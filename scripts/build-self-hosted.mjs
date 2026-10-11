import { spawnSync } from "node:child_process"
import { constants, createHash, createPrivateKey, createPublicKey, sign } from "node:crypto"
import { mkdir, readFile, writeFile } from "node:fs/promises"
import { fileURLToPath } from "node:url"

// CRX3 wire format and signing context:
// https://chromium.googlesource.com/chromium/src/+/main/components/crx_file/crx3.proto
function varint(value) {
  const bytes = []
  do {
    const next = value & 127
    value >>>= 7
    bytes.push(next | (value ? 128 : 0))
  } while (value)
  return Buffer.from(bytes)
}

function field(number, bytes) {
  return Buffer.concat([varint((number << 3) | 2), varint(bytes.length), bytes])
}

function uint32(value) {
  const bytes = Buffer.alloc(4)
  bytes.writeUInt32LE(value)
  return bytes
}

function escapeXml(value) {
  return value.replace(
    /[&<>"']/g,
    (character) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&apos;" })[character],
  )
}

async function main() {
  process.chdir(fileURLToPath(new URL("../", import.meta.url)))
  const { version } = JSON.parse(await readFile("package.json", "utf8"))
  if (
    !/^(0|[1-9]\d*)(\.(0|[1-9]\d*)){0,3}$/.test(version) ||
    version.split(".").some((part) => Number(part) > 65535) ||
    version.split(".").every((part) => Number(part) === 0)
  ) {
    throw new Error(
      "package.json version must be a valid Chromium version (1–4 integers, 0–65535).",
    )
  }
  const base = new URL(process.env.SELF_HOSTED_URL || "https://read-frog-minimal.pages.dev/")
  if (
    base.protocol !== "https:" ||
    base.username ||
    base.password ||
    base.search ||
    base.hash ||
    base.pathname !== "/"
  ) {
    throw new Error(
      "SELF_HOSTED_URL must be an HTTPS origin without credentials, path, query or fragment.",
    )
  }
  const encodedKey = process.env.CRX_PRIVATE_KEY_BASE64
  delete process.env.CRX_PRIVATE_KEY_BASE64
  if (!encodedKey)
    throw new Error("Missing CRX_PRIVATE_KEY_BASE64 (base64-encoded RSA private PEM key).")
  let privateKey
  try {
    privateKey = createPrivateKey(Buffer.from(encodedKey, "base64"))
  } catch {
    throw new Error("CRX_PRIVATE_KEY_BASE64 is not a valid unencrypted private PEM key.")
  }
  if (
    privateKey.asymmetricKeyType !== "rsa" ||
    privateKey.asymmetricKeyDetails.modulusLength < 2048
  ) {
    throw new Error("The signing key must be RSA with at least 2048 bits.")
  }
  const publicKey = createPublicKey(privateKey).export({ type: "spki", format: "der" })
  const crxId = createHash("sha256").update(publicKey).digest().subarray(0, 16)
  const extensionId = crxId
    .toString("hex")
    .replace(/./g, (digit) => String.fromCharCode(97 + parseInt(digit, 16)))
  const updateUrl = new URL("updates.xml", base).href
  const result = spawnSync(
    process.execPath,
    ["node_modules/wxt/bin/wxt.mjs", "zip", "-b", "chrome"],
    {
      stdio: "inherit",
      env: {
        ...process.env,
        SELF_HOSTED_URL: base.href,
        SELF_HOSTED_PUBLIC_KEY: publicKey.toString("base64"),
      },
    },
  )
  if (result.error || result.status !== 0) throw new Error("WXT self-hosted build failed.")
  const manifest = JSON.parse(await readFile(".output/chrome-mv3/manifest.json", "utf8"))
  if (
    manifest.version !== version ||
    manifest.update_url !== updateUrl ||
    manifest.key !== publicKey.toString("base64")
  ) {
    throw new Error("Built manifest does not match the release version, update URL or signing key.")
  }
  const archive = await readFile(".output/self-hosted.zip")
  const signedHeader = field(1, crxId)
  const payload = Buffer.concat([
    Buffer.from("CRX3 SignedData\0"),
    uint32(signedHeader.length),
    signedHeader,
    archive,
  ])
  // Chromium's creator uses PKCS#1 v1.5 SHA-256 (despite the old proto comment mentioning PSS).
  const signature = sign("sha256", payload, {
    key: privateKey,
    padding: constants.RSA_PKCS1_PADDING,
  })
  const proof = Buffer.concat([field(1, publicKey), field(2, signature)])
  const header = Buffer.concat([field(2, proof), field(10000, signedHeader)])
  const crx = Buffer.concat([
    Buffer.from("Cr24"),
    uint32(3),
    uint32(header.length),
    header,
    archive,
  ])
  if (crx.length > 25 * 1024 * 1024)
    throw new Error("CRX exceeds the Cloudflare Pages 25 MiB per-file limit.")
  const output = ".output/self-hosted"
  await mkdir(output, { recursive: true })
  await writeFile(`${output}/read-frog.crx`, crx)
  await writeFile(
    `${output}/updates.xml`,
    `<?xml version="1.0" encoding="UTF-8"?>\n<gupdate xmlns="http://www.google.com/update2/response" protocol="2.0"><app appid="${extensionId}"><updatecheck codebase="${escapeXml(new URL("read-frog.crx", base).href)}" version="${version}" /></app></gupdate>\n`,
  )
  await writeFile(
    `${output}/_headers`,
    "/read-frog.crx\n  Content-Type: application/x-chrome-extension\n  Cache-Control: no-store\n/updates.xml\n  Content-Type: application/xml; charset=utf-8\n  Cache-Control: no-store\n",
  )
  console.log(
    `Self-hosted release: ${version}, ID: ${extensionId}, size: ${crx.length} bytes, output: ${output}`,
  )
}

main().catch((error) => {
  console.error(error.message)
  process.exitCode = 1
})
