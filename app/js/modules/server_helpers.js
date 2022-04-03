// =========================================================
// Copyright 2021, Timothy Mickelson, All rights reserved.
// =========================================================
var fs = require('fs-extra');
var path = require('path');
var store = require('store');
var rmdir = require('rimraf');
const DomHandler = require('@modules/dom_handler');

class ServerHelpers extends DomHandler {
    constructor() {
        super();
        this.server = null;
        this.servers = [];
        this.savedInputPosition = -1;
        this.savedInputCommands = [];
    }

    /**
     * create object to manipulate the user interface
     * make sure that it does not already exist before creation
     */
    initialize_ui_object() {
        let gui = store.get('gui');

        if(!gui) {
            store.set('gui', {
                font: '"Segoe UI", Arial, Helvetica, sans-serif',
                fontsize: '15px',
                fontcolor: 'rgb(182, 182, 185)'
            })
            gui = store.get('gui');
        }

        // set visual defaults
        this.servers.forEach(s => {
            $(s.console).find('*').css('font-family', gui.font);
            $(s.console).css('font-size', gui.fontsize);
            $(s.console).css('color', gui.fontcolor);
        })
    }
    updateVisuals(style, value) {
        let gui = store.get('gui');
        if(gui) {
            let obj = gui;
            let def = this.dStyles[style];
            switch(style) {
                case 'font':
                    if(value == 'default') {
                        obj.font = def;
                        this.servers.forEach(s => {
                            $(s.console).css('font-family', def);
                            $(s.console).find('span').css('font-family', def);
                        })
                    } else {
                        obj.font = value;
                        this.servers.forEach(s => {
                            $(s.console).css('font-family', value);
                            $(s.console).find('span').css('font-family', value);
                        })
                    }
                    break;
                case 'fontsize':
                    if(value == 'default') {
                        obj.fontsize = def;
                        this.servers.forEach(s => {
                            $(s.console).css('font-size', def);
                        })
                    } else {
                        obj.fontsize = value + 'px';
                        this.servers.forEach(s => {
                            $(s.console).css('font-size', value + 'px');
                        })
                    }
                    break;
                case 'fontcolor':
                    if(value == 'default') {
                        obj.fontcolor = def;
                        this.servers.forEach(s => {
                            $(s.console).css('color', def);
                        })
                    } else {
                        obj.fontcolor = value;
                        this.servers.forEach(s => {
                            $(s.console).css('color', value);
                        })
                    }
                    break;
            }

            store.set('gui', obj);
        }
    }


    // manage selected currently selected server
    activeServerCheck() {
        let check = false;
        this.servers.forEach(server => {
            if(server.isActive) {
                check = true;
            }
        })
        return check;
    }
    getSelectedServer() {
        return this.server;
    }
    setSelectedServer(server) {

        if(server) {
            if(this.server) {
                this.server.isSelected = false;
            }

            // replace server console
            this.replace_server_console(server.console);
    
            server.isSelected = true;
            this.server = server;
        }

        this.server = server;
    }
    isSelectedServer(server) {
        return server == this.getSelectedServer();
    }
    server_access(callback) {

        let server = this.getSelectedServer();

        // -- be sure that server is not undefined
        if(server) {

            // -- return display and input in callback
            callback(server);
        }
    }



    // CREATE & POPULATE SERVER HELPERS

    // create server folder to copy server files to
    create_server_folder(server_dir, file_name, callback) {

        try {
            // create random folder id
            this.createFolderName(10, (result) => {

                // create folder with required files to run server
                var f_dir = path.join(server_dir, result);
                this.createFolder(f_dir, () => {

                    // if server files need to be created
                    if(file_name) {
                        this.createBatFile(f_dir, file_name, () => {
                            this.createEulaFile(f_dir, () => {
                                this.createPropFile(f_dir, (data) => {
                                    callback(data);
                                })
                            })
                        })
                    } else {
                        callback(result);
                    }
                })
            })
        } catch(err) {
            this.deleteFile(dir, () => {
                this.hide_overlay();
                this.notifier.alert(err.toString());
                console.log(err);
            })
        }
    }

