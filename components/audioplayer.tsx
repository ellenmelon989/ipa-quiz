// components/AudioPlayer.tsx
"use client"

export default function AudioPlayer({ src }: { src: string | null }) {
  if (!src) return null
  return (
    // changing `key` forces React to remount the element when src changes
    <audio key={src} controls className="w-full" src={src}>
      Your browser does not support audio
    </audio>
  )
}
