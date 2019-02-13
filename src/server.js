import RconClient from './rconclient';
import Gamedig from 'gamedig';

export default class SquadServer {
  constructor(id, host, queryPort, rconPort, rconPassword) {
    if (id) this.name = id;
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

    this.announcements = [];
  }

  async getServerInfo() {
    let response = await Gamedig.query({
      type: 'protocol-valve',
      host: this.host,
      port: this.queryPort
    });

    this.name = response.name;

    this.players = response.players;
    this.populationCount = response.players.length;
    this.populationHistory.unshift(this.populationCount);
    this.populationHistory.slice(0, this.populationHistoryMaxLength);
    this.populationGrowth = isNaN(this.populationHistory[5])
      ? undefined
      : this.populationHistory[0] - this.populationHistory[5];

    this.publicQueue = response.raw.rules.PublicQueue_i;
    this.reserveQueue = response.raw.rules.PlayerReserveCount_i;

    this.maxPlayers = response.maxplayers;
    this.publicSlots = response.raw.rules.NUMPUBCONN;
    this.reserveSlots = response.raw.rules.NUMPRIVCONN;

    this.matchTimeout = response.raw.rules.MatchTimeout_f;
    this.gameVersion = response.raw.version;

    this.mapChange = false;
    this.nextMapChange = false;
    let { currentMap, nextMap } = await this.rcon.getCurrentAndNextMap();

    if (this.currentMap !== currentMap) this.mapChange = true;
    this.currentMap = currentMap;
    this.originalCurrentMap = currentMap;

    if (this.mapChange === false && this.nextMap !== nextMap)
      this.nextMapChange = true;
    this.nextMap = nextMap;
    this.originalNextMap = nextMap;
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
