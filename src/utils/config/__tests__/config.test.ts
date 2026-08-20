import { describe, expect, it } from "vitest"
import { configSchema } from "@/types/config/config"
import { DEFAULT_CONFIG } from "@/utils/constants/config"
import { DEFAULT_PROVIDER_CONFIG } from "@/utils/constants/providers"
import { getObjectWithoutAPIKeys, hasAPIKey } from "../api"
import { LATEST_SCHEMA_VERSION } from "../migration"

describe("config utilities", () => {
  describe("getObjectWithoutAPIKeys", () => {
    for (let version = 2; version <= LATEST_SCHEMA_VERSION; version++) {
      const currentVersionStr = String(version).padStart(3, "0")

      it(`should remove api keys from config v${currentVersionStr}`, async () => {
        const currentConfigModule = await import(`./example/v${currentVersionStr}.ts`)
        const currentConfig = currentConfigModule.configExample

        const result = getObjectWithoutAPIKeys(currentConfig)
        expect(hasAPIKey(result)).toBe(false)
      })
    }

    it("should remove apiKey from OpenAI provider config", () => {
      const openaiConfigFromConstants = DEFAULT_PROVIDER_CONFIG.openai
      const openaiConfigWithApiKey = {
        ...openaiConfigFromConstants,
        apiKey: "sk-1234567890abcdef",
      }

      const result = getObjectWithoutAPIKeys(openaiConfigWithApiKey)

      expect(result).not.toHaveProperty("apiKey")
      expect(result.name).toBe(openaiConfigFromConstants.name)
      expect(result.provider).toBe("openai")
      expect(result.model).toEqual(openaiConfigFromConstants.model)
      expect(hasAPIKey(result)).toBe(false)
    })

    it("should remove apiKey from DeepSeek provider config", () => {
      const deepseekConfigFromConstants = DEFAULT_PROVIDER_CONFIG.deepseek
      const deepseekConfigWithApiKey = {
        ...deepseekConfigFromConstants,
        apiKey: "sk-deepseek-123",
        baseURL: "https://api.deepseek.com",
      }

      const result = getObjectWithoutAPIKeys(deepseekConfigWithApiKey)

      expect(result).not.toHaveProperty("apiKey")
      expect(result.name).toBe(deepseekConfigFromConstants.name)
      expect(result.provider).toBe("deepseek")
      expect(result.model).toEqual(deepseekConfigFromConstants.model)
      expect(hasAPIKey(result)).toBe(false)
    })

    it("should handle nested objects with multiple apiKeys", () => {
      const nestedObject = {
        user: {
          name: "John",
          apiKey: "user-secret-123",
          profile: {
            email: "john@example.com",
            apiKey: "profile-secret-456",
          },
        },
        services: {
          openai: {
            apiKey: "sk-openai-789",
            model: "gpt-4",
          },
          deepseek: {
            apiKey: "sk-deepseek-xyz",
            url: "https://api.deepseek.com",
          },
        },
        apiKey: "root-secret-abc",
      }

      const result = getObjectWithoutAPIKeys(nestedObject)

      expect(result).not.toHaveProperty("apiKey")
      expect(result.user).not.toHaveProperty("apiKey")
      expect(result.user.profile).not.toHaveProperty("apiKey")
      expect(result.services.openai).not.toHaveProperty("apiKey")
      expect(result.services.deepseek).not.toHaveProperty("apiKey")

      expect(result.user.name).toBe("John")
      expect(result.user.profile.email).toBe("john@example.com")
      expect(result.services.openai.model).toBe("gpt-4")
      expect(result.services.deepseek.url).toBe("https://api.deepseek.com")
      expect(hasAPIKey(result)).toBe(false)
    })

    it("should handle arrays containing objects with apiKeys", () => {
      const arrayObject = {
        providers: [
          {
            name: "Provider 1",
            apiKey: "key-1",
            enabled: true,
          },
          {
            name: "Provider 2",
            apiKey: "key-2",
            enabled: false,
          },
        ],
        settings: {
          apiKey: "settings-key",
          theme: "dark",
        },
      }

      const result = getObjectWithoutAPIKeys(arrayObject)

      expect(result.providers[0]).not.toHaveProperty("apiKey")
      expect(result.providers[1]).not.toHaveProperty("apiKey")
      expect(result.settings).not.toHaveProperty("apiKey")

      expect(result.providers[0]!.name).toBe("Provider 1")
      expect(result.providers[0]!.enabled).toBe(true)
      expect(result.providers[1]!.name).toBe("Provider 2")
      expect(result.providers[1]!.enabled).toBe(false)
      expect(result.settings.theme).toBe("dark")
      expect(hasAPIKey(result)).toBe(false)
    })

    it("should handle objects without apiKeys", () => {
      const cleanObject = {
        name: "Test",
        config: {
          enabled: true,
          settings: {
            theme: "light",
            language: "en",
          },
        },
        items: ["item1", "item2"],
      }

      const result = getObjectWithoutAPIKeys(cleanObject)

      expect(result).toEqual(cleanObject)
      expect(hasAPIKey(result)).toBe(false)
    })

    it("should handle edge cases and complex structures", () => {
      // Test empty object
      const emptyObject = {}
      expect(getObjectWithoutAPIKeys(emptyObject)).toEqual({})
      expect(hasAPIKey(getObjectWithoutAPIKeys(emptyObject))).toBe(false)

      // Test object with only apiKey
      const onlyApiKeyObject = { apiKey: "secret" }
      const result = getObjectWithoutAPIKeys(onlyApiKeyObject)
      expect(result).toEqual({})
      expect(hasAPIKey(result)).toBe(false)

      // Test deeply nested structure
      const complexObject = {
        level1: {
          level2: {
            level3: {
              apiKey: "deep-secret",
              data: "keep-this",
              level4: {
                apiKey: "deeper-secret",
                moreData: "also-keep-this",
              },
            },
          },
        },
        otherBranch: {
          apiKey: "branch-secret",
          info: "preserve-this",
        },
      }

      const cleanResult = getObjectWithoutAPIKeys(complexObject)
      expect(cleanResult.level1.level2.level3).not.toHaveProperty("apiKey")
      expect(cleanResult.level1.level2.level3.level4).not.toHaveProperty("apiKey")
      expect(cleanResult.otherBranch).not.toHaveProperty("apiKey")
      expect(cleanResult.level1.level2.level3.data).toBe("keep-this")
      expect(cleanResult.level1.level2.level3.level4.moreData).toBe("also-keep-this")
      expect(cleanResult.otherBranch.info).toBe("preserve-this")
      expect(hasAPIKey(cleanResult)).toBe(false)
    })
  })
})

