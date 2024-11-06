import { app, shell, BrowserWindow, ipcMain, dialog } from 'electron'
import path, { join } from 'path'
import { electronApp, optimizer, is } from '@electron-toolkit/utils'
import icon from '../../resources/icon.png?asset'
import { readdirSync } from 'fs'
import { RAW_FILE_EXT_LIST } from './consts'
import { exiftool } from 'exiftool-vendored'
import * as csv from 'fast-csv'
import { ProcessService } from './service'
import { FolderFile } from './typings/FolderData'
import { LocationData } from './typings/Location'

const processService = new ProcessService()

function createWindow(): void {
  // Create the browser window.
  const mainWindow = new BrowserWindow({
    width: 800,
    height: 600,
    show: false,
    autoHideMenuBar: true,
    ...(process.platform === 'linux' ? { icon } : {}),
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false
    }
  })

  mainWindow.on('ready-to-show', () => {
    mainWindow.show()
  })

  mainWindow.webContents.setWindowOpenHandler((details) => {
    shell.openExternal(details.url)
    return { action: 'deny' }
  })

  processService.onProcessUpdate((data) => {
    mainWindow.webContents.send('event:processDataUpdate', data)
  })

  // HMR for renderer base on electron-vite cli.
  // Load the remote URL for development or the local html file for production.
  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }
}

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.whenReady().then(() => {
  // Set app user model id for windows
  electronApp.setAppUserModelId('icu.fur93.photo-gps-recorder.desktop')

  // Default open or close DevTools by F12 in development
  // and ignore CommandOrControl + R in production.
  // see https://github.com/alex8088/electron-toolkit/tree/master/packages/utils
  app.on('browser-window-created', (_, window) => {
    optimizer.watchWindowShortcuts(window)
  })

  ipcMain.handle('dialog:selectFolder', async () => {
    const result = await dialog.showOpenDialog({
      properties: ['openDirectory']
    })

    if (result.filePaths.length != 1) return

    const folderPath = result.filePaths[0]

    const fileList: FolderFile[] = []
    for (const fileName of readdirSync(folderPath).filter(
      (fileName) =>
        !fileName.startsWith('._') &&
        RAW_FILE_EXT_LIST.includes(path.extname(fileName).toUpperCase())
    )) {
      const filePath = path.resolve(folderPath, fileName)
      const { GPSLatitude, GPSLongitude, GPSAltitude, DateTimeOriginal } =
        await exiftool.read(filePath)
      fileList.push({
        fileName,
        filePath,
        metadata: {
          GPSLatitude,
          GPSLongitude,
          GPSAltitude,
          DateTimeOriginal
        }
      })
    }

    processService.setFolderData({
      folderPath,
      fileList
    })

    return processService.folderData
  })

  ipcMain.handle('dialog:selectCsv', async () => {
    const result = await dialog.showOpenDialog({
      properties: ['openFile'],
      filters: [{ name: 'PGR CSV Data File', extensions: ['csv'] }]
    })

    if (result.filePaths.length != 1) return undefined

    const csvPath = result.filePaths[0]

    return new Promise((resolve) => {
      const data: LocationData[] = []
      csv
        .parseFile(csvPath, { ignoreEmpty: true })
        .on('data', (row) => {
          if (row.length != 5) return
          const [time, lat, lng, alt, type] = row
          data.push({
            time: new Date(time),
            lat: Number(lat),
            lng: Number(lng),
            alt: Number(alt),
            type
          })
        })
        .on('end', () => {
          processService.setCsvData({
            filePath: csvPath,
            locationDataList: data.sort((a, b) => a.time.getTime() - b.time.getTime())
          })
          resolve(processService.csvData)
        })
    })
  })

  ipcMain.handle('event:getData', () => {
    return {
      folderData: processService.folderData,
      csvData: processService.csvData
    }
  })

  ipcMain.handle('event:process', () => {
    processService.process()
  })

  createWindow()

  app.on('activate', function () {
    // On macOS it's common to re-create a window in the app when the
    // dock icon is clicked and there are no other windows open.
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

// Quit when all windows are closed, except on macOS. There, it's common
// for applications and their menu bar to stay active until the user quits
// explicitly with Cmd + Q.
app.on('window-all-closed', () => {
  app.quit()
})

// In this file you can include the rest of your app"s specific main process
// code. You can also put them in separate files and require them here.
