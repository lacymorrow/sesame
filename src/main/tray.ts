import { Tray, Menu, nativeImage, BrowserWindow, app } from 'electron'
import path from 'node:path'

let tray: Tray | null = null

export function createTray(mainWindow: BrowserWindow) {
  // Use template image for macOS (renders correctly in light/dark menu bar)
  const iconPath = path.join(__dirname, '../../resources/icons/trayTemplate.png')
  const icon = nativeImage.createFromPath(iconPath)
  icon.setTemplateImage(true)

  tray = new Tray(icon)
  tray.setToolTip('Sesame Authenticator')

  const contextMenu = Menu.buildFromTemplate([
    {
      label: 'Show Sesame',
      click: () => {
        mainWindow.show()
        mainWindow.focus()
      },
    },
    { type: 'separator' },
    {
      label: 'Quit',
      click: () => {
        app.quit()
      },
    },
  ])

  tray.setContextMenu(contextMenu)

  tray.on('click', () => {
    if (mainWindow.isVisible()) {
      mainWindow.focus()
    } else {
      mainWindow.show()
      mainWindow.focus()
    }
  })

  return tray
}

export function destroyTray() {
  if (tray) {
    tray.destroy()
    tray = null
  }
}
