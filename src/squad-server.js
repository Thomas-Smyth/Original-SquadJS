import compose from 'koa-compose';
import scheduler from 'node-schedule';
import nodeCleanup from 'node-cleanup';
import Gamedig from 'gamedig';
import RconClient from '@thomas-smyth/rcon';

import SquadLayers from './utils/squad-layers';

class SquadServer {
  /* Server Information */
  name = null;
  gameVersion = null;

  maxPlayerSlots = null;
  publicPlayerSlots = null;
  reservePlayerSlots = null;

  players = null;
  playerCount = null;
  playerCountHistory = [];
  publicQueueLength = null;
  reserveQueueLength = null;

  _currentLayer = null;
  currentLayer = null;
  matchTimeout = null;

  _nextLayer = null;
  nextLayer = null;

  previousCurrentLayer = null;
  previousNextLayer = null;
  adminChangeCurrentLayer = false;
  adminChangeNextLayer = false;

  layerHistory = [];
  mapChange = false;

  /* Server Connection Information */
  host = null;
  queryPort = 7787;
  rconPort = 27165;
  rconPassword = null;

  /* SquadServer Attributes */
  rcon = null;
  maintainRconConnection = true;

  pluginInstances = [];
  schedule = null;

  announcements = [];
  announcementInterval = 10000;

  firstTick = true;

  constructor(host, queryPort, rconPort, rconPassword, options = {}) {
    if (typeof host !== 'string')
      throw new Error('SquadServer requires the host address.');
    if (typeof queryPort !== 'number')
      throw new Error('SquadServer requires the query port.');
    if (typeof rconPort !== 'number')
      throw new Error('SquadServer requires the rcon port.');
    if (typeof rconPassword !== 'string')
      throw new Error('SquadServer requires the rcon password.');

    this.debugName = options.debugName || 'Unknown';

    this.host = host;
    this.queryPort = queryPort;
    this.rconPort = rconPort;
    this.rconPassword = rconPassword;

    if (options.maintainRconConnection)
      this.maintainRconConnection = options.maintainRconConnection;

    this.rcon = new RconClient({ host: this.host, port: this.rconPort });

    nodeCleanup(() => {
      console.log(`Closing rcon connection to ${this.host}:${this.rconPort}`);
      this.rcon.disconnect();
    });
  }

  async run() {
    await SquadLayers.fetchLayers();

    console.log('Preparing SquadJS plugins...');
    this.pluginInstances.forEach(plugin => {
      if (typeof plugin.prepare === 'function') plugin.prepare(this);
    });

    if (this.maintainRconConnection) {
      console.log('Connecting to Rcon...');
      await this.rcon.connect();
      await this.rcon.authenticate(this.rconPassword);
    }

    console.log('Running SquadJS plugins...');

    this.schedule = scheduler.scheduleJob(
      '*/60 * * * * *',
      this.tickCallback()
    );
  }

  addTickBasedPlugin(plugin) {
    if (typeof plugin !== 'object')
      throw new TypeError('Plugin must be an object.');
    if (typeof plugin.tick !== 'function')
      throw new Error('Plugin must contain a tick function.');
    this.pluginInstances.push(plugin);
  }

  tickCallback() {
    let pluginChain = this.pluginInstances.map(plugin => plugin.tick);
    pluginChain.unshift(SquadServer.fetchServerInfo);
    pluginChain.push(SquadServer.setServerInfo);

    pluginChain = compose(pluginChain);

    return () => {
      try {
        pluginChain(this);
      } catch (err) {
        console.log(`${this.debugName} throw an error on tick.`);
      }
    };
  }

  static async fetchServerInfo(server, next) {
    try {
      await server.fetchA2SInfo();
    } catch (err) {
      console.log(`Error fetching A2S server infomation... ${err.message}`);
    }

    try {
      await server.fetchRconInfo();
    } catch (err) {
      console.log(`Error fetching Rcon server information... ${err.message}`);
    }

    next();
  }

  static async setServerInfo(server, next) {
    try {
      await server.setRconInfo();
    } catch (err) {
      console.log(`Error setting Rcon server information... ${err.message}`);
    }
    server.firstTick = false;
    next();
  }

