var store = require('store');

class StatsRunnable {
    constructor(handler) {
        this.handler = handler;
        this.interval = null;
        this.timeElement = document.getElementById('ela-time');
        this.cpuElement = document.getElementById('cpu-usage');
        this.memElement = document.getElementById('mem-usage');

        // by default toggle stats is true
        if(store.get('toggle-stats') == undefined) {
            store.set('toggle-stats', true);
        }

        handler.events.on('server-starting', () => {
            this.start();
        })

        handler.events.on('server-swap', () => {
            this.start();
        })
    }

    start() {

        if(store.get('toggle-stats')) {
            this.handler.server_access((server) => {
                if(server.isActive) {
    
                    // display the server stats container
                    this.handler.displayServerInfo();
    
                    // check if runnable is already active
                    if(this.interval) { this.stop(); }
    
                    this.interval = setInterval(() => {
                        this.update();
                    }, 1000);
                } else {
                    
                    // hide server stats container
                    this.handler.hideServerInfo();
                }
            })
        }
    }

    stop() {
        clearInterval(this.interval);
        this.interval = null;
    }

    isRunning() {
        return this.interval;
    }

    async update() {
        var self = this;

        var etime = '00.00.00';
        var cUsage = 0;
        var mUsage = 0;

        var server = this.handler.getSelectedServer();

        // check that server is not null and is active
        if(server && server.isActive) {
            await server.serverProcessData().then((stats) => {
                etime = self.handler.msToTime(stats.elapsed);
                cUsage = parseInt(stats.cpu);
                mUsage = (stats.memory / (1024 * 1024)).toFixed(0);
            }).catch((err) => {
                self.handler.notifier.alert(err.toString());
                console.log(err);
                self.stop();
            });

            this.timeElement.textContent = 'UT ' + etime;
            this.cpuElement.textContent = 'CPU ' + cUsage + '%';
            this.memElement.textContent = 'RAM ' + mUsage + 'MB';

        } else {
            this.timeElement.textContent = 'UT 00.00.00';
            this.cpuElement.textContent = 'CPU 0%';
            this.memElement.textContent = 'RAM 0MB';
            this.handler.hideServerInfo();
            this.stop();
        }
    }
}

module.exports = StatsRunnable;