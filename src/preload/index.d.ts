import { ElectronAPI } from '@electron-toolkit/preload'

interface SesameApi {
  unlock: (password: string) => Promise<{ success: boolean; error?: string }>
  lock: () => Promise<{ success: boolean }>
  isUnlocked: () => Promise<{ unlocked: boolean }>
  listAccounts: () => Promise<
    Array<{
      name: string
      issuer: string
      code: string | null
      remaining: number
      created_at: string
    }>
  >
  addAccount: (name: string, issuer: string, secret: string) => Promise<{ success?: boolean; error?: string }>
  removeAccount: (name: string) => Promise<{ success: boolean }>
  getCode: (name: string) => Promise<{ code: string; remaining: number } | { error: string }>
  getConfig: () => Promise<any>
  saveConfig: (config: any) => Promise<{ success: boolean }>
  startApi: () => Promise<{ success?: boolean; error?: string }>
  stopApi: () => Promise<{ success: boolean }>
  captureScreen: () => Promise<{ dataUrl?: string; width?: number; height?: number; scaleFactor?: number; error?: string }>
}

interface WindowApi {
  send: (channel: string, ...args: any[]) => void
  receive: (channel: string, func: (...args: any[]) => void) => void
  invoke: (channel: string, ...args: any[]) => Promise<any>
  removeAllListeners: (channel: string) => void
}

declare global {
  interface Window {
    electron: ElectronAPI
    api: WindowApi
    sesame: SesameApi
  }
}

export {}
