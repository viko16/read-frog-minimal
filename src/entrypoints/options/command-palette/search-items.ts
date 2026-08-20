import type { GeneratedI18nStructure } from "#i18n"

type I18nKey = keyof GeneratedI18nStructure

export interface SearchItem {
  sectionId: string
  route: string
  titleKey: string
  descriptionKey?: string
  pageKey: string
}

const items: Array<{
  sectionId: string
  route: string
  titleKey: I18nKey
  descriptionKey?: I18nKey
  pageKey: I18nKey
}> = [
  {
    sectionId: "theme",
    route: "/preference",
    titleKey: "options.preference.appearanceAndLanguage.title",
    descriptionKey: "options.preference.appearanceAndLanguage.theme.description",
    pageKey: "options.preference.title",
  },
  {
    sectionId: "interface-language",
    route: "/preference",
    titleKey: "options.preference.appearanceAndLanguage.interfaceLanguage.title",
    descriptionKey: "options.preference.appearanceAndLanguage.interfaceLanguage.description",
    pageKey: "options.preference.title",
  },
  {
    sectionId: "translation-source-language",
    route: "/preference",
    titleKey: "options.preference.translationLanguage.sourceCode.title",
    descriptionKey: "options.preference.translationLanguage.sourceCode.description",
    pageKey: "options.preference.title",
  },
  {
    sectionId: "translation-target-language",
    route: "/preference",
    titleKey: "options.preference.translationLanguage.targetCode.title",
    descriptionKey: "options.preference.translationLanguage.targetCode.description",
    pageKey: "options.preference.title",
  },
  {
    sectionId: "site-control-mode",
    route: "/preference/extension-activation",
    titleKey: "options.preference.extensionActivation.mode.title",
    descriptionKey: "options.preference.extensionActivation.mode.description",
    pageKey: "options.preference.title",
  },
  {
    sectionId: "manual-config-sync",
    route: "/preference",
    titleKey: "options.preference.config.manualSync.title",
    descriptionKey: "options.preference.config.manualSync.description",
    pageKey: "options.preference.title",
  },
  {
    sectionId: "config-backup",
    route: "/preference/config-backup",
    titleKey: "options.preference.config.backup.title",
    descriptionKey: "options.preference.config.backup.description",
    pageKey: "options.preference.title",
  },
  {
    sectionId: "reset-config",
    route: "/preference",
    titleKey: "options.preference.config.reset.title",
    descriptionKey: "options.preference.config.reset.description",
    pageKey: "options.preference.title",
  },
  {
    sectionId: "page-translation-shortcut",
    route: "/shortcuts",
    titleKey: "options.shortcuts.pageTranslation.title",
    descriptionKey: "options.shortcuts.pageTranslation.description",
    pageKey: "options.shortcuts.title",
  },
  {
    sectionId: "translation-mode-shortcut",
    route: "/shortcuts",
    titleKey: "options.shortcuts.translationMode.title",
    descriptionKey: "options.shortcuts.translationMode.description",
    pageKey: "options.shortcuts.title",
  },
  {
    sectionId: "node-translation-hotkey",
    route: "/shortcuts",
    titleKey: "options.shortcuts.nodeTranslation.title",
    descriptionKey: "options.shortcuts.nodeTranslation.description",
    pageKey: "options.shortcuts.title",
  },
  {
    sectionId: "provider-config",
    route: "/api-providers",
    titleKey: "options.apiProviders.configTitle",
    descriptionKey: "options.apiProviders.description",
    pageKey: "options.apiProviders.title",
  },
  {
    sectionId: "feature-providers",
    route: "/api-providers",
    titleKey: "options.apiProviders.featureProviders.title",
    descriptionKey: "options.apiProviders.featureProviders.description",
    pageKey: "options.apiProviders.title",
  },
  {
    sectionId: "language-detection",
    route: "/api-providers",
    titleKey: "options.apiProviders.languageDetection.title",
    descriptionKey: "options.apiProviders.languageDetection.description",
    pageKey: "options.apiProviders.title",
  },
  {
    sectionId: "ai-content-aware",
    route: "/api-providers",
    titleKey: "options.apiProviders.aiContentAware.title",
    descriptionKey: "options.apiProviders.aiContentAware.description",
    pageKey: "options.apiProviders.title",
  },
  {
    sectionId: "translation-mode",
    route: "/page-translation",
    titleKey: "options.translation.preference.translationMode.title",
    descriptionKey: "options.translation.preference.translationMode.description",
    pageKey: "options.translation.title",
  },
  {
    sectionId: "translate-range",
    route: "/page-translation",
    titleKey: "options.translation.preference.translateRange.title",
    descriptionKey: "options.translation.preference.translateRange.description",
    pageKey: "options.translation.title",
  },
  {
    sectionId: "hover-translation",
    route: "/page-translation",
    titleKey: "options.translation.hoverTranslation.title",
    descriptionKey: "options.translation.hoverTranslation.enable.description",
    pageKey: "options.translation.title",
  },
  {
    sectionId: "translation-style",
    route: "/page-translation",
    titleKey: "options.translation.translationStyle.title",
    descriptionKey: "options.translation.translationStyle.description",
    pageKey: "options.translation.title",
  },
  {
    sectionId: "custom-css",
    route: "/page-translation/custom-css",
    titleKey: "options.translation.translationStyle.cssEditor",
    descriptionKey: "options.translation.translationStyle.cssEditorDescription",
    pageKey: "options.translation.title",
  },
  {
    sectionId: "personalized-prompts",
    route: "/page-translation/prompts",
    titleKey: "options.translation.personalizedPrompts.title",
    descriptionKey: "options.translation.personalizedPrompts.description",
    pageKey: "options.translation.title",
  },
  {
    sectionId: "auto-translate-website",
    route: "/page-translation/translation-control/auto-translate-websites",
    titleKey: "options.translation.translationControl.autoTranslateWebsite.title",
    descriptionKey: "options.translation.translationControl.autoTranslateWebsite.description",
    pageKey: "options.translation.title",
  },
  {
    sectionId: "never-auto-translate-website",
    route: "/page-translation/translation-control/never-auto-translate-websites",
    titleKey: "options.translation.translationControl.neverAutoTranslateWebsite.title",
    descriptionKey: "options.translation.translationControl.neverAutoTranslateWebsite.description",
    pageKey: "options.translation.title",
  },
  {
    sectionId: "auto-translate-languages",
    route: "/page-translation/translation-control",
    titleKey: "options.translation.translationControl.autoTranslateLanguages.title",
    descriptionKey: "options.translation.translationControl.autoTranslateLanguages.description",
    pageKey: "options.translation.title",
  },
  {
    sectionId: "skip-languages",
    route: "/page-translation/translation-control",
    titleKey: "options.translation.translationControl.skipLanguages.title",
    descriptionKey: "options.translation.translationControl.skipLanguages.description",
    pageKey: "options.translation.title",
  },
  {
    sectionId: "request-rate",
    route: "/page-translation/translation-queue",
    titleKey: "options.translation.translationQueue.requestQueueConfig.title",
    pageKey: "options.translation.title",
  },
  {
    sectionId: "request-batch",
    route: "/page-translation/translation-queue",
    titleKey: "options.translation.translationQueue.batchQueueConfig.title",
    descriptionKey: "options.translation.translationQueue.batchQueueConfig.description",
    pageKey: "options.translation.title",
  },
  {
    sectionId: "site-rules-user-rules",
    route: "/page-translation/translation-control/site-rules",
    titleKey: "options.siteRules.userRules.title",
    descriptionKey: "options.siteRules.userRules.description",
    pageKey: "options.translation.title",
  },
  {
    sectionId: "clear-cache",
    route: "/page-translation",
    titleKey: "options.translation.cache.clearCache.title",
    descriptionKey: "options.translation.cache.clearCache.description",
    pageKey: "options.translation.title",
  },
]

export const SEARCH_ITEMS: SearchItem[] = items