    // return random string of text for server folder name
    createFolderName(length, callback) {
        var result = '';
        var characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
        var charactersLength = characters.length;
        do {
            result = '';
            if(length <= 15) {
                for ( var i = 0; i < length; i++ ) {
                    result += characters.charAt(Math.floor(Math.random() * charactersLength));
                }
                length += 1;
            }
        } while(fs.existsSync(result));

        callback(result);
    }

    // create run.bat file with pre-built start-script
    createBatFile(dir, file, callback) {
        let batPath = path.join(dir, 'run.bat');

        // start script url(https://aikar.co/2018/07/02/tuning-the-jvm-g1gc-garbage-collector-flags-for-minecraft/)
        let start_script = "java -Xms2G -Xmx2G -XX:+UseG1GC -XX:+ParallelRefProcEnabled -XX:MaxGCPauseMillis=200 -" +
        "XX:+UnlockExperimentalVMOptions -XX:+DisableExplicitGC -XX:+AlwaysPreTouch -XX:G1NewSizePercent=30 -" +
        "XX:G1MaxNewSizePercent=40 -XX:G1HeapRegionSize=8M -XX:G1ReservePercent=20 -XX:G1HeapWastePercent=5 -" +
        "XX:G1MixedGCCountTarget=4 -XX:InitiatingHeapOccupancyPercent=15 -XX:G1MixedGCLiveThresholdPercent=90 -" +
        "XX:G1RSetUpdatingPauseTimePercent=5 -XX:SurvivorRatio=32 -XX:+PerfDisableSharedMem -" +
        "XX:MaxTenuringThreshold=1 -Dusing.aikars.flags=https://mcflags.emc.gs -Daikars.new.flags=true -jar "+ file +" nogui";

        // create run.bat file
        this.createFile(batPath, start_script, (err) => {
            if(err) {
                this.fileCreateError();
                return;
            }

            if(callback) {
                callback();
            }
        })
    }

    // check that .bat file command has required args
    processBatFile(script, file) {
        let changeDetected = false;

        let p = '';
        let command = '';
        let isDirectory = false;
        let fdata = this.fileInfo(script, false);

        if(fdata) {
            isDirectory = true;
            p = path.join(script, 'run.bat');
            command = fs.readFileSync(p, 'utf-8');
        } else {
            command = script;
        }

        // check that .jar matches file name
        let a = command.indexOf('.jar');
        let b = command.substr(0, a);
        let c = b.lastIndexOf(' ');
        let d = b.substr(c);
        if(d !== file) {
            changeDetected = true;
            command = b.substr(0, c).concat(' ' + file).concat(command.substr(a + 4));
        }

        let args = command.split(' ');

        // if there is a change detected
        if(changeDetected) {
            let newCommand = args.join(' ');

            if(isDirectory) {
                fs.writeFileSync(p, newCommand);
            } else {
                return newCommand;
            }
        }
    }

    // create eula.txt file which is required to run the server
    createEulaFile(dir, callback) {
        let eulaPath = path.join(dir, 'eula.txt');
        this.createFile(eulaPath, 'eula=true', (err) => {

            if(err) {
                this.fileCreateError();
                return;
            }

            callback();
        })
    }

    // create server.properties file with basic properties
    createPropFile(dir, callback) {
        let file_content = '';
            let properties = {
                'online-mode': true,
                'motd': 'Welcome to Visual Spigot!',
                'server-ip': 'localhost',
                'server-port': '25565',
                'global-commands': false,
                'max-players': 20,
                'hardcore': false,
                'pvp': true
            };

            // -- for each property in file
            for (const prop in properties) {
                file_content += prop + '=' + properties[prop] + '\n';
            }

            let propPath = path.join(dir, 'server.properties');
            this.createFile(propPath, file_content, (err) => {
                if(err) {
                    this.fileCreateError();
                    return;
                }
                
                callback(dir);
            })
    }

    // create plugin folder
    createPluginFolder(dir) {
        let pluginDir = path.join(dir, 'plugins');
        if (!fs.existsSync(pluginDir)) {
            fs.mkdirSync(pluginDir);
        }
    }

