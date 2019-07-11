/* SquadJS Imports */
const src = process.env.NODE_ENV === 'production' ? './build' : './src';
const SquadServer = require(src).SquadServer;

/* SquadJS Plugin Imports */
const TickTest = require(src).TickTest;
const SeedingMessage = require(src).SeedingMessage;
const LayerSelector = require(src).LayerSelector;

/* Server Configuration */
const TestServer = new SquadServer(
  'xxx.xxx.xxx.xxx',
  27175,
  21124,
  'rconpassword'
);

/* Plugin Configuration */
const tickTest = new TickTest();
const seedingMessage = new SeedingMessage();
const layerSelector = new LayerSelector();

/* Apply Plugins */
TestServer.addTickBasedPlugin(tickTest);
TestServer.addTickBasedPlugin(seedingMessage);
TestServer.addTickBasedPlugin(layerSelector);

/* Boot SquadJS */
TestServer.run();
