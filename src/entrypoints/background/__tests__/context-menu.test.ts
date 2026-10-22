import type { Config } from "@/types/config/config"
import { beforeEach, describe, expect, it, vi } from "vitest"
import { browser, storage } from "#imports"
import { DEFAULT_CONFIG } from "@/utils/constants/config"
import { initI18n } from "@/utils/i18n"
import { MENU_ID_TRANSLATE, setupContextMenu } from "../context-menu"

const { sendMessageMock, ensureInitializedConfigMock } = vi.hoisted(() => ({
  sendMessageMock: vi.fn<(...args: any[]) => any>(),
  ensureInitializedConfigMock: vi.fn<(...args: any[]) => any>(),
}))
vi.mock("@/utils/message", () => ({ sendMessage: sendMessageMock }))
vi.mock("../config", () => ({ ensureInitializedConfig: ensureInitializedConfigMock }))
vi.mock("@/utils/i18n", () => ({
  i18n: { t: (key: string) => key },
  initI18n: vi.fn<(...args: any[]) => any>().mockResolvedValue(undefined),
}))

const clicked = vi.fn<(...args: any[]) => any>()
const activated = vi.fn<(...args: any[]) => any>()
const updated = vi.fn<(...args: any[]) => any>()
const focused = vi.fn<(...args: any[]) => any>()
const stateChanged = vi.fn<(...args: any[]) => any>()
const configChanged = vi.fn<(...args: any[]) => any>()
const getItemMock = vi.fn<(...args: any[]) => any>()
const setItemMock = vi.fn<(...args: any[]) => any>()
let config: Config

async function start(enabled = true) {
  config.contextMenu.enabled = enabled
  setupContextMenu(Promise.resolve())
  // Flush initialization through the same serialized refresh queue.
  await activated.mock.calls[0]![0]({ tabId: 1 })
}

