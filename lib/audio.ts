// lib/audio.ts
export function toLocalMp3Path(name?: string | null) {
  if (!name) return null
  const mp3 = name.replace(/\.(ogg|wav|webm|m4a)$/i, ".mp3")
  return `/audio/${mp3}`
}
