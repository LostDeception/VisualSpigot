// =========================================================
// Copyright 2021, Timothy Mickelson, All rights reserved.
// =========================================================
var fs = require('fs-extra');
var path = require('path');
var store = require('store');
var rmdir = require('rimraf');
const { shell } = require('electron');

class DomHandler {
    constructor() {
        let self = this;
        this.introContainerDisplayed = false;
        this.mainContainerDisplayed = false;

        clean(document.body)

        // initialize notification object
        this.notifier = new AWN({
            maxNotifications: 3
        })

        this.main = document.getElementById('main');
        this.main_container = document.getElementById('main-container');
        this.logo_container = document.getElementById('logo-container');

        /**
         * add click event to the close sidebar buttons
         */
        let exitSidebar = document.getElementsByClassName('closebtn');
        Array.from(exitSidebar).forEach(btn => {
            btn.addEventListener('click', function() {
                let parent = btn.parentElement;
                parent.style.width = '0';
                self.main.style.marginRight = '0';
            })
        })

        // setup donation button click event
        let btn_donate = document.getElementById('btn-paypal-donation');
        btn_donate.addEventListener('click', function() {
            shell.openExternal('https://www.paypal.com/donate?business=tmickelson93%40gmail.com&item_name=VisualSpigot+Donations&currency_code=USD');
        })

        // server console elements
        this.console = document.getElementById('console');
        this.console_container = document.getElementById('console-container');
        this.console_input = document.getElementById('server-console-input');
        this.btn_open_directory = document.getElementById('btn-file-explorer');
        this.btn_delete_server = document.getElementById('btn-delete-server');
        this.btn_server_downloads = document.querySelectorAll('.server-download');

        // SERVER HEADER ELEMENTS
        this.btn_dropdown_servers = document.getElementById('btn-dropdown-servers');
        this.server_dropdown_container = document.getElementById('dropdown-servers');
        this.btn_start_server = document.getElementById('btn-start-server');
        this.btn_stop_server = document.getElementById('btn-stop-server');
        this.btn_kill_server = document.getElementById('btn-kill-server');
        this.btn_restart_server = document.getElementById('btn-restart-server');

        // MODAL BUTTONS
        this.btn_add_server = document.getElementById('btn-add-server');
        this.btn_server_files = document.getElementById('btn-file-explorer');
        this.btn_rename_server = document.getElementById('btn-rename-server');

        // FILE EXPLORER ELEMENTS
        this.btn_back_dir = document.getElementById('btn-back-dir');
        this.btn_open_dir = document.getElementById('btn-open-dir');
        this.file_list = document.getElementById('file-list');
        this.header_text = document.getElementById('fs-dir-text');
        this.btn_save_file = document.getElementById('btn-save-file');
        this.save_file_notif = document.getElementById('file-saved-notification');
        this.editor_theme_dropdown = document.getElementById('editor-theme-dropdown');

        // handle file explorer search input
        this.input_file_search = document.getElementById('file-list-search');
        this.input_file_search.addEventListener('keyup', () => {
            var input, filter, ul, li, a, i, txtValue;
            input = this.input_file_search;
            filter = input.value.toUpperCase();
            ul = this.file_list;
            li = ul.getElementsByTagName('a');

            // Loop through all list items, and hide those who don't match the search query
            for (i = 0; i < li.length; i++) {
                a = li[i];
                txtValue = a.textContent || a.innerText;
                if (txtValue.toUpperCase().indexOf(filter) > -1) {
                li[i].style.display = "";
                } else {
                li[i].style.display = "none";
                }
            }
        })

         // default styles
        this.dStyles = {
            font: 'monospace',
            fontsize: '15px',
            fontcolor: 'lightsteelblue'
        }

        // handle when user focuses window
        window.onfocus = () => {
            self.console_input.focus();
        }

        // when the server explorer modal closes focus input
        $("#serverFilesModal").on("hidden.bs.modal", function () {
            self.main_container.style.visibility = 'visible';
            self.console_input.focus();
        });

        function clean(node)
        {
            for(var n = 0; n < node.childNodes.length; n ++)
            {
                var child = node.childNodes[n];
                if(child.nodeType === 8 || (child.nodeType === 3 && !/\S/.test(child.nodeValue))) {
                    node.removeChild(child);
                    n --;
                } else if(child.nodeType === 1)
                {
                    clean(child);
                }
            }
        }
    }

