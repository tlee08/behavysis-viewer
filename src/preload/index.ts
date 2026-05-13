import { contextBridge, ipcRenderer } from "electron";
import type { Bout, KeypointDef, KeypointFrame } from "../../shared/types";

export interface ElectronAPI {
  openFile: (filters: Electron.FileFilter[]) => Promise<string | null>;
  readFile: (path: string) => Promise<Uint8Array>;
  readJson: (path: string) => Promise<unknown>;
  parseBehav: (path: string) => Promise<{ bouts: Bout[]; numFrames: number }>;
  parseKeypoints: (
    path: string,
    pcutoff: number,
  ) => Promise<{
    keypointDefs: KeypointDef[];
    keypointFrames: KeypointFrame[];
  }>;
  saveBehav: (path: string, bouts: Bout[]) => Promise<void>;
}

const api: ElectronAPI = {
  openFile: (filters) => ipcRenderer.invoke("open-file", filters),
  readFile: (path) => ipcRenderer.invoke("read-file", path),
  readJson: (path) => ipcRenderer.invoke("read-json", path),
  parseBehav: (path) => ipcRenderer.invoke("parse-behav", path),
  parseKeypoints: (path, pcutoff) =>
    ipcRenderer.invoke("parse-keypoints", path, pcutoff),
  saveBehav: (path, bouts) => ipcRenderer.invoke("save-behav", path, bouts),
};

contextBridge.exposeInMainWorld("electron", api);
