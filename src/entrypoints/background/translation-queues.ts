import type { Config } from "@/types/config/config"
import type {
  BatchQueueConfig,
  RequestQueueConfig,
  TranslationTextFormat,
} from "@/types/config/translate"
import type { WebPagePromptContext } from "@/types/content"
import type { PromptResolver } from "@/utils/host/translate/api/ai"
import type { SerializableProviderRef } from "@/utils/providers/provider-ref"
import { browser, storage } from "#imports"
import { isLLMProviderConfig } from "@/types/config/provider"
import { CONFIG_STORAGE_KEY, DEFAULT_CONFIG } from "@/utils/constants/config"
import { BATCH_SEPARATOR, BATCH_SEPARATOR_LINE_PATTERN } from "@/utils/constants/prompt"
import {
  BATCH_TIMEOUT_BASE_MS,
  BATCH_TIMEOUT_PER_CHAR_MS,
  MAX_BATCH_TIMEOUT_MS,
} from "@/utils/constants/translate"
import { generateArticleSummary } from "@/utils/content/summary"
import { cleanText } from "@/utils/content/utils"
import { db } from "@/utils/db/dexie/db"
import { Sha256Hex } from "@/utils/hash"
import { executeTranslate } from "@/utils/host/translate/execute-translate"
import {
  assertHtmlAttributeMarkerIntegrity,
  hasHtmlAttributeMarkerProtocol,
  isHtmlAttributeMarkerIntegrityError,
} from "@/utils/host/translate/html-attribute-markers"
import { normalizePromptContextValue } from "@/utils/host/translate/translate-text"
import { logger } from "@/utils/logger"
import { onMessage } from "@/utils/message"
import { getTranslatePrompt } from "@/utils/prompts/translate"
import { getProviderCacheIdentity } from "@/utils/providers/provider-ref"
import { BatchQueue } from "@/utils/request/batch-queue"
import { CancelledScopeRegistry, TranslationCancelledError } from "@/utils/request/cancellation"
import { RequestQueue } from "@/utils/request/request-queue"
import { generateTextForProviderRef } from "./background-stream"
import { ensureInitializedConfig } from "./config"

interface ExecuteOptions<TContext> {
  isBatch?: boolean
  context?: TContext
  textFormat?: TranslationTextFormat
  preserveLineBreaks?: boolean
  signal?: AbortSignal
}

async function executeQueuedTranslation<TContext>(
  text: string,
  langConfig: Config["language"],
  providerRef: SerializableProviderRef,
  promptResolver: PromptResolver<TContext>,
  options: ExecuteOptions<TContext> = {},
): Promise<string> {
  return executeTranslate(text, langConfig, providerRef.config, promptResolver, options)
}

export function parseBatchResult(result: string): string[] {
  return result
    .trim()
    .split(BATCH_SEPARATOR_LINE_PATTERN)
    .map((text) => text.trim())
}

export function shouldUseBatchQueue(providerRef: SerializableProviderRef): boolean {
  return isLLMProviderConfig(providerRef.config)
}

async function getValidatedCachedTranslation(
  hash: string,
  sourceText: string,
  validateHtmlAttributeMarkers: boolean,
): Promise<string | undefined> {
  const cached = await db.translationCache.get(hash)
  if (!cached) return undefined
  if (!validateHtmlAttributeMarkers) return cached.translation

  try {
    assertHtmlAttributeMarkerIntegrity(sourceText, cached.translation)
    return cached.translation
  } catch (error) {
    if (!isHtmlAttributeMarkerIntegrityError(error)) throw error
    await db.translationCache.delete(hash)
    logger.warn("Deleted cached translation with invalid HTML attribute markers", error)
    return undefined
  }
}

interface TranslateBatchData<TContext = unknown> {
  text: string
  langConfig: Config["language"]
  providerRef: SerializableProviderRef
  hash: string
  scheduleAt: number
  context?: TContext
  scope?: string
}

export async function executeBatchTranslation<TContext>(
  dataList: TranslateBatchData<TContext>[],
  promptResolver: PromptResolver<TContext>,
  signal?: AbortSignal,
): Promise<string[]> {
  const first = dataList[0]!
  const batchText = dataList.map((data) => data.text).join(`\n\n${BATCH_SEPARATOR}\n\n`)
  const result = await executeQueuedTranslation(
    batchText,
    first.langConfig,
    first.providerRef,
    promptResolver,
    { isBatch: true, context: first.context, signal },
  )
  return parseBatchResult(result)
}

