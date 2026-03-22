import { useState, useEffect } from 'react'

export function Settings() {
  const [port, setPort] = useState('7327')
  const [apiRunning, setApiRunning] = useState(false)
  const [message, setMessage] = useState('')

  useEffect(() => {
    window.sesame.getConfig().then((config: any) => {
      setPort(String(config.port || 7327))
    })
  }, [])

  const handleSaveConfig = async () => {
    const config = await window.sesame.getConfig()
    config.port = parseInt(port, 10)
    await window.sesame.saveConfig(config)
    setMessage('Config saved')
    setTimeout(() => setMessage(''), 2000)
  }

  const handleToggleApi = async () => {
    if (apiRunning) {
      await window.sesame.stopApi()
      setApiRunning(false)
    } else {
      const result = await window.sesame.startApi()
      if (result.error) {
        setMessage(`Error: ${result.error}`)
        setTimeout(() => setMessage(''), 3000)
      } else {
        setApiRunning(true)
      }
    }
  }

  return (
    <div className="max-w-sm mx-auto space-y-6">
      <h2 className="text-lg font-semibold">Settings</h2>

      {/* API Server */}
      <section className="space-y-3">
        <h3 className="text-sm font-medium text-zinc-400">API Server</h3>
        <div className="flex items-center gap-3">
          <div
            className={`w-2 h-2 rounded-full ${apiRunning ? 'bg-emerald-400' : 'bg-zinc-600'}`}
          />
          <span className="text-sm">{apiRunning ? 'Running' : 'Stopped'}</span>
          <button
            onClick={handleToggleApi}
            className="ml-auto px-3 py-1 text-sm rounded bg-zinc-800 hover:bg-zinc-700 transition-colors"
          >
            {apiRunning ? 'Stop' : 'Start'}
          </button>
        </div>
        <div className="flex items-center gap-2">
          <label className="text-sm text-zinc-400">Port:</label>
          <input
            type="number"
            value={port}
            onChange={(e) => setPort(e.target.value)}
            className="w-24 px-2 py-1 bg-zinc-900 border border-zinc-700 rounded text-sm focus:outline-none focus:border-zinc-500"
          />
        </div>
      </section>

      {/* Save */}
      <div className="flex items-center gap-3">
        <button
          onClick={handleSaveConfig}
          className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 rounded-lg text-sm font-medium transition-colors"
        >
          Save Config
        </button>
        {message && <span className="text-sm text-emerald-400">{message}</span>}
      </div>
    </div>
  )
}
