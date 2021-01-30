// =========================================================
// Copyright 2021, Timothy Mickelson, All rights reserved.
// =========================================================
var path = require('path');
var store = require('store');
var pidusage = require('@gristlabs/pidusage');
const { exec, spawn } = require('child_process');

class Server {
    constructor(handler, options) {
        this.handler = handler;

        // default server values
        this.name = options.name;
        this.directory = options.dir;
        this.file = options.file;
        this.file_directory = path.join(this.directory, this.file);
        this.state = options.state;
        this.tab = options.tab;
        this.console = options.console;

        this.isSelected = false;
        this.isActive = false;
        this.prefix = RegExp('\\[\\d+\\:\\d+\\:\\d+.*'); // default prefix before console message
        this.minecraft_color_codes = { // default minecraft color codes to display in console
            '4': '#AA0000',
            'c': '#FF5555',
            '6': '#FFAA00',
            'e': '#FFFF55',
            '2': '#00AA00',
            'a': '#55FF55',
            'b': '#55FFFF',
            '3': '#00AAAA',
            '1': '#0000AA',
            '9': '#5555FF',
            'd': '#FF55FF',
            '5': '#AA00AA',
            'f': '#FFFFFF',
            '7': '#AAAAAA',
            '8': '#555555',
            '0': '#000000'
        }

        store.remove(this.folder_name);
    }

    /**
     * check that server process is not already running
     * spawn server child process and listen for response
     * return process response to server_response emitter
     */
    start(callback) {
        
        // reject server start if already active
        if(this.isActive) { callback('Server already started'); }

        this.isActive = true;

        // when server is starting
        this.handler.updateServerState(this, 'starting');
        this.tab.childNodes[0].style.color = 'var(--lime)';
        this.displayMessage('Server Starting...', 'var(--lime)', false, true);
        this.handler.btn_dropdown_servers.innerHTML = this.tab.innerHTML;

        let spawnOpts = {
            cwd: this.directory,
            stdio: ['pipe', 'pipe', 'inherit']
        }

        // spawn server process in its native directory
        let batDir = path.join(this.directory, 'run.bat')
        this.spawn = spawn(batDir, spawnOpts);

        // server is starting EVENT
        this.handler.events.emit('server-starting');

        // get and display server output to console
        this.spawn.stdout.on('data', (data) => {
            data.toString().split('\n').forEach((line) => { 
                if(line) {

                    // check if there is an error or if in the middle of a stacktrace
                    if(this.errorFound || this.isError(line)) {
                        this.errorFound = true;
                        
                        // check if end of stacktrace set error found to false
                        if(this.isInfo(line) || this.isWarning(line)) {
                            this.errorFound = false;
                        } else {
                            this.displayMessage(line, 'var(--red)', true, false);
                        }
                    }
    
                    // if there are no errors being printed in the console
                    if(!this.errorFound) {
                        if(this.isWarning(line)) {
                            this.displayMessage(line, 'var(--yellow)', true, false);
                        } else {
                            this.displayMessage(line, null, true, false);
    
                            // check if server is finished loading
                            if(!this.serverLoaded && this.isServerLoaded(line)) {
                                this.handler.updateServerState(this, 'running');
                                this.serverLoaded = true;
                            }
                        }
                    }
                }
            })

            // scroll to bottom of console
            this.handler.scrollToBottom(this.console);
        })

        // wait for stdio to close
        this.spawn.once('exit', () => {
            this.serverLoaded = false;
            this.isActive = false;
            this.spawn = null;
            
            if (this.state == 'restarting') {
                this.handler.updateServerState(this, 'waiting');
            } else {
                this.handler.updateServerState(this, 'default');
            }

            this.tab.childNodes[0].style.color = 'rgba(255, 255, 255, 0.5)';

            if(this.handler.isSelectedServer(this)) {
                this.handler.btn_dropdown_servers.innerHTML = this.tab.innerHTML;
            }

            this.displayMessage('Server Terminated', 'var(--red)', false, true);
        });
    }

    stop() {
        return new Promise((resolve, reject) => {
            // -- check if server is already not active
            if(!this.isActive) {
                reject("Server is not running!");
            }

            // -- kill main server process and all child processes
            exec('taskkill /pid ' + this.spawn.pid + ' /T /F', function(err, data) {
                if(err) { reject(err); }
            })

            this.spawn = null;
            this.isActive = false;
            resolve();
        })
    }

    restart() {
        this.displayMessage('Server is restarting!', 'rgba(103, 250, 255, 0.5)', false, true);
        this.sendCommand('stop');
        var interval = setInterval(() => {
            if (!this.isActive) { this.start(); clearInterval(interval); }
        }, 100);
    }

    // displays/updates server process information
    serverProcessData() {
        return pidusage(this.spawn.pid);
    }

    // check for error,warning or info
    isWarning(line) {
        return line.indexOf('WARN') > -1;
    }
    isError(line) {
        return line.indexOf('ERROR') > -1;
    }
    isInfo(line) {
        return line.indexOf('INFO') > -1;
    }
    isServerLoaded(line) {
        return line.indexOf('Done') > -1 && line.indexOf('help') > -1;
    }

    // send command to server
    sendCommand(command, callback) {

        // -- add new line after command entered
        let cmd = command + '\n';

        // -- check if command has forward slash before
        if(cmd.charAt(0) == '/') {
            cmd = cmd.substring(1);
        }

        // -- check that process is not undefined
        if(this.isActive) {

            // -- write command to stream
            this.spawn.stdin.write(cmd);
        } else if(callback) {
            callback();
        }
    }

    // display message in server console
    displayMessage(message, color, hidePrefix, autoScroll) {

        // check if message requires prefix
        if(!hidePrefix) {
            if(!this.prefix.test(message)) {
                var d = new Date();
                let hour = ('0' + d.getHours()).slice(-2);
                let minute = ('0' + d.getMinutes()).slice(-2);
                let second = ('0' + d.getSeconds()).slice(-2);
                let m_prefix = '['+hour+':'+minute+':'+second+']: ';
                message = m_prefix.concat(message + '\n');
            }
        } else if(hidePrefix) {
            message = message.concat('\n');
        }

        // check if message is colored
        if(color) {
            let span = document.createElement('span');
            span.style.color = color;
            span.innerHTML = message;
            this.console.append(span);
            span.style.fontFamily = this.console.style.fontFamily;
        } else {
            let text = document.createTextNode(message);
            this.console.append(text);
        }

        if(autoScroll) {
            this.handler.scrollToBottom(this.console);
        }
    }
}

module.exports = Server;