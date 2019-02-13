import RconClient from './rconclient';
import Gamedig from 'gamedig';

export default class SquadServer {
  constructor(id, host, queryPort, rconPort, rconPassword) {
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

    this.populationHistory = [];
    this.populationHistoryMaxLength = 10;

    this.mapHistory = [];
    this.mapHistoryMaxLength = 10;

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

    this.mapChange = false;
    this.nextMapChange = false;
    let { currentMap, nextMap } = await this.rcon.getCurrentAndNextMap();

    if (this.currentMap !== undefined && this.currentMap !== currentMap)
      this.mapChange = true;
    this.currentMap = currentMap;
    this.originalCurrentMap = currentMap;

    if (
      this.nextMap !== undefined &&
      this.mapChange === false &&
      this.nextMap !== nextMap
    )
      this.nextMapChange = true;
    this.nextMap = nextMap;
    this.originalNextMap = nextMap;

    if (this.mapChange) {
      this.mapHistory.unshift({
        map: this.mapHistory,
        time: new Date()
      });
      this.mapHistory.slice(0, this.mapHistoryMaxLength);
    }
  }

  makeAnnouncement(text) {
    this.announcements.push(text);
  }

  async setServerInfo() {
    if (this.originalCurrentMap !== this.currentMap)
      await this.rcon.changeMap(this.currentMap);
    if (this.originalNextMap !== this.nextMap)
      await this.rcon.setNextMap(this.nextMap);

    this.announcements.forEach((message, delay) => {
      setTimeout(async () => {
        await this.rcon.makeAnnouncement(message);
      }, delay * 10000);
    });

    this.announcements = [];
  }
}
