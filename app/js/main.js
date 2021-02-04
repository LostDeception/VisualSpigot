// =========================================================
// Copyright 2021, Timothy Mickelson, All rights reserved.
// =========================================================
const { app, BrowserWindow, Menu, ipcMain, dialog, globalShortcut } = require('electron');
const { autoUpdater } = require("electron-updater");
const url = require('url');
var path = require('path');
var fs = require('fs');

var win;
var force_quit = false;

const gotTheLock = app.requestSingleInstanceLock();

if (!gotTheLock) {
    app.quit()
} else {
    app.on('second-instance', (event, commandLine, workingDirectory) => {
      // Someone tried to run a second instance, we should focus our window.
      if (win) {
        if (win.isMinimized()) win.restore()
        win.focus()
      }
    })
  
    async function createWindow(url, isMain) {

        // window options
        let options = {
            show: false,
            minWidth: 1000,
            minHeight: 650,
            icon: path.join(__dirname, '../images/icon.ico'),
            webPreferences: {
                nodeIntegration: true
            }
        };

        if(isMain) {
            // -- create the browser window
            win = new BrowserWindow(options);

            // get app cache size.. if cache is greater than 100000 bytes clear
            let result = await win.webContents.session.getCacheSize();
            if(result > 1000000) {
                await win.webContents.session.clearCache();
            }

            // open dev panel
            //win.webContents.openDevTools();

            // load html file in browserwindow
            win.loadURL(url)

        } else {
            var newWin = new BrowserWindow(options);
            newWin.loadURL(url);
            newWin.show();
        }
    }
    
    app.on('window-all-closed', function(){
        if(process.platform != 'darwin')
            app.quit();
    });
 
    // when the application is ready to be displayed
    app.whenReady().then(() => {
        resourceFolderCheck(true, async() => {
    
            // by default set application menu to null
            Menu.setApplicationMenu(null);

            // check for updates
            autoUpdater.checkForUpdates();
    
            // create main window
            await createWindow(url.format({
                pathname: path.join(__dirname, '../index.html'),
                protocol: 'file:', 
                slashes: true
            }), true);
    
            // when DOM finished loading display window
            win.once('ready-to-show', function() {
                win.show();
            });
    
            // continue to handle mainWindow "close" event here
            win.on('close', function(e){
                if(!force_quit) {
                    e.preventDefault();

                    // handle any tasks before application exit
                    win.webContents.send("renderAppClose");
                }
            });
    
            // after all tasks have been handled quit the application
            ipcMain.on('mainAppClose', function() {
                force_quit=true; 
                app.quit();
            })

            ipcMain.on('open-donation-window', function() {
                createWindow("https://www.paypal.com/donate?business=tmickelson93%40gmail.com&item_name=VisualSpigot+Donations&currency_code=USD", false);
            })
        })
    })
    
    // if servers folder does not exist create it
    function resourceFolderCheck(production, callback) {
    
        if(production) {
            // let exePath = path.dirname (app.getPath ('exe'));
            let yourDbRootPath = app.getPath('userData');
            let dir = path.join(yourDbRootPath, 'minecraft_servers');
    
            if(!fs.existsSync(dir)) {
                fs.mkdir(dir, (err) => {
                    if(err) {
                        dialog.showMessageBox(win, {
                            message: dir
                        }).then(() => {
                            app.quit();
                        })
    
                        
                    } else {
                        callback();
                    }
                })
            }
    
            callback();
    
        } else {
            callback();
        }
    }

    //---------------------------------------------------------------------------
    // Auto Updates
    //---------------------------------------------------------------------------
    const sendStatusToWindow = (msg) => {
        if (win) {
            win.webContents.send("update", msg);
        }
    };

    //--[on update available]
    autoUpdater.on("update-available", () => {
        // Send status to renderer
        //sendStatusToWindow("update-downloading");
    });
    
    //--[update downloaded]
    autoUpdater.on("update-downloaded", (event, releaseNotes, releaseName) => {
        sendStatusToWindow("update-ready");
    });
    
    //--[Download update]
    ipcMain.once("install-update", (event, arg) => {
        autoUpdater.quitAndInstall();
    });
    
    //--[update error]
    autoUpdater.on("error", (err) => {
        //sendStatusToWindow("update-error");
    });
}