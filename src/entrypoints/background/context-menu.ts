import type { Config } from "@/types/config/config"
import { browser, storage } from "#imports"
import { CONFIG_STORAGE_KEY } from "@/utils/constants/config"
import { TRANSLATION_STATE_KEY_PREFIX } from "@/utils/constants/storage-keys"
import { i18n, initI18n } from "@/utils/i18n"
import { logger } from "@/utils/logger"
import { sendMessage } from "@/utils/message"
import { ensureInitializedConfig } from "./config"
import { getPageTranslationEnabled, setPageTranslationEnabled } from "./page-translation-state"

export const MENU_ID_TRANSLATE = "read-frog-translate"

/** Register synchronously so a menu click can wake the background service worker. */
export function setupContextMenu(backgroundReady: Promise<unknown>) {
  let menuExists: boolean | undefined
  let updateQueue = Promise.resolve()

  function refreshMenu() {
    // Serialize creation, removal and title changes, reading the latest config/tab each time.
    updateQueue = updateQueue
      .then(async () => {
        await backgroundReady
        const config = await ensureInitializedConfig()
        if (!config) return

        if (menuExists === undefined || (!config.contextMenu.enabled && menuExists)) {
          await browser.contextMenus.removeAll()
          menuExists = false
        }
        if (!config.contextMenu.enabled) return

        await initI18n(config.uiLanguage)
        const [tab] = await browser.tabs.query({ active: true, lastFocusedWindow: true })
        const enabled = typeof tab?.id === "number" && (await getPageTranslationEnabled(tab.id))
        const title = i18n.t(enabled ? "contextMenu.showOriginal" : "contextMenu.translate")

        if (menuExists) {
          await browser.contextMenus.update(MENU_ID_TRANSLATE, { title })
        } else {
          await new Promise<void>((resolve, reject) => {
            browser.contextMenus.create(
              {
                id: MENU_ID_TRANSLATE,
                title,
                contexts: ["page"],
                documentUrlPatterns: ["http://*/*", "https://*/*", "file:///*"],
              },
              () => {
                const error = browser.runtime.lastError
                if (error) reject(new Error(error.message))
                else resolve()
              },
            )
          })
          menuExists = true
        }
      })
      .catch((error) => logger.warn("Failed to update translation context menu", error))
    return updateQueue
  }

  storage.watch<Config>(`local:${CONFIG_STORAGE_KEY}`, async (config, oldConfig) => {
    if (
      config?.contextMenu?.enabled !== oldConfig?.contextMenu?.enabled ||
      config?.uiLanguage !== oldConfig?.uiLanguage
    ) {
      await refreshMenu()
    }
  })
  browser.tabs.onActivated.addListener(() => refreshMenu())
  browser.tabs.onUpdated.addListener(async (_tabId, changeInfo) => {
    if (changeInfo.status === "complete") await refreshMenu()
  })
  browser.windows.onFocusChanged.addListener(async (windowId) => {
    if (windowId !== browser.windows.WINDOW_ID_NONE) await refreshMenu()
  })
  browser.storage.session.onChanged.addListener(async (changes) => {
    if (
      Object.keys(changes).some((key) =>
        key.startsWith(TRANSLATION_STATE_KEY_PREFIX.replace("session:", "")),
      )
    ) {
      await refreshMenu()
    }
  })
  browser.contextMenus.onClicked.addListener(async (info, tab) => {
    if (info.menuItemId !== MENU_ID_TRANSLATE || typeof tab?.id !== "number") return
    try {
      await backgroundReady
      const config = await ensureInitializedConfig()
      if (!config?.contextMenu.enabled) return
      await togglePageTranslation(tab.id, tab.url)
    } catch (error) {
      logger.warn("Failed to toggle translation from context menu", error)
    }
  })

  void refreshMenu()
}

async function togglePageTranslation(tabId: number, tabUrl?: string) {
  const enabled = !(await getPageTranslationEnabled(tabId))
  if (!enabled) {
    // Remember manual refusal before messaging, as the popup/shortcut paths do.
    await setPageTranslationEnabled(tabId, false, tabUrl, true)
    void sendMessage("notifyTranslationStateChanged", { enabled: false }, tabId).catch((error) =>
      logger.warn("Failed to notify page translation state change", error),
    )
  }
  await sendMessage("askManagerToTogglePageTranslation", { enabled }, tabId)
  // The manager publishes the actual state; its storage event updates the menu title.
}
