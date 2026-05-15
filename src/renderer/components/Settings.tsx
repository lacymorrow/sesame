import { useState, useEffect, useRef, useCallback } from 'react'
import { motion } from 'framer-motion'
import {
  Server, Download, Upload, Clock, Eye, EyeOff, Check,
  Shield, Info, ExternalLink, Keyboard, Copy, Zap, FileText,
} from 'lucide-react'
import { useToast } from './Toast'

const VERSION = '0.1.0'
const GITHUB_URL = 'https://github.com/lacymorrow/sesame'

const SHORTCUTS = [
  { keys: ['Cmd', 'L'], label: 'Lock vault' },
  { keys: ['Cmd', 'K'], label: 'Search' },
  { keys: ['Cmd', 'N'], label: 'New account' },
  { keys: ['Cmd', ','], label: 'Settings' },
  { keys: ['Cmd', '1/2/3'], label: 'Switch tabs' },
  { keys: ['↑', '↓'], label: 'Navigate accounts' },
  { keys: ['Enter'], label: 'Copy selected code' },
]

interface AuditEntry {
  id: number
  account_name: string
  requester: string
  timestamp: string
}

export function Settings() {
  const [port, setPort] = useState('7327')
  const [apiRunning, setApiRunning] = useState(false)
  const [autoLockMinutes, setAutoLockMinutes] = useState('5')
  const [showCodes, setShowCodes] = useState(true)
  const [savedField, setSavedField] = useState<string | null>(null)
  const [testResult, setTestResult] = useState<'idle' | 'loading' | 'ok' | 'fail'>('idle')
  const [lastApiRequest, setLastApiRequest] = useState<string | null>(null)
  const [auditLog, setAuditLog] = useState<AuditEntry[]>([])
  const { toast } = useToast()
  const portDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    window.sesame.getConfig().then((config: any) => {
      setPort(String(config.port || 7327))
      if (config.autoLockMinutes) setAutoLockMinutes(String(config.autoLockMinutes))
      if (config.showCodes !== undefined) setShowCodes(config.showCodes)
    })
  }, [])

  useEffect(() => {
    window.sesame.getAuditLog(20).then((log: any) => {
      if (Array.isArray(log)) {
        setAuditLog(log)
        const apiEntry = log.find((e: AuditEntry) => e.requester === 'api')
        if (apiEntry) setLastApiRequest(apiEntry.timestamp)
      }
    })
  }, [])

  const saveConfig = useCallback(async (overrides: Record<string, unknown> = {}) => {
    const config = await window.sesame.getConfig()
    config.port = parseInt(overrides.port as string ?? port, 10)
    config.autoLockMinutes = parseInt(overrides.autoLockMinutes as string ?? autoLockMinutes, 10)
    config.showCodes = overrides.showCodes !== undefined ? overrides.showCodes : showCodes
    await window.sesame.saveConfig(config)
  }, [port, autoLockMinutes, showCodes])

  const flashSaved = (field: string) => {
    setSavedField(field)
    setTimeout(() => setSavedField(null), 1500)
  }

  const handlePortChange = (value: string) => {
    setPort(value)
    if (portDebounceRef.current) clearTimeout(portDebounceRef.current)
    portDebounceRef.current = setTimeout(async () => {
      await saveConfig({ port: value })
      flashSaved('port')
    }, 500)
  }

  const handleAutoLockChange = async (value: string) => {
    setAutoLockMinutes(value)
    await saveConfig({ autoLockMinutes: value })
    flashSaved('autoLock')
  }

  const handleShowCodesToggle = async () => {
    const next = !showCodes
    setShowCodes(next)
    await saveConfig({ showCodes: next })
    flashSaved('showCodes')
  }

  const handleToggleApi = async () => {
    if (apiRunning) {
      await window.sesame.stopApi()
      setApiRunning(false)
      toast('API server stopped')
    } else {
      const result = await window.sesame.startApi()
      if (result.error) {
        toast(result.error, 'error')
      } else {
        setApiRunning(true)
        toast('API server started')
      }
    }
  }

  const handleTestApi = async () => {
    setTestResult('loading')
    try {
      const response = await fetch(`http://127.0.0.1:${port}/health`)
      if (response.ok) {
        setTestResult('ok')
        toast('API is healthy')
      } else {
        setTestResult('fail')
        toast('API returned an error', 'error')
      }
    } catch {
      setTestResult('fail')
      toast('Cannot reach API server', 'error')
    }
    setTimeout(() => setTestResult('idle'), 3000)
  }

  const handleCopyUrl = async () => {
    await navigator.clipboard.writeText(`http://127.0.0.1:${port}`)
    toast('URL copied to clipboard')
  }

  const handleExport = async () => {
    try {
      const result = await window.sesame.exportVault()
      if (result.error) {
        toast(result.error, 'error')
      } else {
        toast(`Exported to ${result.path}`)
      }
    } catch {
      toast('Export not available yet', 'info')
    }
  }

  const handleImport = async () => {
    try {
      const result = await window.sesame.importVault()
      if (result.error) {
        toast(result.error, 'error')
      } else {
        toast(`Imported ${result.count} accounts`)
      }
    } catch {
      toast('Import not available yet', 'info')
    }
  }

  const apiUrl = `http://127.0.0.1:${port}`

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
      className="max-w-sm mx-auto space-y-6"
    >
      {/* API Server — redesigned */}
      <Section title="API Server" icon={Server}>
        <div className="space-y-3">
          <div className="flex items-center gap-3">
            <div
              className={`w-2 h-2 rounded-full transition-colors ${
                apiRunning ? 'bg-emerald-400 shadow-[0_0_6px_rgba(52,211,153,0.4)]' : 'bg-zinc-600'
              }`}
            />
            <span className="text-sm text-zinc-300">{apiRunning ? 'Running' : 'Stopped'}</span>
            <button
              onClick={handleToggleApi}
              className="ml-auto px-3 py-1.5 text-xs rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 transition-colors"
            >
              {apiRunning ? 'Stop' : 'Start'}
            </button>
          </div>

          {/* Full URL display */}
          <div className="flex items-center gap-2">
            <div
              onClick={handleCopyUrl}
              className="flex-1 flex items-center gap-2 px-2.5 py-1.5 bg-zinc-900/60 border border-zinc-700 rounded-lg cursor-pointer hover:border-zinc-500 transition-colors group"
            >
              <span className="text-xs font-mono text-zinc-400 truncate">{apiUrl}</span>
              <Copy size={11} className="text-zinc-500 group-hover:text-zinc-300 transition-colors shrink-0" />
            </div>
            <button
              onClick={handleTestApi}
              disabled={testResult === 'loading'}
              className={`flex items-center gap-1 px-2.5 py-1.5 text-xs rounded-lg transition-colors ${
                testResult === 'ok'
                  ? 'bg-emerald-600/20 text-emerald-400'
                  : testResult === 'fail'
                    ? 'bg-red-600/20 text-red-400'
                    : 'bg-zinc-800 hover:bg-zinc-700 text-zinc-300'
              }`}
            >
              <Zap size={11} />
              {testResult === 'loading' ? '...' : testResult === 'ok' ? 'OK' : testResult === 'fail' ? 'Fail' : 'Test'}
            </button>
          </div>

          <div className="flex items-center gap-2">
            <label className="text-xs text-zinc-500">Port</label>
            <input
              type="number"
              value={port}
              onChange={(e) => handlePortChange(e.target.value)}
              className="w-20 px-2 py-1 bg-zinc-900/60 border border-zinc-700 rounded-lg text-sm focus:outline-none focus:border-zinc-500 transition-colors"
            />
            <SavedCheck visible={savedField === 'port'} />
          </div>

          {lastApiRequest && apiRunning && (
            <div className="flex items-center gap-1.5 text-[11px] text-zinc-500">
              <Clock size={10} />
              <span>Last agent request: {formatRelativeTime(lastApiRequest)}</span>
            </div>
          )}
        </div>
      </Section>

      {/* Security */}
      <Section title="Security" icon={Shield}>
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <Clock size={13} className="text-zinc-500" />
            <label className="text-xs text-zinc-500">Auto-lock after</label>
            <select
              value={autoLockMinutes}
              onChange={(e) => handleAutoLockChange(e.target.value)}
              className="px-2 py-1 bg-zinc-900/60 border border-zinc-700 rounded-lg text-sm focus:outline-none focus:border-zinc-500 transition-colors"
            >
              <option value="1">1 min</option>
              <option value="5">5 min</option>
              <option value="15">15 min</option>
              <option value="30">30 min</option>
              <option value="0">Never</option>
            </select>
            <SavedCheck visible={savedField === 'autoLock'} />
          </div>
          <div className="flex items-center justify-between w-full">
            <div className="flex items-center gap-2">
              {showCodes ? <Eye size={13} className="text-zinc-500" /> : <EyeOff size={13} className="text-zinc-500" />}
              <span className="text-sm text-zinc-300">Show TOTP codes</span>
            </div>
            <div className="flex items-center gap-2">
              <SavedCheck visible={savedField === 'showCodes'} />
              <button
                role="switch"
                aria-checked={showCodes}
                aria-label="Show TOTP codes"
                onClick={handleShowCodesToggle}
                className={`w-9 h-5 rounded-full transition-colors flex items-center ${
                  showCodes ? 'bg-emerald-600' : 'bg-zinc-700'
                }`}
              >
                <div
                  className={`w-4 h-4 rounded-full bg-white shadow transition-transform ${
                    showCodes ? 'translate-x-[18px]' : 'translate-x-[2px]'
                  }`}
                />
              </button>
            </div>
          </div>
        </div>
      </Section>

      {/* Audit Log — NEW */}
      <Section title="Access Log" icon={FileText}>
        {auditLog.length === 0 ? (
          <p className="text-xs text-zinc-500">No access events recorded yet.</p>
        ) : (
          <div className="space-y-1 max-h-48 overflow-y-auto">
            {auditLog.map((entry) => (
              <div key={entry.id} className="flex items-center gap-2 py-1.5 border-b border-zinc-800/40 last:border-0">
                <span className="text-[10px] font-mono text-zinc-500 w-14 shrink-0">
                  {formatTime(entry.timestamp)}
                </span>
                <span className="text-xs text-zinc-300 truncate flex-1">{entry.account_name}</span>
                <span
                  className={`px-1.5 py-0.5 text-[10px] rounded font-medium ${
                    entry.requester === 'api'
                      ? 'bg-violet-400/15 text-violet-400'
                      : entry.requester === 'cli'
                        ? 'bg-amber-400/15 text-amber-400'
                        : 'bg-zinc-700/50 text-zinc-400'
                  }`}
                >
                  {entry.requester}
                </span>
              </div>
            ))}
          </div>
        )}
      </Section>

      {/* Vault Import/Export */}
      <Section title="Vault" icon={Download}>
        <div className="flex gap-2">
          <button
            onClick={handleExport}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 transition-colors"
          >
            <Download size={13} />
            Export
          </button>
          <button
            onClick={handleImport}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 transition-colors"
          >
            <Upload size={13} />
            Import
          </button>
        </div>
      </Section>

      {/* About */}
      <Section title="About" icon={Info}>
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm text-zinc-300">Version</span>
            <span className="text-sm text-zinc-500 font-mono">{VERSION}</span>
          </div>
          <a
            href={GITHUB_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 text-sm text-zinc-400 hover:text-zinc-200 transition-colors"
          >
            <ExternalLink size={13} />
            GitHub
          </a>
          <div className="pt-2 border-t border-zinc-800/60">
            <div className="flex items-center gap-1.5 mb-2">
              <Keyboard size={13} className="text-zinc-500" />
              <span className="text-xs text-zinc-500 font-medium">Keyboard shortcuts</span>
            </div>
            <div className="space-y-1.5">
              {SHORTCUTS.map((s) => (
                <div key={s.label} className="flex items-center justify-between">
                  <span className="text-xs text-zinc-400">{s.label}</span>
                  <div className="flex gap-1">
                    {s.keys.map((k) => (
                      <kbd
                        key={k}
                        className="px-1.5 py-0.5 text-[10px] bg-zinc-800 border border-zinc-700 rounded text-zinc-400 font-mono"
                      >
                        {k}
                      </kbd>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </Section>
    </motion.div>
  )
}

function formatTime(timestamp: string): string {
  try {
    const d = new Date(timestamp + 'Z')
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  } catch {
    return timestamp.slice(11, 16)
  }
}

function formatRelativeTime(timestamp: string): string {
  try {
    const d = new Date(timestamp + 'Z')
    const diff = Date.now() - d.getTime()
    const mins = Math.floor(diff / 60000)
    if (mins < 1) return 'just now'
    if (mins < 60) return `${mins}m ago`
    const hours = Math.floor(mins / 60)
    if (hours < 24) return `${hours}h ago`
    return d.toLocaleDateString()
  } catch {
    return timestamp
  }
}

function SavedCheck({ visible }: { visible: boolean }) {
  return (
    <motion.span
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: visible ? 1 : 0, scale: visible ? 1 : 0.8 }}
      transition={{ duration: 0.15 }}
      className="text-emerald-400"
    >
      <Check size={13} />
    </motion.span>
  )
}

function Section({
  title,
  icon: Icon,
  children,
}: {
  title: string
  icon: any
  children: React.ReactNode
}) {
  return (
    <div className="p-4 bg-zinc-900/40 border border-zinc-800/60 rounded-xl">
      <div className="flex items-center gap-2 mb-3">
        <Icon size={14} className="text-zinc-500" />
        <h3 className="text-xs font-medium text-zinc-400 uppercase tracking-wider">{title}</h3>
      </div>
      {children}
    </div>
  )
}
