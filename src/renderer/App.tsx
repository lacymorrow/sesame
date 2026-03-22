import React, { useState, useEffect } from 'react'
import { WindowContextProvider } from '@/app/components/window/WindowContext'
import { menuItems } from '@/lib/window'
import { UnlockScreen } from './components/UnlockScreen'
import { Dashboard } from './components/Dashboard'
import { AddAccount } from './components/AddAccount'
import { Settings } from './components/Settings'

type View = 'dashboard' | 'add' | 'settings'

function SesameApp() {
  const [unlocked, setUnlocked] = useState(false)
  const [view, setView] = useState<View>('dashboard')

  useEffect(() => {
    window.sesame.isUnlocked().then((res: any) => {
      setUnlocked(res.unlocked)
    })
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

  return (
    <div className="flex flex-col h-full">
      <header className="flex items-center justify-between px-4 py-3 border-b border-zinc-800">
        <h1 className="text-lg font-semibold tracking-tight">Sesame</h1>
        <div className="flex gap-1">
          <NavButton active={view === 'dashboard'} onClick={() => setView('dashboard')}>
            Codes
          </NavButton>
          <NavButton active={view === 'add'} onClick={() => setView('add')}>
            Add
          </NavButton>
          <NavButton active={view === 'settings'} onClick={() => setView('settings')}>
            Settings
          </NavButton>
          <button
            onClick={handleLock}
            className="ml-2 px-2 py-1 text-xs rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-400 hover:text-zinc-200 transition-colors"
          >
            Lock
          </button>
        </div>
      </header>

      <main className="flex-1 overflow-y-auto p-4">
        {view === 'dashboard' && <Dashboard />}
        {view === 'add' && <AddAccount onAdded={() => setView('dashboard')} />}
        {view === 'settings' && <Settings />}
      </main>
    </div>
  )
}

function NavButton({
  active,
  onClick,
  children,
}: {
  active: boolean
  onClick: () => void
  children: React.ReactNode
}) {
  return (
    <button
      onClick={onClick}
      className={`px-3 py-1 text-sm rounded transition-colors ${
        active ? 'bg-zinc-700 text-zinc-100' : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800'
      }`}
    >
      {children}
    </button>
  )
}

export default function App() {
  return (
    <WindowContextProvider titlebar={{ title: 'Sesame', menuItems }}>
      <SesameApp />
    </WindowContextProvider>
  )
}
