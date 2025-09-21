// fetch-audio-mp3-only.mjs
import fs from "fs"
import path from "path"
import { spawn } from "child_process"
import { randomUUID } from "crypto"
import { setTimeout as sleep } from "timers/promises"

const inJsonl     = process.argv[2] || "public/data/en-wiktextract-mini.jsonl"
const outAudioDir = process.argv[3] || "public/audio"
const maxConc     = 3

// use a project-local temp dir instead of AppData
const tmpDir = path.join(process.cwd(), "tmp")
fs.mkdirSync(outAudioDir, { recursive: true })
fs.mkdirSync(tmpDir, { recursive: true })

const UA = "ipa-quiz/1.0 (local dev)"

const filePathURL = (name) =>
  "https://commons.wikimedia.org/wiki/Special:FilePath/" + encodeURIComponent(name)

const apiURL = (name) =>
  "https://commons.wikimedia.org/w/api.php?action=query&titles=File:" +
  encodeURIComponent(name.replace(/^File:/i, "")) +
  "&prop=imageinfo&iiprop=url&format=json&origin=*"

function sanitizeBase(name) {
  return path.parse(name).name.replace(/[<>:\"/\\|?*\u0000-\u001F]/g, "_")
}
function mp3PathFor(name) {
  return path.join(outAudioDir, sanitizeBase(name) + ".mp3")
}
function tmpPath() {
  return path.join(tmpDir, "dl-" + randomUUID() + ".bin")
}

function convertToMp3(tempFile, outFile) {
  return new Promise((resolve, reject) => {
    const p = spawn("ffmpeg", ["-hide_banner", "-y", "-i", tempFile, "-codec:a", "libmp3lame", "-qscale:a", "4", outFile], { stdio: "ignore" })
    p.on("close", code => code === 0 ? resolve() : reject(new Error("ffmpeg exit " + code)))
    p.on("error", reject)
  })
}

async function fetchBuffer(url) {
  const res = await fetch(url, { redirect: "follow", headers: { "user-agent": UA } })
  if (!res.ok) throw new Error("http " + res.status)
  const ct = (res.headers.get("content-type") || "").toLowerCase()
  const okType = ct.startsWith("audio/") || ct === "application/ogg" || ct === "application/octet-stream"
  if (!okType) throw new Error("bad content-type " + ct)
  const ab = await res.arrayBuffer()
  if (ab.byteLength < 1024) throw new Error("too small")
  return Buffer.from(ab)
}

async function getApiDirectURL(name) {
  const res = await fetch(apiURL(name), { headers: { "user-agent": UA } })
  if (!res.ok) throw new Error("api http " + res.status)
  const j = await res.json()
  const pages = j?.query?.pages || {}
  for (const k of Object.keys(pages)) {
    const u = pages[k]?.imageinfo?.[0]?.url
    if (u) return u
  }
  throw new Error("api no url")
}

async function downloadAsMp3(originalName) {
  const outMp3 = mp3PathFor(originalName)
  // skip if we already have a real mp3
  if (fs.existsSync(outMp3) && fs.statSync(outMp3).size >= 1024) {
    return { status: "exists", mp3: outMp3 }
  }

  const tpath = tmpPath()
  let lastErr = ""

  // Try Special:FilePath, then fallback to API direct URL
  for (let attempt = 1; attempt <= 2; attempt++) {
    try {
      const url = attempt === 1 ? filePathURL(originalName) : await getApiDirectURL(originalName)
      const buf = await fetchBuffer(url)
      // write temp file atomically
      fs.writeFileSync(tpath, buf, { flag: "w" })
      await convertToMp3(tpath, outMp3)
      try { fs.unlinkSync(tpath) } catch {}
      return { status: "ok", mp3: outMp3 }
    } catch (e) {
      lastErr = String(e?.message || e)
      try { if (fs.existsSync(tpath)) fs.unlinkSync(tpath) } catch {}
      // small wait before fallback / retry
      await sleep(150)
    }
  }

  return { status: "fail", reason: lastErr }
}

async function main() {
  const lines = fs.readFileSync(inJsonl, "utf8").split("\n").filter(l => l.trim())
  const namesSet = new Set()
  for (const line of lines) {
    try {
      const obj = JSON.parse(line)
      if (obj?.audio) namesSet.add(String(obj.audio))
    } catch {}
  }
  const list = Array.from(namesSet)
  console.log(`will fetch+convert ${list.length} files → mp3 in ${outAudioDir}`)

  let i = 0, ok = 0, skip = 0, fail = 0
  const firstFails = []
  async function worker() {
    while (i < list.length) {
      const name = list[i++]
      try {
        const r = await downloadAsMp3(name)
        if (r.status === "ok") ok++
        else if (r.status === "exists") skip++
        else { fail++; if (firstFails.length < 5) firstFails.push({ name, reason: r.reason }) }
      } catch (e) {
        fail++
        if (firstFails.length < 5) firstFails.push({ name, reason: String(e?.message || e) })
      }
      if ((ok + skip + fail) % 20 === 0) {
        console.log(`progress ${ok + skip + fail}/${list.length} ok:${ok} skip:${skip} fail:${fail}`)
      }
      await sleep(120)
    }
  }

  const workers = []
  for (let k = 0; k < Math.min(maxConc, list.length); k++) workers.push(worker())
  await Promise.all(workers)

  console.log(`done: ok ${ok}  skip ${skip}  fail ${fail}`)
  if (firstFails.length) {
    console.log("examples of failures:")
    for (const f of firstFails) console.log(" -", f.name, "=>", f.reason)
  }
}

main().catch(e => {
  console.error(e)
  process.exit(1)
})
