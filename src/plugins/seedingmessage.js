import SquadMaps from '../../data/squad-maps/layers.json';

export default class SeedingMessage {
  constructor(frequency = 5, maxPopulation = 40) {
    this.lastMessage = frequency;
    this.frequency = frequency;
    this.maxPopulation = maxPopulation;
  }

  plugin() {
    return async (server, next) => {
      if (this.lastMessage !== this.frequency) {
        this.lastMessage++;
        return next();
      }
      this.lastMessage = 0;

      if (!server.currentLayer) return next();
      if (server.populationCount >= this.maxPopulation) return next();

      if (
        !['Skirmish', 'AAS', 'AAS INF', 'RAAS'].includes(
          SquadMaps[server.currentLayer].gamemode
        )
      )
        return next();

      let flags =
        SquadMaps[server.currentLayer].middleFlags.length !== 0
          ? SquadMaps[server.currentLayer].middleFlags.join(' and ')
          : 'the center flags';

      server.makeAnnouncement(
        `Seeding mode is Active! Fight only over ${flags}. No attacking FOBs.`
      );

      return next();
    };
  }
}
