// Import Dependencies
const Discord = require('discord.js');

// Init Discord Bot
const client = new Discord.Client();

// Import App and SquadServer Classes
const src = process.env.NODE_ENV === 'production' ? './build' : './src';
const ServerManager = require(src).Application;
const SquadServer = require(src).SquadServer;

// Import Plugins
const SeedingMessagePlugin = require(src).SeedingMessage;
const DiscordStatusMessagePlugin = require(src).DiscordStatusMessage;
const LayerSelectorPlugin = require(src).LayerSelector;
const MapVotePlugin = require(src).MapVote;

// Init App
const app = new ServerManager();

// Add Servers to App
const ServerName = new SquadServer(
  'ServerName', // needs to be unique across all servers
  'IP Addr', // host address of server
  7787, // query port
  27165, // rcon port
  'Rcon Password' // rcon password
);
app.addServer(ServerName);

// Init Plugins
const SeedingMessage = new SeedingMessagePlugin();

const LayerSelector = new LayerSelectorPlugin();
LayerSelector.layerFilter();

const MapVote = new MapVotePlugin(client, LayerSelector, {
  'Map Vote Channel ID': ServerName
});

const DiscordStatusMessage = new DiscordStatusMessagePlugin(client, {
  ServerName: [{ channelID: 'Channel ID', messageID: 'Message ID' }]
});

// Add Plugins
app.addPlugin(SeedingMessage.plugin());
app.addPlugin(LayerSelector.plugin());
app.addPlugin(MapVote.plugin());
app.addPlugin(DiscordStatusMessage.plugin());

// Start App
client.on('ready', () => {
  console.log(`Logged in as ${client.user.tag}!`);
  app.watch();
  MapVote.newVoteMessage(ServerName.id);
});

client.on('error', (err) => {
  console.log(`An error occurs with the Discord Bot: ${err.message}`);
});

// Login Bot
client.login('Discord Bot Login Token');
