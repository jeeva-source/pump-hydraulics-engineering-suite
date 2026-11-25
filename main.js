const { app, BrowserWindow, Menu, shell } = require('electron');
const path = require('path');
function createWindow() {
  const win = new BrowserWindow({
    width: 1500, height: 960, minWidth: 1050, minHeight: 720,
    backgroundColor: '#101820',
    title: 'Pump Hydraulics Engineering Suite',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true
    }
  });
  win.loadFile(path.join(__dirname, 'app', 'index.html'));
  win.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith('https:')) shell.openExternal(url);
    return { action: 'deny' };
  });
}
app.whenReady().then(() => {
  createWindow();
  const template = [
    { label: 'File', submenu: [{ role: 'reload' }, { role: 'toggleDevTools' }, { type: 'separator' }, { role: 'quit' }] },
    { label: 'View', submenu: [{ role: 'resetZoom' }, { role: 'zoomIn' }, { role: 'zoomOut' }, { type: 'separator' }, { role: 'togglefullscreen' }] },
    { label: 'Help', submenu: [{ label: 'About', click: () => require('electron').dialog.showMessageBox({ message: 'Pump Hydraulics Engineering Suite V5.0', detail: 'Single-line hydraulic calculation workspace with explicit SI unit handling. Verify all results against licensed standards, project specifications and vendor data.' }) }] }
  ];
  Menu.setApplicationMenu(Menu.buildFromTemplate(template));
  app.on('activate', () => { if (BrowserWindow.getAllWindows().length === 0) createWindow(); });
});
app.on('window-all-closed', () => { if (process.platform !== 'darwin') app.quit(); });
