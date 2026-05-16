import React, { useState, useEffect, useMemo } from 'react'
import { motion } from 'framer-motion'
import { Lock, ShieldCheck } from 'lucide-react'

interface UnlockScreenProps {
  onUnlock: () => void
}

function PasswordStrength({ password }: { password: string }) {
  const strength = useMemo(() => {
    let score = 0
    if (password.length >= 8) score++
    if (password.length >= 12) score++
    if (/[A-Z]/.test(password) && /[a-z]/.test(password)) score++
    if (/[0-9]/.test(password)) score++
    if (/[^A-Za-z0-9]/.test(password)) score++
    return score
  }, [password])

  const labels = ['', 'Weak', 'Fair', 'Good', 'Strong', 'Excellent']
  const colors = ['bg-zinc-700', 'bg-red-500', 'bg-orange-500', 'bg-yellow-500', 'bg-emerald-500', 'bg-emerald-400']

  if (!password) return null

  return (
    <div className="space-y-1.5">
      <div className="flex gap-1">
        {[1, 2, 3, 4, 5].map((i) => (
          <div
            key={i}
            className={`h-1 flex-1 rounded-full transition-colors duration-200 ${
              i <= strength ? colors[strength] : 'bg-zinc-800'
            }`}
          />
        ))}
      </div>
      <p className="text-xs text-zinc-500">{labels[strength]}</p>
    </div>
  )
}

export function UnlockScreen({ onUnlock }: UnlockScreenProps) {
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [shakeKey, setShakeKey] = useState(0)
  const [vaultExists, setVaultExists] = useState<boolean | null>(null)

  useEffect(() => {
    window.sesame.vaultExists().then((res: any) => {
      setVaultExists(res.exists)
    })
  }, [])

  const isCreateMode = vaultExists === false

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!password) return

    if (isCreateMode && password !== confirmPassword) {
      setError('Passwords do not match')
      setShakeKey((k) => k + 1)
      return
    }

    if (isCreateMode && password.length < 8) {
      setError('Password must be at least 8 characters')
      setShakeKey((k) => k + 1)
      return
    }

    setLoading(true)
    setError('')

    const result = await window.sesame.unlock(password)
    setLoading(false)

    if (result.success) {
      onUnlock()
    } else {
      setError(result.error || 'Failed to unlock vault')
      setShakeKey((k) => k + 1)
    }
  }

  if (vaultExists === null) return null

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.4 }}
      className="flex flex-col items-center justify-center h-screen px-8"
      style={{ background: 'radial-gradient(ellipse at 50% 30%, rgba(6, 78, 59, 0.15), transparent 70%)' }}
    >
      <div
        className="flex flex-col items-center rounded-2xl border border-white/[0.06] p-8 w-full max-w-xs"
        style={{ backdropFilter: 'blur(16px) saturate(1.2)', backgroundColor: 'rgba(255, 255, 255, 0.03)' }}
      >
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: 0.1, duration: 0.4, type: 'spring', stiffness: 200 }}
          className="w-20 h-20 rounded-2xl bg-gradient-to-br from-emerald-600/20 to-emerald-800/10 border border-emerald-700/20 flex items-center justify-center mb-6"
        >
          {isCreateMode ? (
            <ShieldCheck size={32} className="text-emerald-400" />
          ) : (
            <Lock size={32} className="text-emerald-400" />
          )}
        </motion.div>

        <motion.h1
          initial={{ y: 10, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.2, duration: 0.3 }}
          className="text-2xl font-bold mb-1 tracking-tight"
        >
          {isCreateMode ? 'Create your vault' : 'Welcome back'}
        </motion.h1>

        <motion.p
          initial={{ y: 10, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.3, duration: 0.3 }}
          className="text-zinc-500 text-sm mb-8"
        >
          {isCreateMode
            ? 'Choose a master password to encrypt your codes'
            : 'Enter your master password'}
        </motion.p>

        <motion.form
          key={shakeKey}
          initial={shakeKey > 0 ? { x: 0 } : { y: 15, opacity: 0 }}
          animate={shakeKey > 0 ? { x: [0, -10, 10, -8, 8, -4, 4, 0] } : { y: 0, opacity: 1 }}
          transition={shakeKey > 0 ? { duration: 0.4, ease: 'easeInOut' } : { delay: 0.4, duration: 0.3 }}
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

          {isCreateMode && (
            <>
              <PasswordStrength password={password} />
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Confirm password"
                className="w-full px-4 py-3 bg-zinc-900/60 border border-zinc-700 rounded-xl text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-emerald-600/50 focus:ring-1 focus:ring-emerald-600/30 transition-all"
              />
            </>
          )}

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
            disabled={loading || !password || (isCreateMode && !confirmPassword)}
            className="w-full py-3 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 disabled:hover:bg-emerald-600 rounded-xl font-medium transition-colors"
          >
            {loading
              ? isCreateMode ? 'Creating...' : 'Unlocking...'
              : isCreateMode ? 'Create vault' : 'Unlock'}
          </button>
        </motion.form>

        {isCreateMode && (
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.6, duration: 0.4 }}
            className="text-zinc-600 text-xs mt-8 text-center max-w-xs"
          >
            Your password encrypts all stored codes locally. It cannot be recovered if forgotten.
          </motion.p>
        )}
      </div>
    </motion.div>
  )
}