async function getOrGenerateSummary(args: {
  title: string
  textContent: string
  providerRef: SerializableProviderRef
  requestQueue: RequestQueue
}): Promise<string | null> {
  const preparedText = cleanText(args.textContent)
  if (!preparedText) return null

  const cacheKey = Sha256Hex(
    args.title,
    Sha256Hex(preparedText),
    getProviderCacheIdentity(args.providerRef),
  )
  const cached = await db.articleSummaryCache.get(cacheKey)
  if (cached) return cached.summary

  const thunk = async (signal?: AbortSignal) => {
    const cachedAgain = await db.articleSummaryCache.get(cacheKey)
    if (cachedAgain) return cachedAgain.summary
    const summary = await generateArticleSummary(args.title, args.textContent, args.providerRef, {
      signal,
      generate: generateTextForProviderRef,
    })
    if (!summary) return ""
    await db.articleSummaryCache.put({
      key: cacheKey,
      summary,
      createdAt: new Date(),
    })
    return summary
  }

  try {
    return (await args.requestQueue.enqueue(thunk, Date.now(), cacheKey)) || null
  } catch (error) {
    logger.warn("Failed to get/generate summary:", error)
    return null
  }
}

export function buildTranslationScopeKey(
  sender: { tab?: { id?: number } } | undefined,
  sessionId: string | undefined,
): string | undefined {
  const tabId = sender?.tab?.id
  return typeof tabId === "number" && sessionId ? `${tabId}:${sessionId}` : undefined
}

interface QueueSetupConfig<TContext> {
  requestQueueConfig: RequestQueueConfig
  batchQueueConfig: BatchQueueConfig
  promptResolver: PromptResolver<TContext>
  isScopeCancelled: (scopeKey: string) => boolean
  configSource: "user" | "default"
}

function createTranslationQueues<TContext>(config: QueueSetupConfig<TContext>) {
  const requestQueue = new RequestQueue({
    ...config.requestQueueConfig,
    timeoutMs: 20_000,
    maxRetries: 2,
    baseRetryDelayMs: 1_000,
  })
  const batchQueue = new BatchQueue<TranslateBatchData<TContext>, string>({
    ...config.batchQueueConfig,
    batchDelay: 100,
    maxRetries: 3,
    enableFallbackToIndividual: true,
    dispatchGate: { nextDispatchEtaMs: () => requestQueue.nextDispatchEtaMs() },
    getBatchKey: (data) =>
      Sha256Hex(
        `${data.langConfig.sourceCode}-${data.langConfig.targetCode}-${data.providerRef.config.id}`,
        data.context ? JSON.stringify(data.context) : "",
      ),
    getCharacters: (data) => data.text.length,
    getDedupKey: (data) => data.hash,
    getScope: (data) => data.scope,
    isScopeCancelled: config.isScopeCancelled,
    executeBatch: async (dataList, meta) => {
      const hash = Sha256Hex(...dataList.map((data) => data.hash))
      const scheduleAt = Math.min(...dataList.map((data) => data.scheduleAt))
      const characters = dataList.reduce((sum, data) => sum + data.text.length, 0)
      const timeoutMs = Math.min(
        BATCH_TIMEOUT_BASE_MS + characters * BATCH_TIMEOUT_PER_CHAR_MS,
        MAX_BATCH_TIMEOUT_MS,
      )
      return requestQueue.enqueue(
        (signal) => executeBatchTranslation(dataList, config.promptResolver, signal),
        scheduleAt,
        hash,
        meta.scopes,
        { timeoutMs },
      )
    },
    executeIndividual: (data) =>
      requestQueue.enqueue(
        (signal) =>
          executeQueuedTranslation(
            data.text,
            data.langConfig,
            data.providerRef,
            config.promptResolver,
            { context: data.context, signal },
          ),
        data.scheduleAt,
        data.hash,
        data.scope ? [data.scope] : undefined,
      ),
    onError: (error, context) => {
      logger.error(
        `${context.isFallback ? "Individual" : "Batch"} request failed (${context.batchKey}):`,
        error.message,
      )
    },
  })

  logger.info("[translation-queues] webpage queue initialized", {
    ...config.requestQueueConfig,
    ...config.batchQueueConfig,
    configSource: config.configSource,
  })
  return { requestQueue, batchQueue }
}

