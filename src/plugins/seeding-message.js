import SquadLayers from '../utils/squad-layers';

export default class SeedingMessage {
  constructor(options = {}) {
    this.maxPlayerCount = options.maxPlayerCount || 40;
    this.frequency = options.frequency || 5;
    this.ticksToMessage = this.frequency;

    this.tick = this.tick.bind(this);
  }

  tick(server, next) {
    if (this.ticksToMessage !== this.frequency) {
      this.ticksToMessage++;
      return next();
    }
    this.ticksToMessage = 0;

    if (!server.currentLayer) return next();
    if (server.playerCount >= this.maxPlayerCount) return next();

    // Seeding rules only apply to certain gamemodes
    if (
      !['Skirmish', 'AAS', 'AAS INF', 'RAAS'].includes(
        SquadLayers[server.currentLayer].gamemode
      )
    )
      return next();

    const announcement = `Seeding mode is Active! Fight only over the center flags. No attacking FOBs.`;

    if (server.playerCount < this.maxPlayerCount)
      server.makeAnnouncement(announcement);
    return next();
  }
}
