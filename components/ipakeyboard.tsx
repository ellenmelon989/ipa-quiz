"use client"

const CONSONANTS = ["p","b","t","d","k","g","m","n","ŋ","f","v","θ","ð","s","z","ʃ","ʒ","h","t͡ʃ","d͡ʒ","l","ɹ","j","w","ʔ"]
const VOWELS = ["i","ɪ","e","ɛ","æ","ə","ʌ","ɑ","ɔ","o","u","ʊ"]
// const DIACRITICS = ["ː","ˈ","ˌ",".","̃","˞"]

export default function IpaKeyboard({ onInsert }: { onInsert: (s: string) => void }) {
  const Key = ({ k }: { k: string }) => (
    <button
      type="button"
      className="px-3 py-2 border rounded text-lg font-ipa"
      onClick={() => onInsert(k)}
      aria-label={`Insert ${k}`}
    >
      {k}
    </button>
  )

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">{CONSONANTS.map(k => <Key key={k} k={k} />)}</div>
      <div className="flex flex-wrap gap-2">{VOWELS.map(k => <Key key={k} k={k} />)}</div>
      {/* <div className="flex flex-wrap gap-2">{DIACRITICS.map(k => <Key key={k} k={k} />)}</div> */}

    </div>
  )
}
