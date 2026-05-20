import { useState, useEffect, useCallback, createContext, useContext, useRef } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { Check, AlertCircle, Info } from 'lucide-react'

const TOAST_DURATION = 2000

interface Toast {
  id: number
  message: string
  type: 'success' | 'error' | 'info'
  createdAt: number
}

interface ToastContextValue {
  toast: (message: string, type?: Toast['type']) => void
}

const ToastContext = createContext<ToastContextValue>({ toast: () => {} })

export function useToast() {
  return useContext(ToastContext)
}

let toastId = 0

const typeIcon = {
  success: Check,
  error: AlertCircle,
  info: Info,
}

const typeStyles = {
  success: 'bg-emerald-600/90 text-white',
  error: 'bg-red-600/90 text-white',
  info: 'bg-zinc-700/90 text-zinc-100',
}

function ToastItem({ toast: t, onDismiss }: { toast: Toast; onDismiss: (id: number) => void }) {
  const Icon = typeIcon[t.type]
  const progressRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const timer = setTimeout(() => onDismiss(t.id), TOAST_DURATION)
    return () => clearTimeout(timer)
  }, [t.id, onDismiss])

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 20, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -10, scale: 0.95 }}
      transition={{ duration: 0.2 }}
      className={`relative flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium shadow-lg pointer-events-auto overflow-hidden ${typeStyles[t.type]}`}
    >
      <Icon size={14} className="shrink-0" />
      <span>{t.message}</span>
      <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-white/20">
        <motion.div
          ref={progressRef}
          className="h-full bg-white/40"
          initial={{ width: '100%' }}
          animate={{ width: '0%' }}
          transition={{ duration: TOAST_DURATION / 1000, ease: 'linear' }}
        />
      </div>
    </motion.div>
  )
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([])

  const dismiss = useCallback((id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id))
  }, [])

  const addToast = useCallback((message: string, type: Toast['type'] = 'success') => {
    const id = ++toastId
    setToasts((prev) => [...prev, { id, message, type, createdAt: Date.now() }])
  }, [])

  return (
    <ToastContext.Provider value={{ toast: addToast }}>
      {children}
      <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50 flex flex-col-reverse gap-2 pointer-events-none">
        <AnimatePresence>
          {toasts.map((t) => (
            <ToastItem key={t.id} toast={t} onDismiss={dismiss} />
          ))}
        </AnimatePresence>
      </div>
    </ToastContext.Provider>
  )
}
