// =========================================================
// Copyright 2021, Timothy Mickelson, All rights reserved.
// =========================================================
var fs = require('fs-extra');
var path = require('path');
var store = require('store');
const { shell } = require('electron');

class GlobalCommands {
    constructor(handler) {
        this.handler = handler;
        this.input_auto_completion({
            '.help': [],
            '.info': [],
            '.rename': [],
            '.duplicate': [],
            '.files': [],
            '.properties': [],
            '.plugins': [],
            '.path': [],
            '.open': ['logs', 'plugins', 'permissions.yml', 'server.properties'],
            '.open logs': ['latest'],
            '.clear': [],
            '.font': ['serif', 'cursive', 'monospace', 'comic sans'],
            '.fontsize': ['14', '15', '16', '17', '18'],
            '.fontcolor': ['darkseagreen', 'darkkhaki', 'darkcyan', 'lightblue', 'lightslategrey', 'lightsteelblue'],
            '.toggle': ['stats'],
        });
    }

    newGlobalCommand(command) {

        // -- command arguments
        let args = command.substr(1).split(/\s+/);

        // -- get currently active server
        let server = this.handler.getSelectedServer();

        switch(args[0]) {

            // display list of global commands
            case 'help':
                this.handler.displayBlock(server.console, 
                '<i class="fab fa-wpforms"></i>', 
                "Global Command List",
                ".start: start server\n" +
                ".stop: stop server\n" +
                ".kill: kill server process\n" +
                ".restart: restart server\n" +
                ".info: display server info\n" +
                ".port \"number\": set server port\n" +
                ".ram \"number\": set server ram\n" +
                ".rename \"name\": set server name\n" +
                ".files: open server file explorer\n" +
                ".properties: open server properties\n" +
                ".plugins: open server plugins folder\n" +
                ".path: copy directory to clipboard\n" +
                ".open \"file path\": open specified file via desktop\n" +
                ".font \"font-family\": change font of the console\n" +
                '.fontsize \"font-size\": change font size of the console\n' +
                ".fontcolor \"font-color\": change the font color in the console\n" +
                ".clear: clear server console");
                break;
            case 'info':
                let info = server.getInfo();
                this.handler.displayBlock(server.console, 
                    '<i class="fas fa-server"></i>', 
                    server.name + " Info",
                    "Ram: " + info.ram + " Gigabytes\n" +
                    "Port: " + info.port
                );
                break;

            // start, stop, kill and restart selected server
            case 'start':
                this.handler.click_element(this.handler.btn_start_server);
                break;
            case 'stop':
                this.handler.click_element(this.handler.btn_stop_server);
                break;
            case 'kill':
                this.handler.click_element(this.handler.btn_kill_server);
                break;
            case 'restart':
                this.handler.click_element(this.handler.btn_restart_server);
                break;

            // duplicate selected server
            case 'duplicate':
                this.handler.duplicateServerHandler();
                break;

            // display list of server files
            case 'files':
                let filesPath = server.directory;
                if(args.length > 1) {
                    filesPath = path.join(filesPath, args[1]);
                }
                this.handler.sExplorer.generateFileList(filesPath);
                break;

            // display properties file in file explorer
            case 'properties':
                let propDir = path.join(server.directory, 'server.properties');
                this.handler.sExplorer.displayFileContents(propDir);
                break;

            // display plugins folder in file explorer
            case 'plugins':
                let servDir = path.join(server.directory, 'plugins');
                this.handler.sExplorer.generateFileList(servDir);
                break;

            // copy selected server directory to clipboard
            case 'path':
                this.handler.copyToClipboard(server.directory);
                server.displayMessage('Server path copied to clipboard')
                break;

            // rename selected server
            case 'rename': 
            
                try {
                    if(!server.isActive) {
                        if(args.length > 1 && args.length < 3) {
                            let name = args[1].concat('.jar');
                            let serverDir = server.file_directory;
                            let relPath = path.join(serverDir, '../');
                            let newPath = path.join(relPath, name);
                            this.handler.renameFile(serverDir, newPath, () => {
                                let displayName = this.handler.get_display_name(name);
                                server.displayMessage('Server renamed to ' + displayName);
    
                                // set new server name
                                server.name = displayName;

                                // set new full server.jar path
                                server.file_directory = newPath;
    
                                // create new button with name and click it
                                server.tab.innerHTML = '<i class="fas fa-circle"></i> ' + displayName;
                                this.handler.sort_servers();
                                this.handler.click_element(server.tab);
                            })
                        } else {
                            server.displayMessage('Server name cannot include spaces', 'var(--red');
                        }
                    } else {
                        server.displayMessage('Cannot change server name while server is active', 'var(--red)');
                    }
                } catch(err) {
                    this.handler.notifier.alert(err.toString());
                }
             
            break;
            
            // open directories on desktop
            case 'open':

                // -- check if there are more args
                if(args.length > 3) {

                    // -- check if previous arg is 'logs'
                    if(args[1] == 'logs') {
                        switch(args[2]) {
                            case 'latest':
                                this.openServerFile('logs/latest.log');
                                break;
                            case 'list':
                                break;
                        }
                    }

                } else {
                    this.openServerFile(args[1]);
                }
                
                break;
            case 'clear':
                if(server) {
                    server.console.innerHTML = '';
                }
                break;

            case 'font':
            case 'fontsize':
            case 'fontcolor':
                let value = args.slice(1).join(' ');
                this.handler.updateVisuals(args[0], value);
                break;
            
            case 'toggle':
                switch(args[1]) {
                    case 'stats':
                        let stats = this.handler.sRunnable;
                        let canDisplay = store.get('toggle-stats');
                        if(canDisplay) {
                            store.set('toggle-stats', false);
                            this.handler.hideServerInfo();
                            
                            server.displayMessage('Server stats toggle=FALSE (will NOT display when server is active)', null, false, true);
                            stats.stop();
                        } else {

                            store.set('toggle-stats', true);
                            server.displayMessage('Server stats toggle=TRUE (will display when server is active)', null, false, true)

                            if(server.isActive) {
                                this.handler.displayServerInfo();
                                stats.start();
                            }
                        }
                        break;
                }
                break;
        }
    }

