import SquadMaps from '../../data/squad-maps/layers.json';

export default class LayerSelector {
  constructor(options = {}) {
    this.layerTolerance = options.layerTolerance || 4;
    this.mapTolerance = options.mapTolerance || 2;
    this.timeTolerance = options.timeTolerance || 4 * 60 * 60 * 1000;
    this.backupLayer = options.backupLayer || "Fool's Road AAS v1";

    this.layers = Object.keys(SquadMaps);
  }

  plugin() {
    return async (server, next) => {
      if (server.adminChangeNextLayer) return next();

      if (this.isCompliant(server, server.nextLayer)) return next();

      server.nextLayer = this.randomCompliantLayer(server);

      return next();
    };
  }

  layerFilter(filterOptions = {}) {
    let nightLayer = filterOptions.nightLayer || undefined;
    let whitelistLayers = filterOptions.whitelistLayers || null;
    let blacklistLayers = filterOptions.blacklistLayers || null;
    let whitelistMaps = filterOptions.whitelistMaps || null;
    let blacklistMaps = filterOptions.blacklistMaps || null;
    let whitelistGamemodes = filterOptions.whitelistGamemodes || null;
    let blacklistGamemodes = filterOptions.blacklistGamemodes || null;

    let layers = [];

    for (let layer of this.layers) {
      let layerInfo = SquadMaps[layer];

      // Disallow night maps.
      if (nightLayer !== undefined && nightLayer !== layerInfo.night) continue;

      // Whitelist / Blacklist Layers, Maps and Gamemodes
      if (whitelistLayers !== null && !whitelistLayers.includes(layer))
        continue;
      if (blacklistLayers !== null && blacklistLayers.includes(layer)) continue;

      if (whitelistMaps !== null && !whitelistMaps.includes(layerInfo.map))
        continue;
      if (blacklistMaps !== null && blacklistMaps.includes(layerInfo.map))
        continue;

      if (
        whitelistGamemodes !== null &&
        !whitelistGamemodes.includes(layerInfo.gamemode)
      )
        continue;
      if (
        blacklistGamemodes !== null &&
        blacklistGamemodes.includes(layerInfo.gamemode)
      )
        continue;

      layers.push(layer);
    }

    this.layers = layers;
  }

  clearFilter() {
    this.layers = SquadMaps;
  }

  isLayer(layer) {
    return layer in SquadMaps;
  }

  isInRotation(layer) {
    return this.layers.includes(layer);
  }

  isHistoryCompliant(layerHistory, layer) {
    let layerInfo = SquadMaps[layer];

    for (
      let i = 0;
      i <
      Math.min(
        layerHistory.length,
        Math.max(this.layerTolerance, this.mapTolerance)
      );
      i++
    ) {
      if (new Date() - layerHistory[i].time > this.timeTolerance) return true;
      if (
        i < this.mapTolerance &&
        SquadMaps[layerHistory[i].layer].map === layerInfo.map
      )
        return false;
      if (i < this.layerTolerance && layerHistory[i].layer === layer)
        return false;
    }

    return true;
  }

  isPopulationCountCompliant(populationCount, layer) {
    let layerInfo = SquadMaps[layer];
    return !(
      populationCount > layerInfo.maxPlayers ||
      populationCount < layerInfo.minPlayers
    );
  }

  isCompliant(server, layer) {
    return (
      this.isLayer(layer) &&
      this.isInRotation(layer) &&
      this.isHistoryCompliant(server.layerHistory, layer) &&
      this.isPopulationCountCompliant(server.populationCount, layer)
    );
  }

  randomCompliantLayer(server) {
    let layers = this.shuffleLayers(this.layers.slice());
    for (let layer of layers) {
      if (
        this.isHistoryCompliant(server.layerHistory, layer) &&
        this.isPopulationCountCompliant(server.populationCount, layer)
      )
        return layer;
    }
    return this.backupLayer;
  }

  shuffleLayers(layers) {
    let currentIndex = layers.length;
    let temporaryValue;
    let randomIndex;

    while (currentIndex !== 0) {
      randomIndex = Math.floor(Math.random() * currentIndex);
      currentIndex -= 1;

      temporaryValue = layers[currentIndex];
      layers[currentIndex] = layers[randomIndex];
      layers[randomIndex] = temporaryValue;
    }

    return layers;
  }
}