  async fetchA2SInfo() {
    const response = await Gamedig.query({
      type: 'protocol-valve',
      host: this.host,
      port: this.queryPort
    });

    this.name = response.name;
    this.gameVersion = response.raw.version;

    this.maxPlayerSlots = parseInt(response.maxplayers);
    this.publicPlayerSlots = parseInt(response.raw.rules.NUMPUBCONN);
    this.reservePlayerSlots = parseInt(response.raw.rules.NUMPRIVCONN);

    this.players = response.players;
    this.playerCount = Math.min(this.maxPlayerSlots, response.players.length);
    this.publicQueueLength = parseInt(response.raw.rules.PublicQueue_i);
    this.reserveQueueLength = parseInt(response.raw.rules.ReservedQueue_i);

    this.playerCountHistory.unshift(this.playerCount);
    // trim player history to keep it to suitable length (aka 10 mins)
    if (this.playerCountHistory.length > 20)
      this.playerCountHistory.splice(-1, 1);
  }

  async fetchRconInfo() {
    const { currentLayer, nextLayer } = await this.getCurrentAndNextLayer();
    if (currentLayer !== '/Game/Maps/TransitionMap') {
      this._currentLayer = currentLayer;
      this.currentLayer = currentLayer;
    }
    if (nextLayer !== '/Game/Maps/TransitionMap') {
      this._nextLayer = nextLayer;
      this.nextLayer = nextLayer;
    }

    if (
      this.previousCurrentLayer !== null &&
      this.previousCurrentLayer !== this.currentLayer
    )
      this.adminChangeCurrentLayer = true;
    if (
      this.previousCurrentLayer !== null &&
      this.previousNextLayer !== this.nextLayer
    )
      this.adminChangeNextLayer = true;

    // begin record layer history when app starts
    if (this.layerHistory.length === 0)
      this.layerHistory.unshift({ layer: this.currentLayer, time: Date.now() });

    // after that update it on subsequent map changes
    if (this.layerHistory[0].layer !== this.currentLayer) {
      this.layerHistory.unshift({ layer: this.currentLayer, time: Date.now() });
      if (this.layerHistory.length > 10) this.layerHistory.splice(-1, 1);
      this.layerChange = true;

      this.adminChangeCurrentLayer = false;
      this.adminChangeNextLayer = false;
    } else {
      this.layerChange = false;
    }
  }

  async setRconInfo() {
    if (this._currentLayer !== this.currentLayer)
      await this.changeLayer(this.currentLayer);
    if (this._nextLayer !== this.nextLayer)
      await this.setNextLayer(this.nextLayer);
    await this.makeAnnouncements();

    this.previousCurrentLayer = this.currentLayer;
    this.previousNextLayer = this.nextLayer;
  }

  async executeRconCommand(command) {
    if (!this.rcon.connected) {
      await this.rcon.connect();
      await this.rcon.authenticate(this.rconPassword);
    }

    let response = await this.rcon.execute(command);

    if (!this.maintainRconConnection) {
      await this.rcon.disconnect();
    }

    return response;
  }

  async getCurrentAndNextLayer() {
    let response = await this.executeRconCommand('ShowNextMap');

    response = response
      .replace('Current map is ', '')
      .replace(' Next map is ', '')
      .split(',');

    return {
      currentLayer: response[0] !== '' ? response[0] : undefined,
      nextLayer: response[1] !== '' ? response[1] : undefined
    };
  }

  async changeLayer(layer) {
    await this.executeRconCommand(`AdminChangeMap ${layer}`);
  }

  async setNextLayer(layer) {
    await this.executeRconCommand(`AdminSetNextMap ${layer}`);
  }

  makeAnnouncement(message) {
    this.announcements.push(message);
  }

  async makeAnnouncements() {
    this.announcements.forEach((message, delay) => {
      setTimeout(async () => {
        await this.executeRconCommand(`AdminBroadcast ${message}`);
      }, delay * this.announcementInterval);
    });
    this.announcements = [];
  }
}

export default SquadServer;
