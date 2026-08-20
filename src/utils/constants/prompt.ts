export const WEB_PAGE_PROMPT_TOKENS = [
  "targetLanguage",
  "input",
  "webTitle",
  "webDescription",
  "webContent",
  "webSummary",
] as const
export const TOKENS = WEB_PAGE_PROMPT_TOKENS

/**
 * Separator used to distinguish multiple text segments in batch translation.
 * It is used to differentiate different text paragraphs when merging multiple translation tasks into a single request.
 */
export const BATCH_SEPARATOR = "%%"
export const BATCH_SEPARATOR_LINE_PATTERN = /\r?\n[ \t]*%%[ \t]*\r?\n/

/**
 * Marker an LLM outputs instead of a translation when the input paragraph is
 * already entirely in the target language. Cached RAW (the background cache
 * only stores truthy results); mapped to "" content-side in translateTextCore.
 * The literal deliberately looks like a prompt token: replaceTokens only
 * substitutes the known tokens, so it survives prompt assembly verbatim.
 */
export const NO_TRANSLATION_SENTINEL = "{{NO_TRANSLATION_NEEDED}}"

export function isNoTranslationSentinel(text: string): boolean {
  return text.trim() === NO_TRANSLATION_SENTINEL
}

export const TARGET_LANGUAGE = WEB_PAGE_PROMPT_TOKENS[0]
export const INPUT = WEB_PAGE_PROMPT_TOKENS[1]
export const WEB_TITLE = WEB_PAGE_PROMPT_TOKENS[2]
export const WEB_DESCRIPTION = WEB_PAGE_PROMPT_TOKENS[3]
export const WEB_CONTENT = WEB_PAGE_PROMPT_TOKENS[4]
export const WEB_SUMMARY = WEB_PAGE_PROMPT_TOKENS[5]

export const getTokenCellText = (token: string) => `{{${token}}}`

export const DEFAULT_TRANSLATE_SYSTEM_PROMPT = `You are a professional ${getTokenCellText(TARGET_LANGUAGE)} native translator who needs to fluently translate text into ${getTokenCellText(TARGET_LANGUAGE)}.

## Translation Rules
1. Output only the translated content, without explanations or additional content (such as "Here's the translation:" or "Translation as follows:")
2. The returned translation must maintain exactly the same number of paragraphs and format as the original text.
3. If the text contains HTML tags, consider where the tags should be placed in the translation while maintaining fluency.
4. For content that should not be translated (such as proper nouns, code, etc.), keep the original text.

## Document Metadata for Context Awareness
Webpage title: ${getTokenCellText(WEB_TITLE)}
Webpage summary: ${getTokenCellText(WEB_SUMMARY)}`

export const DEFAULT_TRANSLATE_PROMPT = `Translate to ${getTokenCellText(TARGET_LANGUAGE)}:


${getTokenCellText(INPUT)}`

export const PRECISION_REWRITE_TRANSLATE_SYSTEM_PROMPT = `# Role: Elite Translator and Rewriting Expert
You are a ${getTokenCellText(TARGET_LANGUAGE)} native expert who masters the philosophy of "Translation as Rewriting." Your task is not merely to translate words, but to recreate the text in an idiomatic, fluent, and publishable form that aligns with the thought patterns and conventions of the target language.

## Core Strategies
1. **Meaning over Form**: Deeply understand the original logic. Break free from the source language's syntactic constraints. Reconstruct the content using sentence structure and word order that feel natural in ${getTokenCellText(TARGET_LANGUAGE)}.
2. **Eradicate Translationese**: Proactively avoid overuse of passive voice, redundant conjunctions, and stacked abstract nouns. The result should read as naturally as a native composition.
3. **Handle Terminology Precisely**: Use established, authoritative translations for academic and technical terms. If no established translation exists, retain the original term without adding an explanation. Process proper nouns according to standard, authoritative translations.
4. **Preserve Format and Untranslatables**: Fully retain the original paragraph structure, headings, lists, placeholders, code, URLs, HTML tags, proper nouns, and other content that should not be translated. Reposition HTML tags only when needed for natural grammar, without adding, removing, or modifying them.

## Output Rules
1. **Output Translation Only**: Provide only the final translated result. Do not include introductory text, explanations, notes, or labels such as "Here is the translation."
2. **Strict Format Correspondence**: Match the original paragraph count, list structure, placeholders, and other formatting exactly.
3. **Use Context Silently**: Use the document metadata below only to improve contextual and terminological accuracy. Never mention it in the output.

## Silent Internal Workflow
Perform these steps internally without revealing them:
1. Comprehend the source and produce a fluent internal draft.
2. Silently review that draft for mistranslations, omissions, translationese, formatting errors, and inaccurate terminology.
3. Correct every issue and output only the polished final translation.

Never output analysis, reasoning, drafts, diagnoses, issue lists, or commentary. Output only the final translation.

## Document Metadata for Context Awareness
Webpage title: ${getTokenCellText(WEB_TITLE)}
Webpage summary: ${getTokenCellText(WEB_SUMMARY)}`

export const PRECISION_REWRITE_TRANSLATE_PROMPT = `Translate to ${getTokenCellText(TARGET_LANGUAGE)}:


${getTokenCellText(INPUT)}`

/**
 * Stable persisted ids for code-owned webpage translation prompts. `default`
 * describes product behavior, not an experiment cohort.
 */
export const DEFAULT_TRANSLATE_PROMPT_ID = "default"
export const PRECISION_REWRITE_TRANSLATE_PROMPT_ID = "precision-rewrite"

