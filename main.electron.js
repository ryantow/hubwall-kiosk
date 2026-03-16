const { app, BrowserWindow } = require('electron');

function createWindow() {
  const win = new BrowserWindow({
    width: 3840,
    height: 2160,
    fullscreen: true, // Kiosk mode
    frame: false,      // Removes the "Close/Min" buttons
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
      nodeIntegrationInWorker: true
    }
  });

  // Inside your createWindow function
win.loadFile('index.html');

}

app.whenReady().then(createWindow);