import { deepmerge } from "deepmerge-ts"
import { useAtom, useAtomValue } from "jotai"
import { HelpTooltip } from "@/components/help-tooltip"
import { Switch } from "@/components/ui/base-ui/switch"
import { isLLMProviderConfig } from "@/types/config/provider"
import { configFieldsAtomMap } from "@/utils/atoms/config"
import { i18n } from "@/utils/i18n"
import { resolveProviderRefForCapability } from "@/utils/providers/provider-registry"

export function AISmartContext() {
  const [translateConfig, setTranslateConfig] = useAtom(configFieldsAtomMap.pageTranslation)
  const providers = useAtomValue(configFieldsAtomMap.providersConfig)
  const selected = resolveProviderRefForCapability(
    "pageTranslation",
    providers,
    translateConfig.providerId,
  )
  const enabled = !!selected && isLLMProviderConfig(selected.config)

  return (
    <div className="flex items-center justify-between gap-2">
      <span className="flex items-center gap-1.5 text-[13px] font-medium">
        {i18n.t("popup.aiSmartContext")}
        <HelpTooltip>{i18n.t("popup.aiSmartContextDescription")}</HelpTooltip>
      </span>
      <Switch
        checked={translateConfig.enableAIContentAware}
        disabled={!enabled}
        onCheckedChange={(checked) =>
          setTranslateConfig(deepmerge(translateConfig, { enableAIContentAware: checked }))
        }
      />
    </div>
  )
}