    /**
     * if there is an error creating a server
     * remove all pre-existing files related to the server
     */
    fileCreateError() {
        this.deleteFile(dir, () => {
            this.hide_overlay();
            this.notifier.alert(err.toString());
            console.log(err);
        })
    }

    // search array for value and return it
    searchArray(array, searchString) {
        return array.filter(f => f.includes(searchString))[0];
    }

    // remove index from array
    removeFromArray(array, value) {
        let index = array.indexOf(value);
        array.splice(index, 1);
    }

    // return a random string from given length
    randomString(length) {
        var result = '';
        var characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
        var charactersLength = characters.length;
        for ( var i = 0; i < length; i++ ) {
            result += characters.charAt(Math.floor(Math.random() * charactersLength));
        }
        return result;
    }



    // GENERAL APPLICATION HELPERS

    // parse initial server name and return beautiful string
    get_display_name(jar_file) {
        let str_no_ext = jar_file.substring(0, jar_file.lastIndexOf('.'));
        let str_no_dash = str_no_ext.replace('-',' ');
        let str_cap = str_no_dash.charAt(0).toUpperCase() + str_no_dash.slice(1);
        return str_cap;
    }

    // get last saved command
    getSavedCommand(a) {
        let i = this.savedInputPosition;
        let l = this.savedInputCommands.length;

        if(a) {
            i += 1;
        } else {
            i -= 1;
        }

        if(i < 0) {
            i = l - 1;
        } else if(i == l) {
            i = 0;
        }

        let command = this.savedInputCommands[i];

        if(command) {
            this.savedInputPosition = i;
            this.console_input.value = command;
        }
    }

    // add command to array of saved commands
    updateSavedCommands(command) {

        if(this.savedInputCommands.length > 10) {
            this.savedInputCommands.pop();
        }

        this.savedInputCommands.unshift(command);
        this.savedInputPosition = -1;
    }

    // manually copy text to clipboard
    copyToClipboard(text) {
        var dummy = document.createElement("textarea");
        document.body.appendChild(dummy);
        dummy.value = text;
        dummy.select();
        document.execCommand("copy");
        document.body.removeChild(dummy);
    }

    // sorts servers in ascending order
    sort_servers() {
        let container_element = this.server_dropdown_container;
        let list = $(this.server_dropdown_container);
        let listItems = list.children('a').get();

        listItems.sort(function(a, b) {
            return $(a).text().toUpperCase().localeCompare($(b).text().toUpperCase());
        })

        container_element.innerHTML = '';
        $.each(listItems, function(index, item) {
            list.append(item);
        })
    }

    // return base64 image buffer
    getEncodedImage(dir) {
        return fs.readFileSync(dir, { encoding: 'base64' });
    }


    // FILE HANDLER FUNCTIONS
    createFile(filePath, data, callback) {
        if(!fs.existsSync(filePath)) {
            fs.writeFile(filePath, data, (err) => {
                if(err) {
                    this.notifier.alert(err.toString());
                    console.log(err);

                    if(callback) {
                        callback(err);
                    }
                } else {
                    if(callback) {
                        callback();
                    }
                }
            })
        }
    }

    createFolder(filePath, callback) {
        if(!fs.existsSync(filePath)) {
            fs.mkdir(filePath, (err) => {
                if(err) {
                    this.notifier.alert(err.toString());
                    console.log(err);
                } else {
                    if(callback) {
                        callback();
                    }
                }
            })
        }
    }

    deleteFile(filePath, callback) {
        let self = this;
        if(fs.existsSync(filePath)) {
            let info = this.fileInfo(filePath);
            if(info.isDirectory()) {
                rmdir(filePath, function (err) {
                    if(err) { 
                        self.notifier.alert('Failed to delete ' + path.basename(filePath));
                        console.log(err);
                        return;
                    } else {
                        if(callback) {
                            callback();
                        }
                    }
                });
            } else {
                fs.unlink(filePath, (err) => {
                    if (err) {
                        self.notifier.alert('Failed to delete ' + path.basename(filePath));
                        console.log(err);
                        return;
                    } else {
                        if(callback) {
                            callback();
                        }
                    }
                })
            }
        }
    }