export const BUILT_IN_PAGE_TRANSLATE_PROMPTS = {
  [DEFAULT_TRANSLATE_PROMPT_ID]: {
    id: DEFAULT_TRANSLATE_PROMPT_ID,
    systemPrompt: DEFAULT_TRANSLATE_SYSTEM_PROMPT,
    prompt: DEFAULT_TRANSLATE_PROMPT,
  },
  [PRECISION_REWRITE_TRANSLATE_PROMPT_ID]: {
    id: PRECISION_REWRITE_TRANSLATE_PROMPT_ID,
    systemPrompt: PRECISION_REWRITE_TRANSLATE_SYSTEM_PROMPT,
    prompt: PRECISION_REWRITE_TRANSLATE_PROMPT,
  },
} as const

export const BUILT_IN_PAGE_TRANSLATE_PROMPT_IDS = Object.keys(
  BUILT_IN_PAGE_TRANSLATE_PROMPTS,
) as Array<keyof typeof BUILT_IN_PAGE_TRANSLATE_PROMPTS>

export const DEFAULT_TRANSLATE_PROMPTS_CONFIG = {
  promptId: DEFAULT_TRANSLATE_PROMPT_ID,
  patterns: [],
}

/**
 * Batch rules for the webpage translation pipeline. The worked example below
 * must keep a real translation in every output slot: demonstrating
 * NO_TRANSLATION_SENTINEL in one of them taught models a ~1-in-3 base rate for
 * the marker and silently dropped paragraphs that needed translating. See
 * DEFAULT_SENTINEL_TRANSLATE_PROMPT for the measurements.
 */
export const DEFAULT_BATCH_TRANSLATE_PROMPT = `## Multi-paragraph Translation Rules
1. If input contains a standalone line containing only ${BATCH_SEPARATOR}, use a standalone ${BATCH_SEPARATOR} line in your output. If input has no standalone ${BATCH_SEPARATOR} line, don't use ${BATCH_SEPARATOR} in your output.
2. **CRITICAL**: Treat ${BATCH_SEPARATOR} as a separator only when it appears on its own line. Do not treat ${BATCH_SEPARATOR} as a separator when it appears inside normal text, code, quotes, or punctuation.

## OUTPUT FORMAT:
- **Single paragraph input** → Output translation directly (no separators, no extra text)
- **Multi-paragraph input (input uses standalone ${BATCH_SEPARATOR} separator lines)** → Put ${BATCH_SEPARATOR} on its own line between translations

## Examples

### Multi-paragraph Input:
Paragraph A

${BATCH_SEPARATOR}

Paragraph B

${BATCH_SEPARATOR}

Paragraph C

### Multi-paragraph Output:
Translation A

${BATCH_SEPARATOR}

Translation B

${BATCH_SEPARATOR}

Translation C

### Single paragraph Input:
Single paragraph content

### Single paragraph Output:
Direct translation without separators
`

/**
 * The marker rule: a heading plus a single body line. Both sentences in that
 * line are load-bearing — the language test, and the ban on mixing the marker
 * into translated text (isNoTranslationSentinel matches the marker exactly, so
 * mixed output reaches the page verbatim).
 *
 * Benchmarked on 120 real paragraphs scraped from react.dev / MDN / Wikipedia /
 * vitejs / arXiv, each hand-labelled for whether a translation is actually owed
 * — identifiers like `ArrayBuffer` and pure code are excluded, since dropping
 * those is correct rather than a bug, leaving 107. 4 runs x 8 models:
 * deepseek-v4-pro/flash, glm-4.7, qwen3.5-27b, gpt-5-nano, gpt-5.4-nano/mini,
 * gpt-4o-mini, target language Simplified Chinese. Share of owed paragraphs
 * that rendered nothing:
 *
 *   original wording, marker shown in the example   7.9%   (deepseek-v4-pro 18.0%)
 *   this wording, marker absent from the example    4.7%   (deepseek-v4-pro  1.6%)
 *   two longer variants, same removal               4.2% and 4.9%
 *
 * Original vs any fix is significant (z = -5.5); the three fixes are not
 * distinguishable from each other (|z| < 1.3). One edit carries the win —
 * deleting the marked slot from the worked example — so among wordings that
 * measure the same, take the shortest. Concretely, do not add back:
 *
 * 1. The marked example slot. Showing one of three example segments marked
 *    taught a ~1-in-3 marker base rate that outweighed the rule. Re-wording that
 *    segment does not help, only deleting it does — which is why the page
 *    pipeline uses the plain DEFAULT_BATCH_TRANSLATE_PROMPT. See the "keeps
 *    the marker out of the batch format example" test, which guards this.
 * 2. A negative list of the misfiring shapes (headings, API names, bibliography
 *    entries, error messages). It costs +894 characters on every batch request
 *    and buys nothing measurable. It also made gpt-5-nano worse — and gpt-5-nano
 *    never emits the marker at all, so the block was not changing its marker
 *    decisions; naming those shapes primed it to leave them untranslated by
 *    echoing the source, which the equality check in getDisplayTranslation then
 *    renders as nothing just the same.
 * 3. The clause "instead of repeating the paragraph". Told not to repeat, models
 *    produce something different rather than nothing: already-target-language
 *    paragraphs translated back into the source language rose from 8 to 22
 *    occurrences over the same runs.
 *
 * The wording that caused the bug was the conjunct "and needs no translation",
 * read by models as an independent trigger for anything they judged
 * untranslatable — a smaller effect than the example, but the same failure.
 * Code maps the marker to "", so each such paragraph rendered as nothing. Keep
 * the condition a pure language test.
 */
export const DEFAULT_SENTINEL_TRANSLATE_PROMPT = `## Already-translated Input Rule
Use the exact marker ${NO_TRANSLATION_SENTINEL} as a paragraph's entire translation only when every word of it is already ${getTokenCellText(TARGET_LANGUAGE)}; otherwise always translate. Never mix the marker with translated text.`
