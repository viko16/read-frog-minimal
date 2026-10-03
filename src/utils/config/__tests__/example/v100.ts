import type { TestSeriesObject } from "./types"
import { testSeries as v099TestSeries } from "./v099"

// Extend the historical Minimal fixtures without consulting runtime defaults.
export const testSeries: TestSeriesObject = Object.fromEntries(
  Object.entries(v099TestSeries).map(([id, series]) => {
    const config = structuredClone(series.config)
    config.pageTranslation.page.translateTitle = true
    return [id, { description: series.description, config }]
  }),
)
