import SquadLayers from '../utils/squad-layers';

export default class LayerSelector {
  constructor(filter, options = {}) {
    this.filter = filter;

    this.historyCompliantOptions = {
      layerTolerance: options.layerTolerance || 4,
      mapTolerance: options.mapTolerance || 2,
      timeTolerance: options.timeTolerance || 4 * 60 * 60 * 1000
    };

    this.backupLayer = options.backupLayer || "Fool's Road AAS v1";

    this.tick = this.tick.bind(this);
  }

  prepare() {
    this.layerRotation = SquadLayers.filterLayers(this.filter);
  }

  applyFilter(filter) {
    this.layerRotation = SquadLayers.filterLayers(filter);
  }

  clearFilter(filter) {
    this.layerRotation = SquadLayers.listLayers();
  }

  tick(server, next) {
    // Do not run if an admin has forced the next layer
    if (server.adminChangeNextLayer) return next();

    // Do nothing if the current layer is compliant to all criteria
    if (this.isCompliant(server, server.nextLayer)) return next();

    server.nextLayer = this.randomCompliantLayer(server);

    return next();
  }

  isCompliant(server, layer) {
    return (
      SquadLayers.isLayer(layer) &&
      SquadLayers.isInRotation(this.layerRotation, layer) &&
      SquadLayers.isHistoryCompliant(
        server.layerHistory,
        layer,
        this.historyCompliantOptions
      ) &&
      SquadLayers.isPlayerCountCompliant(server.playerCount, layer)
    );
  }

  randomCompliantLayer(server) {
    let layers = this.shuffleLayers(this.layerRotation.slice());
    for (let layer of layers) {
      if (this.isCompliant(server, layer)) return layer;
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
