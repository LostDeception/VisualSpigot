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

    function createWindow() {

        // -- create the browser window
        win = new BrowserWindow({
            show: false,
            minWidth: 1000,
            minHeight: 650,
            icon: path.join(__dirname, '../images/icon.ico'),
            webPreferences: {
                nodeIntegration: true,
                contextIsolation: false
            }
        });

        let indexPath = path.join(__dirname, '../index.html');
        var indexURL = url.format({
            pathname: indexPath,
            protocol: 'file:',
            slashes: true
        })

        //win.webContents.openDevTools();

        // load html file in browserwindow
        win.loadURL(indexURL).then(() => {
            win.show();

            // continue to handle mainWindow "close" event here
            win.on('close', function (e) {
                if (!force_quit) {
                    e.preventDefault();

                    // handle any tasks before application exit
                    win.webContents.send("renderAppClose");
                }
            });

        }).catch(err => {
            console.log(err)
        });
    }

    app.on('window-all-closed', function () {
        if (process.platform != 'darwin')
            app.quit();
    });

    // when the application is ready to be displayed
    app.whenReady().then(() => {
        resourceFolderCheck(true, () => {

            // by default set application menu to null
            Menu.setApplicationMenu(null);

            // check for updates
            autoUpdater.checkForUpdates();

            // create main window
            createWindow();

            // after all tasks have been handled quit the application
            ipcMain.on('mainAppClose', function () {
                force_quit = true;
                app.quit();
            })

            // handle image select dialog
            ipcMain.on('selectImage', function () {
                dialog.showOpenDialog({
                    filters: [
                        { name: 'Images', extensions: ['jpg', 'png'] }
                    ]
                }).then(result => {
                    if (!result.canceled) {
                        win.webContents.send('image', result.filePaths[0]);
                    }
                })
            })

            // select .zip location
            ipcMain.on('zipLocation', function (sender, name) {
                dialog.showOpenDialog({
                    properties: ['openDirectory'],
                }).then(result => {
                    if (!result.canceled) {
                        win.webContents.send('zipLocated', result.filePaths[0], name);
                    }
                })
            })
        })
    })

    // if servers folder does not exist create it
    function resourceFolderCheck(production, callback) {

        if (production) {
            // let exePath = path.dirname (app.getPath ('exe'));
            let yourDbRootPath = app.getPath('userData');
            let dir = path.join(yourDbRootPath, 'minecraft_servers');

            if (!fs.existsSync(dir)) {
                fs.mkdir(dir, (err) => {
                    if (err) {
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