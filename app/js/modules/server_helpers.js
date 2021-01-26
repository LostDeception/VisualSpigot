var fs = require('fs');
var path = require('path');
var store = require('store');
var rmdir = require('rimraf');

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

        this.main_container = document.getElementById('main-container');
        this.logo_container = document.getElementById('logo-container');

        // server console elements
        this.console = document.getElementById('console');
        this.console_container = this.console.childNodes[0];
        this.console_input = this.console.childNodes[1].childNodes[0];
        this.btn_open_directory = document.getElementById('btn-file-explorer');
        this.btn_delete_server = document.getElementById('btn-delete-server');
        this.btn_server_downloads = document.querySelectorAll('.server-download');
        this.server_download_overlay = document.getElementById('server-download-overlay');

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

    display_download_overlay(server_name) {

        // -- close the add-server modal
        $('#addServerModel').modal('hide');

        // -- display server-download overlay
        let text = "Downloading: " + server_name;
        this.server_download_overlay.childNodes[0].textContent = text;
        this.server_download_overlay.style.display = 'flex';
    }

    hide_download_overlay() {
        this.server_download_overlay.childNodes[0].textContent = '';
        this.server_download_overlay.style.display = 'none';
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

    removeAllChildNodes(parent) {
        while (parent.firstChild) {
            parent.removeChild(parent.firstChild);
        }
    } 

    updateServerState(server, state) {

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

    input_auto_completion(commands) {

        // -- shorthand for document
        var doc = document;

        // -- suggestion container
        var container = doc.createElement("div");
        container.classList.add('autocomplete');
        container.style.userSelect = 'none';

        // -- suggestion container style
        var containerStyle = container.style;
        containerStyle.position = 'absolute';

        // -- console input
        var input = this.console_input;

        // -- get keys in commands object
        var keys = Object.keys(commands);

        
        /**
         * -- when user presses key
         * -- check if input value has a suggestion
         */
        input.addEventListener('keyup', function(e) {

            // -- e is undefined set to window event
            if(!e) { e = window.event; }

            // -- get keycode 
            var keyCode = e.code || e.key;

            // -- check that user is not pressing tab
            if(keyCode !== 'Tab') {

                // -- get input value text to lowercase
                let text = this.value.toLowerCase();

                // -- if input has no value than detach suggestion container
                if(text !== '') {

                    // -- variable to hold found suggestions
                    let suggestions = '';

                    // -- get full command thus far
                    let cmd = text.substr(0, text.lastIndexOf(' '));

                    // -- check if commands contains current command
                    if(commands[cmd]) {

                        // -- get last word
                        let n = text.split(" ");
                        let lastWord =  n[n.length - 1];

                        // -- all sub args for current command path
                        suggestions = commands[cmd].filter(n => n.startsWith(lastWord));
                    } else {
                        // -- all base args for command paths
                        suggestions = keys.filter(n => !n.includes(' ') && n.startsWith(text));
                    }
                    
                    // -- check if suggestions were found
                    if(suggestions != '') {

                        // -- clear container of any elements
                        container.innerHTML = '';

                        // -- set container suggestions
                        for(var i = 0; i < suggestions.length; i++) {
                            let item = doc.createElement('div');
                            item.innerHTML = suggestions[i];
                            container.append(item);

                            if(i == 0) {
                                item.classList.add('selected');
                            }
                        }

                        attach();
                        updatePosition();
                    } else {
                        detach();
                    }

                } else {
                    detach();
                }
            }
        })

        /**
         * -- if user presses Tab in input box than cycle suggestions if any
         * -- if user presses Space than append the selected suggestion to input value
         */
        input.addEventListener('keydown', function(e) {

            // -- e is undefined set to window event
            if(!e) { e = window.event; }

            // -- get keycode 
            var keyCode = e.code || e.key;

            // -- prevent default tab key functionality
            if(keyCode == 'Tab') { e.preventDefault(); }

            // -- check that container is being displayed
            if(containerDisplayed()) {

                // -- get selected element in suggestion container
                let selected = doc.querySelector('.selected');

                switch(keyCode) {

                    /**
                     * -- if the container is present than
                     * -- select next suggestion within it
                     */
                    case 'Tab':
                    
                        // -- get next sibling element to currently selected element
                        let sibling = selected.nextElementSibling;
                        selected.classList.remove('selected');

                        // -- check that there is a sibling
                        if(sibling) {
                            sibling.classList.add('selected');
                        } else {
                            container.childNodes[0].classList.add('selected');
                        }

                        break;
    
                    /**
                     * -- append selected suggestion to
                     * -- the input value
                     */
                    case 'Space':
                        
                        // -- get input text
                        let text = input.value.toLowerCase();

                        // -- get all text up to latest command
                        let cmd = text.substr(0, text.lastIndexOf(' ') + 1);

                        // -- set input value to the updated command
                        input.value = cmd.concat(selected.innerHTML);

                        break;
                }
            }
        })

        // -- if input loses focus than detach suggestion container
        input.addEventListener('focusout', function() { detach(); })


        /**
        * Attach the container to DOM
        */
        function attach() {
            if (!container.parentNode) {
                doc.body.appendChild(container);
            }
        }

        /**
        * Detach the container from DOM
        */
        function detach() {
            var parent = container.parentNode;
            if (parent) {
                parent.removeChild(container);
            }
        }

        /**
        * Check if container for autocomplete is displayed
        */
        function containerDisplayed() {
            return !!container.parentNode;
        }

        /**
        * Update autocomplete position
        */
       function updatePosition() {
            if (!containerDisplayed()) {
                return;
            }
            containerStyle.height = "auto";
            containerStyle.width = input.offsetWidth + "px";
            var maxHeight = 0;
            var inputRect;
            function calc() {
                var docEl = doc.documentElement;
                var clientLeft = docEl.clientLeft || doc.body.clientLeft || 0;
                var scrollLeft = window.pageXOffset || docEl.scrollLeft;
                inputRect = input.getBoundingClientRect();
                var left = inputRect.left + scrollLeft - clientLeft;
                containerStyle.left = left + "px";
                maxHeight = window.innerHeight - (inputRect.top + input.offsetHeight);
                if (maxHeight < 0) {
                    maxHeight = 0;
                }

                containerStyle.bottom = (window.innerHeight - inputRect.bottom + input.offsetHeight) + "px";
                containerStyle.left = left + "px";
                containerStyle.maxHeight = "200px";
            }
            // the calc method must be called twice, otherwise the calculation may be wrong on resize event (chrome browser)
            calc();
            calc();
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

    app_intro_state() {
        this.mainContainerDisplayed = false;
        this.console.style.display = 'none';
        this.logo_container.style.display = 'flex';
    }

    app_default_state() {
        this.console.style.display = 'flex';
        this.logo_container.style.display = 'none';
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
            $(s.console).css('font-family', gui.font);
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

    // object to write to properties file on server creation
    propObj() {
        return {
            'online-mode': true,
            'motd': 'Welcome to Visual Spigot!',
            'server-ip': 'localhost',
            'server-port': '25565',
            'global-commands': false,
            'max-players': 20,
            'hardcore': false,
            'pvp': true
        };
    }

    getSelectedServer() {
        return this.server;
    }

    setSelectedServer(server) {

        if(this.server) {
            this.server.isSelected = false;
        }

        server.isSelected = true;
        this.server = server;
    }

    isSelectedServer(server) {
        return server == this.getSelectedServer();
    }

    // checks that current server obj is not null/undefined then returns server object in callback
    server_access(callback) {

        let server = this.getSelectedServer();

        // -- be sure that server is not undefined
        if(server) {

            // -- return display and input in callback
            callback(server);
        }
    }

    // create server folder to copy server files to
    create_server_folder(server_dir, file_name, callback) {

        let self = this;
    
        // create random folder id
        createFolderName(10, (result) => {
            let f_dir = path.join(server_dir, result);
            let s_dir = path.join(f_dir, file_name);
            fs.mkdir(f_dir, function (err) {

                if(err) {
                    callback(err);
                    return;
                }

                fs.writeFile(path.join(f_dir, 'eula.txt'), 'eula=true', function (err) {

                    if (err) { callback(err); }

                    try {
                        let file_content = '';
                        let properties = self.propObj();

                        // -- for each property in file
                        for (const prop in properties) {
                            file_content += prop + '=' + properties[prop] + '\n';
                        }

                        fs.writeFile(path.join(f_dir, 'server.properties'), file_content, function(err) {
                            if (err) { callback(err); };
                            let data = {
                                folderName: result,
                                folderDir: f_dir,
                                serverDir: s_dir
                            }

                            callback(null, data);
                        })
                    } catch(err) {
                        callback(err);
                    }
                })
            })
        })

        // return random string of text for server folder name
        function createFolderName(length, callback) {
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
    }

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
        try {
            if(fs.existsSync(filePath)) {
                fs.writeFile(filePath, data, (err) => {
                    if(err) {
                        throw new Error('Failed to create file ' + path.basename(filePath));
                    } else {
                        callback();
                    }
                })
            }
        } catch(err) {
            this.notifier.alert(err.toString());
            console.log(err);
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
                        callback();
                    }
                });
            } else {
                fs.unlink(filePath, (err) => {
                    if (err) {
                        self.notifier.alert('Failed to delete ' + path.basename(filePath));
                        console.log(err);
                        return;
                    } else {
                        callback();
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
                            jsonObj = fs.readFileSync(filePath, 'utf-8');
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
}

module.exports = ServerHelpers;