import React, { useState, useEffect } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { WindowContextProvider } from '@/app/components/window/WindowContext'
import { menuItems } from '@/lib/window'
import { KeyRound, Plus, Settings as SettingsIcon, Lock } from 'lucide-react'
import { UnlockScreen } from './components/UnlockScreen'
import { Dashboard } from './components/Dashboard'
import { AddAccount } from './components/AddAccount'
import { Settings } from './components/Settings'
import { ToastProvider } from './components/Toast'

type View = 'dashboard' | 'add' | 'settings'

const viewVariants = {
  initial: { opacity: 0, y: 6 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -6 },
}

function SesameApp() {
  const [unlocked, setUnlocked] = useState(false)
  const [view, setView] = useState<View>('dashboard')

  useEffect(() => {
    window.sesame.isUnlocked().then((res: any) => {
      setUnlocked(res.unlocked)
    })
  }, [])

  // Global keyboard shortcuts
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'l') {
        e.preventDefault()
        handleLock()
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [])

  const handleUnlock = () => {
    setUnlocked(true)
    setView('dashboard')
  }

  const handleLock = async () => {
    await window.sesame.lock()
    setUnlocked(false)
    setView('dashboard')
  }

  if (!unlocked) {
    return <UnlockScreen onUnlock={handleUnlock} />
  }

  const navItems: { id: View; label: string; icon: typeof KeyRound }[] = [
    { id: 'dashboard', label: 'Codes', icon: KeyRound },
    { id: 'add', label: 'Add', icon: Plus },
    { id: 'settings', label: 'Settings', icon: SettingsIcon },
  ]

  return (
    <div className="flex flex-col h-full">
      <header className="flex items-center justify-between px-4 py-2.5 border-b border-zinc-800/60">
        <h1 className="text-sm font-semibold tracking-tight text-zinc-400">Sesame</h1>
        <div className="flex items-center gap-0.5">
          {navItems.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setView(id)}
              className={`flex items-center gap-1.5 px-2.5 py-1.5 text-xs rounded-lg transition-all ${
                view === id
                  ? 'bg-zinc-800 text-zinc-100'
                  : 'text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800/50'
              }`}
            >
              <Icon size={13} />
              {label}
            </button>
          ))}
          <button
            onClick={handleLock}
            className="ml-1.5 p-1.5 rounded-lg text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800/50 transition-colors"
            title="Lock vault (Cmd+L)"
          >
            <Lock size={13} />
          </button>
        </div>
      </header>

      <main className="flex-1 overflow-y-auto p-4">
        <AnimatePresence mode="wait">
          <motion.div
            key={view}
            variants={viewVariants}
            initial="initial"
            animate="animate"
            exit="exit"
            transition={{ duration: 0.15 }}
            className="h-full"
          >
            {view === 'dashboard' && <Dashboard onNavigate={(v) => setView(v as View)} />}
            {view === 'add' && <AddAccount onAdded={() => setView('dashboard')} />}
            {view === 'settings' && <Settings />}
          </motion.div>
        </AnimatePresence>
      </main>
    </div>
  )
}

export default function App() {
  return (
    <WindowContextProvider titlebar={{ title: 'Sesame', menuItems }}>
      <ToastProvider>
        <SesameApp />
      </ToastProvider>
    </WindowContextProvider>
  )
}
