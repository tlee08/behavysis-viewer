import { useState, useCallback, useRef, useEffect } from 'react'
import { useStore } from '../store'
import { resolveExperimentPaths, parseAppConfig } from '../lib/fileManager'
import { parseBehavParquet, parseKeypointsParquet, boutsToBehavParquet } from '../lib/parseParquet'
import type { ExperimentPaths, AppConfig } from '../types'

export function useExperimentIO() {
  const [videoUrl, setVideoUrl] = useState<string | null>(null)
  const [status, setStatus] = useState('Open a config JSON to begin  (File > Open)')
  const rawTableRef = useRef<import('apache-arrow').Table | null>(null)
  const blobUrlRef = useRef<string | null>(null)

  const { paths, bouts, loadExperiment } = useStore()

  // Clean up blob URL on unmount
  useEffect(() => {
    return () => {
      if (blobUrlRef.current) URL.revokeObjectURL(blobUrlRef.current)
    }
  }, [])

  const open = useCallback(async () => {
    const configPath = await window.electron.openFile([
      { name: 'Config file', extensions: ['json', 'yaml'] },
    ])
    if (!configPath) return

    try {
      setStatus('Loading…')
      const expPaths = resolveExperimentPaths(configPath)
      const rawConfig = (await window.electron.readJson(configPath)) as Record<string, unknown>
      const appConfig = parseAppConfig(rawConfig)

      // Load video via blob URL — avoids needing webSecurity: false
      const videoBytes = await window.electron.readFile(expPaths.videoPath)
      if (blobUrlRef.current) URL.revokeObjectURL(blobUrlRef.current)
      const blob = new Blob([videoBytes], { type: 'video/mp4' })
      const url = URL.createObjectURL(blob)
      blobUrlRef.current = url
      setVideoUrl(url)

      const behavBytes = await window.electron.readFile(expPaths.behavsPath)
      const { bouts: parsedBouts, numFrames: nf, rawTable: rt } = await parseBehavParquet(behavBytes)
      rawTableRef.current = rt

      let keypointDefs: import('../types').KeypointDef[] = []
      let keypointFrames: import('../types').KeypointFrame[] = []
      try {
        const kptBytes = await window.electron.readFile(expPaths.keypointsPath)
        const parsed = await parseKeypointsParquet(kptBytes, appConfig.keypointPcutoff)
        keypointDefs = parsed.keypointDefs
        keypointFrames = parsed.keypointFrames
      } catch {
        // Keypoints file absent — silently skip
      }

      loadExperiment(expPaths, appConfig, nf, parsedBouts, keypointDefs, keypointFrames)
      setStatus(`Opened: ${expPaths.name}`)
    } catch (err) {
      setStatus(`Error: ${String(err)}`)
    }
  }, [loadExperiment])

  const save = useCallback(async () => {
    if (!paths || !rawTableRef.current) { setStatus('Nothing to save'); return }
    try {
      const bytes = await boutsToBehavParquet(bouts, rawTableRef.current)
      await window.electron.writeFile(paths.behavsPath, bytes)
      setStatus(`Saved → ${paths.behavsPath}`)
    } catch (err) {
      setStatus(`Save failed: ${String(err)}`)
    }
  }, [paths, bouts])

  const saveJson = useCallback(async () => {
    if (!paths) { setStatus('Nothing to save'); return }
    try {
      await window.electron.writeJson(paths.behavsPath.replace(/\.parquet$/, '_bouts.json'), bouts)
      setStatus('Saved bouts as JSON')
    } catch (err) {
      setStatus(`Save failed: ${String(err)}`)
    }
  }, [paths, bouts])

  return { videoUrl, status, open, save, saveJson }
}
