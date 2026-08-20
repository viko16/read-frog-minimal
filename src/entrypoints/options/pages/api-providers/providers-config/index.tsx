import type { APIProviderConfig } from "@/types/config/provider"
import { Icon } from "@iconify/react"
import { useAtom, useAtomValue, useSetAtom } from "jotai"
import { useEffect, useRef, useState } from "react"
import { useLocation } from "react-router"
import ProviderIcon from "@/components/provider-icon"
import { useTheme } from "@/components/providers/theme-provider"
import { SortableList } from "@/components/sortable-list"
import { Badge } from "@/components/ui/base-ui/badge"
import { Button } from "@/components/ui/base-ui/button"
import { Dialog, DialogTrigger } from "@/components/ui/base-ui/dialog"
import { anchoredToastManager } from "@/components/ui/base-ui/toast"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/base-ui/tooltip"
import { isAPIProvider, isAPIProviderConfig } from "@/types/config/provider"
import { configAtom, configFieldsAtomMap } from "@/utils/atoms/config"
import { providerConfigAtom } from "@/utils/atoms/provider"
import { getAPIProvidersConfig, getProviderConfigById } from "@/utils/config/helpers"
import {
  FEATURE_KEYS,
  FEATURE_PROVIDER_DEFS,
  getFeatureLabelI18nKey,
} from "@/utils/constants/feature-providers"
import { API_PROVIDER_ITEMS } from "@/utils/constants/providers"
import { i18n } from "@/utils/i18n"
import {
  getRequestedProviderId,
  getRequestedProviderType,
  PROVIDER_CONFIG_SECTION_ID,
  shouldHighlightApiKey,
} from "@/utils/navigation"
import { ConfigItem } from "../../../components/config-item"
import { EntityEditorLayout } from "../../../components/entity-editor-layout"
import { EntityListItem } from "../../../components/entity-list-item"
import { EntityListRail } from "../../../components/entity-list-rail"
import AddProviderDialog from "./add-provider-dialog"
import { highlightedProviderFieldAtom, selectedProviderIdAtom } from "./atoms"
import { ProviderConfigForm } from "./provider-config-form"
import { addProvider } from "./utils"

function useRequestedProvider() {
  const { search, key } = useLocation()
  const [providers, setProviders] = useAtom(configFieldsAtomMap.providersConfig)
  const setSelected = useSetAtom(selectedProviderIdAtom)
  const setHighlighted = useSetAtom(highlightedProviderFieldAtom)
  const handled = useRef<string | null>(null)

  useEffect(() => {
    const marker = `${key}:${search}`
    if (handled.current === marker) return
    const select = (id: string) => {
      handled.current = marker
      setSelected(id)
      if (shouldHighlightApiKey(search)) setHighlighted("apiKey")
    }

    const requestedId = getRequestedProviderId(search)
    if (requestedId) {
      if (getProviderConfigById(providers, requestedId)) select(requestedId)
      return
    }

    const requestedType = getRequestedProviderType(search)
    if (!requestedType || !isAPIProvider(requestedType)) return
    const existing = getAPIProvidersConfig(providers).find(
      (provider) => provider.provider === requestedType,
    )
    if (existing) {
      select(existing.id)
      return
    }

    handled.current = marker
    void addProvider(requestedType, providers, setProviders, setSelected).then(() => {
      if (shouldHighlightApiKey(search)) setHighlighted("apiKey")
    })
  }, [key, providers, search, setHighlighted, setProviders, setSelected])
}

export function ProvidersConfig() {
  useRequestedProvider()
  const selectedProviderId = useAtomValue(selectedProviderIdAtom)
  return (
    <ConfigItem
      id={PROVIDER_CONFIG_SECTION_ID}
      orientation="vertical"
      title={i18n.t("options.apiProviders.configTitle")}
      description={i18n.t("options.apiProviders.description")}
    >
      <EntityEditorLayout
        list={<ProviderCardList />}
        editor={<ProviderConfigForm key={selectedProviderId} />}
      />
    </ConfigItem>
  )
}

