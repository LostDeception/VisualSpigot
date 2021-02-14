// =========================================================
// Copyright 2021, Timothy Mickelson, All rights reserved.
// =========================================================
var fs = require('fs-extra');
var path = require('path');
var store = require('store');
const { shell } = require('electron');

// handle the local and remove file explorer
class ServerExplorer {
    constructor(handler) {
        this.handler = handler;

        let self = this;
        this.filesDisplayed = false;
        this.allowedFiles = ['.txt', '.yml', '.json', '.properties', '.log', '.bat'];
        this.excludedFiles = ['eula.txt', 'vsc-v1.0.8.jar'];

        this.baseDir = '';
        this.currentDir = '';

        // hold codemirror object
        this.editor = null;

        // set default editor theme
        if(!store.get('editor-theme')) {
            store.set('editor-theme', 'darcula');
        }

        // navigates back a directory
        handler.btn_back_dir.addEventListener('click', function() {
            if(self.currentDir !== self.baseDir) {
                let previousDir = path.join(self.currentDir, '..');
                self.generateFileList(previousDir);
            } else {
                
                // close the file-explorer window
                $('#serverFilesModal').modal('hide');
            }
        })

        // open current directory on desktop
        handler.btn_open_dir.addEventListener('click', function() {
            if(fs.existsSync(self.currentDir)) {
                shell.openPath(self.currentDir);
            }
        })

        // write data to modified file
        let savingFile = false;
        handler.btn_save_file.addEventListener('click', function() {
            if(!savingFile) {
                let data = self.editor.getValue();
                if(data != undefined && data != '') {
                    savingFile = true;
                    self.handler.save_file_notif.style.display = 'none';

                    // rename .jar to server file name for user before saving
                    if(path.basename(self.currentDir) == 'run.bat') {
                        let server = self.handler.getSelectedServer();
                        data = self.handler.processBatFile(data, server.file);
                        self.editor.setValue(data);
                    }

                    // write data to current file
                    fs.writeFile(self.currentDir, data, (err) => {
                        if(err) {
                            savingFile = false;
                            self.notifier.alert('Failed to save file');
                            return;
                        }

                        self.handler.save_file_notif.style.display = 'block';
                        savingFile = false;
                    })
                }
            }
        })

        // setup drag-drop for files
        handler.initializeDragDrop(handler.file_list, (e) => {

            // if file list is being displayed in file_list container
            if(self.filesDisplayed) {
                Array.from(e.files).forEach(file => {
                    let destPath = path.join(this.currentDir, file.name);
                    this.handler.moveFiles(file.path, destPath, () => {
                        this.generateFileList(this.currentDir);
                    })
                })
            }
        })

        // add listener to theme buttons
        this.editorThemes = document.getElementById('editor-theme');
        let btnTheme = document.getElementById('btn-dropdown-themes');
        let themeDrop = document.getElementById('dropdown-themes');
        let allThemeButtons = Array.from(themeDrop.childNodes);
        allThemeButtons.forEach(btn => {

            // set selected tab-item border
            if(btn.textContent == store.get('editor-theme')) {
                btn.style.color = 'rgb(209, 209, 214)';
                btn.style.backgroundColor = 'rgba(72, 76, 82, 0.87)';
                btnTheme.innerHTML = 'Theme (' + btn.textContent + ')';
            }

            btn.addEventListener('click', function() {

                let btnText = btn.textContent;
                
                // reset colors of all tab_items
                allThemeButtons.forEach(element => {
                    element.style.color = 'rgba(255, 255, 255, 0.5)';
                    element.style.backgroundColor = 'transparent';
                });

                // set selected tab-item border
                btn.style.color = 'rgb(209, 209, 214)';
                btn.style.backgroundColor = 'rgba(72, 76, 82, 0.87)';

                // set selected item in main dropdown button
                btnTheme.innerHTML = 'Theme (' + btnText + ')';

                // set new editor theme to be stored
                store.set('editor-theme', btnText);

                // re-generate file with theme
                self.generateFileList(self.currentDir);
            })
        })
    }

