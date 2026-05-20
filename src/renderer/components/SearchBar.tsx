import { useRef, useEffect } from 'react'
import { Search, X } from 'lucide-react'

interface SearchBarProps {
  value: string
  onChange: (value: string) => void
  resultCount?: number
  totalCount?: number
}

export function SearchBar({ value, onChange, resultCount, totalCount }: SearchBarProps) {
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'f') {
        e.preventDefault()
        inputRef.current?.focus()
      }
      if (e.key === 'Escape' && document.activeElement === inputRef.current) {
        onChange('')
        inputRef.current?.blur()
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [onChange])

  const showCount = value && resultCount !== undefined && totalCount !== undefined

  return (
    <div className="relative">
      <Search
        size={15}
        className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500"
      />
      <input
        ref={inputRef}
        role="searchbox"
        aria-controls="account-list"
        aria-label="Search accounts"
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Search accounts... Cmd+F"
        className="w-full pl-9 pr-8 py-2 bg-zinc-900/60 border border-zinc-800 rounded-lg text-sm text-zinc-200 placeholder-zinc-500 focus:outline-none focus:border-zinc-600 transition-colors"
      />
      {showCount && (
        <span className="absolute right-8 top-1/2 -translate-y-1/2 text-xs text-zinc-500 pointer-events-none">
          {resultCount}/{totalCount}
        </span>
      )}
      {value && (
        <button
          onClick={() => {
            onChange('')
            inputRef.current?.focus()
          }}
          className="absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300 transition-colors"
        >
          <X size={14} />
        </button>
      )}
    </div>
  )
}
