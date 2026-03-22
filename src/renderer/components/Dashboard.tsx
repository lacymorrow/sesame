import { useState, useEffect, useCallback } from 'react'
import { AccountCard } from './AccountCard'

interface AccountData {
  name: string
  issuer: string
  code: string | null
  remaining: number
  created_at: string
}

export function Dashboard() {
  const [accounts, setAccounts] = useState<AccountData[]>([])

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

  const handleRemove = async (name: string) => {
    await window.sesame.removeAccount(name)
    refresh()
  }

  if (accounts.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-zinc-500">
        <div className="text-4xl mb-4">🔑</div>
        <p className="text-sm">No accounts yet</p>
        <p className="text-xs mt-1">Click "Add" to add your first account</p>
      </div>
    )
  }

  return (
    <div className="space-y-2">
      {accounts.map((account) => (
        <AccountCard key={account.name} account={account} onRemove={() => handleRemove(account.name)} />
      ))}
    </div>
  )
}
