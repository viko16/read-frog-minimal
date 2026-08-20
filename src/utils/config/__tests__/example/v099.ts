import type { TestSeriesObject } from "./types"
import { testSeries as v098TestSeries } from "./v098"

const PURE_TRANSLATE_PROVIDER_TYPES = new Set([
  "google-translate",
  "microsoft-translate",
  "deeplx",
  "deepl",
])

/**
 * The v098 fixtures are already frozen snapshots. This projection supplies the
 * common-chain expectations for the deliberately shrinking v099 schema; the
 * edge decisions (hosted ids, sponsor rows, HN seed, and BYOK preservation)
 * remain covered by the dedicated frozen v098-to-v099 migration tests.
 */
function projectToMinimalConfig(config: any): any {
  const providersConfig = config.providersConfig.filter(
    (provider: any) =>
      provider.id !== "jalapenocloud-default" && provider.id !== "atlascloud-default",
  )
  const pageTranslation = structuredClone(config.pageTranslation)

  if (
    pageTranslation.page.autoTranslatePatterns.length === 1 &&
    pageTranslation.page.autoTranslatePatterns[0] === "news.ycombinator.com"
  ) {
    pageTranslation.page.autoTranslatePatterns = []
  }

  let languageDetection = structuredClone(config.languageDetection)
  if (languageDetection.mode === "llm") {
    const provider = providersConfig.find(
      (candidate: any) =>
        candidate.id === languageDetection.providerId &&
        candidate.enabled &&
        !PURE_TRANSLATE_PROVIDER_TYPES.has(candidate.provider),
    )
    if (!provider) languageDetection = { mode: "basic" }
  }

  return {
    language: structuredClone(config.language),
    providersConfig: structuredClone(providersConfig),
    pageTranslation,
    languageDetection,
    siteControl: structuredClone(config.siteControl),
    siteRules: structuredClone(config.siteRules),
    uiLanguage: config.uiLanguage ?? "auto",
  }
}

export const testSeries: TestSeriesObject = Object.fromEntries(
  Object.entries(v098TestSeries).map(([id, series]) => [
    id,
    {
      description: `${series.description}; projects the retained Minimal schema`,
      config: projectToMinimalConfig(series.config),
    },
  ]),
)
