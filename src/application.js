const compose = require('koa-compose');
const scheduler = require('node-schedule');
const SquadServer = require('./server');

module.exports = class Application {
  constructor() {
    this.plugins = [];
    this.servers = [];
  }

  watch(schedule = '*/1 * * * * *') {
    this.schedule = scheduler.scheduleJob(schedule, this.callback());
  }

  callback() {
    const fn = compose(this.plugins);

    return () => {
      for (let server of this.servers) {
        fn(server);
      }
    };
  }

  addPlugin(fn) {
    if (typeof fn !== 'function')
      throw new TypeError('Plugin must be a function!');
    this.plugins.push(fn);
    return this;
  }

  addServer(server) {
    if (!(server instanceof SquadServer))
      throw new TypeError('Server must be an instance of SquadServer');
    this.servers.push(server);
  }
};