function ProviderCardList() {
  const [providers, setProviders] = useAtom(configFieldsAtomMap.providersConfig)
  const [isOpen, setIsOpen] = useState(false)
  const apiProviders = getAPIProvidersConfig(providers)

  const handleReorder = (ordered: APIProviderConfig[]) => {
    const orderedIds = new Set(ordered.map((provider) => provider.id))
    const nonApi = providers.filter((provider) => !isAPIProviderConfig(provider))
    const lateApi = providers.filter(
      (provider) => isAPIProviderConfig(provider) && !orderedIds.has(provider.id),
    )
    void setProviders([...nonApi, ...ordered, ...lateApi])
  }

  return (
    <div className="flex flex-col gap-4">
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogTrigger
          render={
            <Button
              variant="outline"
              className="h-auto rounded-xl border-dashed border-accent-blue bg-accent-blue/8 p-3"
            />
          }
        >
          <Icon icon="tabler:plus" className="size-4" />
          <span>{i18n.t("options.apiProviders.addProvider")}</span>
        </DialogTrigger>
        <AddProviderDialog onClose={() => setIsOpen(false)} />
      </Dialog>
      <EntityListRail>
        <SortableList
          list={apiProviders}
          setList={handleReorder}
          className="flex flex-col gap-4 pt-2"
          renderItem={(provider) => <ProviderCard provider={provider} />}
        />
      </EntityListRail>
    </div>
  )
}

function ProviderCard({ provider }: { provider: APIProviderConfig }) {
  const { theme } = useTheme()
  const config = useAtomValue(configAtom)
  const [selected, setSelected] = useAtom(selectedProviderIdAtom)
  const setProvider = useSetAtom(providerConfigAtom(provider.id))
  const switchRef = useRef<HTMLButtonElement>(null)
  const assignedFeatures = FEATURE_KEYS.filter(
    (key) => FEATURE_PROVIDER_DEFS[key].getProviderId(config) === provider.id,
  )
  const detectsLanguage =
    config.languageDetection.mode === "llm" && config.languageDetection.providerId === provider.id
  const assignmentCount = assignedFeatures.length + (detectsLanguage ? 1 : 0)

  const setEnabled = (enabled: boolean) => {
    if (!enabled && provider.enabled && assignmentCount > 0) {
      if (!switchRef.current) return
      anchoredToastManager.add({
        id: `provider-disable-${provider.id}`,
        positionerProps: { anchor: switchRef.current, sideOffset: 6 },
        type: "error",
        title: i18n.t("options.apiProviders.form.providerInUseCannotDisable", [
          provider.name,
          assignmentCount,
        ]),
      })
      return
    }
    void setProvider({ ...provider, enabled })
  }

  return (
    <EntityListItem.Root
      data-provider-id={provider.id}
      selected={selected === provider.id}
      onClick={() => setSelected(provider.id)}
    >
      <EntityListItem.Badges>
        {assignmentCount > 0 && (
          <div className="absolute -top-2 right-2">
            <Tooltip>
              <TooltipTrigger render={<Badge className="bg-blue-500" size="sm" />}>
                {i18n.t("options.apiProviders.badges.featureCount", [assignmentCount])}
              </TooltipTrigger>
              <TooltipContent>
                <ul className="list-inside list-disc">
                  {assignedFeatures.map((key) => (
                    <li key={key}>{i18n.t(getFeatureLabelI18nKey(key))}</li>
                  ))}
                  {detectsLanguage && (
                    <li>{i18n.t("options.apiProviders.languageDetection.title")}</li>
                  )}
                </ul>
              </TooltipContent>
            </Tooltip>
          </div>
        )}
      </EntityListItem.Badges>
      <EntityListItem.Content>
        <ProviderIcon
          logo={API_PROVIDER_ITEMS[provider.provider].logo(theme)}
          name={provider.name}
          size="base"
          textClassName="text-sm"
        />
        <EntityListItem.Toggle
          ref={switchRef}
          aria-label={provider.name}
          checked={provider.enabled}
          onCheckedChange={setEnabled}
        />
      </EntityListItem.Content>
    </EntityListItem.Root>
  )
}
