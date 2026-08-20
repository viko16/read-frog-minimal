import type { BackgroundGenerateTextPayload } from "@/types/background-generate-text"
import { generateText } from "ai"
import { isLLMProviderConfig } from "@/types/config/provider"
import { buildLocalGenerateTextParams } from "@/utils/providers/generate-params"
import { getLanguageModelForConfig } from "@/utils/providers/model"

export async function generateTextForProviderRef(
  payload: BackgroundGenerateTextPayload,
  options: { signal?: AbortSignal } = {},
): Promise<string> {
  const { providerRef, instructions, prompt, maxRetries } = payload

  if (!isLLMProviderConfig(providerRef.config)) {
    throw new Error(`Provider "${providerRef.config.id}" cannot generate text`)
  }

  const { text } = await generateText({
    model: getLanguageModelForConfig(providerRef.config),
    instructions,
    prompt,
    maxRetries: maxRetries ?? 0,
    abortSignal: options.signal,
    ...buildLocalGenerateTextParams(providerRef.config),
  })
  return text.trim()
}
