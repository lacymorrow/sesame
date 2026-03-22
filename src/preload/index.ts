import { contextBridge, ipcRenderer } from 'electron'
import { electronAPI } from '@electron-toolkit/preload'

// Boilerplate window API
const api = {
  send: (channel: string, ...args: any[]) => {
    ipcRenderer.send(channel, ...args)
  },
  receive: (channel: string, func: (...args: any[]) => void) => {
    ipcRenderer.on(channel, (_, ...args) => func(...args))
  },
  invoke: (channel: string, ...args: any[]) => {
    return ipcRenderer.invoke(channel, ...args)
  },
  removeAllListeners: (channel: string) => {
    ipcRenderer.removeAllListeners(channel)
  },
}

// Sesame vault API
const sesame = {
  unlock: (password: string) => ipcRenderer.invoke('vault:unlock', password),
  lock: () => ipcRenderer.invoke('vault:lock'),
  isUnlocked: () => ipcRenderer.invoke('vault:isUnlocked'),
  listAccounts: () => ipcRenderer.invoke('vault:listAccounts'),
  addAccount: (name: string, issuer: string, secret: string) =>
    ipcRenderer.invoke('vault:addAccount', name, issuer, secret),
  removeAccount: (name: string) => ipcRenderer.invoke('vault:removeAccount', name),
  getCode: (name: string) => ipcRenderer.invoke('vault:getCode', name),
  getConfig: () => ipcRenderer.invoke('vault:getConfig'),
  saveConfig: (config: any) => ipcRenderer.invoke('vault:saveConfig', config),
  startApi: () => ipcRenderer.invoke('vault:startApi'),
  stopApi: () => ipcRenderer.invoke('vault:stopApi'),
  captureScreen: () => ipcRenderer.invoke('vault:captureScreen'),
}

if (process.contextIsolated) {
  try {
    contextBridge.exposeInMainWorld('electron', electronAPI)
    contextBridge.exposeInMainWorld('api', api)
    contextBridge.exposeInMainWorld('sesame', sesame)
  } catch (error) {
    console.error(error)
  }
} else {
  ;(window as any).electron = electronAPI
  ;(window as any).api = api
  ;(window as any).sesame = sesame
}