describe("minimal config invariants", () => {
  it("starts with only Microsoft and Google and no auto-translate website seed", () => {
    expect(DEFAULT_CONFIG.providersConfig.map((provider) => provider.id)).toEqual([
      "microsoft-translate-default",
      "google-translate-default",
    ])
    expect(DEFAULT_CONFIG.pageTranslation.providerId).toBe("microsoft-translate-default")
    expect(DEFAULT_CONFIG.pageTranslation.page.autoTranslatePatterns).toEqual([])
  })

  it("repairs an unavailable page provider without resetting unrelated config", () => {
    const input = structuredClone(DEFAULT_CONFIG)
    input.providersConfig.push({
      ...DEFAULT_PROVIDER_CONFIG.openai,
      apiKey: "keep-this-key",
      enabled: false,
    })
    input.providersConfig = input.providersConfig.map((provider) => ({
      ...provider,
      enabled: false,
    }))
    input.pageTranslation.providerId = "missing-provider"
    input.pageTranslation.customPromptsConfig.patterns = [
      {
        id: "123e4567-e89b-12d3-a456-426614174000",
        name: "Keep this prompt",
        systemPrompt: "",
        prompt: "Translate {{input}}",
      },
    ]
    input.siteControl.blacklistPatterns = ["example.com"]

    const parsed = configSchema.parse(input)
    const microsoftRows = parsed.providersConfig.filter(
      (provider) => provider.id === "microsoft-translate-default",
    )

    expect(microsoftRows).toHaveLength(1)
    expect(microsoftRows[0]?.enabled).toBe(true)
    expect(parsed.pageTranslation.providerId).toBe("microsoft-translate-default")
    expect(parsed.providersConfig.find((provider) => provider.id === "openai-default")).toEqual(
      expect.objectContaining({ apiKey: "keep-this-key", enabled: false }),
    )
    expect(parsed.pageTranslation.customPromptsConfig.patterns[0]?.name).toBe("Keep this prompt")
    expect(parsed.siteControl.blacklistPatterns).toEqual(["example.com"])
  })
})
