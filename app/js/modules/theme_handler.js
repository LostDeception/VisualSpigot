var fs = require("fs-extra");
var path = require('path');
var store = require('store');
var CryptoJS = require("crypto-js");
const { shell } = require('electron');
const AColorPicker = require('a-color-picker');
const { ipcRenderer } = require('electron');

class ThemeHandler {
    constructor(handler) {
        let self = this;
        this.handler = handler;
        this.passphrase = "vspassphrase";
        this.appdata = handler.appDataPath;
        this.themePath = path.join(this.appdata, 'themes');

        // theme elements
        this.themeList = document.getElementById('themeList');

        // image byte string
        this.imageBytes = '';

        // theme css variables
        this.variables = [

            // background theme variables 0-3
            '--background-opacity',
            '--background-blur',
            '--background-grayscale',
            '--background-contrast',

            // primary theme color variables 4-8
            '--primary-color',
            '--accent-one',
            '--accent-two',
            '--scrollbar-color',
            '--shadow-color',

            // button theme variables 9-20
            '--button-hover',
            '--btn-add-server',
            '--btn-start-server',
            '--btn-stop-server',
            '--btn-kill-server',
            '--btn-restart-server',
            '--btn-file-explorer',
            '--btn-delete-server',
            '--btn-back-dir',
            '--btn-open-dir',
            '--btn-save-file',
            '--btn-download-server',

            // file theme variables 20-27
            '--file-hover',
            '--search-color',
            '--file-border',
            '--folder-color',
            '--file-color',
            '--jar-color',
            '--prop-color',

            // server dropdown variables 27-31
            '--dropdown-background',
            '--dropdown-selection',
            '--active-server',
            '--inactive-server',

            // add-server container variables 31-33
            '--add-server-background',
            '--add-server-selection',

            // auto-complete container variables 33-35
            '--auto-comp-background',
            '--auto-comp-selection',

            // text variables 36-43
            '--console-font-size',
            '--console-font-color',
            '--font-color',
            '--button-text-disabled',
            '--input-font-color',
            '--placeholder-color',
            '--text-selection'
        ];

        // handle save theme
        $('#saveTheme').on('click', function() {
            let themeKey = self.generateThemeKey();
            let activeTheme = store.get('active-theme');
            if(activeTheme != '') {
                let activeThemePath = path.join(self.themePath, activeTheme);
                fs.writeFile(activeThemePath, themeKey);
                $('#saveThemeNotification').css('display', 'block').fadeOut('slow', function() {
                    this.style.display = 'none';
                });
            }
        })

        // handle when user clicks the sidebar panel toggle arrow
        $('.sidebar-panel-header').on('click', function() {
            let container = this.parentElement;
            let body = this.parentElement.childNodes[1];
            let arrow = this.childNodes[1].childNodes[0];
            if ($(arrow).css('transform') == 'none') {
                $(arrow).css({'transform': 'rotate(-180deg)'});
                container.style.height = 'auto';
                body.style.display = 'block';
              } else {
                $(arrow).css({'transform': ''});
                container.style.height = '40px';
                body.style.display = 'none';
              };
        })

        this.bgImage = document.getElementById('btnBackgroundImage');
        this.bgImage.addEventListener('click', function() {
            ipcRenderer.send('selectImage');
        })

        /**
         * wait for user to select an image from dialog
         * update theme background image
         */
        ipcRenderer.on('image', function(event, result) {
            let base64 = handler.getEncodedImage(result);
            self.imageBytes = base64;
            self.bgImage.src = "data:image/*;base64," + base64;
            $('.background').css('background-image', "url(data:image/*;base64," + base64 + ")");
        })

        // handle all sliders in theme menu
        let sliders = document.getElementsByClassName('slider');
        Array.from(sliders).forEach(slider => {
            let ext = slider.dataset.ext;
            let text = slider.parentElement.childNodes[0];
            slider.oninput = function() {
                text.value = slider.value;
                let value = this.value;
                if(ext) {
                    value = this.value.concat(ext)
                }
                document.documentElement.style.setProperty(slider.dataset.edit, value);
            }
        })

        // handle all color pickers in theme menu
        let pickerButtons = document.getElementsByClassName('picker-button');
        Array.from(pickerButtons).forEach(btn => {
            let picker = null;
            let pickerContainer = null;
            if(!btn.classList.contains('picker-group')) {
                pickerContainer = btn.parentElement.childNodes[1];
                picker = AColorPicker.from(pickerContainer);

                picker.on('change', (picker, color) => {
                    btn.style.backgroundColor = color;
                    document.documentElement.style.setProperty(btn.dataset.color, color);
                })
            } else {
                pickerContainer = btn.parentElement.parentElement.parentElement.childNodes[1];
                let pickerDropdownButton = btn.parentElement.childNodes[0];
                let pickerDropdown = btn.parentElement.childNodes[1];
                picker = AColorPicker.from(pickerContainer);

                // when hovering over color picker display content that is being colored
                pickerContainer.addEventListener('mouseover', function() {
                    switch(pickerContainer.dataset.type) {
                        case 'dropdownpicker':
                            $('.dropdown-content').css('display', 'block');
                            break;
                        case 'autocompicker':
                            $('#auto-complete').css('display', 'block');
                            break;
                    }
                })

                // when hovering over color picker hide content that was being colored
                pickerContainer.addEventListener('mouseleave', function() {
                    switch(pickerContainer.dataset.type) {
                        case 'dropdownpicker':
                            $('.dropdown-content').css('display', 'none');
                            break;
                        case 'autocompicker':
                            $('#auto-complete').css('display', 'none');
                            break;
                    }
                })

                let selectedItem = null;
                $(pickerDropdown).find('a').on('click', (e) => {
                    selectedItem = e.target;
                    pickerDropdownButton.innerHTML = selectedItem.innerHTML;
                    let color = getComputedStyle(document.documentElement).getPropertyValue(selectedItem.dataset.edit).trim();
                    picker[0].setColor(color);
                })

                picker.on('change', (picker, color) => {
                    if(selectedItem) {
                        btn.style.backgroundColor = color;
                        document.documentElement.style.setProperty(selectedItem.dataset.edit, color);
                    }
                })
            }
            
            btn.addEventListener('click', function() {
                picker[0].toggle();
            })

            picker[0].hide();
        });

        // handle all sidebar checkboxes
        let checkBoxes = document.getElementsByClassName('sidebar-check-value');
        Array.from(checkBoxes).forEach(check => {
            let value = check.dataset.value;
            let variable = store.get(value);

            // set check value
            $(check).prop('checked', variable);

            // toggle check value
            $(check).on('change', function() {
                let isChecked = $(this).is(':checked');
                store.set('display-line-numbers', isChecked);
                handler.sExplorer.generateFileList();
            })
        })

        // handle code-editor dropdown selection
        let themeMenu = document.getElementById('themeMenu');
        let themeMenuText = themeMenu.parentElement.childNodes[0];
        themeMenuText.innerHTML = store.get('editor-theme');
        $(themeMenu).find('a').on('click', function() {
            let value = this.innerHTML;
            themeMenuText.innerHTML = value;
            store.set("editor-theme", value);
            handler.sExplorer.generateFileList();
        })

        // handle adding and copying themes
        let addTheme = document.getElementById('btnAddTheme');
        let openThemeDir = document.getElementById('btnThemeDir');
        let themeInput = document.getElementById('themeKeyInput');
        addTheme.addEventListener('click', function() {
            self.addTheme(themeInput.value);
            self.populateThemes();
            themeInput.value = '';
        })
        openThemeDir.addEventListener('click', function() {
            shell.openExternal(self.themePath);
        })

        // handle drag-drop theme files
        let themePanel = document.getElementById('themePanel');
        handler.initializeDragDrop(themePanel, (e) => {
            let data = e.files[0];
            let dest = path.join(this.themePath, data.name);
            handler.moveFiles(data.path, dest, () => {
                this.populateThemes();
            });
        })


        /**
         * make sure that theme folder
         * and default theme is present if not create them
         */
        this.populateThemes();
    }

