import { Tray, Menu, nativeImage, BrowserWindow } from 'electron'

let tray: Tray | null = null

export function createTray(mainWindow: BrowserWindow) {
  // Create a simple 16x16 tray icon (key emoji as fallback)
  const icon = nativeImage.createEmpty()
  tray = new Tray(icon)
  tray.setTitle('🔐')
  tray.setToolTip('Sesame Authenticator')

  const contextMenu = Menu.buildFromTemplate([
    {
      label: 'Show Sesame',
      click: () => {
        mainWindow.show()
        mainWindow.focus()
      }
    },
    { type: 'separator' },
    {
      label: 'Quit',
      click: () => {
        mainWindow.destroy()
      }
    }
  ])

  tray.setContextMenu(contextMenu)

  tray.on('click', () => {
    mainWindow.show()
    mainWindow.focus()
  })

  return tray
}

export function destroyTray() {
  if (tray) {
    tray.destroy()
    tray = null
  }
}
