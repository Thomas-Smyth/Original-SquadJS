const ServerManager = require('./src/index').Application;
const SquadServer = require('./src/index').SquadServer;

const app = new ServerManager();

app.addPlugin(function(server, next) {
  console.log(server.name);
  return next();
});

app.addServer(new SquadServer());

app.watch();