    /**
     * display files in given directory
     * @param {*} directory 
     */
    generateFileList(directory) {

        // reference class for use inside event handlers
        var self = this;

        // get access to currently selected server
        this.handler.server_access((server) => {

            try {
                // set directories
                this.baseDir = server.directory;
                this.currentDir = directory;

                // get directory information
                var dirInfo = this.handler.fileInfo(directory);
                var dirName = path.basename(directory);

                // be sure that file info is not undefined or null
                if(dirInfo) {

                    // files are being displayed
                    this.filesDisplayed = true;

                    // set header text
                    self.setHeaderText(directory);
                    
                    // clear the file list
                    this.handler.file_list.innerHTML = '';
                    this.handler.file_list.style.border = '0.5px solid transparent';

                    // reset save file notification animation and hide main container
                    this.handler.save_file_notif.style.display = 'none';
                    this.handler.main_container.style.visibility = 'hidden';

                    // check if the path to search is a directory
                    if(dirInfo.isDirectory()) {

                        // elements to hide when inside directory
                        this.handler.btn_save_file.style.display = 'none';

                        // hide code editor theme dropdown
                        this.editorThemes.style.display = 'none';

                        // elements to display when inside directory
                        this.handler.input_file_search.style.display = 'block';
                        this.handler.input_file_search.value = '';

                        // loop through every file in directory
                        this.handler.getFiles(directory, false, (files) => {
                            
                            // sort files directories first
                            let sortedFiles = files.sort((a, b) => {
                                let c = path.extname(a);
                                let d = path.extname(b);

                                if(c !== '' && d == '') {
                                    return 1;
                                }
                                if(c == '' && d !== '') {
                                    return -1;
                                }

                                return 0;
                            })

                            sortedFiles.forEach(file => {

                                // get file information
                                let filePath = path.join(directory, file);
                                let fileInfo = this.handler.fileInfo(filePath);

                                // be sure that file info is not undefined or null
                                if(fileInfo) {

                                    // get file extension and name
                                    let fileExt = path.extname(file);
                                    let fileName = path.basename(filePath);

                                    // check that file is not to be excluded from display (some files are hidden due to them being required to run server)
                                    if(!this.excludedFiles.includes(fileName)) {

                                        // create button element (used to display file)
                                        var btn = document.createElement('a');
                                        //btn.draggable = true;
                                        btn.tabIndex = 1;
                                        btn.classList.add('list-group-item', 'list-group-item-action', 'rounded-0');

                                        // icon that will appear on the button (default to folder icon)
                                        var btnIcon = '<i class="fa fa-folder" style="color:var(--yellow)"></i> ';

                                        // check if file is not a directory (set the file type icon)
                                        if(!fileInfo.isDirectory()) {

                                            // display different icons for different file types
                                            switch(fileExt) {
                                                case '.bat':
                                                    btnIcon = '<i class="fas fa-file-alt"></i> ';
                                                    break;
                                                case '.txt':
                                                    btnIcon = '<i class="fas fa-file-alt"></i> ';
                                                    break;
                                                case '.properties':
                                                    btnIcon = '<i class="fas fa-cogs" style="color:var(--info)"></i> ';
                                                    break;
                                                case '.jar':
                                                    btnIcon = '<i class="fab fa-java" style="color:var(--orange)"></i> ';
                                                    break;
                                                default:
                                                    btnIcon = '<i class="fa fa-file"></i> ';
                                                    break;
                                            }
                                        }

                                        // add file name after the icon and append to file list
                                        btn.innerHTML = btnIcon.concat(fileName);
                                        this.handler.file_list.appendChild(btn);

                                        // when user clicks a file
                                        btn.addEventListener('click', () => {
                                            if(fileInfo.isDirectory()) {
                                                self.generateFileList(filePath);
                                            } else {
                                                self.displayFileContents(filePath);
                                            }
                                        })
                
                                        // when users mouse is over a file
                                        btn.addEventListener('mouseover', () => {
                                            btn.focus({preventScroll: true});
                                        })
                
                                        // when user presses delete on a file
                                        btn.addEventListener('keyup', (e) => {
                                            if(e.key == 'Delete') {
                                                self.handler.deleteFile(filePath, () => {
                                                    btn.style.display = 'none';
                                                    self.handler.file_list.removeChild(btn);
                                                })
                                            }
                                        })
                                    }
                                }
                            })
                        })
                    } else {
                        this.displayFileContents(directory);
                    }

                    // open the file explorer window
                    $('#serverFilesModal').modal();

                    // set file search focus
                    setTimeout(() => {
                        this.handler.input_file_search.focus()
                    }, 1);
                    
                } else {
                    server.displayMessage(dirName + ' file not found', 'var(--red)');
                }
            } catch(err) {
                this.handler.notifier.alert(err.toString());
                console.log(err);
            }
        })
    }

    /**
     * display contents of file for editing
     * create CodeMirror object for custom editing
     */
    displayFileContents(filePath) {

        // reference class for use in listeners
        var self = this;

        // get extension of file to open
        var ext = path.extname(filePath);

        // check that extension can be opened
        if(this.allowedFiles.includes(ext)) {

            // file editor is being displayed
            this.filesDisplayed = false;

            // set file-explorer header text
            this.setHeaderText(filePath);

            // reset save file notification animation and hide main container
            this.handler.save_file_notif.style.display = 'none';
            this.handler.main_container.style.visibility = 'hidden';

            // clear file list
            this.handler.file_list.innerHTML = '';
            this.handler.file_list.style.border = 'none';

            // elements to display while inside file
            this.handler.btn_save_file.style.display = 'block';

            // elements to hide while inside file
            this.handler.input_file_search.style.display = 'none';

            // display code editor theme dropdown
            this.editorThemes.style.display = 'block';

            // set the current directory to the file path given
            this.currentDir = filePath;

            // create textarea for file contents
            let content = document.createElement('textarea');

            var data = '';

            switch(ext) {
                case '.json':
                    data = this.handler.readJson(filePath);
                    break;
                default:
                    data = fs.readFileSync(filePath);
                    break;
            }

            $(this.handler.file_list).append(content).append(function() {

                $('#serverFilesModal').modal();

                self.editor = CodeMirror.fromTextArea(content, {
                    mode: "yaml",
                    lineNumbers: true,
                    theme: store.get('editor-theme'),
                    cursorHeight: 0.85,
                    extraKeys: {
                        "Ctrl-S": function(instance) {
                            self.handler.click_element(self.handler.btn_save_file);
                        },
                        "Ctrl-Z": function(instance) {
                            instance.undo();
                           if(self.editor.getValue() == '') {
                               setTimeout(() => { instance.redo(); }, 0);
                           }
                        }
                    }
                })        
                
                let code = data.toString().trim();
                self.editor.setValue(code);
            })
        }
    }

    /**
     * set file-explorer header text to directory basename
     * @param {*} directory 
     */
    setHeaderText(directory) {
        let serverName = this.handler.getSelectedServer().name;
        let dirFileName = path.basename(directory);
        let text = directory !== this.baseDir ? serverName + ' | ' + dirFileName : serverName;
        this.handler.header_text.innerHTML = text;
    }
}

module.exports = ServerExplorer;