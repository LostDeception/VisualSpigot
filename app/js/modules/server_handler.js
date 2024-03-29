// =========================================================
// Copyright 2021, Timothy Mickelson, All rights reserved.
// =========================================================
var fs = require('fs-extra');
var path = require('path');
var download = require('download-file');
var compressing = require('compressing');
const Server = require('@modules/server_process');
const Events = require('@modules/events');
const GlobalCommands = require('@modules/global_commands');
const ServerHelpers = require('@modules/server_helpers');
const ServerExplorer = require('@modules/server_explorer');
const ThemeHandler = require('@modules/theme_handler');
const { ipcRenderer } = require('electron');

class ServerHandler extends ServerHelpers {
    
    constructor() {
        super();

        /**
         * directory to download/copy minecraft servers to
         * for in house testing path.join(__dirname, '../../../minecraft_servers');
        */
        let userDataPath = process.env.APPDATA || (process.platform == 'darwin' ? process.env.HOME + '/Library/Preferences' : process.env.HOME + "/.local/share");
        this.appDataPath = path.join(userDataPath, 'VisualSpigot');
        this.nativeDir =  path.join(this.appDataPath, 'minecraft_servers');

        // handle all application events
        this.events = new Events();

        // handle file explorer functions
        this.sExplorer = new ServerExplorer(this);

        // handle global command functions
        this.gCommand = new GlobalCommands(this);

        // handle application theme
        this.theme = new ThemeHandler(this);

        /**
         * get all server files in nativeDirectory
         */
        this.populate_servers(() => {
            this.server_gui_handler();
            this.downloadServerHandler();
            this.serverDropHandler();
            this.add_plugin_handler();
        })


        // handle server zip
        let self = this;
        ipcRenderer.on('zipLocated', function(sender, dir, name) {
            let destination = path.join(dir, name);
            let server = self.getSelectedServer();
            compressing.tar.compressDir(server.directory, destination)
            .then(() => {
                self.notifier.success(name + ' Successfully Compressed')
            })
            .catch((err) => {
                console.log(err);
                self.notifier.alert(err.toString());
            });
        })
    }

    // handle all core server element listeners
    server_gui_handler() {

        let self = this;

        // initialize stored object for updating visuals
        this.initialize_ui_object();

        this.btn_add_server.addEventListener('click', function() {
            $('#addServerModel').modal();
        })

        this.btn_start_server.addEventListener('click', function () {
            self.server_access((server) => {
                self.console_input.focus();
                self.updateServerState(server, 'starting');
                server.start((err) => {
                    if(err) {
                        self.updateServerState(server, 'default');
                        self.notifier.alert(err.toString());
                    }
                });
            })
        });

        this.btn_stop_server.addEventListener('click', function () {
            self.server_access((server) => {
                self.console_input.focus();
                self.updateServerState(server, 'stopping');
                server.sendCommand('stop');
            })
        })

        this.btn_kill_server.addEventListener('click', function () {
            self.server_access((server) => {
                self.console_input.focus();
                self.updateServerState(server, 'default');
                server.stop().catch((err) => {
                    self.updateServerState(server, 'default');
                    self.notifier.alert(err.toString());
                });
            })
        })

        this.btn_restart_server.addEventListener('click', function () {
            self.server_access((server) => {
                self.console_input.focus();
                self.updateServerState(server, 'restarting');
                server.restart();
            })
        });

        this.btn_delete_server.addEventListener('click', function () {
            self.delete_server();
        })

        this.console_input.addEventListener('keydown', function (e) {

            try {

                let value = self.console_input.value;
                if (!e) { e = window.event; }
                var keyCode = e.code || e.key;

                switch (keyCode) {

                    // -- execute global or server command
                    case 'Enter':

                        // -- check that value is not null of undefined and contains text
                        if (value && value != '') {

                            // -- access currently active server
                            self.server_access((server) => {

                                // -- the period represends a global command (command that can be used accross all servers)
                                if (value.charAt(0) == '.') {

                                    // -- execute global command
                                    self.gCommand.newGlobalCommand(value);

                                } else {

                                    if (value == 'stop') {
                                        self.updateServerState(server, 'stopping');
                                    }

                                    server.sendCommand(value, () => {
                                        server.displayMessage('Unknown command. Type ".help" for help.',null , false, true);
                                    });
                                }

                                self.updateSavedCommands(value);
                                self.console_input.value = '';
                            })
                        }

                        self.console_input.focus();

                        break;
                    case 'ArrowUp':
                        e.preventDefault();
                        self.getSavedCommand(true);
                        break;
                    case 'ArrowDown':
                        e.preventDefault();
                        self.getSavedCommand(false);
                        break;
                }

            } catch (err) {
                self.notifier.alert(err);
            }
        })

        this.btn_server_files.addEventListener('click', function() {
            self.clear_input();
            let server = self.getSelectedServer();
            self.baseDir = server.directory;
            self.sExplorer.generateFileList(server.directory);
        })
    }

