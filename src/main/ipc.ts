import { ipcMain, dialog } from "electron";
import { readFileSync } from "fs";
import type { Bout } from "../shared/types";
import { parseBehavParquet } from "./lib/parseBehav";
import { getFeatureColumns, getFeatureData } from "./lib/parseFeatures";
import { parseKeypointsParquet } from "./lib/parseKeypoints";
import { saveBehavParquet } from "./lib/saveBehav";

export function registerIpcHandlers(): void {
  ipcMain.handle("open-file", async (_, filters: Electron.FileFilter[]) => {
    const { filePaths } = await dialog.showOpenDialog({
      filters,
      properties: ["openFile"],
    });
    return filePaths[0] ?? null;
  });

  ipcMain.handle("read-file", (_, filePath: string): Uint8Array => {
    return new Uint8Array(readFileSync(filePath));
  });

  ipcMain.handle("read-json", (_, filePath: string): unknown => {
    return JSON.parse(readFileSync(filePath, "utf-8"));
  });

  ipcMain.handle("parse-behav", (_, path: string) => {
    return parseBehavParquet(path);
  });

  ipcMain.handle("parse-keypoints", (_, path: string, pcutoff: number) => {
    return parseKeypointsParquet(path, pcutoff);
  });

  ipcMain.handle("save-behav", (_, path: string, bouts: unknown) => {
    saveBehavParquet(path, bouts as Bout[]);
  });

  ipcMain.handle("parse-features-columns", (_, path: string) => {
    return getFeatureColumns(path);
  });

  ipcMain.handle(
    "parse-features-data",
    (_, path: string, columns: string[]) => {
      return getFeatureData(path, columns);
    },
  );
}
