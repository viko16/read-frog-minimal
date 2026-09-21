import { describe, expect, it } from "vitest"
import { DEFAULT_CONFIG } from "@/utils/constants/config"
import {
  DEFAULT_BATCH_TRANSLATE_PROMPT,
  DEFAULT_SENTINEL_TRANSLATE_PROMPT,
  isNoTranslationSentinel,
  NO_TRANSLATION_SENTINEL,
} from "@/utils/constants/prompt"
import { HTML_ATTRIBUTE_MARKER } from "@/utils/host/translate/html-attribute-markers"
import { getTranslatePromptFromConfig } from "../translate"

const defaultTranslatePromptConfig = DEFAULT_CONFIG.pageTranslation

describe("no-translation sentinel", () => {
  it.each(["Simplified Chinese", "English", "Japanese"])(
    "substitutes %s while separating preserved tokens from foreign prose",
    (targetLanguage) => {
      const result = getTranslatePromptFromConfig(
        defaultTranslatePromptConfig,
        targetLanguage,
        "Hi",
        { isBatch: true },
      )
      expect(result.systemPrompt).toContain("Already-translated Input Rule")
      expect(result.systemPrompt).toContain(NO_TRANSLATION_SENTINEL)
      expect(result.systemPrompt).toContain("differ from " + targetLanguage)
      expect(result.systemPrompt).not.toContain("{{targetLanguage}}")
      expect(result.systemPrompt).toContain("names, brands, handles, URLs, numbers, or code")
      expect(result.systemPrompt).toContain(
        "A foreign-language phrase or clause must be translated",
      )
    },
  )

  it("keeps the marker out of the batch examples and non-batch prompts", () => {
    expect(DEFAULT_BATCH_TRANSLATE_PROMPT).not.toContain(NO_TRANSLATION_SENTINEL)
    expect(DEFAULT_SENTINEL_TRANSLATE_PROMPT.split("\n")).toHaveLength(2)
    const result = getTranslatePromptFromConfig(defaultTranslatePromptConfig, "English", "Hi")
    expect(result.systemPrompt).not.toContain(NO_TRANSLATION_SENTINEL)
  })

  it("matches only a full trimmed sentinel segment", () => {
    expect(isNoTranslationSentinel(NO_TRANSLATION_SENTINEL)).toBe(true)
    expect(isNoTranslationSentinel("  " + NO_TRANSLATION_SENTINEL + "\n")).toBe(true)
    expect(isNoTranslationSentinel("text " + NO_TRANSLATION_SENTINEL)).toBe(false)
    expect(isNoTranslationSentinel("{{NO_TRANSLATION")).toBe(false)
    expect(isNoTranslationSentinel("")).toBe(false)
  })
})

describe("page translation placeholder prompts", () => {
  it("appends placeholder rules only when the input carries an inline atom token", () => {
    const withToken = getTranslatePromptFromConfig(
      defaultTranslatePromptConfig,
      "Chinese",
      "Let {{0}} be the mean.",
    )
    expect(withToken.systemPrompt).toContain("## Protected Placeholder Rules")
    expect(withToken.systemPrompt).toContain("may move within its segment")
    expect(withToken.systemPrompt).not.toMatch(/Rules[\s\S]*\{\{\d+\}\}/)

    const without = getTranslatePromptFromConfig(
      defaultTranslatePromptConfig,
      "Chinese",
      "Let x be the mean.",
    )
    expect(without.systemPrompt).not.toContain("## Protected Placeholder Rules")
    // Byte-identical to the pre-feature prompt: the LLM cache hash of every
    // paragraph without atoms must not change.
    expect(without.systemPrompt).toBe(
      getTranslatePromptFromConfig(defaultTranslatePromptConfig, "Chinese", "other").systemPrompt,
    )
  })

  it.each([
    ["the no-translation sentinel", `Prefix ${NO_TRANSLATION_SENTINEL}`],
    ["a template literal with spaces", "Use {{ count }} in the template"],
    ["a named prompt token", "Translate {{input}} please"],
    ["a single-brace literal", "Format {0} here"],
  ])("does not append placeholder rules for %s", (_case, input) => {
    const result = getTranslatePromptFromConfig(defaultTranslatePromptConfig, "Chinese", input)

    expect(result.systemPrompt).not.toContain("## Protected Placeholder Rules")
  })

  it("orders placeholder rules after marker and batch rules", () => {
    const input = `<span ${HTML_ATTRIBUTE_MARKER}="0">First {{0}}</span>\n\n%%\n\nSecond {{0}}`

    const result = getTranslatePromptFromConfig(defaultTranslatePromptConfig, "French", input, {
      isBatch: true,
    })

    const batchRulesIndex = result.systemPrompt.indexOf("## Multi-paragraph Translation Rules")
    const markerRulesIndex = result.systemPrompt.indexOf("## Protected HTML Marker Rules")
    const placeholderRulesIndex = result.systemPrompt.indexOf("## Protected Placeholder Rules")
    expect(batchRulesIndex).toBeGreaterThan(-1)
    expect(markerRulesIndex).toBeGreaterThan(batchRulesIndex)
    expect(placeholderRulesIndex).toBeGreaterThan(markerRulesIndex)
  })
})
