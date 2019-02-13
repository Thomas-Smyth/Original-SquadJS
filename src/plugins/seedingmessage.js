import SquadMaps from '../../data/squad-maps/layers.json';

export default class SeedingMessage {
  constructor(frequency = 5, maxPopulation = 40) {
    this.lastMessage = frequency;
    this.frequency = frequency;
    this.maxPopulation = maxPopulation;
  }

  plugin() {
    return (server, next) => {
      if (this.lastMessage !== this.frequency) {
        this.lastMessage++;
        return next();
      }
      this.lastMessage = 0;

      if (!server.currentMap) return next();
      if (server.populationCount >= this.maxPopulation) return next();

      if (
        !['Skirmish', 'AAS', 'AAS INF', 'RAAS'].includes(
          SquadMaps[server.currentMap].gamemode
        )
      )
        return next();

      let flags =
        SquadMaps[server.currentMap].middleFlags.length !== 0
          ? SquadMaps[server.currentMap].middleFlags.join(' and ')
          : 'the center flags';

      server.makeAnnouncement(
        `Seeding mode is Active! Fight only over ${flags}. No attacking FOBs.`
      );

      return next();
    };
  }
}
