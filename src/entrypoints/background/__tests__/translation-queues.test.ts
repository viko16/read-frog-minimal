import type { ProviderConfig } from "@/types/config/provider"
import { beforeEach, describe, expect, it, vi } from "vitest"
import { fakeBrowser } from "wxt/testing/fake-browser"
import { DEFAULT_CONFIG } from "@/utils/constants/config"
import { NO_TRANSLATION_SENTINEL } from "@/utils/constants/prompt"

const mocks = vi.hoisted(() => ({
  onMessage: vi.fn<(...args: any[]) => any>(),
  executeTranslate: vi.fn<(...args: any[]) => any>(),
  ensureInitializedConfig: vi.fn<(...args: any[]) => any>(),
  cacheGet: vi.fn<(...args: any[]) => any>(),
  cachePut: vi.fn<(...args: any[]) => any>(),
  cacheDelete: vi.fn<(...args: any[]) => any>(),
}))

vi.mock("@/utils/message", () => ({ onMessage: mocks.onMessage }))
vi.mock("../config", () => ({ ensureInitializedConfig: mocks.ensureInitializedConfig }))
vi.mock("@/utils/host/translate/execute-translate", () => ({
  executeTranslate: mocks.executeTranslate,
}))
vi.mock("@/utils/content/summary", () => ({
  generateArticleSummary: vi.fn<(...args: any[]) => any>(),
}))
vi.mock("../background-stream", () => ({
  generateTextForProviderRef: vi.fn<(...args: any[]) => any>(),
}))
vi.mock("@/utils/db/dexie/db", () => ({
  db: {
    translationCache: { get: mocks.cacheGet, put: mocks.cachePut, delete: mocks.cacheDelete },
    articleSummaryCache: {
      get: vi.fn<(...args: any[]) => any>(),
      put: vi.fn<(...args: any[]) => any>(),
    },
  },
}))

const provider: ProviderConfig = {
  id: "google-translate-default",
  name: "Google Translate",
  provider: "google-translate",
  enabled: true,
}

describe("page translation queue formula integrity", () => {
  beforeEach(() => {
    fakeBrowser.reset()
    vi.resetAllMocks()
    mocks.ensureInitializedConfig.mockResolvedValue(DEFAULT_CONFIG)
  })

  it.each([
    ["reordered", "设 {{1}} 大于 {{0}}。", true],
    ["missing", "设 {{0}} 大于。", false],
    ["duplicated", "{{0}} {{0}} {{1}}", false],
    ["invented", "{{0}} {{1}} {{2}}", false],
    ["no-translation sentinel", NO_TRANSLATION_SENTINEL, true],
  ])("returns %s output but caches only intact translations", async (_case, output, cacheable) => {
    mocks.executeTranslate.mockResolvedValue(output)
    const { setUpWebPageTranslationQueue } = await import("../translation-queues")
    setUpWebPageTranslationQueue()
    const registration = mocks.onMessage.mock.calls.find(
      ([name]) => name === "enqueueTranslateRequest",
    )
    expect(registration).toBeDefined()
    const handler = registration![1]

    const result = await handler({
      data: {
        text: "Let {{0}} be smaller than {{1}}.",
        langConfig: DEFAULT_CONFIG.language,
        providerRef: { kind: "local", config: provider },
        scheduleAt: Date.now(),
        hash: "atom-hash",
      },
    })

    expect(result).toBe(output)
    expect(mocks.executeTranslate).toHaveBeenCalledTimes(1)
    expect(mocks.cachePut.mock.calls.map(([entry]) => [entry.key, entry.translation])).toEqual(
      cacheable ? [["atom-hash", output]] : [],
    )
    expect(mocks.cacheDelete.mock.calls).toEqual(cacheable ? [] : [["atom-hash"]])
  })
})
