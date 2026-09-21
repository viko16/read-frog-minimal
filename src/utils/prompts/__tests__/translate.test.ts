import { describe, expect, it } from "vitest"
import { DEFAULT_CONFIG } from "@/utils/constants/config"
import { NO_TRANSLATION_SENTINEL } from "@/utils/constants/prompt"
import { HTML_ATTRIBUTE_MARKER } from "@/utils/host/translate/html-attribute-markers"
import { getTranslatePromptFromConfig } from "../translate"

const defaultTranslatePromptConfig = DEFAULT_CONFIG.pageTranslation

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
