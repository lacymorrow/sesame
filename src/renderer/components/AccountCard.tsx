import { useState } from 'react'
import { motion } from 'framer-motion'
import { Copy, Trash2, Check } from 'lucide-react'
import { IssuerIcon } from './IssuerIcon'
import { CountdownRing } from './CountdownRing'
import { useToast } from './Toast'

interface AccountData {
  name: string
  issuer: string
  code: string | null
  remaining: number
}

interface AccountCardProps {
  account: AccountData
  onRemove: () => void
  selected?: boolean
}

export function AccountCard({ account, onRemove, selected }: AccountCardProps) {
  const [confirmRemove, setConfirmRemove] = useState(false)
  const [justCopied, setJustCopied] = useState(false)
  const { toast } = useToast()

  const handleCopy = async () => {
    if (!account.code) return
    await navigator.clipboard.writeText(account.code)
    setJustCopied(true)
    toast('Copied to clipboard')
    setTimeout(() => setJustCopied(false), 1500)
  }

  const formattedCode = account.code
    ? `${account.code.slice(0, 3)} ${account.code.slice(3)}`
    : '--- ---'

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8, scale: 0.97 }}
      transition={{ duration: 0.2 }}
      onClick={handleCopy}
      className={`flex items-center gap-3 p-3.5 rounded-xl border cursor-pointer group transition-colors ${
        selected
          ? 'bg-zinc-800/80 border-zinc-600'
          : 'bg-zinc-900/50 border-zinc-800/60 hover:bg-zinc-800/40 hover:border-zinc-700'
      }`}
    >
      <IssuerIcon issuer={account.issuer} name={account.name} />

      <div className="flex-1 min-w-0">
        <div className="flex items-baseline gap-1.5">
          {account.issuer && (
            <span className="text-xs font-medium text-zinc-400 truncate">
              {account.issuer}
            </span>
          )}
          <span className="text-xs text-zinc-500 truncate">{account.name}</span>
        </div>
        <div className="flex items-center gap-3 mt-0.5">
          <span className="text-[22px] font-mono font-bold tracking-[0.2em] text-zinc-100">
            {formattedCode}
          </span>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <CountdownRing remaining={account.remaining} />

        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <button
            onClick={(e) => {
              e.stopPropagation()
              handleCopy()
            }}
            className="p-1.5 rounded-lg hover:bg-zinc-700/60 text-zinc-400 hover:text-zinc-200 transition-colors"
            title="Copy code"
          >
            {justCopied ? <Check size={14} className="text-emerald-400" /> : <Copy size={14} />}
          </button>

          {confirmRemove ? (
            <button
              onClick={(e) => {
                e.stopPropagation()
                onRemove()
              }}
              className="px-2 py-1 text-xs rounded-lg bg-red-600/80 hover:bg-red-500 text-white transition-colors"
            >
              Remove?
            </button>
          ) : (
            <button
              onClick={(e) => {
                e.stopPropagation()
                setConfirmRemove(true)
                setTimeout(() => setConfirmRemove(false), 3000)
              }}
              className="p-1.5 rounded-lg hover:bg-zinc-700/60 text-zinc-400 hover:text-red-400 transition-colors"
              title="Remove account"
            >
              <Trash2 size={14} />
            </button>
          )}
        </div>
      </div>
    </motion.div>
  )
}