    openServerFile(file) {

        let server = this.handler.getSelectedServer();

        // -- check that file is not undefined or null
        if(file && file !== null) {

            // -- get file path
            let dir = path.join(server.directory, file);

            // -- check if file or dir exists
            if(fs.existsSync(dir)) {
                shell.openPath(dir);
                server.displayMessage(file + ' file opened successfully');
            } else {
                server.displayMessage(file + ' file not found', 'var(--red)');
            }
        } else {
            shell.openPath(server.directory);
            server.displayMessage(server.name + ' directory opened successfully');
        }
    }

    input_auto_completion(commands) {

        // shorthand for document
        var doc = document;

        // suggestion container
        var container = doc.createElement("div");
        container.classList.add('autocomplete', 'fadeIn');
        container.style.userSelect = 'none';

        // suggestion container style
        var containerStyle = container.style;
        containerStyle.position = 'absolute';

        // console input
        var input = this.handler.console_input;

        // get keys in commands object
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

                    // check if commands contains current command
                    if(commands[cmd]) {

                        // get last word
                        let n = text.split(" ");
                        let lastWord =  n[n.length - 1];

                        // all sub args for current command path
                        suggestions = commands[cmd].filter(n => n.startsWith(lastWord));
                    } else {
                        // all base args for command paths
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

            // check that container is being displayed
            if(!!container.parentNode) {

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
                            sibling.scrollIntoView({
                                behavior: "smooth", 
                                block: "center", 
                                inline: "nearest"
                            });
                        } else {
                            container.childNodes[0].classList.add('selected');
                            container.childNodes[0].scrollIntoView(false);
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
        input.addEventListener('focusout', function() { 
            detach(); 
        })

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
    }
}

module.exports = GlobalCommands;