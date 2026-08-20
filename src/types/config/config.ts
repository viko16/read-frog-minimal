import { langCodeISO6393Schema, langLevel } from "@read-frog/definitions"
import { z } from "zod"
import { languageDetectionConfigSchema } from "./language-detection"
import { isLLMProviderConfig, isTranslateProviderConfig, providersConfigSchema } from "./provider"
import { siteRulesConfigSchema } from "./site-rules"
import { translateConfigSchema } from "./translate"

const languageSchema = z.object({
  sourceCode: langCodeISO6393Schema.or(z.literal("auto")),
  targetCode: langCodeISO6393Schema,
  level: langLevel,
})

const siteControlSchema = z.object({
  mode: z.enum(["blacklist", "whitelist"]),
  blacklistPatterns: z.array(z.string()),
  whitelistPatterns: z.array(z.string()),
})

const uiLanguageSchema = z
  .enum(["auto", "en", "es", "ja", "ko", "ru", "tr", "vi", "zh-CN", "zh-TW"])
  .default("auto")
export type UiLanguage = z.infer<typeof uiLanguageSchema>

const microsoftTranslateProvider = {
  id: "microsoft-translate-default",
  name: "Microsoft Translate",
  enabled: true,
  provider: "microsoft-translate",
} as const

/**
 * Repair a stale page/language-detection provider reference without replacing the rest of the
 * user's config. Provider rows are parsed first, so malformed provider data still fails loudly;
 * only missing or disabled references get a deterministic local fallback.
 */
function normalizeProviderReferences(value: unknown): unknown {
  if (!value || typeof value !== "object" || Array.isArray(value)) return value

  const input = value as Record<string, unknown>
  const providersResult = providersConfigSchema.safeParse(input.providersConfig)
  if (!providersResult.success) return value

  const providersConfig = [...providersResult.data]
  const pageTranslation =
    input.pageTranslation &&
    typeof input.pageTranslation === "object" &&
    !Array.isArray(input.pageTranslation)
      ? { ...(input.pageTranslation as Record<string, unknown>) }
      : undefined

  if (!pageTranslation) return value

  const selectedPageProvider = providersConfig.find(
    (provider) =>
      provider.id === pageTranslation.providerId &&
      provider.enabled &&
      isTranslateProviderConfig(provider),
  )

  if (!selectedPageProvider) {
    let fallbackProvider = providersConfig.find(
      (provider) => provider.enabled && isTranslateProviderConfig(provider),
    )
    if (!fallbackProvider) {
      const microsoftIndex = providersConfig.findIndex(
        (provider) => provider.id === microsoftTranslateProvider.id,
      )
      if (microsoftIndex >= 0) {
        const enabledMicrosoft = {
          ...providersConfig[microsoftIndex]!,
          enabled: true,
        }
        providersConfig[microsoftIndex] = enabledMicrosoft
        fallbackProvider = enabledMicrosoft
      } else {
        providersConfig.push(microsoftTranslateProvider)
        fallbackProvider = microsoftTranslateProvider
      }
    }
    pageTranslation.providerId = fallbackProvider.id
  }

  const languageDetection =
    input.languageDetection &&
    typeof input.languageDetection === "object" &&
    !Array.isArray(input.languageDetection)
      ? { ...(input.languageDetection as Record<string, unknown>) }
      : undefined

  if (languageDetection?.mode === "llm") {
    const provider = providersConfig.find(
      (candidate) =>
        candidate.id === languageDetection.providerId &&
        candidate.enabled &&
        isLLMProviderConfig(candidate),
    )
    if (!provider) {
      languageDetection.mode = "basic"
      delete languageDetection.providerId
    }
  }

  return {
    ...input,
    providersConfig,
    pageTranslation,
    ...(languageDetection ? { languageDetection } : {}),
  }
}

const minimalConfigSchema = z.object({
  language: languageSchema,
  providersConfig: providersConfigSchema,
  pageTranslation: translateConfigSchema,
  languageDetection: languageDetectionConfigSchema,
  siteControl: siteControlSchema,
  siteRules: siteRulesConfigSchema,
  uiLanguage: uiLanguageSchema,
})

export const configSchema = z.preprocess(normalizeProviderReferences, minimalConfigSchema)

export type Config = z.infer<typeof minimalConfigSchema>