    populateThemes() {

        // setup backend storage
        if(!store.get('active-theme')) {
            store.set('active-theme', '');
        }

        // if theme folder does not exist create it and add default theme
        if(!fs.existsSync(this.themePath)) {
            this.handler.createFolder(this.themePath);
            this.appendToList("default");
        } else {

            // clear theme list incase there is already elements inside
            this.themeList.innerHTML = '';
            
            // add themes to list
            let themes = this.handler.getFiles(this.themePath);

            if(themes.length > 0) {
                themes.forEach(theme => {
                    this.appendToList(theme);
                })
            } else {
                store.set('active-theme', '');
                $('#saveTheme').css('display', 'none');
            }
        }
    }

    addTheme(name) {
        if(name != '') {
            let themeKey = this.generateThemeKey();
            let p = path.join(this.themePath, name.concat('.txt'));
            if(!fs.existsSync(p)) {
                this.handler.createFile(p, themeKey);
                //this.appendToList(name);
            } else {
                this.handler.notifier.alert('Theme already exists')
            }
        }
    }

    // generate an encoded key to share theme with others
    generateThemeKey() {
        let unEncryptedKey = [this.imageBytes];
        this.variables.forEach(value => {
            let a = getComputedStyle(document.documentElement).getPropertyValue(value).trim();
            unEncryptedKey.push(a);
        })

        let textToEncrypt = unEncryptedKey.join(':');
        let encryptedKey = CryptoJS.AES.encrypt(textToEncrypt, this.passphrase);
        return encryptedKey;
    }

