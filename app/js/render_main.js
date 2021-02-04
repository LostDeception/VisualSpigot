// =========================================================
// Copyright 2021, Timothy Mickelson, All rights reserved.
// =========================================================
const { ipcRenderer } = require('electron');
require('v8-compile-cache');
var $ = require('jquery');
require('popper.js');
require('bootstrap');

document.addEventListener('DOMContentLoaded', (event) => {

    // -- setup module aliases
    moduleAliasSetup();

    const ServerHandler = require('@modules/server_handler');

    // -- initialize server handler
    var handler = new ServerHandler();

    ipcRenderer.on('update', function(event, data) {
        switch (data) {
            case "update-ready":

                let onOk = () => {
                    ipcRenderer.send("install-update");
                };
        
                let onCancel = () => { };
        
                handler.notifier.confirm(
                    'A new update is available!',
                    onOk,
                    onCancel,
                    {
                        icons: {
                            prefix: "<i class='fas fa fa-fw fa-",
                            confirm: "info-circle",
                            suffix: "' style='color:var(--info)'></i>"
                        },
                        labels: {
                            confirm: 'UPDATE FOUND!'
                        }
                    }
                )
              break;
          }
    })

    // -- listen to main process for 'close' event
    ipcRenderer.on('renderAppClose', function() {
        
        // -- close all servers then close application
        handler.close_servers(() => {
            this.send('mainAppClose');
        })
    })

    // -- enable bootstrap popovers
    $(function () {
        $('[data-toggle="popover"]').popover()
    })

    // -- enable bootstrap tooltips
    $(function () {
        $('[data-toggle="tooltip"]').tooltip()
    })

    // -- listen to main process for 'modal' event
    ipcRenderer.on('modal', function() {

        // -- open add server modal
        $('#addServerModel').modal();
    })
})

function moduleAliasSetup() {

    const moduleAlias = require('module-alias');

    // Or multiple aliases
    moduleAlias.addAliases({
        '@root'  : __dirname,
        '@modules': __dirname + '/js/modules'
    })
   
    // Custom handler function (starting from v2.1)
    moduleAlias.addAlias('@src', (fromPath, request, alias) => {
        // fromPath - Full path of the file from which `require` was called
        // request - The path (first argument) that was passed into `require`
        // alias - The same alias that was passed as first argument to `addAlias` (`@src` in this case)
    
        // Return any custom target path for the `@src` alias depending on arguments
        if (fromPath.startsWith(__dirname + '/others')) return __dirname + '/others'
        return __dirname + '/src'
    })
    
    // Or let module-alias to figure where your package.json is
    // located. By default it will look in the same directory
    // where you have your node_modules (application's root)
    moduleAlias()
}