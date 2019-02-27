import SquadMaps from '../../data/squad-maps/layers.json';

export default class LayerSelector {
  /**
   * Init the Layer Selector Tool / Plugin
   *
   * @param {Object} options
   */
  constructor(options = {}) {
    this.layerTolerance = options.layerTolerance || 4;
    this.mapTolerance = options.mapTolerance || 2;
    this.timeTolerance = options.timeTolerance || 4 * 60 * 60 * 1000;
    this.backupLayer = options.backupLayer || "Fool's Road AAS v1";

    this.layers = Object.keys(SquadMaps);
  }

  /**
   * Output plugin function to apply to the application.
   *
   * @returns {Function}
   */
  plugin() {
    return async (server, next) => {
      // Do not run if an admin has forced the next layer
      if (server.adminChangeNextLayer) return next();

      // Do nothing if the current layer is compliant to all criteria
      if (this.isCompliant(server, server.nextLayer)) return next();

      server.nextLayer = this.randomCompliantLayer(server);

      return next();
    };
  }

  /**
   * Filter list of maps that can be used on the server.
   *
   * @param {Object} filterOptions
   */
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

  /**
   * Reset the filter.
   */
  clearFilter() {
    this.layers = SquadMaps;
  }

  /**
   * Return true if the layer is a valid Squad layer.
   *
   * @param {String} layer
   * @returns {boolean}
   */
  isLayer(layer) {
    return layer in SquadMaps;
  }

  /**
   * Return true if the layer is in the layer filter.
   *
   * @param {String} layer
   * @returns {boolean}
   */
  isInRotation(layer) {
    return this.layers.includes(layer);
  }

  /**
   * Return true if the layer passes the history criteria.
   *
   * @param {Array} layerHistory
   * @param {String} layer
   * @returns {boolean}
   */
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

  /**
   * Return true if the layer passes the population count criteria.
   *
   * @param {Integer} populationCount
   * @param {String} layer
   * @returns {boolean}
   */
  isPopulationCountCompliant(populationCount, layer) {
    let layerInfo = SquadMaps[layer];
    return !(
      populationCount > layerInfo.maxPlayers ||
      populationCount < layerInfo.minPlayers
    );
  }

  /**
   * Return true if layer is fully compliant.
   *
   * @param {SquadServer} server
   * @param {String} layer
   * @returns {boolean}
   */
  isCompliant(server, layer) {
    return (
      this.isLayer(layer) &&
      this.isInRotation(layer) &&
      this.isHistoryCompliant(server.layerHistory, layer) &&
      this.isPopulationCountCompliant(server.populationCount, layer)
    );
  }

  /**
   * Returns a compliant layer.
   *
   * @param {SquadServer} server
   * @returns {*|string}
   */
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

  /**
   * Shuffles a list of layers to allow a random layer to be selected.
   *
   * @param {Array} layers
   * @returns {*}
   */
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