    /**
     * when server.jar is dropped into manual tab, copy to
     * native directory and generate server files.
     * select server when all files are generated.
     */
    serverDropHandler() {

        try {
            let self = this;
            let drop_container = document.querySelector('#file-drop-container');

            this.initializeDragDrop(drop_container, (e) => {
                let file = e.files[0];
                if (file) {
                    if (e.types == "Files") {
                        let fileExt = path.extname(file.name);
                        if(fileExt == '.jar') {
                            self.create_server_folder(self.nativeDir, file.name, function (folder_dir) {
                                if (folder_dir) {
                                    let s_dir = path.join(folder_dir, file.name);
    
                                    // -- copy dropped file to server folder
                                    fs.copyFile(file.path, s_dir, function (err) {

                                        if (err) {
                                            $('#addServerModel').modal('hide');
                                            self.notifier.alert(err.toString());
                                            return;
                                        }

                                        $('#addServerModel').modal('hide');

                                        self.populate_servers(() => {
                                            let server = self.servers.filter(s => s.directory == folder_dir)[0];
                                            server.displayMessage(server.name + ' successfully added. type \".help\" for a list of commands!', null, false, true);
                                            self.click_element(server.tab);
                                        })
                                    })
                                } else {
                                    $('#addServerModel').modal('hide');
                                    self.notifier.alert('Failed to create server folder');
                                }
                            })
                        }
                    }
                }
            })
        } catch (err) {
            self.notifier.alert(err);
        }
    }

    /**
     * download server and generate server
     * files then select the server after finished
     */
    downloadServerHandler() {
        let self = this;
        this.btn_server_downloads.forEach(btn => {
            btn.addEventListener('click', function () {

                let url = btn.dataset.url;
                let name = btn.dataset.filename;

                // display that server is being downloaded
                self.display_overlay('Downloading: ' + name);

                // create folder then attempt to download server
                self.create_server_folder(self.nativeDir, name, function (folder_dir) {
                    download(url, { directory: folder_dir, filename: name }, function (err) {

                        if (err) {
                            self.hide_overlay();
                            self.notifier.alert(err.toString());
                            return;
                        } else {
                            $('.modal').modal('hide');
                            self.populate_servers(() => {
                                let server = self.servers.filter(s => s.directory == folder_dir)[0];
                                server.displayMessage(server.name + ' finished downloading. type \".help\" for a list of commands!', null, false, true);
                                self.click_element(server.tab);
                                self.hide_overlay();
                            })
                        }
                    })
                })
            })
        });
    }

    /**
     * copy currently selected server files to 
     * new directory and re-populate servers
     */
    duplicateServerHandler() {
        this.server_access((server) => {
            let onOk = () => {

                try {

                    if(!server.isActive) {
                        this.display_overlay('Duplicating: ' + server.name);

                        // create folder and grab name of said folder
                        this.create_server_folder(this.nativeDir, null, (result) => {
                            let srcDir = path.join(server.directory);
                            let destDir = path.join(srcDir, '../', result);
                            this.copyFiles(srcDir, destDir, () => {
                                this.hide_overlay();
                                this.populate_servers();

                                // selecte cloned server and write some text :P
                                let server = this.servers.filter(s => s.directory == destDir)[0];

                                if(server) {
                                    server.displayMessage('I am a clone :P');
                                    this.click_element(server.tab);
                                }
                            })
                        })
                    } else {
                        this.notifier.alert('Cannot duplicate ' + server.name + ' while active');
                    }
                    
                } catch(err) {
                    this.notifier.alert(err.toString())
                    this.hide_overlay();
                    console.log(err);
                }
            };
    
            let onCancel = () => { };
    
            this.notifier.confirm(
                'Are you sure you want to duplicate ' + server.name,
                onOk,
                onCancel,
                {
                    icons: {
                        prefix: "<i class='fas fa fa-fw fa-",
                        confirm: "exclamation-triangle",
                        suffix: "' style='color:var(--orange)'></i>"
                    },
                    labels: {
                        confirm: 'Just A Warning'
                    }
                }
            )
        })
    }

    /**
     * handle copying plugins when dragged
     * and dropped into selected server console
     */
    add_plugin_handler() {
        let self = this;
        this.initializeDragDrop(this.console_container, function(e) {
            try {
                Object.keys(e.files).forEach(key => {
                    let file = e.files[key];
                    if(file && e.types == "Files") {
                        self.server_access((server) => {
                            if (path.extname(file.name) == '.jar') {

                                // create plugin folder
                                self.createPluginFolder(server.directory);
                                let pluginDir = path.join(server.directory, 'plugins');
                                let destinDir = path.join(pluginDir, file.name);
    
                                if (fs.existsSync(destinDir)) {
                                    fs.unlink(destinDir, () => {
                                        fs.rename(file.path, destinDir, function (err) {
                                            if (err) {
                                                self.notifier.alert(err.toString());
                                                return;
                                            }
    
                                            server.displayMessage(file.name + ' successfully replaced', 'var(--lime)', false, true);
                                        })
                                    })
                                } else {
                                    fs.rename(file.path, destinDir, function (err) {
                                        if (err) {
                                            self.notifier.alert(err.toString());
                                            return;
                                        }
    
                                        server.displayMessage(file.name + ' successfully added', 'var(--lime)', false, true);
                                    })
                                }
                            } else {
                                server.displayMessage(file.name + ' is not a plugin', 'var(--red)', false, true);
                            }
                        })
                    }
                })
            } catch(err) {
                self.notifier.alert(err.toString());
                console.log(err);
            }
        })
    }

