// make-mini.mjs
import fs from "fs"
import readline from "readline"

const inPath  = process.argv[2] || "public/data/raw-wiktextract-data.jsonl"
const outPath = process.argv[3] || "public/data/en-wiktextract-mini.jsonl"
const limit   = Number(process.argv[4] || 2000)

function sanitizeIPA(raw) {
  if (!raw) return ""
  let s = raw.normalize("NFD")
  s = s.replace(/\p{M}+/gu, "")                      // combining marks (diacritics, tie-bars)
  s = s.replace(/[\u02B0-\u02FF]/g, "")              // spacing modifier letters (ː ˈ ˌ ʰ ʷ …)
  s = s.replace(/[\/\[\]\(\)\{\}\.\s|‖‿]/g, "")      // slashes, dots, spaces, misc
  s = s.replace(/[^a-z\u00C0-\u00FF\u0100-\u017F\u0250-\u02AF\u03B8]/g, "") // whitelist letters + θ
  return s.normalize("NFC")
}

function pickAudio(sounds) {
  if (!Array.isArray(sounds)) return null
  const a = sounds.find(s => s?.audio)
  if (!a) return null
  const file = String(a.audio)
  const m = file.toLowerCase().match(/\.(ogg|mp3|wav|webm|m4a)$/)
  return { audio: file, audioType: m ? m[1] : null }
}

fs.mkdirSync("public/data", { recursive: true })

const rl = readline.createInterface({
  input: fs.createReadStream(inPath, { encoding: "utf8" }),
  crlfDelay: Infinity
})

const seen = new Set()
let uniqueCount = 0
const rows = new Map() // dedupe: wordLower -> row

rl.on("line", (line) => {
  if (uniqueCount >= limit) {
    rl.close()
    return
  }
  if (!line.trim()) return
  try {
    const obj = JSON.parse(line)
    if (obj.lang !== "English") return

    const word = (obj.word || "").trim()
    if (!word) return

    const sounds = obj.sounds || []
    const ipas = sounds.map(s => s?.ipa).filter(Boolean)
    if (ipas.length === 0) return

    const ipa = sanitizeIPA(ipas[0])
    if (!ipa) return

    const audioObj = pickAudio(sounds)
    if (!audioObj) return // 🔑 only keep entries with audio

    const key = word.toLowerCase()
    if (rows.has(key)) return

    rows.set(key, { word, ipa, ...audioObj })
    uniqueCount++
    if (uniqueCount >= limit) rl.close()
  } catch {
    // ignore bad JSON lines
  }
})

rl.on("close", () => {
  const out = fs.createWriteStream(outPath, { encoding: "utf8" })
  let written = 0
  for (const [, row] of rows) {
    if (written >= limit) break
    out.write(JSON.stringify(row) + "\n")
    written++
  }
  out.end()
  console.log(`✅ Wrote ${written} words with audio to ${outPath}`)
})
