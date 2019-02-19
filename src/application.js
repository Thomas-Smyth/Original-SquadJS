import compose from 'koa-compose';
import scheduler from 'node-schedule';
import SquadServer from './server';

export default class Application {
  constructor() {
    this.plugins = [];
    this.servers = [];
  }

  watch(schedule = '*/60 * * * * *') {
    this.schedule = scheduler.scheduleJob(schedule, this.callback());
  }

  callback() {
    this.plugins.unshift(this.getServerInfo);
    this.plugins.push(this.setServerInfo);

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

  async getServerInfo(server, next) {
    await server.getServerInfo();
    return next();
  }

  async setServerInfo(server, next) {
    await server.setServerInfo();
    return next();
  }
}
