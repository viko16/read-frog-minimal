/**
 * Migration from the full Read Frog v098 config to the Read Frog Minimal v099 config.
 *
 * This is a frozen snapshot. It deliberately imports nothing from application code: every
 * provider id, provider shape, removed key, and fallback value is fixed here so future product
 * changes cannot alter the meaning of an already-shipped migration.
 */

const HOSTED_PROVIDER_IDS = new Set(["read-frog-free-ai", "read-frog-advance-ai"])
const PURE_TRANSLATE_PROVIDER_TYPES = new Set([
  "google-translate",
  "microsoft-translate",
  "deeplx",
  "deepl",
])

const MICROSOFT_PROVIDER = {
  id: "microsoft-translate-default",
  name: "Microsoft Translate",
  enabled: true,
  provider: "microsoft-translate",
}

function isObject(value: any): value is Record<string, any> {
  return value !== null && typeof value === "object" && !Array.isArray(value)
}

function isReferencedByRetainedFeature(config: any, providerId: string): boolean {
  return (
    config?.pageTranslation?.providerId === providerId ||
    (config?.languageDetection?.mode === "llm" &&
      config?.languageDetection?.providerId === providerId)
  )
}

function hasUserProviderChanges(provider: any): boolean {
  if (!isObject(provider)) return false
  if (typeof provider.apiKey === "string" && provider.apiKey.length > 0) return true
  if (provider.headers && Object.keys(provider.headers).length > 0) return true
  if (provider.description && typeof provider.description !== "string") return true

  if (provider.id === "jalapenocloud-default" && provider.provider === "jalapenocloud") {
    const model = provider.model?.model
    const modelIsSeeded = model === "DeepSeek-V4-Flash" || model === "GLM-5.2"
    return (
      provider.name !== "Jalapeno Cloud" ||
      provider.enabled !== true ||
      provider.baseURL !== "https://api.jalapeno-cloud.ai/v1" ||
      provider.model?.isCustomModel !== false ||
      provider.model?.customModel !== null ||
      !modelIsSeeded
    )
  }

  if (provider.id === "atlascloud-default" && provider.provider === "atlascloud") {
    return (
      provider.name !== "Atlas Cloud" ||
      provider.enabled !== true ||
      provider.baseURL !== "https://api.atlascloud.ai/v1" ||
      provider.model?.isCustomModel !== false ||
      provider.model?.customModel !== null ||
      provider.model?.model !== "deepseek-ai/deepseek-v4-flash"
    )
  }

  return true
}

function shouldKeepProvider(config: any, provider: any): boolean {
  if (!isObject(provider)) return true
  const isSeededSponsor =
    provider.id === "jalapenocloud-default" || provider.id === "atlascloud-default"
  if (!isSeededSponsor) return true

  return isReferencedByRetainedFeature(config, provider.id) || hasUserProviderChanges(provider)
}

function ensurePageProvider(
  config: any,
  providersConfig: any[],
): {
  pageTranslation: any
  providersConfig: any[]
} {
  const originalPageTranslation = isObject(config.pageTranslation) ? config.pageTranslation : {}
  const pageTranslation = { ...originalPageTranslation }
  const providers = [...providersConfig]
  const wasHosted = HOSTED_PROVIDER_IDS.has(pageTranslation.providerId)

  const current = providers.find(
    (provider) =>
      isObject(provider) && provider.id === pageTranslation.providerId && provider.enabled === true,
  )

  if (wasHosted) {
    const microsoftIndex = providers.findIndex(
      (provider) => isObject(provider) && provider.id === MICROSOFT_PROVIDER.id,
    )
    let microsoft
    if (microsoftIndex >= 0) {
      microsoft = { ...providers[microsoftIndex], enabled: true }
      providers[microsoftIndex] = microsoft
    } else {
      microsoft = structuredClone(MICROSOFT_PROVIDER)
      providers.unshift(microsoft)
    }
    pageTranslation.providerId = microsoft.id
    pageTranslation.enableAIContentAware = false
  } else if (!current) {
    let fallback = providers.find(
      (provider) => isObject(provider) && provider.enabled === true && provider.id,
    )
    if (!fallback) {
      fallback = structuredClone(MICROSOFT_PROVIDER)
      providers.push(fallback)
    }
    pageTranslation.providerId = fallback.id
  }

  if (
    Array.isArray(pageTranslation.page?.autoTranslatePatterns) &&
    pageTranslation.page.autoTranslatePatterns.length === 1 &&
    pageTranslation.page.autoTranslatePatterns[0] === "news.ycombinator.com"
  ) {
    pageTranslation.page = {
      ...pageTranslation.page,
      autoTranslatePatterns: [],
    }
  }

  return { pageTranslation, providersConfig: providers }
}

function migrateLanguageDetection(config: any, providersConfig: any[]): any {
  if (!isObject(config.languageDetection) || config.languageDetection.mode !== "llm") {
    return isObject(config.languageDetection) ? { ...config.languageDetection } : { mode: "basic" }
  }

  const providerId = config.languageDetection.providerId
  const provider = providersConfig.find(
    (candidate) =>
      isObject(candidate) &&
      candidate.id === providerId &&
      candidate.enabled === true &&
      !PURE_TRANSLATE_PROVIDER_TYPES.has(candidate.provider),
  )

  return provider ? { ...config.languageDetection } : { mode: "basic" }
}

export function migrate(oldConfig: any): any {
  if (!isObject(oldConfig)) return oldConfig

  const filteredProviders = Array.isArray(oldConfig.providersConfig)
    ? oldConfig.providersConfig
        .filter((provider: any) => shouldKeepProvider(oldConfig, provider))
        .map((provider: any) => (isObject(provider) ? { ...provider } : provider))
    : []

  const { pageTranslation, providersConfig } = ensurePageProvider(oldConfig, filteredProviders)

  return {
    language: oldConfig.language,
    providersConfig,
    pageTranslation,
    languageDetection: migrateLanguageDetection(oldConfig, providersConfig),
    siteControl: oldConfig.siteControl,
    siteRules: oldConfig.siteRules,
    uiLanguage: oldConfig.uiLanguage ?? "auto",
  }
}
