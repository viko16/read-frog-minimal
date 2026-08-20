import type { APIProviderConfig, ProvidersConfig } from "@/types/config/provider"
import { useAtom, useAtomValue, useSetAtom } from "jotai"
import { useEffect } from "react"
import { toastManager } from "@/components/ui/base-ui/toast"
import {
  isAPIProviderConfig,
  isLLMProvider,
  isNonAPIProvider,
  isTranslateProvider,
} from "@/types/config/provider"
import { configAtom, configFieldsAtomMap, writeConfigAtom } from "@/utils/atoms/config"
import { providerConfigAtom } from "@/utils/atoms/provider"
import {
  computeLanguageDetectionFallbackAfterDeletion,
  computeProviderFallbacksAfterDeletion,
  findFeatureMissingProvider,
} from "@/utils/config/helpers"
import {
  buildFeatureProviderPatch,
  FEATURE_KEYS,
  FEATURE_PROVIDER_DEFS,
  getFeatureLabelI18nKey,
} from "@/utils/constants/feature-providers"
import { i18n } from "@/utils/i18n"
import { EntityEditor } from "../../../../components/entity-editor"
import { selectedProviderIdAtom } from "../atoms"
import { CustomProviderEditor, ProviderEditor, useProviderForm } from "../provider-editor"
import { duplicateProvider } from "../utils"

export function ProviderConfigForm() {
  const selectedId = useAtomValue(selectedProviderIdAtom)
  const provider = useAtomValue(providerConfigAtom(selectedId ?? ""))
  return provider && isAPIProviderConfig(provider) ? (
    <EditableProviderConfig key={provider.id} providerConfig={provider} />
  ) : null
}

function EditableProviderConfig({ providerConfig }: { providerConfig: APIProviderConfig }) {
  const setSelected = useSetAtom(selectedProviderIdAtom)
  const [current, setProvider] = useAtom(providerConfigAtom(providerConfig.id))
  const [providers, setProviders] = useAtom(configFieldsAtomMap.providersConfig)
  const setConfig = useSetAtom(writeConfigAtom)
  const config = useAtomValue(configAtom)
  const form = useProviderForm(providerConfig, setProvider)

  useEffect(() => {
    if (current && isAPIProviderConfig(current)) form.reset(current)
  }, [current, form])

  const chooseNext = (items: ProvidersConfig) =>
    items.find((provider) => !isNonAPIProvider(provider.provider)) ?? items[0]

  const handleDelete = async () => {
    const remaining = providers.filter((provider) => provider.id !== providerConfig.id)
    const missing = findFeatureMissingProvider(remaining, config)
    if (missing) {
      toastManager.add({
        type: "error",
        title: i18n.t("options.apiProviders.form.featureWouldLoseProvider", [
          missing === "languageDetection"
            ? i18n.t("options.apiProviders.languageDetection.title")
            : i18n.t(getFeatureLabelI18nKey(missing)),
        ]),
      })
      return
    }

    const patch = buildFeatureProviderPatch(
      computeProviderFallbacksAfterDeletion(providerConfig.id, config, remaining),
    )
    const detectionFallback = computeLanguageDetectionFallbackAfterDeletion(
      providerConfig.id,
      config,
      remaining,
    )
    if (detectionFallback !== null) {
      patch.languageDetection = {
        ...config.languageDetection,
        providerId: detectionFallback,
      }
    }
    if (Object.keys(patch).length > 0) await setConfig(patch)
    await setProviders(remaining)
    const next = chooseNext(remaining)
    setSelected(next?.id)
  }

  const providerType = providerConfig.provider
  const hasTranslationModelFields = isTranslateProvider(providerType) && isLLMProvider(providerType)
  const hasAdvancedFields = isLLMProvider(providerType)
  const hasAssignments =
    hasAdvancedFields ||
    FEATURE_KEYS.some((key) => FEATURE_PROVIDER_DEFS[key].isProvider(providerType))

  return (
    <CustomProviderEditor.Provider
      providerConfig={providerConfig}
      form={form}
      duplicate={async () => {
        await duplicateProvider(providerConfig, providers, setProviders, setSelected)
      }}
      delete={handleDelete}
    >
      <ProviderEditor.Form>
        <EntityEditor.Root>
          <EntityEditor.Body>
            <ProviderEditor.ConfigHeader />
            <ProviderEditor.NameField />
            <ProviderEditor.DescriptionField />
            <ProviderEditor.ConnectionFields />
            <ProviderEditor.ProviderSpecificFields />
            {hasTranslationModelFields && <ProviderEditor.TranslationModelFields />}
            {hasAssignments && (
              <ProviderEditor.Assignments>
                <ProviderEditor.CompatibleFeatureAssignments />
                <ProviderEditor.LanguageDetectionAssignment />
              </ProviderEditor.Assignments>
            )}
            {hasAdvancedFields && <ProviderEditor.AdvancedFields />}
          </EntityEditor.Body>
          <EntityEditor.Footer>
            <ProviderEditor.DuplicateButton />
            <ProviderEditor.DeleteButton />
          </EntityEditor.Footer>
        </EntityEditor.Root>
      </ProviderEditor.Form>
    </CustomProviderEditor.Provider>
  )
}
