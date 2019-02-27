import SquadMaps from '../../data/squad-maps/layers.json';

export default class SeedingMessage {
  /**
   * Init the Seeding Message Plugin
   *
   * @param {Integer} maxPopulation
   * @param {Integer} frequency
   */
  constructor(maxPopulation = 40, frequency = 5) {
    this.lastMessage = frequency;
    this.frequency = frequency;
    this.maxPopulation = maxPopulation;
  }

  /**
   * Output plugin function to apply to the application.
   *
   * @returns {Function}
   */
  plugin() {
    return async (server, next) => {
      if (this.lastMessage !== this.frequency) {
        this.lastMessage++;
        return next();
      }
      this.lastMessage = 0;

      // Seeding messages only apply under a certain population count
      if (!server.currentLayer) return next();
      if (server.populationCount >= this.maxPopulation) return next();

      // Seeding rules only apply to certain gamemodes
      if (
        !['Skirmish', 'AAS', 'AAS INF', 'RAAS'].includes(
          SquadMaps[server.currentLayer].gamemode
        )
      )
        return next();

      // for RAAS maps when the middle flags are unknown use "the center flags"
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
