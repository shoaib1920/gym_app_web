require('./rt/electron-rt');
//////////////////////////////
// User Defined Preload scripts below

import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('electronAPI', {
  sendRegistrationEmail: (payload: { to: string; gymName: string; memberName: string; memberCode: string }) =>
    ipcRenderer.invoke('send-registration-email', payload),
});
