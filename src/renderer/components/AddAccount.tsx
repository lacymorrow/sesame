import React, { useState, useRef, useCallback, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Camera, Clipboard, FileImage, QrCode, PenLine, Link, Check } from 'lucide-react'
import { useToast } from './Toast'
import { IssuerIcon } from './IssuerIcon'
import jsQR from 'jsqr'

interface AddAccountProps {
  onAdded: (accountName?: string) => void
}

type InputMode = 'manual' | 'uri' | 'scan'

const COMMON_ISSUERS = [
  'GitHub', 'Google', 'AWS', 'Microsoft', 'Slack', 'Cloudflare',
  'Vercel', 'Discord', 'Twitter', 'Stripe', 'DigitalOcean', 'npm',
  'GitLab', 'Heroku', 'Dropbox', 'Facebook', 'Reddit', 'Twitch',
  'LinkedIn', 'PyPI', 'Docker Hub', 'Bitwarden', 'Coinbase',
]

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
  const [previewCode, setPreviewCode] = useState<string | null>(null)
  const [previewRemaining, setPreviewRemaining] = useState(0)
  const [issuerOpen, setIssuerOpen] = useState(false)
  const [issuerFilter, setIssuerFilter] = useState('')
  const [addedAccount, setAddedAccount] = useState<{name: string, issuer: string, code: string | null} | null>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const issuerRef = useRef<HTMLDivElement>(null)
  const { toast } = useToast()

  // Auto-paste otpauth:// URI from clipboard on mount
  useEffect(() => {
    (async () => {
      try {
        const text = await navigator.clipboard.readText()
        if (text.startsWith('otpauth://')) {
          const parsed = parseOtpauthUri(text)
          setName(parsed.name)
          setIssuer(parsed.issuer)
          setSecret(parsed.secret)
          setMode('manual')
          toast('Detected otpauth URI in clipboard', 'success')
        }
      } catch {
        // Clipboard access denied — ignore
      }
    })()
  }, [toast])

  // Live TOTP preview while typing secret
  useEffect(() => {
    if (!secret || secret.length < 8) {
      setPreviewCode(null)
      return
    }

    let cancelled = false
    const update = async () => {
      const result = await window.sesame.previewCode(secret)
      if (!cancelled && result.code) {
        setPreviewCode(result.code)
        setPreviewRemaining(result.remaining)
      } else if (!cancelled) {
        setPreviewCode(null)
      }
    }

    update()
    const interval = setInterval(update, 1000)
    return () => { cancelled = true; clearInterval(interval) }
  }, [secret])

  // Close issuer dropdown on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (issuerRef.current && !issuerRef.current.contains(e.target as Node)) {
        setIssuerOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const filteredIssuers = COMMON_ISSUERS.filter((i) =>
    i.toLowerCase().includes((issuerFilter || issuer).toLowerCase())
  )

  const handleQrResult = useCallback(
    (data: string) => {
      try {
        const parsed = parseOtpauthUri(data)
        setName(parsed.name)
        setIssuer(parsed.issuer)
        setSecret(parsed.secret)
        setMode('manual')
        setScanStatus('')
        setError('')
        toast('QR code scanned', 'success')
      } catch {
        setError('QR code found but not a valid otpauth:// URI')
        setScanStatus('')
      }
    },
    [toast]
  )

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

  const handlePaste = useCallback(
    async (e?: React.ClipboardEvent) => {
      setScanStatus('Reading clipboard...')
      setError('')

      let items: DataTransferItemList | undefined
      if (e) {
        items = e.clipboardData?.items
      } else {
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
      const preview = await window.sesame.previewCode(accountSecret)
      setAddedAccount({
        name: accountName,
        issuer: accountIssuer,
        code: preview.code || null,
      })
      toast('Account added')
      setTimeout(() => onAdded(accountName), 1500)
    }
  }

  const handleIssuerInput = (value: string) => {
    setIssuer(value)
    setIssuerFilter(value)
    setIssuerOpen(true)
  }

  const selectIssuer = (value: string) => {
    setIssuer(value)
    setIssuerOpen(false)
  }

  const modes: { id: InputMode; label: string; icon: typeof QrCode }[] = [
    { id: 'scan', label: 'Scan QR', icon: QrCode },
    { id: 'manual', label: 'Manual', icon: PenLine },
    { id: 'uri', label: 'URI', icon: Link },
  ]

  const formattedPreview = previewCode
    ? `${previewCode.slice(0, 3)} ${previewCode.slice(3)}`
    : null

  if (addedAccount) {
    const formattedCode = addedAccount.code
      ? `${addedAccount.code.slice(0, 3)} ${addedAccount.code.slice(3)}`
      : '--- ---'

    return (
      <div className="flex flex-col items-center justify-center py-16">
        <motion.div
          layoutId={`account-${addedAccount.name}`}
          className="w-full max-w-sm flex items-center gap-3 p-3.5 rounded-xl border border-emerald-700/30 bg-zinc-900/50 shadow-[0_0_24px_rgba(52,211,153,0.1)]"
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: 'spring', stiffness: 300, damping: 25 }}
        >
          <IssuerIcon issuer={addedAccount.issuer} name={addedAccount.name} />
          <div className="flex-1 min-w-0">
            <div className="flex items-baseline gap-1.5">
              {addedAccount.issuer && (
                <span className="text-xs font-medium text-zinc-400">{addedAccount.issuer}</span>
              )}
              <span className="text-xs text-zinc-500">{addedAccount.name}</span>
            </div>
            <div className="text-[24px] font-mono font-bold tracking-[0.25em] text-zinc-50 mt-0.5">
              {formattedCode}
            </div>
          </div>
        </motion.div>
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, duration: 0.3 }}
          className="flex items-center gap-2 mt-4 text-emerald-400"
        >
          <Check size={16} />
          <span className="text-sm font-medium">Account added</span>
        </motion.div>
      </div>
    )
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
      className="max-w-sm mx-auto"
      onPaste={handlePaste}
    >
      <canvas ref={canvasRef} className="hidden" />

      <div className="flex gap-1 mb-5 p-1 bg-zinc-900/40 rounded-xl">
        {modes.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => {
              setMode(id)
              setError('')
              setScanStatus('')
            }}
            className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2 text-xs rounded-lg transition-all ${
              mode === id
                ? 'bg-zinc-700 text-zinc-100 shadow-sm'
                : 'text-zinc-500 hover:text-zinc-300'
            }`}
          >
            <Icon size={13} />
            {label}
          </button>
        ))}
      </div>

      {mode === 'scan' ? (
        <div className="space-y-3">
          <div
            onDragOver={(e) => {
              e.preventDefault()
              setDragOver(true)
            }}
            onDragLeave={() => setDragOver(false)}
            onDrop={handleDrop}
            className={`border-2 border-dashed rounded-xl p-8 text-center transition-all ${
              dragOver
                ? 'border-emerald-500/60 bg-emerald-500/5'
                : 'border-zinc-800 hover:border-zinc-600'
            }`}
          >
            <QrCode size={32} className="mx-auto mb-3 text-zinc-600" />
            <p className="text-zinc-400 text-sm mb-4">Drop a QR code image here</p>
            <div className="flex gap-2 justify-center flex-wrap">
              <ScanButton icon={Camera} label="Screen" onClick={handleScreenCapture} />
              <ScanButton icon={Clipboard} label="Clipboard" onClick={() => handlePaste()} />
              <ScanButton icon={FileImage} label="File" onClick={handleFilePick} />
            </div>
          </div>

          {scanStatus && (
            <p className="text-zinc-400 text-xs text-center animate-pulse">{scanStatus}</p>
          )}
          {error && <p className="text-red-400 text-xs text-center">{error}</p>}
          <p className="text-zinc-600 text-xs text-center">
            Tip: screenshot the QR code, then paste here
          </p>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-3">
          {mode === 'manual' ? (
            <>
              <Input value={name} onChange={setName} placeholder="Account name" autoFocus />

              {/* Issuer with autocomplete */}
              <div className="relative" ref={issuerRef}>
                <Input
                  value={issuer}
                  onChange={handleIssuerInput}
                  placeholder="Issuer (optional)"
                  onFocus={() => setIssuerOpen(true)}
                />
                <AnimatePresence>
                  {issuerOpen && filteredIssuers.length > 0 && (
                    <motion.div
                      initial={{ opacity: 0, y: -4 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -4 }}
                      transition={{ duration: 0.12 }}
                      className="absolute z-10 top-full left-0 right-0 mt-1 bg-zinc-800 border border-zinc-700 rounded-lg shadow-lg max-h-32 overflow-y-auto"
                    >
                      {filteredIssuers.slice(0, 8).map((i) => (
                        <button
                          key={i}
                          type="button"
                          onClick={() => selectIssuer(i)}
                          className="w-full text-left px-3 py-1.5 text-xs text-zinc-300 hover:bg-zinc-700 transition-colors"
                        >
                          {i}
                        </button>
                      ))}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              <Input value={secret} onChange={setSecret} placeholder="Secret key" />

              {/* Live TOTP preview */}
              <AnimatePresence>
                {formattedPreview && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="overflow-hidden"
                  >
                    <div className="flex items-center justify-between p-3 bg-zinc-800/50 border border-zinc-700/60 rounded-xl">
                      <div>
                        <span className="text-[10px] text-zinc-500 uppercase tracking-wider">Preview</span>
                        <div className="text-lg font-mono font-bold tracking-[0.2em] text-zinc-200">
                          {formattedPreview}
                        </div>
                      </div>
                      <div className="text-xs text-zinc-500 font-mono">{previewRemaining}s</div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </>
          ) : (
            <Input value={uri} onChange={setUri} placeholder="otpauth://totp/..." autoFocus />
          )}

          {error && <p className="text-red-400 text-xs">{error}</p>}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 rounded-xl text-sm font-medium transition-colors"
          >
            {loading ? 'Adding...' : 'Add Account'}
          </button>
        </form>
      )}
    </motion.div>
  )
}

function Input({
  value,
  onChange,
  placeholder,
  autoFocus,
  onFocus,
}: {
  value: string
  onChange: (v: string) => void
  placeholder: string
  autoFocus?: boolean
  onFocus?: () => void
}) {
  return (
    <input
      type="text"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      autoFocus={autoFocus}
      onFocus={onFocus}
      className="w-full px-3.5 py-2.5 bg-zinc-900/60 border border-zinc-800 rounded-xl text-sm text-zinc-200 placeholder-zinc-500 focus:outline-none focus:border-zinc-600 transition-colors"
    />
  )
}

function ScanButton({
  icon: Icon,
  label,
  onClick,
}: {
  icon: typeof Camera
  label: string
  onClick: () => void
}) {
  return (
    <button
      onClick={onClick}
      className="flex items-center gap-1.5 px-3 py-2 bg-zinc-800/60 hover:bg-zinc-700/60 text-zinc-300 text-xs rounded-lg transition-colors"
    >
      <Icon size={13} />
      {label}
    </button>
  )
}
