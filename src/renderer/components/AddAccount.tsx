import React, { useState } from 'react'

interface AddAccountProps {
  onAdded: () => void
}

export function AddAccount({ onAdded }: AddAccountProps) {
  const [name, setName] = useState('')
  const [issuer, setIssuer] = useState('')
  const [secret, setSecret] = useState('')
  const [uri, setUri] = useState('')
  const [mode, setMode] = useState<'manual' | 'uri'>('manual')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    let accountName = name
    let accountIssuer = issuer
    let accountSecret = secret

    if (mode === 'uri') {
      try {
        const url = new URL(uri)
        if (url.protocol !== 'otpauth:') throw new Error('Invalid URI')
        accountSecret = url.searchParams.get('secret') || ''
        accountIssuer = url.searchParams.get('issuer') || ''
        const label = decodeURIComponent(url.pathname.slice(1))
        accountName = label.includes(':') ? label.split(':').slice(1).join(':').trim() : label
      } catch {
        setError('Invalid otpauth:// URI')
        setLoading(false)
        return
      }
    }

    if (!accountName || !accountSecret) {
      setError('Name and secret are required')
      setLoading(false)
      return
    }

    const result = await window.sesame.addAccount(accountName, accountIssuer, accountSecret)
    setLoading(false)

    if (result.error) {
      setError(result.error)
    } else {
      onAdded()
    }
  }

  return (
    <div className="max-w-sm mx-auto">
      <h2 className="text-lg font-semibold mb-4">Add Account</h2>

      <div className="flex gap-2 mb-4">
        <button
          onClick={() => setMode('manual')}
          className={`px-3 py-1 text-sm rounded transition-colors ${
            mode === 'manual' ? 'bg-zinc-700 text-zinc-100' : 'text-zinc-400 hover:bg-zinc-800'
          }`}
        >
          Manual
        </button>
        <button
          onClick={() => setMode('uri')}
          className={`px-3 py-1 text-sm rounded transition-colors ${
            mode === 'uri' ? 'bg-zinc-700 text-zinc-100' : 'text-zinc-400 hover:bg-zinc-800'
          }`}
        >
          URI
        </button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-3">
        {mode === 'manual' ? (
          <>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Account name"
              className="w-full px-3 py-2 bg-zinc-900 border border-zinc-700 rounded-lg text-sm focus:outline-none focus:border-zinc-500"
            />
            <input
              type="text"
              value={issuer}
              onChange={(e) => setIssuer(e.target.value)}
              placeholder="Issuer (optional)"
              className="w-full px-3 py-2 bg-zinc-900 border border-zinc-700 rounded-lg text-sm focus:outline-none focus:border-zinc-500"
            />
            <input
              type="text"
              value={secret}
              onChange={(e) => setSecret(e.target.value)}
              placeholder="Secret key"
              className="w-full px-3 py-2 bg-zinc-900 border border-zinc-700 rounded-lg text-sm focus:outline-none focus:border-zinc-500"
            />
          </>
        ) : (
          <input
            type="text"
            value={uri}
            onChange={(e) => setUri(e.target.value)}
            placeholder="otpauth://totp/..."
            className="w-full px-3 py-2 bg-zinc-900 border border-zinc-700 rounded-lg text-sm focus:outline-none focus:border-zinc-500"
          />
        )}

        {error && <p className="text-red-400 text-sm">{error}</p>}

        <button
          type="submit"
          disabled={loading}
          className="w-full py-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 rounded-lg text-sm font-medium transition-colors"
        >
          {loading ? 'Adding...' : 'Add Account'}
        </button>
      </form>
    </div>
  )
}
