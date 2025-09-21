
'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import IpaKeyboard from '../components/ipakeyboard'
import AudioPlayer from '../components/audioplayer'
import { loadWords, type Row } from '../lib/loadwords'
import { toLocalMp3Path } from '../lib/audio'

// const norm = (s: string) => s.normalize('NFC').trim().replace(/\s+/g, ' ')
const norm = (s: string) =>
  s
    .normalize("NFC")
    .trim()
    .replace(/\s+/g, " ")
    // accept ASCII g as IPA ɡ
    .replace(/g/g, "ɡ");


function shuffle<T>(arr: T[]) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    const t = arr[i]
    arr[i] = arr[j]
    arr[j] = t
  }
  return arr
}

export default function QuizPage() {
  const [words, setWords] = useState<Row[]>([])
  const [order, setOrder] = useState<number[]>([])
  const [idx, setIdx] = useState(0)
  const [input, setInput] = useState('')
  const [result, setResult] = useState<null | 'right' | 'wrong'>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    loadWords(2000).then(ws => {
      setWords(ws)
      const ord = shuffle([...Array(ws.length).keys()])
      setOrder(ord)
      setIdx(0)
    })
  }, [])

  const current = useMemo(() => {
    if (order.length === 0 || words.length === 0) return null
    const i = order[idx] ?? 0
    return words[i]
  }, [order, idx, words])

  const audioSrc = useMemo(() => toLocalMp3Path(current?.audio), [current])

  const insertAtCursor = (t: string) => {
    const el = inputRef.current
    if (!el) return setInput(v => v + t)
    const start = el.selectionStart ?? input.length
    const end = el.selectionEnd ?? input.length
    const next = input.slice(0, start) + t + input.slice(end)
    setInput(next)
    requestAnimationFrame(() => {
      el.focus()
      const pos = start + t.length
      el.setSelectionRange(pos, pos)
    })
  }

  const submit = () => {
    if (!current) return
    setResult(norm(input) === norm(current.ipa) ? 'right' : 'wrong')
  }

  const next = () => {
    if (order.length === 0) return
    const atEnd = idx + 1 >= order.length
    setInput('')
    setResult(null)
    if (atEnd) {
      const newOrder = shuffle([...order])
      setOrder(newOrder)
      setIdx(0)
    } else {
      setIdx(i => i + 1)
    }
    // optional autoplay after changing item
    // setTimeout(() => audioRef.current?.play(), 0)
  }

  if (!current) {
    return <main className='flex min-h-screen items-center justify-center'>loading…</main>
  }

  return (
    <main className='flex min-h-screen items-center'>
      <div className='w-full max-w-2xl mx-auto space-y-6 p-6'>
        <h1 className='text-3xl font-bold text-center'>IPA quiz</h1>

        <div className='text-lg text-center'>
          word: <b>{current.word}</b>
        </div>

        {audioSrc && <AudioPlayer src={audioSrc} />}

        <input
          ref={inputRef}
          value={input}
          onChange={e => setInput(e.target.value)}
          className='w-full border rounded p-3 text-xl font-ipa'
          placeholder='type or use the IPA keyboard'
        />

        <IpaKeyboard onInsert={insertAtCursor} />

        <div className='flex gap-4'>
          <button className='px-4 py-2 rounded bg-blue-600 text-white' onClick={submit}>submit</button>
          <button className='px-4 py-2 rounded bg-gray-200' onClick={next}>next</button>
        </div>

        {result && (
          <div className='p-3 rounded border'>
            {result === 'right' ? (
              <span className='text-green-700'>correct</span>
            ) : (
              <div className='space-y-1'>
                <div className='text-red-700'>wrong</div>
                <div className='font-ipa'>your answer: {input || '—'}</div>
                <div className='font-ipa'>correct: {current.ipa}</div>
              </div>
            )}
          </div>
        )}
      </div>
    </main>
  )
}
