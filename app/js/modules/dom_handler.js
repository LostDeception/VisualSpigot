var store = require('store');
const { shell } = require('electron');

class DomHandler {
    constructor() {
        let self = this;
        this.introContainerDisplayed = false;
        this.mainContainerDisplayed = false;

        clean(document.body);

        // initialize notification object
        this.notifier = new AWN({
            maxNotifications: 3
        })

        this.main = document.getElementById('main');
        this.main_container = document.getElementById('main-container');
        this.logo_container = document.getElementById('logo-container');

        // handle sidebar close button listeners
        let exitSidebar = document.getElementsByClassName('closebtn');
        Array.from(exitSidebar).forEach(btn => {
            btn.addEventListener('click', function() {
                let parent = btn.parentElement;
                parent.style.width = '0';
                parent.style.display = 'none';
                self.main.style.marginRight = '0';
                $('#add-server-container').css('min-width', '800px');
                $('.modal-content').css('margin-right', '0px');
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
        $("#addServerModel").on("hidden.bs.modal", function () {
            self.console_input.focus();
        });

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
        overlay.childNodes[0].textContent = text;
        overlay.style.display = 'flex';
    }

    hide_overlay() {
        let overlay = document.getElementById('application-overlay');
        overlay.childNodes[0].textContent = '';
        overlay.style.display = 'none';
    }

    clear_input() {
        this.console_input.value = '';
        $('#auto-complete').css('display', 'none');
    }

    create_tab_item(server_name) {

        let self = this;

        // -- get tab_container element
        let container = this.server_dropdown_container;

        // -- create a tag
        let tab_item = document.createElement('a');
        
        let tab_icon = document.createElement('i');
        tab_icon.classList.add('fas', 'fa-circle');
        tab_icon.style.color = 'var(--inactive-server)';

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
            tab_item.style.backgroundColor = 'var(--dropdown-selection)';

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
            $('.modal-content').css('margin-right', '0px');
        } else {
            sidebar.style.display = 'block';
            sidebar.style.width = '250px';
            main.style.marginRight = '250px';
            $('#add-server-container').css('cssText', 'min-width: 900px !important');
            $('.modal-content').css('margin-right', '250px');
        }
    }
}

module.exports = DomHandler;