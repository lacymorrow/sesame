import { ipcMain, desktopCapturer, screen, dialog, BrowserWindow } from 'electron'
import { VaultStore, getConfig, saveConfig } from '../core/store'
import { deriveKey } from '../core/crypto'
import { generateCode, getTimeRemaining } from '../core/totp'
import { startApiServer, stopApiServer } from '../core/api'

let store: VaultStore | null = null
let derivedKey: Buffer | null = null
let storeReady = false

async function getStore(): Promise<VaultStore> {
  if (!store) {
    store = new VaultStore()
    await store.init()
    storeReady = true
  }
  return store
}

export function registerIpcHandlers() {
  ipcMain.handle('vault:unlock', async (_event, password: string) => {
    try {
      const config = getConfig()
      derivedKey = deriveKey(password, config.salt)
      const s = await getStore()
      // Verify we can access the store
      s.listAccounts()
      return { success: true }
    } catch (e: any) {
      derivedKey = null
      return { success: false, error: e.message }
    }
  })

  ipcMain.handle('vault:lock', async () => {
    derivedKey = null
    await stopApiServer()
    return { success: true }
  })

  ipcMain.handle('vault:isUnlocked', async () => {
    return { unlocked: derivedKey !== null }
  })

  ipcMain.handle('vault:listAccounts', async () => {
    if (!derivedKey) return { error: 'Vault is locked' }
    const s = await getStore()
    const accounts = s.listAccounts()

    const remaining = getTimeRemaining()
    return accounts.map((a) => {
      try {
        const secret = s.getDecryptedSecret(a.name, derivedKey!)
        const code = secret ? generateCode(secret) : null
        return { name: a.name, issuer: a.issuer, code, remaining, created_at: a.created_at }
      } catch {
        return { name: a.name, issuer: a.issuer, code: null, remaining: 0, created_at: a.created_at }
      }
    })
  })

  ipcMain.handle('vault:addAccount', async (_event, name: string, issuer: string, secret: string) => {
    if (!derivedKey) return { error: 'Vault is locked' }
    try {
      const s = await getStore()
      s.addAccount(name, issuer, secret, derivedKey)
      return { success: true }
    } catch (e: any) {
      return { error: e.message }
    }
  })

  ipcMain.handle('vault:removeAccount', async (_event, name: string) => {
    const s = await getStore()
    const removed = s.removeAccount(name)
    return { success: removed }
  })

  ipcMain.handle('vault:getCode', async (_event, name: string) => {
    if (!derivedKey) return { error: 'Vault is locked' }
    const s = await getStore()
    const secret = s.getDecryptedSecret(name, derivedKey)
    if (!secret) return { error: 'Account not found' }
    s.logAccess(name, 'gui')
    return { code: generateCode(secret), remaining: getTimeRemaining() }
  })

  ipcMain.handle('vault:getConfig', async () => {
    return getConfig()
  })

  ipcMain.handle('vault:saveConfig', async (_event, config: any) => {
    saveConfig(config)
    return { success: true }
  })

  ipcMain.handle('vault:startApi', async () => {
    if (!derivedKey) return { error: 'Vault is locked' }
    try {
      const s = await getStore()
      await startApiServer(s, derivedKey)
      return { success: true }
    } catch (e: any) {
      return { error: e.message }
    }
  })

  ipcMain.handle('vault:stopApi', async () => {
    await stopApiServer()
    return { success: true }
  })

  ipcMain.handle('vault:exportVault', async () => {
    if (!derivedKey) return { error: 'Vault is locked' }
    try {
      const win = BrowserWindow.getFocusedWindow()
      if (!win) return { error: 'No focused window' }
      const { canceled, filePath } = await dialog.showSaveDialog(win, {
        defaultPath: 'sesame-export.json',
        filters: [{ name: 'JSON', extensions: ['json'] }],
      })
      if (canceled || !filePath) return { error: 'Cancelled' }

      const s = await getStore()
      const accounts = s.listAccounts()
      const data = accounts.map((a) => ({
        name: a.name,
        issuer: a.issuer,
        encrypted_secret: a.encrypted_secret,
      }))
      const fs = await import('node:fs/promises')
      await fs.writeFile(filePath, JSON.stringify(data, null, 2))
      return { path: filePath }
    } catch (e: any) {
      return { error: e.message }
    }
  })

  ipcMain.handle('vault:importVault', async () => {
    if (!derivedKey) return { error: 'Vault is locked' }
    try {
      const win = BrowserWindow.getFocusedWindow()
      if (!win) return { error: 'No focused window' }
      const { canceled, filePaths } = await dialog.showOpenDialog(win, {
        filters: [{ name: 'JSON', extensions: ['json'] }],
        properties: ['openFile'],
      })
      if (canceled || !filePaths[0]) return { error: 'Cancelled' }

      const fs = await import('node:fs/promises')
      const raw = await fs.readFile(filePaths[0], 'utf8')
      const data = JSON.parse(raw)
      if (!Array.isArray(data)) return { error: 'Invalid import file' }

      const s = await getStore()
      let count = 0
      for (const item of data) {
        if (!item.name || !item.encrypted_secret) continue
        try {
          s.importAccountRaw(item.name, item.issuer || '', item.encrypted_secret)
          count++
        } catch {
          // Skip duplicates
        }
      }
      return { success: true, count }
    } catch (e: any) {
      return { error: e.message }
    }
  })

  ipcMain.handle('vault:captureScreen', async () => {
    try {
      const primaryDisplay = screen.getPrimaryDisplay()
      const { width, height } = primaryDisplay.size
      const scaleFactor = primaryDisplay.scaleFactor

      const sources = await desktopCapturer.getSources({
        types: ['screen'],
        thumbnailSize: {
          width: Math.round(width * scaleFactor),
          height: Math.round(height * scaleFactor),
        },
      })

      if (sources.length === 0) {
        return { error: 'No screen sources available' }
      }

      // Return the primary screen as a PNG data URL
      const thumbnail = sources[0].thumbnail
      const dataUrl = thumbnail.toDataURL()
      return { dataUrl, width, height, scaleFactor }
    } catch (e: any) {
      return { error: e.message }
    }
  })
}

export function cleanupStore() {
  if (store) {
    store.close()
    store = null
  }
  derivedKey = null
}
