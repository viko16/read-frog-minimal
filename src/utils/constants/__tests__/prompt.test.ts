import { describe, expect, it } from "vitest"
import {
  BUILT_IN_PAGE_TRANSLATE_PROMPTS,
  DEFAULT_TRANSLATE_PROMPTS_CONFIG,
  PRECISION_REWRITE_TRANSLATE_SYSTEM_PROMPT,
} from "../prompt"

describe("built-in translation prompts", () => {
  it("uses default as the real persisted webpage selection", () => {
    expect(DEFAULT_TRANSLATE_PROMPTS_CONFIG).toEqual({ promptId: "default", patterns: [] })
  })

  it("registers only the intended webpage built-ins", () => {
    expect(Object.keys(BUILT_IN_PAGE_TRANSLATE_PROMPTS)).toEqual(["default", "precision-rewrite"])
  })

  it("keeps precision self-review silent and final-output-only", () => {
    expect(PRECISION_REWRITE_TRANSLATE_SYSTEM_PROMPT).toContain(
      "Perform these steps internally without revealing them",
    )
    expect(PRECISION_REWRITE_TRANSLATE_SYSTEM_PROMPT).toContain(
      "Never output analysis, reasoning, drafts, diagnoses, issue lists, or commentary",
    )
    expect(PRECISION_REWRITE_TRANSLATE_SYSTEM_PROMPT).not.toContain("List all issues")
    expect(PRECISION_REWRITE_TRANSLATE_SYSTEM_PROMPT).not.toContain("brief clarification")
  })
})