    display_overlay(text) {

        // hide any visible modals
        $('.modal').modal('hide');

        // get overlay element from DOM
        let overlay = document.getElementById('application-overlay');

        // -- display server-download overlay
        overlay.childNodes[0].textContent = text;
        overlay.style.display = 'flex';
    }

    hide_overlay() {
        let overlay = document.getElementById('application-overlay');
        overlay.childNodes[0].textContent = '';
        overlay.style.display = 'none';
    }

    create_tab_item(server_name) {

        let self = this;

        // -- get tab_container element
        let container = this.server_dropdown_container;

        // -- create a tag
        let tab_item = document.createElement('a');
        
        let tab_icon = document.createElement('i');
        tab_icon.classList.add('fas', 'fa-circle');

        tab_item.append(tab_icon);
        tab_item.innerHTML += ' ' + server_name;

        // -- add tab-item to container
        container.append(tab_item);
        
        // -- add event listener to tab_item
        tab_item.addEventListener('click', function() {

            // all server_tabs
            let server_tabs = container.childNodes;

            // reset colors of all tab_items
            server_tabs.forEach(element => {
                element.style.color = 'rgba(255, 255, 255, 0.5)';
                element.style.backgroundColor = 'transparent';
            });

            // set selected tab-item border
            tab_item.style.color = 'rgb(209, 209, 214)';
            tab_item.style.backgroundColor = 'rgba(72, 76, 82, 0.87)';

            // set selected item in main dropdown button
            self.btn_dropdown_servers.innerHTML = tab_item.innerHTML;
        })

        return tab_item;
    }

    create_server_console() {
        let c = document.createElement('div');
        c.classList.add('server-console');
        c.spellcheck = false;

        let gui = store.get('gui');
        if(gui) {
            c.style.fontFamily = gui.font;
            c.style.fontSize = gui.fontsize;
            c.style.color = gui.fontcolor;
        }

        return c;
    }

    replace_server_console(console) {
        // -- replace console element in console container
        let container = this.console_container;
        if (container.childNodes.length > 0) {
            container.replaceChild(console, container.childNodes[0]);
        } else {
            container.appendChild(console);
        }

        container.scrollTop = container.scrollHeight;
    }

    removeAllChildNodes(parent) {
        while (parent.firstChild) {
            parent.removeChild(parent.firstChild);
        }
    } 

    updateServerState(server, state) {

        // display main container is not being displayed
        if(!this.mainContainerDisplayed) {
            this.console.style.display = 'flex';
            this.logo_container.style.display = 'none';
            this.mainContainerDisplayed = true;
        }

        if(server.state !== state) {

            if(state) {
                server.state = state;
            }

            if(server.isSelected) {
                switch(server.state) {
                    case 'waiting':
                        this.btn_start_server.disabled = true;
                        this.btn_stop_server.disabled = true;
                        this.btn_kill_server.disabled = true;
                        this.btn_restart_server.disabled = true;
                        break;
                    case 'default':
                        this.btn_start_server.disabled = false;
                        this.btn_stop_server.disabled = true;
                        this.btn_kill_server.disabled = true;
                        this.btn_restart_server.disabled = true;
                        break;
                    case 'running':
                        this.btn_start_server.disabled = true;
                        this.btn_stop_server.disabled = false;
                        this.btn_kill_server.disabled = false;
                        this.btn_restart_server.disabled = false;
                        break;
                    case 'starting':
                        this.btn_start_server.disabled = true;
                        this.btn_stop_server.disabled = true;
                        this.btn_kill_server.disabled = false;
                        this.btn_restart_server.disabled = true;
                        break;
                    case 'stopping':
                    case 'restarting':
                        this.btn_start_server.disabled = true;
                        this.btn_stop_server.disabled = true;
                        this.btn_kill_server.disabled = false;
                        this.btn_restart_server.disabled = true;
                        break;
                }
            }
        }
    }

    displayBlock(console, icon, title, text) {

        let container = document.createElement('div');
        container.style.display = 'flex';
        container.style.flexDirection = 'column';
        container.style.width = '500px';
        container.style.height = 'auto';
        container.style.marginTop = '5px';
        container.style.padding = '5px';
        container.style.borderRadius = '3px';
        container.style.backgroundColor = 'var(--fade)';
        container.style.color = 'var(--dim-white)';
        

        let titleMsg = '';
        let header = document.createElement('div');
        header.style.display = 'flex';
        header.style.justifyContent = 'center';
        header.style.alignItems = 'center';
        header.style.width = '100%';
        header.style.height = '35px';
        header.style.borderBottom = '1px solid var(--shadow-grey)';
        header.style.color = 'var(--white)';
        header.style.userSelect = 'none';

        if(icon) {
            titleMsg = icon + ' ' + title;
        } else {
            titleMsg = title;
        }

        header.innerHTML = titleMsg;
        container.appendChild(header);

        container.innerHTML += text;

        console.appendChild(container);
        console.parentNode.scrollTop = console.parentNode.scrollHeight;
    }

