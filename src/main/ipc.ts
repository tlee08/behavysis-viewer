import { ipcMain, dialog } from 'electron'
import { readFileSync, writeFileSync } from 'fs'
import { pathToFileURL } from 'url'

export function registerIpcHandlers(): void {
  // Open a file picker dialog and return the chosen path
  ipcMain.handle(
    'open-file',
    async (_, filters: Electron.FileFilter[]) => {
      const { filePaths } = await dialog.showOpenDialog({ filters, properties: ['openFile'] })
      return filePaths[0] ?? null
    },
  )

  // Read a file and return its raw bytes (Uint8Array) to the renderer.
  // The renderer owns all parsing (parquet-wasm + apache-arrow).
  ipcMain.handle('read-file', (_, filePath: string): Uint8Array => {
    return new Uint8Array(readFileSync(filePath))
  })

  // Read a JSON file and return the parsed object
  ipcMain.handle('read-json', (_, filePath: string): unknown => {
    return JSON.parse(readFileSync(filePath, 'utf-8'))
  })

  // Write raw bytes to disk (for saving parquet)
  ipcMain.handle('write-file', (_, filePath: string, data: Uint8Array): void => {
    writeFileSync(filePath, data)
  })

  // Write JSON to disk (for saving bouts)
  ipcMain.handle('write-json', (_, filePath: string, data: unknown): void => {
    writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf-8')
  })

  // Convert an absolute file path to a file:// URL for the video element
  ipcMain.handle('get-video-url', (_, filePath: string): string => {
    return pathToFileURL(filePath).href
  })
}
