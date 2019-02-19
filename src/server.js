import RconClient from './rconclient';
import Gamedig from 'gamedig';

export default class SquadServer {
  constructor(id, host, queryPort, rconPort, rconPassword, options = {}) {
    if (id) this.id = id;
    else throw new Error('SquadServer must have a id!');

    if (host) this.host = host;
    else throw new Error('SquadServer must have a host!');

    if (queryPort) this.queryPort = queryPort;
    else throw new Error('SquadServer must have a query port!');

    if (rconPort) this.rconPort = rconPort;
    else throw new Error('SquadServer must have a rcon port!');

    if (rconPassword) this.rconPassword = rconPassword;
    else throw new Error('SquadServer must have a rcon password!');

    this.rcon = new RconClient(this.host, this.rconPort, this.rconPassword);

    this.populationHistory = options.populationHistory || [];
    this.populationHistoryMaxLength = options.populationHistoryMaxLength || 10;

    this.layerHistory = options.layerHistory || [];
    this.layerHistoryMaxLength = options.layerHistoryMaxLength || [];

    this.announcements = [];
  }

  async getServerInfo() {
    let response = await Gamedig.query({
      type: 'protocol-valve',
      host: this.host,
      port: this.queryPort
    });

    this.name = response.name;

    this.maxPlayers = parseInt(response.maxplayers);
    this.publicSlots = parseInt(response.raw.rules.NUMPUBCONN);
    this.reserveSlots = parseInt(response.raw.rules.NUMPRIVCONN);

    this.players = response.players;
    this.populationCount = Math.min(this.maxPlayers, response.players.length);
    this.populationHistory.unshift(this.populationCount);
    this.populationHistory.slice(0, this.populationHistoryMaxLength);
    this.populationGrowth = isNaN(this.populationHistory[5])
      ? undefined
      : this.populationHistory[0] - this.populationHistory[5];

    this.publicQueue = parseInt(response.raw.rules.PublicQueue_i);
    this.reserveQueue = parseInt(response.raw.rules.ReservedQueue_i);

    this.matchTimeout = parseFloat(response.raw.rules.MatchTimeout_f);
    this.gameVersion = response.raw.version;

    this.layerChange = false;
    this.nextLayerChange = false;
    let { currentLayer, nextLayer } = await this.rcon.getCurrentAndNextLayer();

    if (
      currentLayer === '/Game/Maps/TransitionMap' ||
      nextLayer === '/Game/Maps/TransitionMap'
    ) {
      currentLayer = this.currentLayer;
      nextLayer = this.nextLayer;
    }

    if (this.currentLayer !== undefined && this.currentLayer !== currentLayer)
      this.layerChange = true;

    if (this.layerChange || this.currentLayer === undefined) {
      this.layerHistory.unshift({
        layer: currentLayer,
        time: new Date()
      });
      this.layerHistory.slice(0, this.layerHistoryMaxLength);
    }

    this.currentLayer = currentLayer;
    this.originalCurrentLayer = currentLayer;

    if (
      this.nextLayer !== undefined &&
      this.layerChange === false &&
      this.nextLayer !== nextLayer
    )
      this.nextLayerChange = true;
    this.nextLayer = nextLayer;
    this.originalNextLayer = nextLayer;

    if (
      this.lastNextLayerUpdate !== undefined &&
      this.lastNextLayerUpdate !== this.nextLayer
    )
      this.adminChangeNextLayer = true;
    if (this.layerChange === true) this.adminChangeNextLayer = false;
  }

  async setServerInfo() {
    if (this.originalCurrentLayer !== this.currentLayer)
      await this.rcon.changeLayer(this.currentLayer);
    if (this.originalNextLayer !== this.nextLayer) {
      // Used to tell if the admin has updated the layer via other means since the time the script was run.
      this.lastNextLayerUpdate = this.nextLayer;
      await this.rcon.setNextLayer(this.nextLayer);
    }

    this.announcements.forEach((message, delay) => {
      setTimeout(async () => {
        await this.rcon.makeAnnouncement(message);
      }, delay * 10000);
    });

    this.announcements = [];
  }

  makeAnnouncement(text) {
    this.announcements.push(text);
  }
}
