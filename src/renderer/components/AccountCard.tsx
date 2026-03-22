import { useState } from 'react'

interface AccountData {
  name: string
  issuer: string
  code: string | null
  remaining: number
}

interface AccountCardProps {
  account: AccountData
  onRemove: () => void
}

export function AccountCard({ account, onRemove }: AccountCardProps) {
  const [copied, setCopied] = useState(false)
  const [confirmRemove, setConfirmRemove] = useState(false)

  const handleCopy = async () => {
    if (!account.code) return
    await navigator.clipboard.writeText(account.code)
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }

  const formattedCode = account.code ? `${account.code.slice(0, 3)} ${account.code.slice(3)}` : '--- ---'

  const progressPercent = (account.remaining / 30) * 100

  return (
    <div
      className="flex items-center justify-between p-3 bg-zinc-900 rounded-lg border border-zinc-800 hover:border-zinc-700 transition-colors cursor-pointer group"
      onClick={handleCopy}
    >
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          {account.issuer && <span className="text-xs text-zinc-500 truncate">{account.issuer}</span>}
          <span className="text-sm text-zinc-300 truncate">{account.name}</span>
        </div>
        <div className="flex items-center gap-3 mt-1">
          <span className="text-2xl font-mono font-bold tracking-widest">{formattedCode}</span>
          <div className="flex items-center gap-1.5">
            <div className="w-8 h-8 relative">
              <svg className="w-8 h-8 -rotate-90" viewBox="0 0 32 32">
                <circle cx="16" cy="16" r="14" fill="none" stroke="currentColor" strokeWidth="2" className="text-zinc-800" />
                <circle
                  cx="16"
                  cy="16"
                  r="14"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeDasharray={`${2 * Math.PI * 14}`}
                  strokeDashoffset={`${2 * Math.PI * 14 * (1 - progressPercent / 100)}`}
                  className={account.remaining <= 5 ? 'text-red-400' : 'text-emerald-400'}
                  strokeLinecap="round"
                />
              </svg>
              <span className="absolute inset-0 flex items-center justify-center text-[10px] text-zinc-400">
                {account.remaining}
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
        {copied && <span className="text-xs text-emerald-400 mr-1">Copied!</span>}
        {confirmRemove ? (
          <button
            onClick={(e) => {
              e.stopPropagation()
              onRemove()
            }}
            className="px-2 py-1 text-xs rounded bg-red-600 hover:bg-red-500 text-white transition-colors"
          >
            Confirm
          </button>
        ) : (
          <button
            onClick={(e) => {
              e.stopPropagation()
              setConfirmRemove(true)
              setTimeout(() => setConfirmRemove(false), 3000)
            }}
            className="px-2 py-1 text-xs rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-400 transition-colors"
          >
            Remove
          </button>
        )}
      </div>
    </div>
  )
}
