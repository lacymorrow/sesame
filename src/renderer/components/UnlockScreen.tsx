import React, { useState } from 'react'
import { motion } from 'framer-motion'
import { Lock } from 'lucide-react'

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
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.4 }}
      className="flex flex-col items-center justify-center h-screen px-8"
    >
      <motion.div
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ delay: 0.1, duration: 0.4, type: 'spring', stiffness: 200 }}
        className="w-20 h-20 rounded-2xl bg-gradient-to-br from-emerald-600/20 to-emerald-800/10 border border-emerald-700/20 flex items-center justify-center mb-6"
      >
        <Lock size={32} className="text-emerald-400" />
      </motion.div>

      <motion.h1
        initial={{ y: 10, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.2, duration: 0.3 }}
        className="text-2xl font-bold mb-1 tracking-tight"
      >
        Sesame
      </motion.h1>

      <motion.p
        initial={{ y: 10, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.3, duration: 0.3 }}
        className="text-zinc-500 text-sm mb-8"
      >
        Enter your master password
      </motion.p>

      <motion.form
        initial={{ y: 15, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.4, duration: 0.3 }}
        onSubmit={handleSubmit}
        className="w-full max-w-xs space-y-4"
      >
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Master password"
          autoFocus
          className="w-full px-4 py-3 bg-zinc-900/60 border border-zinc-700 rounded-xl text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-emerald-600/50 focus:ring-1 focus:ring-emerald-600/30 transition-all"
        />
        {error && (
          <motion.p
            initial={{ opacity: 0, y: -5 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-red-400 text-sm"
          >
            {error}
          </motion.p>
        )}
        <button
          type="submit"
          disabled={loading || !password}
          className="w-full py-3 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 disabled:hover:bg-emerald-600 rounded-xl font-medium transition-colors"
        >
          {loading ? 'Unlocking...' : 'Unlock'}
        </button>
      </motion.form>

      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.6, duration: 0.4 }}
        className="text-zinc-600 text-xs mt-8 text-center"
      >
        First time? Enter a new password to create your vault.
      </motion.p>
    </motion.div>
  )
}
