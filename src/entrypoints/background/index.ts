import "@/utils/zod-config"
import { browser, defineBackground } from "#imports"
import { selectFreshTranslateProviders } from "@/utils/config/default-translate-provider"
import { initI18n } from "@/utils/i18n"
import { logger } from "@/utils/logger"
import { onMessage } from "@/utils/message"
import { openOptionsPage } from "@/utils/navigation"
import { initializeActionIcons, registerActionIconListeners } from "./browser-action-icon"
import { ensureInitializedConfig, isFreshInstalledConfig } from "./config"
import { setUpConfigBackup } from "./config-backup"
import {
  cleanupAllSummaryCache,
  cleanupAllTranslationCache,
  setUpDatabaseCleanup,
} from "./db-cleanup"
import { setupIframeInjection } from "./iframe-injection"
import { setupLLMGenerateTextMessageHandlers } from "./llm-generate-text"
import { proxyFetch } from "./proxy-fetch"
import { setUpWebPageTranslationQueue } from "./translation-queues"
import { translationMessage } from "./translation-signal"

export default defineBackground({
  type: "module",
  main: () => {
    logger.info("Hello background!", { id: browser.runtime.id })

    browser.runtime.onInstalled.addListener(async () => {
      await ensureInitializedConfig()

      // Deliberately last: probing Google Translate can hang for seconds on networks that
      // block it, and nothing above should wait for that. Awaiting inside the listener
      // keeps the service worker alive until the probe settles. Guarded by the config
      // actually being new rather than by the install reason: reloading an unpacked
      // extension reports "install" while the developer's provider choice is still in
      // storage, and a config rebuilt from defaults after failing validation during an
      // update deserves the same provider selection a fresh install gets.
      if (await isFreshInstalledConfig()) {
        await selectFreshTranslateProviders()
      }
    })

    onMessage("openPage", async (message) => {
      const { url, active } = message.data
      logger.info("openPage", { url, active })
      await browser.tabs.create({ url, active: active ?? true })
    })

    onMessage("openOptionsPage", async (message) => {
      logger.info("openOptionsPage", message.data)
      await openOptionsPage(message.data)
    })

    onMessage("clearAllTranslationRelatedCache", async () => {
      await cleanupAllTranslationCache()
      await cleanupAllSummaryCache()
    })

    translationMessage()
    registerActionIconListeners()

    // Initialize action icons asynchronously
    void initializeActionIcons()

    // Synchronous: all queue message handlers register in the first turn of
    // the SW so wake-triggering messages are never dropped during init.
    setUpWebPageTranslationQueue()
    void setUpDatabaseCleanup()
    setUpConfigBackup()

    // Start config and i18n initialization without delaying synchronous listener
    // registration. Consumers that materialize localized config-derived data await
    // this shared barrier before reading it.
    const backgroundReady = (async () => {
      const config = await ensureInitializedConfig()
      await initI18n(config?.uiLanguage ?? "auto")
    })()

    proxyFetch()
    setupLLMGenerateTextMessageHandlers()

    // Setup on-demand iframe injection after page translation is enabled.
    setupIframeInjection()

    void backgroundReady
  },
})