describe("page translation context menu", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    config = structuredClone(DEFAULT_CONFIG)
    ensureInitializedConfigMock.mockImplementation(async () => config)
    sendMessageMock.mockResolvedValue(undefined)
    browser.contextMenus.create = vi.fn<(...args: any[]) => any>((_properties, callback) => {
      callback()
      return MENU_ID_TRANSLATE
    })
    browser.contextMenus.update = vi.fn<(...args: any[]) => any>().mockResolvedValue(undefined)
    browser.contextMenus.removeAll = vi.fn<(...args: any[]) => any>().mockResolvedValue(undefined)
    browser.contextMenus.onClicked.addListener = clicked
    browser.tabs.onActivated.addListener = activated
    browser.tabs.onUpdated.addListener = updated
    browser.windows.onFocusChanged.addListener = focused
    browser.storage.session.onChanged.addListener = stateChanged
    browser.tabs.query = vi.fn<(...args: any[]) => any>().mockResolvedValue([{ id: 1 }])
    storage.watch = configChanged
    storage.getItem = getItemMock.mockResolvedValue({ enabled: false })
    storage.setItem = setItemMock.mockResolvedValue(undefined)
  })

  it("clears persisted menu items and creates none with the default-off setting", async () => {
    await start(false)
    expect(browser.contextMenus.removeAll).toHaveBeenCalledOnce()
    expect(browser.contextMenus.create).not.toHaveBeenCalled()
  })

  it("registers wake-up listeners immediately but waits for initialization before creating menus", async () => {
    const ready = Promise.withResolvers<void>()
    config.contextMenu.enabled = true
    setupContextMenu(ready.promise)
    expect(clicked).toHaveBeenCalledOnce()
    expect(browser.contextMenus.create).not.toHaveBeenCalled()
    ready.resolve()
    await activated.mock.calls[0]![0]({ tabId: 1 })
    expect(browser.contextMenus.create).toHaveBeenCalledExactlyOnceWith(
      expect.objectContaining({
        id: MENU_ID_TRANSLATE,
        title: "contextMenu.translate",
        contexts: ["page"],
      }),
      expect.any(Function),
    )
  })

  it("adds and removes the menu immediately when the setting changes", async () => {
    await start(false)
    const oldConfig = structuredClone(config)
    config.contextMenu.enabled = true
    await configChanged.mock.calls[0]![1](config, oldConfig)
    expect(browser.contextMenus.create).toHaveBeenCalledOnce()
    const enabledConfig = structuredClone(config)
    config.contextMenu.enabled = false
    await configChanged.mock.calls[0]![1](config, enabledConfig)
    expect(browser.contextMenus.removeAll).toHaveBeenCalledTimes(2)
    await activated.mock.calls[0]![0]({ tabId: 2 })
    expect(browser.contextMenus.create).toHaveBeenCalledOnce()
  })

  it("serializes a disable while menu creation is still pending", async () => {
    await start(false)
    let finishCreation: () => void = () => {}
    vi.mocked(browser.contextMenus.create).mockImplementation((_properties, callback) => {
      finishCreation = callback!
      return MENU_ID_TRANSLATE
    })
    const oldConfig = structuredClone(config)
    config.contextMenu.enabled = true
    const enableUpdate = configChanged.mock.calls[0]![1](config, oldConfig)
    await vi.waitFor(() => expect(browser.contextMenus.create).toHaveBeenCalledOnce())
    const enabledConfig = structuredClone(config)
    config.contextMenu.enabled = false
    const disableUpdate = configChanged.mock.calls[0]![1](config, enabledConfig)
    finishCreation()
    await Promise.all([enableUpdate, disableUpdate])
    expect(browser.contextMenus.removeAll).toHaveBeenCalledTimes(2)
  })

  it("updates the title from actual translation state, including changes from other entry points", async () => {
    await start()
    getItemMock.mockResolvedValue({ enabled: true })
    await stateChanged.mock.calls[0]![0]({ "translationState.1": { newValue: { enabled: true } } })
    expect(browser.contextMenus.update).toHaveBeenLastCalledWith(MENU_ID_TRANSLATE, {
      title: "contextMenu.showOriginal",
    })
    getItemMock.mockResolvedValue(null)
    await stateChanged.mock.calls[0]![0]({ "translationState.1": { oldValue: { enabled: true } } })
    expect(browser.contextMenus.update).toHaveBeenLastCalledWith(MENU_ID_TRANSLATE, {
      title: "contextMenu.translate",
    })
  })

  it("keeps the focused tab's title when another tab finishes loading", async () => {
    await start()
    getItemMock.mockImplementation(async (key) =>
      key === "session:translationState.1" ? { enabled: true } : { enabled: false },
    )
    await updated.mock.calls[0]![0](2, { status: "complete" })
    expect(browser.contextMenus.update).toHaveBeenLastCalledWith(MENU_ID_TRANSLATE, {
      title: "contextMenu.showOriginal",
    })
    vi.mocked(browser.tabs.query).mockResolvedValue([{ id: 2 }] as any)
    await focused.mock.calls[0]![0](2)
    expect(browser.contextMenus.update).toHaveBeenLastCalledWith(MENU_ID_TRANSLATE, {
      title: "contextMenu.translate",
    })
  })

  it("refreshes the background locale before updating the menu", async () => {
    await start()
    const oldConfig = structuredClone(config)
    config.uiLanguage = "zh-CN"
    await configChanged.mock.calls[0]![1](config, oldConfig)
    expect(initI18n).toHaveBeenLastCalledWith("zh-CN")
  })

  it("starts translation in the clicked tab, including tab ID zero", async () => {
    await start()
    await clicked.mock.calls[0]![0]({ menuItemId: MENU_ID_TRANSLATE }, { id: 0 })
    expect(sendMessageMock).toHaveBeenCalledWith(
      "askManagerToTogglePageTranslation",
      { enabled: true },
      0,
    )
    expect(setItemMock).not.toHaveBeenCalled()
  })

  it("records manual refusal before stopping translation so auto-translation cannot re-enable it", async () => {
    await start()
    getItemMock.mockResolvedValue({ enabled: true })
    await clicked.mock.calls[0]![0](
      { menuItemId: MENU_ID_TRANSLATE },
      { id: 5, url: "https://example.com/article" },
    )
    expect(setItemMock).toHaveBeenCalledWith("session:translationState.5", {
      enabled: false,
      userDisabled: true,
      origin: "https://example.com",
    })
    expect(sendMessageMock).toHaveBeenCalledWith(
      "notifyTranslationStateChanged",
      { enabled: false },
      5,
    )
    expect(sendMessageMock).toHaveBeenCalledWith(
      "askManagerToTogglePageTranslation",
      { enabled: false },
      5,
    )
    expect(setItemMock.mock.invocationCallOrder[0]).toBeLessThan(
      sendMessageMock.mock.invocationCallOrder[0]!,
    )
  })

  it("ignores removed selection actions, missing tabs and stale clicks after disabling", async () => {
    await start()
    const click = clicked.mock.calls[0]![0]
    await click({ menuItemId: "read-frog-selection-translate" }, { id: 1 })
    await click({ menuItemId: MENU_ID_TRANSLATE })
    config.contextMenu.enabled = false
    await click({ menuItemId: MENU_ID_TRANSLATE }, { id: 1 })
    expect(sendMessageMock).not.toHaveBeenCalled()
  })

  it("handles pages without a content-script receiver without reporting translation as enabled", async () => {
    await start()
    sendMessageMock.mockRejectedValueOnce(new Error("No receiver"))
    await expect(
      clicked.mock.calls[0]![0]({ menuItemId: MENU_ID_TRANSLATE }, { id: 1 }),
    ).resolves.toBeUndefined()
    expect(setItemMock).not.toHaveBeenCalled()
    expect(browser.contextMenus.update).not.toHaveBeenCalledWith(MENU_ID_TRANSLATE, {
      title: "contextMenu.showOriginal",
    })
  })
})
