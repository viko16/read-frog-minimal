import { describe, expect, it } from "vitest"
import { migrate } from "../../migration-scripts/v098-to-v099"

function baseConfig() {
  return {
    language: { sourceCode: "auto", targetCode: "cmn", level: "intermediate" },
    providersConfig: [
      {
        id: "microsoft-translate-default",
        name: "Microsoft Translate",
        enabled: true,
        provider: "microsoft-translate",
      },
      {
        id: "openai-default",
        name: "OpenAI",
        enabled: true,
        provider: "openai",
        apiKey: "preserve-me",
        model: { model: "gpt-5.4-mini", isCustomModel: false, customModel: null },
      },
      {
        id: "jalapenocloud-default",
        name: "Jalapeno Cloud",
        enabled: true,
        provider: "jalapenocloud",
        baseURL: "https://api.jalapeno-cloud.ai/v1",
        model: { model: "GLM-5.2", isCustomModel: false, customModel: null },
        providerOptions: { chat_template_kwargs: { thinking: false } },
      },
      {
        id: "atlascloud-default",
        name: "Atlas Cloud",
        enabled: true,
        provider: "atlascloud",
        baseURL: "https://api.atlascloud.ai/v1",
        model: {
          model: "deepseek-ai/deepseek-v4-flash",
          isCustomModel: false,
          customModel: null,
        },
      },
    ],
    pageTranslation: {
      providerId: "openai-default",
      enableAIContentAware: true,
      customPromptsConfig: { promptId: "default", patterns: [] },
      page: { autoTranslatePatterns: ["news.ycombinator.com"] },
    },
    languageDetection: { mode: "llm", providerId: "openai-default" },
    siteControl: { mode: "blacklist", blacklistPatterns: [], whitelistPatterns: [] },
    siteRules: { userRules: [], disabledBuiltInRules: [] },
    uiLanguage: "zh-CN",
    tts: { enabled: true },
    floatingButton: { enabled: true },
    selectionToolbar: { enabled: true },
    inputTranslation: { enabled: true },
    videoSubtitles: { enabled: true },
    translationHub: { shortcut: "Alt+H" },
    betaExperience: { enabled: true },
  }
}

describe("v098 to v099 minimal migration", () => {
  it("keeps webpage settings and BYOK secrets while dropping removed feature sections", () => {
    const migrated = migrate(baseConfig())

    expect(migrated.providersConfig).toContainEqual(
      expect.objectContaining({ id: "openai-default", apiKey: "preserve-me" }),
    )
    expect(migrated.pageTranslation.customPromptsConfig).toEqual({
      promptId: "default",
      patterns: [],
    })
    expect(migrated.languageDetection).toEqual({ mode: "llm", providerId: "openai-default" })
    expect(migrated.siteControl).toEqual(baseConfig().siteControl)
    expect(migrated).not.toHaveProperty("tts")
    expect(migrated).not.toHaveProperty("selectionToolbar")
    expect(migrated).not.toHaveProperty("videoSubtitles")
  })

  it("maps hosted page translation to Microsoft and disables smart context", () => {
    const config = baseConfig()
    config.pageTranslation.providerId = "read-frog-free-ai"

    const migrated = migrate(config)

    expect(migrated.pageTranslation.providerId).toBe("microsoft-translate-default")
    expect(migrated.pageTranslation.enableAIContentAware).toBe(false)
  })

  it("re-enables an existing Microsoft row when hosted translation needs the fallback", () => {
    const config = baseConfig()
    config.pageTranslation.providerId = "read-frog-free-ai"
    config.providersConfig[0]!.enabled = false

    const migrated = migrate(config)
    const microsoftRows = migrated.providersConfig.filter(
      (provider: any) => provider.id === "microsoft-translate-default",
    )

    expect(microsoftRows).toHaveLength(1)
    expect(microsoftRows[0].enabled).toBe(true)
    expect(migrated.pageTranslation.providerId).toBe("microsoft-translate-default")
  })

  it("maps hosted or invalid language detection back to basic", () => {
    const config = baseConfig()
    config.languageDetection = { mode: "llm", providerId: "read-frog-advance-ai" }

    expect(migrate(config).languageDetection).toEqual({ mode: "basic" })
  })

  it("removes untouched sponsor seeds and the sole Hacker News default", () => {
    const migrated = migrate(baseConfig())

    expect(migrated.providersConfig.map((provider: any) => provider.id)).not.toContain(
      "jalapenocloud-default",
    )
    expect(migrated.providersConfig.map((provider: any) => provider.id)).not.toContain(
      "atlascloud-default",
    )
    expect(migrated.pageTranslation.page.autoTranslatePatterns).toEqual([])
  })

  it("keeps a selected or keyed sponsor provider and non-default website lists", () => {
    const config = baseConfig()
    config.pageTranslation.providerId = "jalapenocloud-default"
    config.providersConfig[3]!.apiKey = "atlas-key"
    config.pageTranslation.page.autoTranslatePatterns = ["news.ycombinator.com", "example.com"]

    const migrated = migrate(config)

    expect(migrated.providersConfig.map((provider: any) => provider.id)).toEqual(
      expect.arrayContaining(["jalapenocloud-default", "atlascloud-default"]),
    )
    expect(migrated.pageTranslation.page.autoTranslatePatterns).toEqual([
      "news.ycombinator.com",
      "example.com",
    ])
  })

  it("does not mutate input and is idempotent", () => {
    const config = baseConfig()
    const snapshot = structuredClone(config)
    const once = migrate(config)

    expect(config).toEqual(snapshot)
    expect(migrate(structuredClone(once))).toEqual(once)
  })
})
