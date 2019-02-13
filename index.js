const src = process.env.NODE_ENV === 'production' ? './build' : './src';
const ServerManager = require(src).Application;
const SquadServer = require(src).SquadServer;

const SeedingMessage = require(src).SeedingMessage;

const app = new ServerManager();
const seeder = new SeedingMessage();

app.addPlugin(seeder.plugin());

app.addServer(new SquadServer());

app.watch();