    // append theme element to list
    appendToList(name) {
        let self = this;

        // create button group
        let group = document.createElement('div');
        group.classList.add('btn-group');
        group.role = 'group';
        let select = document.createElement('a');
        select.classList.add('list-group-item', 'list-group-item-action');
        select.style.overflow = 'hidden';
        select.style.borderTop = 'none';
        select.style.borderRight = 'none';
        select.style.maxWidth = '182px';


        let remove = document.createElement('a');
        remove.classList.add('list-group-item', 'list-group-item-action');
        remove.style.width = '55px';
        remove.style.borderTop = 'none';
        let trash = document.createElement('i');
        trash.classList.add('fas', 'fa-trash');
        remove.appendChild(trash);

        let nameWithExt = name;
        let nameWithoutExt = '';

        let ext = path.extname(name);
        if(ext == '' || ext != '.txt') {
            nameWithoutExt = name;
            nameWithExt = name.concat('.txt');
        } else {
            nameWithoutExt = name.substring(0, name.lastIndexOf('.'));
            nameWithExt = name;
        }

        select.innerHTML = nameWithoutExt;
        group.append(select, remove);
        themeList.appendChild(group);

        select.addEventListener('click', function() {
            self.applyTheme(nameWithExt);
            $(self.themeList).find('a').removeClass('active');
            this.classList.add('active');
            $('#saveTheme').css('display', 'block');
        })

        remove.addEventListener('click', function() {
            self.themeList.removeChild(group);
            let dir = path.join(self.themePath, nameWithExt);
            self.handler.deleteFile(dir);

            if(self.themeList.childNodes.length == 0) {
                $('#saveTheme').css('display', 'none');
                store.set('active-theme', '');
            }
        })

        if(store.get('active-theme') == name) {
            self.handler.click_element(select);
        }
    }

    // apply theme to application
    applyTheme(name) {
        try {
            let p = path.join(this.themePath, name);
            const data = fs.readFileSync(p, { encoding: 'utf8', flag: 'r' });
            let decryptedKey = CryptoJS.AES.decrypt(data, this.passphrase);
            let decString = decryptedKey.toString(CryptoJS.enc.Utf8);
            let values = decString.split(':');

            if(values.length === 44) {
                if(values[0] != '') {
                    this.imageBytes = values[0];
                    this.bgImage.src = "data:image/*;base64," + values[0];
                    $('.background').css('background-image', "url(data:image/*;base64," + values[0] + ")");
                } else {
                    this.imageBytes = '';
                    this.bgImage.src = "./images/bground1.jpg";
                    $('.background').css('background-image', "url(./images/bground1.jpg)");
                }
        
                for(var i = 0; i < this.variables.length; i++) {
                    document.documentElement.style.setProperty(this.variables[i], values[i + 1]);
                }
        
                // set slider and base color values
                $('#bgOpacityContainer').find('input').val(values[1]);
                $('#bgBlurContainer').find('input').val(values[2]);
                $('#bgContrastContainer').find('input').val(values[4].replace('%', ''));
                $('#bgGrayscaleContainer').find('input').val(values[3].replace('%', ''));
                $('#btnHoverContainer').find('input').val(values[10].replace('%', ''));
                $('#cFontSizeContainer').find('input').val(values[37].replace('px', ''));
                $('#ftColor').css('background-color', values[38]);
                $('#phColor').css('background-color', values[42]);
                $('#textSelection').css('background-color', values[44]);
                $('#inputFontColor').css('background-color', values[41]);
                $('#btnTextDisabled').css('background-color', values[40]);
                $('#consoleFontColor').css('background-color', values[37]);

                // set as active theme
                store.set('active-theme', name);
            } else {
                store.set('active-theme', '');
                this.handler.notifier.alert('Theme is missing data. Try re-saving the theme.');
            }
            
        } catch(err) {
            console.log(err)
            store.set('active-theme', '');
            this.handler.notifier.alert('Error applying theme ' + name);
        }
    }
}

module.exports = ThemeHandler;