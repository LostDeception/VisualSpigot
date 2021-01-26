var fs = require('fs');
var path = require('path');
const { shell } = require('electron');

class GlobalCommands {
    constructor(handler) {
        this.handler = handler;
        handler.input_auto_completion({
            '.help': [],
            '.info': [],
            '.port': [],
            '.ram': [],
            '.rename': [],
            '.files': [],
            '.properties': [],
            '.plugins': [],
            //'.path': [],
            '.open': ['logs', 'plugins', 'permissions.yml', 'server.properties'],
            '.open logs': ['latest'],
            '.clear': [],
            '.font': ['serif', 'cursive', 'monospace', 'comic sans'],
            '.fontsize': ['14', '15', '16', '17', '18'],
            '.fontcolor': ['DarkSeaGreen', 'DarkKhaki', 'DarkCyan', 'LightBlue', 'LightSlateGrey', 'LightSteelBlue']
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
                server.displayMessage('Server path copied to clipboard', 'var(--info)')
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
                                server.displayMessage('Server renamed to ' + displayName, 'var(--info)');
    
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
            case 'port':
                if(args.length == 2 && args[1]) {
                    let port = parseInt(args[1]);
                    if(!isNaN(port)) {
                        server.setPort(port);
                    } else {
                        server.displayMessage('Port must be a number ex:25565', 'var(--red)');
                    }
                }
                break;
            case 'ram':
                if(args.length == 2 && args[1]) {
                    let ram = parseInt(args[1]);
                    if(!isNaN(ram)) {
                        server.setRam(ram);
                    } else {
                        server.displayMessage('Ram must be a number', 'var(--red)');
                    }
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
                server.displayMessage(file + ' file opened successfully', 'var(--info)');
            } else {
                server.displayMessage(file + ' file not found', 'var(--red)');
            }
        } else {
            shell.openPath(server.directory);
            server.displayMessage(server.name + ' directory opened successfully', 'var(--info)');
        }
    }
}

module.exports = GlobalCommands;