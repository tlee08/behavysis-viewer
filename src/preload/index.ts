import { contextBridge, ipcRenderer } from 'electron'

export interface ElectronAPI {
  openFile: (filters: Electron.FileFilter[]) => Promise<string | null>
  readFile: (path: string) => Promise<Uint8Array>
  readJson: (path: string) => Promise<unknown>
  writeFile: (path: string, data: Uint8Array) => Promise<void>
  writeJson: (path: string, data: unknown) => Promise<void>
  getVideoUrl: (path: string) => Promise<string>
}

const api: ElectronAPI = {
  openFile: (filters) => ipcRenderer.invoke('open-file', filters),
  readFile: (path) => ipcRenderer.invoke('read-file', path),
  readJson: (path) => ipcRenderer.invoke('read-json', path),
  writeFile: (path, data) => ipcRenderer.invoke('write-file', path, data),
  writeJson: (path, data) => ipcRenderer.invoke('write-json', path, data),
  getVideoUrl: (path) => ipcRenderer.invoke('get-video-url', path),
}

contextBridge.exposeInMainWorld('electron', api)
