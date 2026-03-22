import React, { useState } from 'react'

interface UnlockScreenProps {
  onUnlock: () => void
}

export function UnlockScreen({ onUnlock }: UnlockScreenProps) {
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!password) return
    setLoading(true)
    setError('')

    const result = await window.sesame.unlock(password)
    setLoading(false)

    if (result.success) {
      onUnlock()
    } else {
      setError(result.error || 'Failed to unlock vault')
    }
  }

  return (
    <div className="flex flex-col items-center justify-center h-screen px-8">
      <div className="text-5xl mb-6">🔐</div>
      <h1 className="text-2xl font-bold mb-1">Sesame</h1>
      <p className="text-zinc-500 text-sm mb-8">Enter your master password</p>

      <form onSubmit={handleSubmit} className="w-full max-w-xs space-y-4">
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Master password"
          autoFocus
          className="w-full px-4 py-3 bg-zinc-900 border border-zinc-700 rounded-lg text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-zinc-500 focus:ring-1 focus:ring-zinc-500"
        />
        {error && <p className="text-red-400 text-sm">{error}</p>}
        <button
          type="submit"
          disabled={loading || !password}
          className="w-full py-3 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 disabled:hover:bg-emerald-600 rounded-lg font-medium transition-colors"
        >
          {loading ? 'Unlocking...' : 'Unlock'}
        </button>
      </form>

      <p className="text-zinc-600 text-xs mt-8">First time? Enter a new master password to create your vault.</p>
    </div>
  )
}
