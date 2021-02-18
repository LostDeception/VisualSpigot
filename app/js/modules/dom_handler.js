var store = require('store');
const { shell } = require('electron');
const AColorPicker = require('a-color-picker');

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
                parent.style.display = 'none';
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
        this.btn_server_downloads = document.querySelectorAll('.btn-server-download');

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


        /**
         * instantiate theme handler which
         * will handle the theme editor
         */
        new ThemeHandler(this);

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
            tab_item.style.backgroundColor = 'var(--light-accent)';

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
            sidebar.style.display = 'none';
            sidebar.style.width = '0';
            main.style.marginRight = '0';
        } else {
            sidebar.style.display = 'block';
            sidebar.style.width = '250px';
            main.style.marginRight = '250px';
        }
    }
}

class ThemeHandler {
    constructor(dom) {
        this.dom = dom;
        let self = this;

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

        // handle background image
        let background = document.getElementsByClassName('background')[0];

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

        // Handle all color pickers
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
    }

    rgb2hex(rgb){
        rgb = rgb.match(/^rgba?[\s+]?\([\s+]?(\d+)[\s+]?,[\s+]?(\d+)[\s+]?,[\s+]?(\d+)[\s+]?/i);
        return (rgb && rgb.length === 4) ? "#" +
         ("0" + parseInt(rgb[1],10).toString(16)).slice(-2) +
         ("0" + parseInt(rgb[2],10).toString(16)).slice(-2) +
         ("0" + parseInt(rgb[3],10).toString(16)).slice(-2) : '';
    }
}

module.exports = DomHandler;