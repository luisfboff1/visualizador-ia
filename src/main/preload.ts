import { contextBridge, ipcRenderer } from 'electron'

contextBridge.exposeInMainWorld('api', {
  getData: () => ipcRenderer.invoke('get-data'),
  refresh: () => ipcRenderer.invoke('refresh'),
  getStatus: () => ipcRenderer.invoke('get-status'),
  getConfig: () => ipcRenderer.invoke('get-config'),
  updateConfig: (partial: object) => ipcRenderer.invoke('update-config', partial),
  startDeviceFlow: () => ipcRenderer.invoke('start-device-flow'),
  pollDeviceFlow: (deviceCode: string) => ipcRenderer.invoke('poll-device-flow', deviceCode),
  onDataUpdated: (callback: (data: unknown) => void) => {
    ipcRenderer.on('data-updated', (_event, data) => callback(data))
    return () => ipcRenderer.removeAllListeners('data-updated')
  },
  openExternal: (url: string) => ipcRenderer.invoke('open-external', url),
  diagnose: () => ipcRenderer.invoke('diagnose'),
  rawFetch: () => ipcRenderer.invoke('raw-fetch'),
  rawFetchCodex: () => ipcRenderer.invoke('raw-fetch-codex'),
  rawFetchCopilot: () => ipcRenderer.invoke('raw-fetch-copilot'),
  hideWindow: () => ipcRenderer.invoke('hide-window'),
  toggleAlwaysOnTop: () => ipcRenderer.invoke('toggle-always-on-top'),
  checkUpdate: () => ipcRenderer.invoke('check-update'),
})
