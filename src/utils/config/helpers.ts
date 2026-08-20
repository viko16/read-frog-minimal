import type { Config } from "@/types/config/config"
import type { LanguageDetectionMode } from "@/types/config/language-detection"
import type {
  APIProviderConfig,
  LLMProviderConfig,
  NonAPIProviderConfig,
  ProviderConfig,
  ProvidersConfig,
  PureAPIProviderConfig,
  TranslateProviderConfig,
} from "@/types/config/provider"
import type { FeatureKey } from "@/utils/constants/feature-providers"
import {
  isAPIProviderConfig,
  isLLMProviderConfig,
  isNonAPIProviderConfig,
  isPureAPIProviderConfig,
  isTranslateProviderConfig,
} from "@/types/config/provider"
import { FEATURE_KEYS, FEATURE_PROVIDER_DEFS } from "@/utils/constants/feature-providers"
import { getProviderIdsForCapability } from "@/utils/providers/provider-registry"

export function getProviderConfigById<T extends ProviderConfig>(
  providersConfig: T[],
  providerId: string,
): T | undefined {
  return providersConfig.find((provider) => provider.id === providerId)
}

export const getLLMProvidersConfig = (providers: ProvidersConfig): LLMProviderConfig[] =>
  providers.filter(isLLMProviderConfig)
export const getAPIProvidersConfig = (providers: ProvidersConfig): APIProviderConfig[] =>
  providers.filter(isAPIProviderConfig)
export const getPureAPIProvidersConfig = (providers: ProvidersConfig): PureAPIProviderConfig[] =>
  providers.filter(isPureAPIProviderConfig)
export const getNonAPIProvidersConfig = (providers: ProvidersConfig): NonAPIProviderConfig[] =>
  providers.filter(isNonAPIProviderConfig)
export const getTranslateProvidersConfig = (
  providers: ProvidersConfig,
): TranslateProviderConfig[] => providers.filter(isTranslateProviderConfig)
export const filterEnabledProvidersConfig = (providers: ProvidersConfig): ProvidersConfig =>
  providers.filter((provider) => provider.enabled)
export const getEnabledLLMProvidersConfig = (providers: ProvidersConfig): LLMProviderConfig[] =>
  providers.filter((provider) => provider.enabled).filter(isLLMProviderConfig)

export function getProviderKeyByName(providers: ProvidersConfig, providerId: string) {
  return getProviderConfigById(providers, providerId)?.provider
}

export function getProviderModelConfig(config: Config, providerId: string) {
  const provider = getProviderConfigById(config.providersConfig, providerId)
  return provider && isLLMProviderConfig(provider) ? provider.model : undefined
}

export function getProviderApiKey(providers: ProvidersConfig, providerId: string) {
  const provider = getProviderConfigById(providers, providerId)
  return provider && isAPIProviderConfig(provider) ? provider.apiKey : undefined
}

export function resolveLanguageDetectionConfigForModeChange(
  current: Config["languageDetection"],
  nextMode: LanguageDetectionMode,
  providers: ProvidersConfig,
): Partial<Config["languageDetection"]> | null {
  if (nextMode === "basic") return { mode: "basic" }
  const available = getProviderIdsForCapability("languageDetection", providers, {
    requireEnable: true,
  })
  if (available.length === 0) return null
  return {
    mode: "llm",
    providerId:
      current.providerId && available.includes(current.providerId)
        ? current.providerId
        : available[0]!,
  }
}

export function computeProviderFallbacksAfterDeletion(
  deletedProviderId: string,
  config: Config,
  remainingProviders: ProvidersConfig,
): Partial<Record<FeatureKey, string>> {
  const updates: Partial<Record<FeatureKey, string>> = {}
  for (const key of FEATURE_KEYS) {
    if (FEATURE_PROVIDER_DEFS[key].getProviderId(config) !== deletedProviderId) continue
    const fallback = getProviderIdsForCapability(key, remainingProviders, {
      requireEnable: true,
    })[0]
    if (fallback) updates[key] = fallback
  }
  return updates
}

export function findFeatureMissingProvider(
  remainingProviders: ProvidersConfig,
  config?: Config,
): FeatureKey | "languageDetection" | null {
  for (const key of FEATURE_KEYS) {
    if (!getProviderIdsForCapability(key, remainingProviders, { requireEnable: true })[0])
      return key
  }
  if (
    config?.languageDetection.mode === "llm" &&
    !getProviderIdsForCapability("languageDetection", remainingProviders, {
      requireEnable: true,
    })[0]
  ) {
    return "languageDetection"
  }
  return null
}

export function computeLanguageDetectionFallbackAfterDeletion(
  deletedProviderId: string,
  config: Config,
  remainingProviders: ProvidersConfig,
): string | undefined | null {
  if (
    config.languageDetection.mode !== "llm" ||
    config.languageDetection.providerId !== deletedProviderId
  ) {
    return null
  }
  return getProviderIdsForCapability("languageDetection", remainingProviders, {
    requireEnable: true,
  })[0]
}
