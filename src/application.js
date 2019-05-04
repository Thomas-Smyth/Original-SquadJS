import compose from 'koa-compose';
import scheduler from 'node-schedule';
import SquadServer from './server';

export default class Application {
  /**
   * Initialize a new `Application`.
   */
  constructor() {
    this.plugins = [];
    this.servers = [];
  }

  /**
   * Start running added servers through the added plugins.
   *
   * @param {String} schedule
   */
  watch(schedule = '*/60 * * * * *') {
    this.schedule = scheduler.scheduleJob(schedule, this.callback());
  }

  /**
   * Turns plugins into a single function using Koa Compose.
   *
   * @returns {Function}
   */
  callback() {
    this.plugins.unshift(this.getServerInfo);
    this.plugins.push(this.setServerInfo);

    const fn = compose(this.plugins);

    return () => {
      for (let server of this.servers) {
        try {
          fn(server);
        } catch (err) {
          console.log(`${server.id} throw an error on tick!`);
        }
      }
    };
  }

  /**
   * Add a new plugin to the application.
   *
   * @param {Function} fn
   * @returns {Application}
   */
  addPlugin(fn) {
    if (typeof fn !== 'function')
      throw new TypeError('Plugin must be a function!');
    this.plugins.push(fn);
    return this;
  }

  /**
   * Add a new Squad server to the application.
   *
   * @param {SquadServer} server
   */
  addServer(server) {
    if (!(server instanceof SquadServer))
      throw new TypeError('Server must be an instance of SquadServer');
    this.servers.push(server);
  }

  /**
   * Basic plugin to get the server information.
   *
   * @param {SquadServer} server
   * @param {Function} next
   * @returns {Promise<*>}
   */
  async getServerInfo(server, next) {
    await server.getServerInfo();
    return next();
  }

  /**
   * Basic plugin to set the server information.
   *
   * @param {SquadServer} server
   * @param {Function} next
   * @returns {Promise<*>}
   */
  async setServerInfo(server, next) {
    await server.setServerInfo();
    return next();
  }
}