const selectQueueConfig = (config: Config) => ({
  requestQueueConfig: config.pageTranslation.requestQueueConfig,
  batchQueueConfig: config.pageTranslation.batchQueueConfig,
})

async function loadQueueConfig() {
  try {
    const config = await ensureInitializedConfig()
    if (config) return { ...selectQueueConfig(config), configSource: "user" as const }
  } catch (error) {
    logger.error("[translation-queues] failed to load user config", error)
  }
  return { ...selectQueueConfig(DEFAULT_CONFIG), configSource: "default" as const }
}

export function setUpWebPageTranslationQueue(): void {
  const cancelledScopes = new CancelledScopeRegistry()
  type PromptContext = WebPagePromptContext
  const queuesPromise = loadQueueConfig().then((config) =>
    createTranslationQueues<PromptContext>({
      ...config,
      promptResolver: getTranslatePrompt,
      isScopeCancelled: (scope) => cancelledScopes.has(scope),
    }),
  )

  let lastAppliedJson: string | null = null
  storage.watch<Config>(`local:${CONFIG_STORAGE_KEY}`, (config) => {
    if (!config) return
    void queuesPromise.then(({ requestQueue, batchQueue }) => {
      const selected = selectQueueConfig(config)
      const json = JSON.stringify(selected)
      if (json === lastAppliedJson) return
      requestQueue.setQueueOptions(selected.requestQueueConfig)
      batchQueue.setBatchConfig(selected.batchQueueConfig)
      lastAppliedJson = json
    })
  })

  onMessage("enqueueTranslateRequest", async (message) => {
    const { requestQueue, batchQueue } = await queuesPromise
    const {
      text,
      langConfig,
      providerRef,
      scheduleAt,
      hash,
      textFormat,
      preserveLineBreaks,
      webTitle,
      webDescription,
      webContent,
      webSummary,
      sessionId,
      forceRetranslation = false,
    } = message.data
    const scope = buildTranslationScopeKey(message.sender, sessionId)
    const validateMarkers = textFormat === "html" && hasHtmlAttributeMarkerProtocol(text)
    if (validateMarkers) assertHtmlAttributeMarkerIntegrity(text, text)

    if (hash && !forceRetranslation) {
      const cached = await getValidatedCachedTranslation(hash, text, validateMarkers)
      if (cached !== undefined) return cached
    }
    if (scope && cancelledScopes.has(scope)) throw new TranslationCancelledError(scope)

    const context: PromptContext = {
      webTitle: normalizePromptContextValue(webTitle),
      webDescription: normalizePromptContextValue(webDescription),
      webContent: normalizePromptContextValue(webContent),
      webSummary: normalizePromptContextValue(webSummary),
    }

    const result = shouldUseBatchQueue(providerRef)
      ? await batchQueue.enqueue({
          text,
          langConfig,
          providerRef,
          hash,
          scheduleAt,
          context,
          scope,
        })
      : await requestQueue.enqueue(
          (signal) =>
            executeTranslate(text, langConfig, providerRef.config, getTranslatePrompt, {
              textFormat,
              preserveLineBreaks,
              signal,
            }),
          scheduleAt,
          hash,
          scope ? [scope] : undefined,
        )

    if (validateMarkers) assertHtmlAttributeMarkerIntegrity(text, result)
    if (result && hash) {
      await db.translationCache.put({ key: hash, translation: result, createdAt: new Date() })
    }
    return result
  })

  onMessage("getOrGenerateWebPageSummary", async (message) => {
    const { webTitle, webContent, providerRef } = message.data
    if (!webTitle || !webContent) return null
    const { requestQueue } = await queuesPromise
    return getOrGenerateSummary({
      title: webTitle,
      textContent: webContent,
      providerRef,
      requestQueue,
    })
  })

  onMessage("cancelPageTranslationRequests", async (message) => {
    const scope = buildTranslationScopeKey(message.sender, message.data.sessionId)
    if (!scope) return
    cancelledScopes.markScope(scope)
    const { requestQueue, batchQueue } = await queuesPromise
    batchQueue.cancelByScope(scope)
    requestQueue.cancelByScope(scope)
  })

  browser.tabs.onRemoved.addListener((tabId) => {
    const prefix = `${tabId}:`
    cancelledScopes.markPrefix(prefix)
    void queuesPromise.then(({ requestQueue, batchQueue }) => {
      batchQueue.cancelWhere((scope) => scope.startsWith(prefix))
      requestQueue.cancelWhere((scope) => scope.startsWith(prefix))
    })
  })
}
