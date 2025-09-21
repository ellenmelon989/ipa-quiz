export type Row = { word: string, ipa: string, audio?: string | null }

export async function loadWords(limit = 2000): Promise<Row[]> {
  const res = await fetch('/data/en-wiktextract-mini.jsonl', { cache: 'no-store' })
  const text = await res.text()
  const out: Row[] = []
  for (const line of text.split('\n')) {
    if (!line.trim()) continue
    try {
      const obj = JSON.parse(line)
      if (!obj.word || !obj.ipa) continue
      out.push({ word: obj.word, ipa: obj.ipa, audio: obj.audio || null })
      if (out.length >= limit) break
    } catch {}
  }
  return out
}
