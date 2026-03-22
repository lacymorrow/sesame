import React, { useState, useRef, useCallback } from 'react'
import jsQR from 'jsqr'

interface AddAccountProps {
  onAdded: () => void
}

type InputMode = 'manual' | 'uri' | 'scan'

function parseOtpauthUri(uri: string) {
  const url = new URL(uri)
  if (url.protocol !== 'otpauth:') throw new Error('Not an otpauth URI')
  const secret = url.searchParams.get('secret') || ''
  const issuer = url.searchParams.get('issuer') || ''
  const label = decodeURIComponent(url.pathname.slice(1))
  const name = label.includes(':') ? label.split(':').slice(1).join(':').trim() : label
  return { name, issuer, secret }
}

function decodeQrFromImageData(imageData: ImageData): string | null {
  const code = jsQR(imageData.data, imageData.width, imageData.height)
  return code?.data || null
}

export function AddAccount({ onAdded }: AddAccountProps) {
  const [name, setName] = useState('')
  const [issuer, setIssuer] = useState('')
  const [secret, setSecret] = useState('')
  const [uri, setUri] = useState('')
  const [mode, setMode] = useState<InputMode>('scan')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [scanStatus, setScanStatus] = useState('')
  const [dragOver, setDragOver] = useState(false)
  const canvasRef = useRef<HTMLCanvasElement>(null)

  const handleQrResult = useCallback((data: string) => {
    try {
      const parsed = parseOtpauthUri(data)
      setName(parsed.name)
      setIssuer(parsed.issuer)
      setSecret(parsed.secret)
      setMode('manual')
      setScanStatus('')
      setError('')
    } catch {
      setError('QR code found but not a valid otpauth:// URI')
      setScanStatus('')
    }
  }, [])

  const processImage = useCallback(
    (img: HTMLImageElement) => {
      const canvas = canvasRef.current
      if (!canvas) return
      const ctx = canvas.getContext('2d')
      if (!ctx) return

      canvas.width = img.width
      canvas.height = img.height
      ctx.drawImage(img, 0, 0)
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height)
      const result = decodeQrFromImageData(imageData)

      if (result) {
        handleQrResult(result)
      } else {
        setError('No QR code found in image')
        setScanStatus('')
      }
    },
    [handleQrResult]
  )

  const processDataUrl = useCallback(
    (dataUrl: string) => {
      const img = new Image()
      img.onload = () => processImage(img)
      img.onerror = () => {
        setError('Failed to load image')
        setScanStatus('')
      }
      img.src = dataUrl
    },
    [processImage]
  )

  // Screen capture
  const handleScreenCapture = useCallback(async () => {
    setScanStatus('Capturing screen...')
    setError('')
    const result = await window.sesame.captureScreen()
    if (result.error) {
      setError(result.error)
      setScanStatus('')
      return
    }
    setScanStatus('Scanning for QR code...')
    processDataUrl(result.dataUrl)
  }, [processDataUrl])

  // Clipboard paste
  const handlePaste = useCallback(
    async (e?: React.ClipboardEvent) => {
      setScanStatus('Reading clipboard...')
      setError('')

      let items: DataTransferItemList | undefined
      if (e) {
        items = e.clipboardData?.items
      } else {
        // Programmatic read via clipboard API
        try {
          const clipItems = await navigator.clipboard.read()
          for (const item of clipItems) {
            const imageType = item.types.find((t) => t.startsWith('image/'))
            if (imageType) {
              const blob = await item.getType(imageType)
              const reader = new FileReader()
              reader.onload = () => processDataUrl(reader.result as string)
              reader.readAsDataURL(blob)
              return
            }
          }
          // Try text (might be an otpauth URI)
          const text = await navigator.clipboard.readText()
          if (text.startsWith('otpauth://')) {
            handleQrResult(text)
            return
          }
          setError('No image or otpauth URI in clipboard')
          setScanStatus('')
          return
        } catch {
          setError('Clipboard access denied')
          setScanStatus('')
          return
        }
      }

      if (!items) {
        setError('No clipboard data')
        setScanStatus('')
        return
      }

      for (let i = 0; i < items.length; i++) {
        const item = items[i]
        if (item.type.startsWith('image/')) {
          const file = item.getAsFile()
          if (file) {
            const reader = new FileReader()
            reader.onload = () => processDataUrl(reader.result as string)
            reader.readAsDataURL(file)
            return
          }
        }
        if (item.type === 'text/plain') {
          item.getAsString((text) => {
            if (text.startsWith('otpauth://')) {
              handleQrResult(text)
            } else {
              setError('Pasted text is not an otpauth URI')
              setScanStatus('')
            }
          })
          return
        }
      }
      setError('No image or URI in clipboard')
      setScanStatus('')
    },
    [handleQrResult, processDataUrl]
  )

  // File drop
  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      setDragOver(false)
      setScanStatus('Reading file...')
      setError('')

      const file = e.dataTransfer.files[0]
      if (!file) return

      if (file.type.startsWith('image/')) {
        const reader = new FileReader()
        reader.onload = () => processDataUrl(reader.result as string)
        reader.readAsDataURL(file)
      } else {
        setError('Drop an image file containing a QR code')
        setScanStatus('')
      }
    },
    [processDataUrl]
  )

  // File picker
  const handleFilePick = useCallback(() => {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = 'image/*'
    input.onchange = () => {
      const file = input.files?.[0]
      if (!file) return
      setScanStatus('Reading file...')
      setError('')
      const reader = new FileReader()
      reader.onload = () => processDataUrl(reader.result as string)
      reader.readAsDataURL(file)
    }
    input.click()
  }, [processDataUrl])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    let accountName = name
    let accountIssuer = issuer
    let accountSecret = secret

    if (mode === 'uri') {
      try {
        const parsed = parseOtpauthUri(uri)
        accountName = parsed.name || accountName
        accountIssuer = parsed.issuer || accountIssuer
        accountSecret = parsed.secret
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
    <div className="max-w-sm mx-auto" onPaste={handlePaste}>
      <h2 className="text-lg font-semibold mb-4">Add Account</h2>

      {/* Hidden canvas for QR decode */}
      <canvas ref={canvasRef} className="hidden" />

      <div className="flex gap-2 mb-4">
        {(['scan', 'manual', 'uri'] as const).map((m) => (
          <button
            key={m}
            onClick={() => { setMode(m); setError(''); setScanStatus('') }}
            className={`px-3 py-1 text-sm rounded transition-colors ${
              mode === m ? 'bg-zinc-700 text-zinc-100' : 'text-zinc-400 hover:bg-zinc-800'
            }`}
          >
            {m === 'scan' ? 'Scan QR' : m === 'manual' ? 'Manual' : 'URI'}
          </button>
        ))}
      </div>

      {mode === 'scan' ? (
        <div className="space-y-3">
          {/* Drop zone */}
          <div
            onDragOver={(e) => { e.preventDefault(); setDragOver(true) }}
            onDragLeave={() => setDragOver(false)}
            onDrop={handleDrop}
            className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
              dragOver
                ? 'border-emerald-500 bg-emerald-500/10'
                : 'border-zinc-700 hover:border-zinc-500'
            }`}
          >
            <p className="text-zinc-400 text-sm mb-3">
              Drop a QR code image here, or:
            </p>
            <div className="flex gap-2 justify-center flex-wrap">
              <button
                onClick={handleScreenCapture}
                className="px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-sm rounded transition-colors"
              >
                📸 Capture Screen
              </button>
              <button
                onClick={() => handlePaste()}
                className="px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-sm rounded transition-colors"
              >
                📋 Paste from Clipboard
              </button>
              <button
                onClick={handleFilePick}
                className="px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-sm rounded transition-colors"
              >
                📁 Choose File
              </button>
            </div>
          </div>

          {scanStatus && (
            <p className="text-zinc-400 text-sm text-center">{scanStatus}</p>
          )}

          {error && <p className="text-red-400 text-sm text-center">{error}</p>}

          <p className="text-zinc-500 text-xs text-center">
            Tip: Take a screenshot of the QR code, then paste it here (Cmd+V / Ctrl+V)
          </p>
        </div>
      ) : (
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
      )}
    </div>
  )
}