    /**
     * -- create promise for populating servers
     * -- clear server tab container
     * -- get all server files in resource dir 'minecraft_servers'
     * -- check that file contains .jar file that matches 'server-#.#.#'
     * -- retrieve name from containing folder and version from .jar file
     * -- create server
     */
    populate_servers(callback) {
        let self = this;
        this.removeAllChildNodes(this.server_dropdown_container);
        this.getFiles(this.nativeDir, false, (folders) => {
            folders.forEach(folder => {
                try {
                    let directory = path.join(this.nativeDir, folder);
                    let info = this.fileInfo(directory);
                    if (info && info.isDirectory()) {
                        let files = this.getFiles(directory);
                        if(files) {
    
                            // filter array of files for .jar and .bat file
                            let jarFile = this.searchArray(files, '.jar');
                            let batFile = this.searchArray(files, 'run.bat');
                            
                            // if files contain .jar file
                            if(jarFile) {
    
                                // if server directory does not contain run.bat file create it
                                if(!batFile) {
                                    self.createBatFile(directory, jarFile);
                                } else {
                                    // check the run.bat to be sure the .jar name and required args are passed
                                    self.processBatFile(directory, jarFile);
                                }
    
                                let server_name = this.get_display_name(jarFile);
                                let server = this.servers.find((s) => { return s.directory == directory; });

                                if (server === undefined) {
                                    let server_console = this.create_server_console();
                                    let server_tab = this.create_tab_item(server_name);

                                    let server = new Server(this, {
                                        name: server_name,
                                        dir: directory,
                                        file: jarFile,
                                        state: 'default',
                                        tab: server_tab,
                                        console: server_console
                                    })
    
                                    // when user clicks server button
                                    server.tab.addEventListener('click', () => {
                                        if (!server.isSelected) {
    
                                            // set the selected server and replace console
                                            self.setSelectedServer(server);
    
                                            // display main container if not already displayed
                                            self.updateServerState(server);
                                        }
                    
                                        // focus server console input on server selection
                                        self.console_input.focus();
                                    })
    
                                    this.servers.push(server);
    
                                } else {
                                    this.server_dropdown_container.append(server.tab);
                                }
                            } else {
                                this.deleteFile(directory);
                            }
                        }
                    }
                } catch(err) {
                    this.notifier.alert(err.toString());
                    console.log(err);
                }
            });

            this.sort_servers();
            if(callback) callback();
        })
    }

    // stop all servers that are currently active
    close_servers(callback) {

        let self = this;

        let s_amount = this.servers.filter(s => s.isActive == true).length;
        let notifyText = '';

        if (s_amount > 0) {
            if (s_amount > 1) {
                notifyText = s_amount + ' servers are active. Are you sure you want to exit?';
            } else {
                notifyText = s_amount + ' server is active. Are you sure you want to exit?';
            }

            let onOk = () => {
                self.servers.forEach(s => {
                    s.sendCommand('stop');
                })

                callback();
            };

            let onCancel = () => { };

            self.notifier.confirm(
                notifyText,
                onOk,
                onCancel,
                {
                    icons: {
                        prefix: "<i class='fas fa fa-fw fa-",
                        confirm: "exclamation-triangle",
                        suffix: "' style='color:var(--red)'></i>"
                    },
                    labels: {
                        confirm: 'Dangerous action'
                    }
                }
            )
        } else {
            callback();
        }
    }

    // delete selected server
    delete_server() {

        let self = this;

        let onOk = () => {
            self.server_access(async (server) => {
                server.stop().then(() => {
                    let sIndex = self.servers.indexOf(server);

                    if (sIndex > -1) {
                        self.servers.splice(sIndex, 1)
                    }

                    self.deleteFile(server.directory, () => {
                        self.setSelectedServer(null);
                        self.console_container.innerHTML = '';
                        self.populate_servers();
                        self.updateServerState(server, 'waiting');
                        self.btn_dropdown_servers.innerHTML = 'Select A Server';
                        self.app_intro_state();
                    })   
                })
            })
        };

        let onCancel = () => { };

        this.notifier.confirm(
            'Are you sure you want to delete ' + this.getSelectedServer().name,
            onOk,
            onCancel,
            {
                icons: {
                    prefix: "<i class='fas fa fa-fw fa-",
                    confirm: "exclamation-triangle",
                    suffix: "' style='color:var(--red)'></i>"
                },
                labels: {
                    confirm: 'Dangerous action'
                }
            }
        )
    }
}

module.exports = ServerHandler;