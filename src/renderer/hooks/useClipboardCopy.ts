import { useCallback, useEffect, useRef } from 'react'

export function useClipboardCopy() {
  const timerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)
  const lastCopiedRef = useRef('')

  const copy = useCallback(async (text: string) => {
    await navigator.clipboard.writeText(text)
    lastCopiedRef.current = text

    if (timerRef.current) clearTimeout(timerRef.current)

    const config = await window.sesame.getConfig()
    const clearSeconds = config.clipboardClearSeconds || 0

    if (clearSeconds > 0) {
      timerRef.current = setTimeout(async () => {
        try {
          const current = await navigator.clipboard.readText()
          if (current === lastCopiedRef.current) {
            await navigator.clipboard.writeText('')
          }
        } catch {}
      }, clearSeconds * 1000)
    }
  }, [])

  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current)
    }
  }, [])

  return copy
}