    // display application logo container
    app_intro_state() {
        this.mainContainerDisplayed = false;
        this.console.style.display = 'none';
        this.logo_container.style.display = 'flex';
    }

    click_element(element) {
        
        // -- create click event
        const event = new MouseEvent('click', {
            view: window,
            bubbles: true,
            cancelable: true
        });

        // -- dispatch event on element
        element.dispatchEvent(event);
    }

    scrollToBottom(element) {
        let parentNode = element.parentNode;
        if(parentNode) {
            parentNode.scrollTop = parentNode.scrollHeight;
        }
    }

    // apply drag-drop to container
    initializeDragDrop(element, callback) {
        element.addEventListener('drop', function (e) {
            element.style.borderColor = 'transparent';
            callback(e.dataTransfer);
        })

        element.addEventListener('dragenter', function (e) {
            e.preventDefault();
            element.style.borderColor = 'var(--lime)';
        })

        element.addEventListener('dragleave', function (e) {
            if(!element.contains(e.relatedTarget)) {
                element.style.borderColor = 'transparent';
            }
        })

        element.addEventListener('dragover', function (e) {
            e.preventDefault();
            element.style.borderColor = 'var(--lime)';
        })
    }

    setTheme(theme) {
        let background = document.getElementsByClassName('background')[0];
        let header = document.getElementById('container-header');
        switch(theme) {
            case 'default':
                background.style.opacity = '0.3';
                header.style.backgroundColor = 'var(--default-two)';
                header.style.borderColor = 'var(--default-three)';
                this.console_input.style.backgroundColor = 'var(--default-one)';
                break;
            case 'dark':
                background.style.opacity = '0.2';
                //this.main_container.style.backgroundColor = 'var(--dark-three)';
                header.style.backgroundColor = 'var(--dark-two)';
                this.console_input.style.backgroundColor = 'var(--dark-two)';
                break;
            case 'light':
                header.style.backgroundColor = 'var(--light-one)';
                this.console_input.style.backgroundColor = 'var(--light-two)';
                break;
        }
    }

    /**
     * if settings sidebar is open 
     * than close it otherwise open it
     */
    toggleSettingsSideBar() {
        let main = document.getElementById('main');
        let sidebar = document.getElementById('settings-side-bar');
        if(sidebar.style.width == '250px') {
            sidebar.style.width = '0';
            main.style.marginRight = '0';
        } else {
            sidebar.style.width = '250px';
            main.style.marginRight = '250px';
        }
    }

    /**
     * if theme sidebar is open
     * than close it otherwise open it
     */
    toggleThemeSideBar() {
        let main = document.getElementById('main');
        let sidebar = document.getElementById('theme-side-bar');
        if(sidebar.style.width == '250px') {
            sidebar.style.width = '0';
            main.style.marginRight = '0';
        } else {
            sidebar.style.width = '250px';
            main.style.marginRight = '250px';
        }
    }
}

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

    // if vsc plugin does not exist than copy from resource folder
    copyVSCPlugin(dir) {

        // first create plugin folder if needed
        this.createPluginFolder(dir);

        // OLD VERSION TO REPLACE
        /**
            let old = path.join(dir, 'plugins', 'vsc.jar');
            if(fs.existsSync(old)) {
                this.deleteFile(old);
            }
        */

        // get path to vsc.jar
        let to = path.join(dir, 'plugins', 'vsc-v1.0.8.jar');
        
        if(!fs.existsSync(to)) {
            let from = path.join(process.resourcesPath, 'plugins', 'vsc-v1.0.8.jar');
            fs.copy(from, to, err => {
                if(err) {
                    this.notifier.alert(err.toString());
                    console.log(err);
                }
            })
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


    // FILE HANDLER FUNCTIONS
    createFile(filePath, data, callback) {
        if(!fs.existsSync(filePath)) {
            fs.writeFile(filePath, data, (err) => {
                if(err) {
                    this.notifier.alert(err.toString());
                    console.log(err);
                    callback(err);
                } else {
                    callback();
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
                    callback();
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

                setTimeout(() => { callback(); }, 1500);
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