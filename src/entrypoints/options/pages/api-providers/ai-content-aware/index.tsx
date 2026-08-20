import { useAtom, useAtomValue } from "jotai"
import { Switch } from "@/components/ui/base-ui/switch"
import { isLLMProviderConfig } from "@/types/config/provider"
import { configFieldsAtomMap } from "@/utils/atoms/config"
import { i18n } from "@/utils/i18n"
import { resolveProviderRefForCapability } from "@/utils/providers/provider-registry"
import { ConfigItem } from "../../../components/config-item"
import { ConfigSection } from "../../../components/config-section"

export function AIContentAwareConfig() {
  const [pageTranslation, setPageTranslation] = useAtom(configFieldsAtomMap.pageTranslation)
  const providers = useAtomValue(configFieldsAtomMap.providersConfig)
  const selected = resolveProviderRefForCapability(
    "pageTranslation",
    providers,
    pageTranslation.providerId,
  )
  const hasLLMProvider = !!selected && isLLMProviderConfig(selected.config)

  return (
    <ConfigSection
      id="ai-content-aware"
      title={i18n.t("options.apiProviders.aiContentAware.title")}
    >
      <ConfigItem
        title={i18n.t("options.apiProviders.aiContentAware.enable")}
        description={
          <>
            {i18n.t("options.apiProviders.aiContentAware.enableDescription")}
            <span className="mt-2 flex items-center gap-1.5">
              <span
                className={`size-2 rounded-full ${hasLLMProvider ? "bg-green-500" : "bg-orange-400"}`}
              />
              <span className="text-xs">
                {i18n.t(
                  hasLLMProvider
                    ? "options.apiProviders.aiContentAware.llmProviderConfigured"
                    : "options.apiProviders.aiContentAware.llmProviderNotConfigured",
                  [i18n.t("options.apiProviders.featureProviders.features.pageTranslation")],
                )}
              </span>
            </span>
          </>
        }
      >
        <Switch
          checked={pageTranslation.enableAIContentAware}
          disabled={!hasLLMProvider}
          onCheckedChange={(enabled) => void setPageTranslation({ enableAIContentAware: enabled })}
        />
      </ConfigItem>
    </ConfigSection>
  )
}
