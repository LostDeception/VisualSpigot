var fs = require('fs');
var path = require('path');
var download = require('download-file');
const Server = require('@modules/local_server_process');
const GlobalCommands = require('@modules/global_commands');
const ServerHelpers = require('@modules/server_helpers');
const ServerExplorer = require('@modules/server_explorer');

class ServerHandler extends ServerHelpers {
    
    constructor() {
        super();
        this.ctrlActive = false;

        /**
         * directory to download/copy minecraft servers to
         * for in house testing path.join(__dirname, '../../../minecraft_servers');
        */
        let userDataPath = process.env.APPDATA || (process.platform == 'darwin' ? process.env.HOME + '/Library/Preferences' : process.env.HOME + "/.local/share");
        let nativeDirectory = path.join(userDataPath, 'VisualSpigot', 'minecraft_servers');
        this.nativeDir = nativeDirectory;

        this.sExplorer = new ServerExplorer(this);
        this.gCommand = new GlobalCommands(this);

        /**
         * get all server files in nativeDirectory
         */
        this.populate_servers(() => {
            this.server_gui_handler();
            this.downloadServerHandler();
            this.serverDropHandler();
            this.add_plugin_handler();
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
                        self.notifier.alert(err);
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
                    self.notifier.alert(err);
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

            drop_container.addEventListener('drop', function (e) {

                drop_container.style.borderColor = 'rgb(44, 47, 51)';
                drop_container.style.borderThickness = '1px';

                let file = e.dataTransfer.files[0];

                if (file) {

                    if (e.dataTransfer.types == "Files") {

                        self.create_server_folder(self.nativeDir, file.name, function (err, data) {

                            if (err) {
                                $('#addServerModel').modal('hide');
                                self.notifier.alert(err.toString());
                                return;
                            }

                            if (data) {

                                let f_name = data['folderName'];
                                let s_dir = data['serverDir'];
                                let f_dir = data['folderDir'];

                                // -- copy dropped file to server folder
                                fs.copyFile(file.path, s_dir, function (err) {

                                    if (err) {
                                        $('#addServerModel').modal('hide');
                                        self.notifier.alert(err);
                                        return;
                                    }

                                    $('#addServerModel').modal('hide');

                                    self.populate_servers(() => {
                                        let server = self.servers.filter(s => s.directory == f_dir)[0];
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
            })

            // -- when user drags file into drop container
            drop_container.addEventListener('dragenter', function (e) {
                e.preventDefault();
                drop_container.style.borderColor = 'rgba(171, 223, 122, 0.856)';
            })

            // -- when user drags file over drop container
            drop_container.addEventListener('dragover', function (e) {
                e.preventDefault();
            })

            // -- when user leaves drag container
            drop_container.addEventListener('dragleave', function (e) {
                drop_container.style.borderColor = 'rgb(44, 47, 51)';
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

                self.display_download_overlay(name);

                self.create_server_folder(self.nativeDir, name, function (err, data) {

                    if (err) {
                        self.hide_download_overlay();
                        self.notifier.alert(err.toString());
                        return;
                    }

                    if (data) {
                        let f_dir = data['folderDir'];

                        let options = {
                            directory: f_dir,
                            filename: name
                        }

                        download(url, options, function (err) {

                            if (err) {
                                self.hide_download_overlay();
                                self.notifier.alert(err);
                                return;
                            } else {
                                $('#addServerModel').modal('hide');
                                self.populate_servers(() => {
                                    let server = self.servers.filter(s => s.directory == f_dir)[0];
                                    server.displayMessage(server.name + ' finished downloading. type \".help\" for a list of commands!', null, false, true);
                                    self.click_element(server.tab);
                                    self.hide_download_overlay();
                                })
                            }
                        })
                    }
                })
            })
        });
    }

    /**
     * handle copying plugins when dragged
     * and dropped into selected server console
     */
    add_plugin_handler() {
        let self = this;

        this.console_container.addEventListener('drop', function (e) {

            try {
                self.console_container.style.borderColor = 'transparent';

                Object.keys(e.dataTransfer.files).forEach(key => {
                    let file = e.dataTransfer.files[key];
                    if (file && e.dataTransfer.types == "Files") {

                        self.server_access((server) => {
                            if (path.extname(file.name) == '.jar') {
                                let pluginDir = path.join(server.directory, 'plugins');
                                let destinDir = path.join(pluginDir, file.name);
    
                                if (!fs.existsSync(pluginDir)) {
                                    fs.mkdirSync(pluginDir);
                                }
    
                                if (fs.existsSync(destinDir)) {
                                    fs.unlink(destinDir, () => {
                                        fs.rename(file.path, destinDir, function (err) {
                                            if (err) {
                                                self.notifier.alert(err);
                                                return;
                                            }
    
                                            server.displayMessage(file.name + ' successfully replaced', 'var(--lime)', false, true);
                                        })
                                    })
                                } else {
                                    fs.rename(file.path, destinDir, function (err) {
                                        if (err) {
                                            self.notifier.alert(err);
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
                });
                
            } catch (err) {
                self.notifier.alert(err);
                console.log(err);
            }
        })

        this.console_container.addEventListener('dragenter', function (e) {
            e.preventDefault();
            self.console_container.style.borderColor = 'rgba(171, 223, 122, 0.856)';
        })

        this.console_container.addEventListener('dragover', function (e) {
            e.preventDefault();
        })

        this.console_container.addEventListener('dragleave', function (e) {
            self.console_container.style.borderColor = 'transparent';
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
            try {
                folders.forEach(folder => {
                    let directory = path.join(this.nativeDir, folder);
                    let info = this.fileInfo(directory);
                    if (info && info.isDirectory()) {
                        let files = this.getFiles(directory);
                        if(files) {
                            files.forEach(server_file => {
                                if (path.extname(server_file) === '.jar') {
                                    let name = this.get_display_name(server_file);
                                    let server = this.servers.find((s) => { return s.directory == directory; });
                                    if (server === undefined) {

                                        let file_directory = path.join(directory, server_file);
                                        let server_console = this.create_server_console();
                                        let server_tab = this.create_tab_item(name);

                                        let server = new Server(this, {
                                            name: name,
                                            dir: directory,
                                            fDir: file_directory,
                                            state: 'default',
                                            tab: server_tab,
                                            console: server_console
                                        })

                                        // when user clicks server button
                                        server.tab.addEventListener('click', () => {
                                            if (!server.isSelected) {
                                                self.setSelectedServer(server);
                                                self.updateServerState(server);
                                
                                                // -- replace console element in console container
                                                let container = self.console_container;
                                                if (container.childNodes.length > 0) {
                                                    container.replaceChild(server_console, container.childNodes[0]);
                                                } else {
                                                    container.appendChild(server_console);
                                                }
                                
                                                container.scrollTop = container.scrollHeight;
                                            }
                        
                                            // focus server console input on server selection
                                            self.console_input.focus();
                                        })

                                        this.servers.push(server);

                                    } else {
                                        this.server_dropdown_container.append(server.tab);
                                    }
                                }
                            });   
                        }
                    }
                });

                this.sort_servers();
                if(callback) callback();

            } catch(err) {
                this.notifier.alert(err.toString());
                console.log(err);
            }
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

                if (server.isActive) {
                    await server.stop();
                }

                let sIndex = self.servers.indexOf(server);

                if (sIndex > -1) {
                    self.servers.splice(sIndex, 1)
                }

                self.deleteFile(server.directory, () => {
                    self.console_container.innerHTML = '';
                    self.populate_servers();
                    self.updateServerState(server, 'waiting');
                    self.btn_dropdown_servers.innerHTML = 'Select A Server';
                    self.app_intro_state();
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