import axios from 'axios';

class SquadLayers {
  fetchingLayers = false;
  fetchedLayers = false;
  repoAddress =
    'https://raw.githubusercontent.com/Thomas-Smyth/squad-layers/master/layers.json';

  listLayers() {
    // filter out object properties
    // weird design idea, but make the rest of the code cleaner?
    return Object.keys(this).filter(
      layer =>
        ![
          'fetchingLayers',
          'fetchedLayers',
          'repoAddress',
          'listLayers',
          'fetchLayers',
          'filterLayers',
          'isLayer',
          'isInRotation',
          'isHistoryCompliant',
          'isPlayerCountCompliant'
        ].includes(layer)
    );
  }

  async fetchLayers(forceUpdate = false) {
    // prevent updates if not required
    if (this.fetchingLayers) return;
    if (this.fetchedLayers && !forceUpdate) return;

    // reset on forced update
    if (forceUpdate) this.fetchedLayers = false;

    // prevent future calls from running
    this.fetchingLayers = true;

    const response = await axios.get(this.repoAddress);
    for (let layer in response.data) {
      if (this.hasOwnProperty(layer)) continue; // prevent overwriting own properties
      this[layer] = response.data[layer];
    }

    // prevent future calls from running as layers are available
    this.fetchedLayers = true;
  }

  filterLayers(filter = {}) {
    let whitelistLayers = filter.whitelistLayers || null;
    let blacklistLayers = filter.blacklistLayers || null;
    let whitelistMaps = filter.whitelistMaps || null;
    let blacklistMaps = filter.blacklistMaps || null;
    let whitelistGamemodes = filter.whitelistGamemodes || null;
    let blacklistGamemodes = filter.blacklistGamemodes || null;

    let layers = [];

    for (let layer of this.listLayers()) {
      let layerInfo = this[layer];

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

    return layers;
  }

  isLayer(layer) {
    return layer in this;
  }

  isInRotation(rotation, layer) {
    return rotation.includes(layer);
  }

  isHistoryCompliant(layerHistory, layer, options = {}) {
    let layerTolerance = options.layerTolerance || 4;
    let mapTolerance = options.mapTolerance || 2;
    let gamemodeTolerance = options.gamemodeTolerance || -1;
    let timeTolerance = options.timeTolerance || 4 * 60 * 60 * 1000;

    for (let i = 0; i < layerHistory.length; i++) {
      if (i >= Math.max(layerHistory, mapTolerance)) return true;
      if (new Date() - layerHistory[i].time > timeTolerance) return true;

      if (
        i < gamemodeTolerance &&
        this[layerHistory[i].layer].gamemode === this[layer].gamemode
      )
        return false;
      if (i < layerTolerance && layerHistory[i] === layer) return false;
      if (
        i < mapTolerance &&
        this[layerHistory[i].layer].map === this[layer].map
      )
        return false;
    }
    return true;
  }

  isPlayerCountCompliant(playerCount, layer) {
    return !(
      playerCount > this[layer].estimatedSuitablePlayerCount.max ||
      playerCount < this[layer].estimatedSuitablePlayerCount.min
    );
  }
}

export default new SquadLayers();
