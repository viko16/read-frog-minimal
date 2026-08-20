import path from "node:path"
import process from "node:process"
import ViteYaml from "@modyfi/vite-plugin-yaml"
import { defineConfig } from "wxt"
const useLocalPackages = process.env.WXT_USE_LOCAL_PACKAGES === "true"
// Root of the read-frog monorepo whose source is aliased in when developing
// with local packages. Defaults to the sibling checkout; override with
// WXT_MONOREPO_PATH to point at a git worktree (relative or absolute).
const monorepoRoot = process.env.WXT_MONOREPO_PATH
  ? path.resolve(process.env.WXT_MONOREPO_PATH)
  : path.resolve(__dirname, "../read-frog-monorepo")

// See https://wxt.dev/api/config.html
export default defineConfig({
  srcDir: "src",
  imports: false,
  modules: ["@wxt-dev/module-react", "@wxt-dev/i18n/module"],
  manifestVersion: 3,
  // WXT top level alias - will be automatically synced to tsconfig.json paths and Vite alias
  alias: useLocalPackages
    ? {
        "@read-frog/definitions": path.resolve(monorepoRoot, "packages/definitions/src"),
      }
    : {},
  manifest: ({ mode, browser }) => ({
    name: "__MSG_extName__",
    description: "__MSG_extDescription__",
    default_locale: "en",
    // Fixed extension ID for development
    ...(mode === "development" &&
      (browser === "chrome" || browser === "edge") && {
        key: "MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEAqYEhICz/OMxb9gBhAwl4pToD4SYqlqgRSvf2G3+B1FzdhroYnfF135OKI3cIodwAZWOfbRoZ7dYpq/ItSyyGe4C4w1kmztkCCGmfhpAzAdj/ahKKI7PptCk+Z/mWiIoJyvWC+yJ1Fc8C4/H/EAO0YfBalo/IgX3Wb94WBLDAUZUmLHo60ss9Bj6r/Xk/KtNkR4XasMNhP4p7JzCD+FXJMp+JstIN63j9dNjg0S37uOW7KvdDXFxv/hLZ8kZb3OfowJWuMjAY9wj2MJmiKojE7/PVC3+1nA7mQ6yViW5fvz/dCqgGi1xcDlZA6UiwBaYlyuBUz6d4uw9PxK8qOByWuQIDAQAB",
      }),
    permissions: ["storage", "tabs", "alarms", "scripting", "webNavigation"],
    host_permissions: [
      "*://*/*", // Required for scripting.executeScript in any frame
    ],
    // Allow images/SVGs referenced by content-script UI <img> tags to be loaded from
    // moz-extension:// URLs on regular pages. Firefox enforces this more strictly.
    web_accessible_resources: [
      {
        resources: ["assets/*.png", "assets/*.svg", "assets/*.webp"],
        matches: ["*://*/*", "file:///*"],
      },
    ],
    // Firefox-specific settings for MV3
    ...(browser === "firefox" && {
      // Override default CSP to exclude `upgrade-insecure-requests` (Firefox MV3 default),
      // which would upgrade custom provider HTTP URLs (e.g. LAN) to HTTPS.
      content_security_policy: {
        extension_pages: "script-src 'self' 'wasm-unsafe-eval'; object-src 'self';",
      },
      browser_specific_settings: {
        gecko: {
          id: "{a97f76cb-2cab-42ae-870f-2c6cd5b25d84}",
          strict_min_version: "112.0",
          data_collection_permissions: {
            required: ["none"],
          },
        },
      },
    }),
  }),
  zip: {
    includeSources: ["**/*"],
    excludeSources: ["docs/**/*", "assets/**/*", "repos/**/*", "readmes/**/*"],
  },
  hooks: {
    "vite:build:extendConfig": (entrypoints, viteConfig) => {
      const entrypoint = entrypoints.length === 1 ? entrypoints[0] : undefined
      if (entrypoint?.type !== "content-script") return

      const output = viteConfig.build?.rollupOptions?.output
      if (!output) return

      for (const outputOptions of Array.isArray(output) ? output : [output]) {
        outputOptions.assetFileNames = (assetInfo) =>
          assetInfo.names.some((name) => name.endsWith(".css"))
            ? `content-scripts/${entrypoint.name}.[ext]`
            : "assets/[name]-[hash].[ext]"
      }
    },
  },
  dev: {
    server: {
      // Prefer 3333 over WXT's default 3000 while still allowing WXT to pick
      // another open port when 3333 is already taken.
      port: 3333,
      strictPort: false,
    },
  },
  vite: () => ({
    build: {
      // Chromium does not reuse modulepreload requests for chrome-extension://
      // pages, causing duplicate fetches and unused-preload warnings.
      modulePreload: false,
    },
    resolve: {
      // CodeMirror breaks with "Unrecognized extension value in extension set"
      // if the bundle contains more than one copy of these packages (#1782).
      dedupe: [
        "@codemirror/state",
        "@codemirror/view",
        "@codemirror/language",
        "@codemirror/lint",
        "@codemirror/autocomplete",
        "@codemirror/search",
        "@codemirror/commands",
        "@lezer/common",
      ],
    },
    plugins: [
      // Lets the runtime i18next facade (src/utils/i18n) `import` the `src/locales/*.yml`
      // files as JS objects so i18next can bundle them for runtime language switching.
      //
      // This does NOT replace `@wxt-dev/i18n/module` (still registered in `modules` above).
      // That module reads the same .yml files via its own fs-based mechanism — a separate
      // path from this Vite `import` — and is kept ONLY for two build-time jobs it still owns:
      //   1. Emitting `_locales/*/messages.json`, which the browser uses to localize the
      //      manifest `__MSG_extName__` / `__MSG_extDescription__` below. That is chosen by
      //      the browser UI language at load time and is NOT runtime-switchable (platform
      //      constraint), so it stays with @wxt-dev/i18n.
      //   2. Generating the `#i18n` key types (.wxt/i18n/structure.d.ts) that the facade
      //      reuses for autocomplete/type-checking at every `i18n.t('key')` call site.
      // Runtime UI string lookup itself no longer goes through @wxt-dev/i18n.
      ViteYaml(),
    ],
  }),
})
