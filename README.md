<div align="center">

# SQUAD.js

[![GitHub release](https://img.shields.io/github/release/Thomas-Smyth/SquadJS.svg?style=flat-square)](https://github.com/Thomas-Smyth/SquadJS/releases)
[![GitHub issues](https://img.shields.io/github/issues/Thomas-Smyth/SquadJS.svg?style=flat-square)](https://github.com/Thomas-Smyth/SquadJS/issues)
[![GitHub pull requests](https://img.shields.io/github/issues-pr-raw/Thomas-Smyth/SquadJS.svg?style=flat-square)](https://github.com/Thomas-Smyth/SquadJS/pulls)
[![GitHub contributors](https://img.shields.io/github/contributors/Thomas-Smyth/SquadJS.svg?style=flat-square)](https://github.com/Thomas-Smyth/SquadJS/graphs/contributors)
[![GitHub license](https://img.shields.io/github/license/Thomas-Smyth/SpaceX-API-Wrapper.svg?style=flat-square)](https://github.com/Thomas-Smyth/SquadJS/blob/master/LICENSE.md)

### Squad Server Management Script Framework
<br>
</div>

## About
Squad.js is a powerful Squad server management script framework. It allows various tasks to be automated through "plugins" written in the same format as [Koa](https://github.com/koajs/koa) Middleware.

Though Squad.js allows you to create and use your own plugins, it also comes bundled with several plugins:
* Seeding Messages - Automatically announces seeding rules in game when the server population is below the required amount.
* Layer Selector - Improves the automatic selection of the next map by factoring the population of the server and the layer history.
* Discord Status Messages - Provides server status messages in Discord allowing you to quickly find out basic information about a Squad server.
* Discord Map Vote - Allows Discord users to vote for the next map.

Each plugin can be enabled / disabled as required. Furthermore, the plugins also support multiple servers, so you can run Squad.js plugins on multiple Squad servers in a single application.

## Basic Usage
This guide will show you how to install and use Squad.js on your server box. Given that most Squad server owners use their own server box for hosting this seems to be the most suitable installation option for most.

Some basic knowledge of Discord bots is required to setup some of the plugins. Furthermore, some knowledge of Javascript and NodeJS is very useful. If you get stuck on any aspect, feel free to [create an issue](https://github.com/Thomas-Smyth/SquadJS/issues/new) to get some help.

Squad.js requires NodeJS and NPM to be install on the server box. The download for these can be found [here](https://nodejs.org/en/).

### Installation
Clone the repository and the submodules:
```
git clone --recurse-submodules https://github.com/Thomas-Smyth/SquadJS
```

Download the NPM modules required for Squad.js:
```
npm install
```

### Setup
Squad.js provides a [quick start file (index.js)](index.js) to get you going. However, some setup is required.

Firstly, you must register your server(s) with the application:
```js
const ServerName = new SquadServer(
  'ServerName', // needs to be unique across all servers and must be a valid object key (it is suggested you use the name of the variable you assign the server object to)
  'IP Addr', // host address of server
  7787, // query port
  27165, // rcon port
  'Rcon Password' // rcon password
);
app.addServer(ServerName);
```
Several server can be added to one Squad.js application. But, don't forget to setup each plugin with the relevant info for all the servers you have added.

Next, you need to assign a Discord channel (that your bot has access to) for the map voting to take place:
```js
const MapVote = new MapVotePlugin(client, LayerSelector, {
  'Map Vote Channel ID': ServerName
});
```

Then, you need to specify the Discord message(s) where the status messages are shown.
```js
const DiscordStatusMessage = new DiscordStatusMessagePlugin(client, {
  ServerName: [{ channelID: 'Channel ID', messageID: 'Message ID' }]
});
```
These messages must exist and be made by the bot first for the Discord Status Message plugin to work. This can be done through a simple Discord.js application.

Finally, add your Discord bot's login token to the last line of the file.
```js
client.login('Discord Bot Login Token');
```

The quick start file includes all th bundled plugins, though you can easily turn each of these off by commenting them out.

More setup options for each plugin can be found below.

### Running Squad.js
Once you have setup the application, you need to build the application and start it:
```
npm run build
npm run start
```

## Squad.js Option Setup
Add Plugin:
```js
app.addPlugin(fn); // add some plugin to the plugin list (must be a function)
```

Add a Squad server:
```js
app.addServer(server) // add a Squad server to the list to process (must be a Squad server instance)
```

Watch Servers:
```js
app.watch(schedule); // watch the servers running the plugins every 60 seconds (can be changed by giving a new CRON schedule string, but not advised)
```

## Bundled Plugin Setup
Each plugin is registered to the Squad.js application after any required initialisation using:
```js
app.addPlugin(pluginname.plugin());
```
### Seeding Message Plugin
Plugin Init:
```js
const SeedingMessage = new SeedingMessagePlugin(
  maxPopulation, // maximum population before seeding messages end (default 40)
  frequency // frequency of messages (default 5)
);
```

### Layer Selector
Plugin Init:
```js
const LayerSelector = new LayerSelectorPlugin({
  layerTolerance: 4, // how many other layers must be played before this layer can be replayed (default 4)
  mapTolerance: 2, // how many other maps must be played before this map can be replayed (default 2)
  timeTolerance: 4 * 60 * 60 * 1000, // time in milliseconds before the previous two criteria are ignored (default 2 hours)
  backupLayer: "Fool's Road AAS v1" // back up layer used when for some reason a map matching the selection criteria cannot be found (default "Fool's Road AAS v1")
});
```

Layer Filter (filters down the list of maps allowed on the servers):
```js
LayerSelector.layerFilter({ // options (optional)
  nightLayer: undefined, // select night maps (true / false or undefined for either) (default undefined)
  whitelistLayers: null, // whitelist layers
  blacklistLayers: null, // black layers
  whitelistMaps: null, // whitelist maps
  blacklistMaps: null, // black maps
  whitelistGamemodes: null, // whitelist gamemodes
  blacklistGamemodes: null, // black gamemodes
});
```

### Map Vote
Plugin Init:
```js
const MapVote = new MapVotePlugin(
  client, // discord.js client
  LayerSelector, // layer selector instance
  { // object specifying which Discord channels are map vote channels for which server
    'Map Vote Channel ID': ServerName
  }, { // options (optional)
    prefix: "!", // command prefix (default "!")
    resultsLimit: 5, // how many layers to show in the result embed (default 5)
    forceVoteTag: [] // list of Discord tags that allow you to change the forced map / cancel a forced map
  }
);
```

Usage:
* Anyone can use the `!mapvote <layer name / number>` to vote for a layer in the relevant map vote channel for the server they are playing on.
* Those specified in the options can use the `!mapvoteforce <"cancel" / layer name / number>` to set a forced next map or cancel a forced next map (either set via admin in game or through Discord). Note cancelling a forced next map will also reactivate the map selector plugin to ensure the next map meets the set criteria.

### Discord Status Message
Init:
```js
const DiscordStatusMessage = new DiscordStatusMessagePlugin(
  client, // discord.js client
  { // object containing a list of status messages for each server
    ServerName: [{ channelID: 'Channel ID', messageID: 'Message ID' }]
  },
  { // options (optional)
    interval: "5 minutes" // the interval of population growth show in the message (default is "5 minutes") 
                          // (only effects the message and not the population growth interval value)
  }
);
``` 

## Writing Your Own Plugins
Plugins for Squad.js are written in a similar format to Koa Middleware. Examples of Koa Middleware can be found on their [Github repository](https://github.com/koajs/koa).

A basic plugin may look like:
```js
app.addPlugin(async function (server, next){
  console.log(server.nextMap); // do some action, like log the next map to the console
  next(); // call the next plugin. This can be used in combination with "return" to end the execution of the plugin
  console.log(server.nextMap); // do an action after the next plugin, like log the next next map to the console
});
```

If looking at the existing plugins and Koa Middleware does not give sufficient guidance on how to create your own plugins, feel free to [create an issue](https://github.com/Thomas-Smyth/SquadJS/issues/new) to get some help.

### Available Data
Squad.js update some basic information in the server object each "tick" which is then passed to each plugin:
* `.name` - Name of the server.
* `.maxPlayers` - Maximum player count.
* `.publicSlots` - Number of public player slots.
* `.reserveSlots` - Number of reserved player slots.
* `.players` - An array of information about each player on the server.
* `.populationCount` - Number of players on the server.
* `.populationGrowth` - How much the population count went up / down by between a set interval of ticks. `undefined` if not enough data has been collected so far to find the growth.
* `.publicQueue` - Number of players in the public queue.
* `.reserveQueue` - Number of players in the reserve queue.
* `.matchTimeout` - Time until the match ends.
* `.gameVersion` - Squad game version.
* `.currentLayer` - Current layer.
* `.originalCurrentLayer` - Current layer at start of tick.
* `.nextLayer` - Next layer.
* `.originalNextLayer` - Next layer at start of tick.
* `.lastNextLayerUpdate` - Next layer last set by Squad.js.
* `.layerChange` - `true / false` has the layer changed?
* `.adminChangeNextLayer` - `true` if the next layer has been changed by some means outside Squad.js.
* `.layerHistory` - Array of layers played.

### Set Data Functions
Squad.js can also update some information about the server.
* `.currentLayer` - Changes in this variable will be applied to the Squad server.
* `.nextLayer` - Changes in this variable will be applied to the Squad server.
* `.makeAnnouncement()` - Using this method will make announcements on the server pausing for 10 seconds between each announcement.
* `.rcon.execute(command)` - Manually run RCON commands on the server (not advised for map changes or announcements, use the above).

## Notes
* To run RCON commands on the server, we use the [Thomas-Smyth/rcon](https://github.com/Thomas-Smyth/rcon) RCON library. It is a fork of a decent existing client, but attempts to fix a memory leak issue caused when commands are called frequently by a single instance. It is "experimental", but seems to work well enough. Please be aware of this, however, as it may cause you some issues when developing your own plugins.

## Credits
Many thanks to [The Coalition Squad Server](https://joinsquad.ninja/), for whom this project was created for. I am very grateful for how supportive and patient their community has been in the development on Squad.js.

Special thanks to subtlerod for providing servers to test on and answering all my questions about Squad servers.