    replaceFile(filePath, targetPath, callback) {
        try {
            if(fs.existsSync(filePath) && fs.existsSync(targetPath)) {
                fs.rename(filePath, targetPath, (err) => {
                    if(err) throw new Error("Failed to overwrite file " + path.basename(filePath));
                    callback();
                })
            }
        } catch(err) {
            this.notifier.alert(err.toString());
            console.log(err);
        }
    }

    renameFile(oldPath, newPath, callback) {
        try {
            if(fs.existsSync(oldPath)) {
                fs.rename(oldPath, newPath, (err) => {
                    if(err) {
                        console.log(err);
                    };
                    callback();
                })
            }
        } catch(err) {
            this.notifier.alert(err.toString());
            console.log(err);
        }
    }

    getFiles(directory, isAsync, callback) {
        try {
            if(fs.existsSync(directory)) {
                if(isAsync) {
                    fs.readdir(directory, (err, files) => {
                        if(err) throw new Error("Failed to get files in " + path.basename(directory));
                        callback(files);
                    })
                } else {
                    let files = fs.readdirSync(directory);
                    if(callback) callback(files);
                    return files;
                }
            }
        } catch(err) {
            this.notifier.alert(err.toString());
            console.log(err);
        }
    }

    fileInfo(filePath, isAsync, callback) {
        try {
            if(fs.existsSync(filePath)) {
                if(isAsync) {
                    fs.lstat(filePath, (err, info) => {
                        if(err) {
                            throw new Error('Failed to retrieve file stats at ' + path.basename(filePath));
                        }
                        callback(info);
                    })
                } else {
                    let info = fs.lstatSync(filePath);
                    if(callback) callback(info);
                    return info;
                }
            }
        } catch(err) {
            this.notifier.alert(err.toString());
            console.log(err);
        }
    }
    
    readJson(filePath, isAsync, callback) {
        try {
            if(fs.existsSync(filePath)) {
                let info = this.fileInfo(filePath);
                if(!info.isDirectory()) {
                    let ext = path.extname(filePath);
                    if(ext == '.json') {
                        let jsonObj = null;
                        let jsonContent = null;
                        if(isAsync) {
                            fs.readFile(filePath, 'utf-8', (err, data) => {
                                if(err) {
                                    throw new Error('Failed to read json file ' + path.basename(filePath));
                                }
                                jsonObj = JSON.parse(data);
                                jsonContent = JSON.stringify(jsonObj, undefined, 2);
                                callback(jsonContent);
                            })
                        } else {
                            jsonObj = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
                            jsonContent = JSON.stringify(jsonObj, undefined, 2);
                            if(callback) callback(jsonContent);
                            return jsonContent;
                        }
                    }
                }
            }
        } catch(err) {
            this.notifier.alert(err.toString());
            console.log(err);
        }
    }

    copyFiles(srcDir, destDir, callback) {
        let self = this;
        if(fs.existsSync(srcDir) && fs.existsSync(destDir)) {
            fs.copy(srcDir, destDir, err => {
                if(err) {
                    self.notifier.alert(err.toString());
                    console.log(err);
                }

                if(callback) {
                    setTimeout(() => { callback(); }, 1500);
                }
            })
        } else {
            this.notifier.alert('Files already exist sh-cf');
        }
    }

    moveFiles(srcDir, destDir, callback) {
        let self = this;
        if(fs.existsSync(srcDir)) {

            // if the dest path already exists delete it
            if(fs.existsSync(destDir)) {
                self.deleteFile(destDir);
            }

            fs.move(srcDir, destDir, err => {
                if(err) {
                    self.notifier.alert(err.toString());
                    console.log(err);
                }

                if(callback) {
                    callback();
                }
            })
        } else {
            this.notifier.alert('Invalid source directory sh-mf');
        }
    }
}

module.exports = ServerHelpers;