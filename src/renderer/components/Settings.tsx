import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Server, Download, Upload, Clock, Eye, EyeOff } from 'lucide-react'
import { useToast } from './Toast'

export function Settings() {
  const [port, setPort] = useState('7327')
  const [apiRunning, setApiRunning] = useState(false)
  const [autoLockMinutes, setAutoLockMinutes] = useState('5')
  const [showCodes, setShowCodes] = useState(true)
  const { toast } = useToast()

  useEffect(() => {
    window.sesame.getConfig().then((config: any) => {
      setPort(String(config.port || 7327))
      if (config.autoLockMinutes) setAutoLockMinutes(String(config.autoLockMinutes))
      if (config.showCodes !== undefined) setShowCodes(config.showCodes)
    })
  }, [])

  const handleSaveConfig = async () => {
    const config = await window.sesame.getConfig()
    config.port = parseInt(port, 10)
    config.autoLockMinutes = parseInt(autoLockMinutes, 10)
    config.showCodes = showCodes
    await window.sesame.saveConfig(config)
    toast('Settings saved')
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

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
      className="max-w-sm mx-auto space-y-6"
    >
      {/* API Server */}
      <Section title="API Server" icon={Server}>
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
        <div className="flex items-center gap-2 mt-3">
          <label className="text-xs text-zinc-500">Port</label>
          <input
            type="number"
            value={port}
            onChange={(e) => setPort(e.target.value)}
            className="w-20 px-2 py-1 bg-zinc-900/60 border border-zinc-700 rounded-lg text-sm focus:outline-none focus:border-zinc-500 transition-colors"
          />
        </div>
      </Section>

      {/* Display */}
      <Section title="Display" icon={showCodes ? Eye : EyeOff}>
        <button
          onClick={() => setShowCodes(!showCodes)}
          className="flex items-center justify-between w-full text-sm text-zinc-300"
        >
          <span>Show TOTP codes</span>
          <div
            className={`w-9 h-5 rounded-full transition-colors flex items-center ${
              showCodes ? 'bg-emerald-600' : 'bg-zinc-700'
            }`}
          >
            <div
              className={`w-4 h-4 rounded-full bg-white shadow transition-transform ${
                showCodes ? 'translate-x-[18px]' : 'translate-x-[2px]'
              }`}
            />
          </div>
        </button>
      </Section>

      {/* Auto-lock */}
      <Section title="Security" icon={Clock}>
        <div className="flex items-center gap-2">
          <label className="text-xs text-zinc-500">Auto-lock after</label>
          <select
            value={autoLockMinutes}
            onChange={(e) => setAutoLockMinutes(e.target.value)}
            className="px-2 py-1 bg-zinc-900/60 border border-zinc-700 rounded-lg text-sm focus:outline-none focus:border-zinc-500 transition-colors"
          >
            <option value="1">1 min</option>
            <option value="5">5 min</option>
            <option value="15">15 min</option>
            <option value="30">30 min</option>
            <option value="0">Never</option>
          </select>
        </div>
      </Section>

      {/* Import/Export */}
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

      {/* Save */}
      <button
        onClick={handleSaveConfig}
        className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-500 rounded-xl text-sm font-medium transition-colors"
      >
        Save Settings
      </button>
    </motion.div>
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
