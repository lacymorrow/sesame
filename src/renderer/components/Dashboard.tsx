import { useState, useEffect, useCallback, useRef } from 'react'
import { AnimatePresence } from 'framer-motion'
import { Plus, KeyRound } from 'lucide-react'
import { AccountCard } from './AccountCard'
import { SearchBar } from './SearchBar'

interface AccountData {
  name: string
  issuer: string
  code: string | null
  remaining: number
  created_at: string
}

interface DashboardProps {
  onNavigate?: (view: string) => void
}

const AGENT_ACCESS_TTL = 5 * 60 * 1000

export function Dashboard({ onNavigate }: DashboardProps) {
  const [accounts, setAccounts] = useState<AccountData[]>([])
  const [search, setSearch] = useState('')
  const [selectedIndex, setSelectedIndex] = useState(-1)
  const [agentAccessed, setAgentAccessed] = useState<Map<string, number>>(new Map())
  const [agentPulse, setAgentPulse] = useState<string | null>(null)
  const listRef = useRef<HTMLDivElement>(null)

  const refresh = useCallback(async () => {
    const result = await window.sesame.listAccounts()
    if (Array.isArray(result)) {
      setAccounts(result)
    }
  }, [])

  useEffect(() => {
    refresh()
    const interval = setInterval(refresh, 1000)
    return () => clearInterval(interval)
  }, [refresh])

  useEffect(() => {
    const cleanup = window.sesame.onCodeAccessed((data) => {
      const now = Date.now()
      setAgentAccessed((prev) => new Map(prev).set(data.account, now))
      setAgentPulse(data.account)
      setTimeout(() => setAgentPulse(null), 1000)
    })
    return cleanup
  }, [])

  useEffect(() => {
    const interval = setInterval(() => {
      setAgentAccessed((prev) => {
        const now = Date.now()
        const next = new Map<string, number>()
        for (const [k, v] of prev) {
          if (now - v < AGENT_ACCESS_TTL) next.set(k, v)
        }
        return next.size !== prev.size ? next : prev
      })
    }, 30000)
    return () => clearInterval(interval)
  }, [])

  const handleRemove = async (name: string) => {
    await window.sesame.removeAccount(name)
    refresh()
  }

  // Filter accounts
  const filtered = accounts.filter((a) => {
    if (!search) return true
    const q = search.toLowerCase()
    return (
      a.name.toLowerCase().includes(q) ||
      a.issuer.toLowerCase().includes(q)
    )
  })

  // Group by issuer
  const grouped = filtered.reduce<Record<string, AccountData[]>>((acc, a) => {
    const key = a.issuer || 'Other'
    if (!acc[key]) acc[key] = []
    acc[key].push(a)
    return acc
  }, {})

  const sortedGroups = Object.entries(grouped).sort(([a], [b]) => {
    if (a === 'Other') return 1
    if (b === 'Other') return -1
    return a.localeCompare(b)
  })

  // Flat list for keyboard nav
  const flatList = sortedGroups.flatMap(([, accs]) => accs)

  // Keyboard navigation with scrollIntoView
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'ArrowDown') {
        e.preventDefault()
        setSelectedIndex((i) => {
          const next = Math.min(i + 1, flatList.length - 1)
          requestAnimationFrame(() => {
            const el = listRef.current?.querySelector(`[data-flat-index="${next}"]`)
            el?.scrollIntoView({ block: 'nearest', behavior: 'smooth' })
          })
          return next
        })
      } else if (e.key === 'ArrowUp') {
        e.preventDefault()
        setSelectedIndex((i) => {
          const next = Math.max(i - 1, 0)
          requestAnimationFrame(() => {
            const el = listRef.current?.querySelector(`[data-flat-index="${next}"]`)
            el?.scrollIntoView({ block: 'nearest', behavior: 'smooth' })
          })
          return next
        })
      } else if (e.key === 'Enter' && selectedIndex >= 0 && selectedIndex < flatList.length) {
        e.preventDefault()
        const account = flatList[selectedIndex]
        if (account.code) {
          navigator.clipboard.writeText(account.code)
        }
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [flatList, selectedIndex])

  // Reset selection when search changes
  useEffect(() => {
    setSelectedIndex(-1)
  }, [search])

  if (accounts.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-zinc-500 px-8">
        <div className="w-16 h-16 rounded-2xl bg-zinc-800/60 flex items-center justify-center mb-5">
          <KeyRound size={28} className="text-zinc-500" />
        </div>
        <p className="text-sm font-medium text-zinc-400 mb-1">No accounts yet</p>
        <p className="text-xs text-zinc-600 text-center mb-6">
          Add your first account to start generating codes
        </p>
        <button
          onClick={() => onNavigate?.('add')}
          className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 rounded-lg text-sm font-medium transition-colors"
        >
          <Plus size={16} />
          Add Account
        </button>
      </div>
    )
  }

  let globalIdx = 0

  return (
    <div className="space-y-3" ref={listRef} id="account-list">
      <SearchBar
        value={search}
        onChange={setSearch}
        resultCount={search ? filtered.length : undefined}
        totalCount={search ? accounts.length : undefined}
      />

      {filtered.length === 0 && search && (
        <div className="text-center py-8 text-zinc-500 text-sm">
          No accounts matching "{search}"
        </div>
      )}

      {sortedGroups.map(([issuer, accs]) => (
        <div key={issuer}>
          {sortedGroups.length > 1 && (
            <div className="text-[11px] font-medium text-zinc-500 uppercase tracking-wider px-1 mb-1.5">
              {issuer}
            </div>
          )}
          <div className="space-y-1.5">
            <AnimatePresence mode="popLayout">
              {accs.map((account) => {
                const idx = globalIdx++
                return (
                  <div key={account.name} data-flat-index={idx}>
                    <AccountCard
                      account={account}
                      onRemove={() => handleRemove(account.name)}
                      selected={idx === selectedIndex}
                      agentBadge={agentAccessed.has(account.name)}
                      agentPulse={agentPulse === account.name}
                    />
                  </div>
                )
              })}
            </AnimatePresence>
          </div>
        </div>
      ))}
    </div>
  )
}
