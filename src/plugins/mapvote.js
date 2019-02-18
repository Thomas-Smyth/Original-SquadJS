import SquadMaps from '../../data/squad-maps/layers.json';

import LayerSelectorImport from './layerselector';

export default class MapVote {
  constructor(
    client,
    LayerSelector = new LayerSelectorImport(),
    voteChannels = {},
    options = {}
  ) {
    if (client) this.client = client;
    else throw new Error('MapVote must have a Discord.js client!');
    this.client.on('message', this.handleMessage.bind(this));

    this.LayerSelector = LayerSelector;
    this.voteChannels = voteChannels;

    this.prefix = options.prefix || '!';
    this.resultsLimit = options.resultsLimit || 5;
    this.forceVoteTag = options.forceVoteTag || [];

    this.forcedLayer = {};
    this.votes = {};
    this.results = {};

    for (let channel in this.voteChannels) {
      let server = this.voteChannels[channel];
      this.forcedLayer[server.id] = undefined;
      this.votes[server.id] = {};
      this.results[server.id] = {};
    }
  }

  plugin() {
    return async (server, next) => {
      if (server.adminChangeNextLayer) {
        this.forcedLayer[server.id] = server.nextLayer;
        return next();
      }

      if (server.layerChange) {
        let results = this.getVoteResults(server.id);

        let voteResult;

        if (results.length === 0) voteResult = 'No one voted in the last vote.';
        else if (!results.some(result => result.layer === server.currentLayer))
          voteResult =
            'In the last vote no maps that suited the current player count were voted for, so votes have been ignored.';
        else voteResult = `${server.currentLayer} won the last vote.`;
        voteResult += '\n\n A new map vote has started!\n';

        await this.newVoteMessage(server.id, voteResult);

        this.forcedLayer[server.id] = undefined;
        this.votes[server.id] = {};
        this.results[server.id] = {};

        return next();
      }

      let layer = this.selectMap(server);
      if (layer !== undefined) server.nextLayer = layer;
      return next();
    };
  }

  handleMessage(msg) {
    if (msg.author.bot) return;
    if (msg.content.indexOf(this.prefix) !== 0) return;
    if (!this.voteChannels.hasOwnProperty(msg.channel.id)) return;

    const args = msg.content
      .slice(this.prefix.length)
      .trim()
      .split(/ +/g);
    const command = args.shift().toLowerCase();

    switch (command) {
      case 'mapvote':
        this.handleVote(msg, args);
        break;
      case 'mapvoteforce':
        this.handleVote(msg, args, true);
        break;
      default:
        msg.reply('unrecognised command!');
    }
  }

  handleVote(msg, args, forced = false) {
    let layer = args.join(' ');
    let server = this.voteChannels[msg.channel.id];

    if (!isNaN(layer)) layer = this.numberToLayer(layer);

    if (forced) {
      if (!msg.member.roles.some(r => this.forceVoteTag.includes(r.name))) {
        msg.reply('you do not have permissions to do this!');
        return;
      }

      if (layer === 'cancel') {
        this.forcedLayer[server.id] = undefined;
        server.lastNextLayerUpdate = server.nextLayer;
        msg.reply(`you unforced the winner of the map vote.`);
        return;
      }
    }

    if (!this.LayerSelector.isLayer(layer)) {
      msg.reply(`\`${layer}\` is not a Squad Map!`);
      return;
    }

    if (forced) {
      this.forcedLayer[server.id] = layer;
      msg.reply(`you forced the winner of the map vote to ${layer}.`);
      return;
    }

    if (!this.LayerSelector.isInRotation(layer)) {
      msg.reply(`\`${layer}\` is not in this server's map rotation!`);
      return;
    }

    if (!this.LayerSelector.isHistoryCompliant(server.layerHistory, layer)) {
      msg.reply(`\`${layer}\` was played too recently.`);
      return;
    }

    let additionalText = '';
    if (
      !this.LayerSelector.isPopulationCountCompliant(
        server.populationCount,
        layer
      )
    )
      additionalText =
        'Be advised, the map you have selected is not suitable for the current player count. ';

    this.updateVote(msg.author.id, server.id, layer);

    const embed = this.getVoteResultsEmbed(server.id);

    msg.reply(`you voted for \`${layer}\`. ${additionalText}`, { embed });
  }

  async newVoteMessage(serverID, additionalText = '') {
    let fields = [];
    let counter = -1;

    for (let i = 1; i < this.LayerSelector.layers.length + 1; i++) {
      let layer = this.numberToLayer(i);
      let layerInfo = SquadMaps[layer];

      if (fields.length === 0 || fields[counter].name !== layerInfo.map) {
        fields.push({ name: layerInfo.map, value: '' });
        counter++;
      }

      fields[counter].value += `${i}) ${layer} (${layerInfo.minPlayers} - ${
        layerInfo.maxPlayers
      } players)\n`;
    }

    fields = fields.map(field => ({
      name: field.name,
      value: `\`\`\`${field.value}\`\`\``
    }));

    let embed = {
      title: 'Map Vote!',
      description: `**${additionalText}Vote for the map you want by replying with \`!mapvote <layer name or number>\`. Layer numbers can be found below:**`,
      color: 486651,
      fields: fields
    };

    let servers = {};
    for (let key in this.voteChannels) {
      servers[this.voteChannels[key].id] = key;
    }
    let channel = servers[serverID];

    try {
      channel = await this.client.channels.get(channel);
      channel.send({ embed });
    } catch (e) {
      console.log(`Error fetching channel - most likely did not exist: ${e}`);
    }
  }

  selectMap(server) {
    let newLayer;

    for (let result of this.getVoteResults(server.id)) {
      let layer = result.layer;
      if (
        !this.forcedLayer[server.id] &&
        !this.LayerSelector.isPopulationCountCompliant(
          server.populationCount,
          layer
        )
      )
        continue;
      newLayer = layer;
      break;
    }

    return newLayer;
  }

  numberToLayer(number) {
    return this.LayerSelector.layers[number - 1];
  }

  updateVote(voter, serverID, option) {
    this.removeVote(voter, serverID);
    this.addVote(voter, serverID, option);
  }

  addVote(voter, serverID, layer) {
    this.votes[serverID][voter] = layer;
    if (isNaN(this.results[serverID][layer])) this.results[serverID][layer] = 1;
    else this.results[serverID][layer]++;
  }

  removeVote(voter, serverID) {
    let option = this.votes[serverID][voter];
    if (option === undefined) return;
    this.results[serverID][option]--;
    if (this.results[serverID][option] === 0)
      delete this.results[serverID][option];
  }

  getVoteResults(serverID) {
    let results = [];

    for (let layer in this.results[serverID]) {
      results.push({
        layer: layer,
        votes: this.results[serverID][layer]
      });
    }

    results.sort((a, b) => {
      if (a.votes < b.votes) return 1;
      if (a.votes > b.votes) return -1;
      return Math.random() >= 0.5 ? 1 : -1;
    });

    if (this.forcedLayer[serverID])
      results.splice(0, 0, {
        layer: this.forcedLayer[serverID],
        votes: undefined
      });

    return results;
  }

  getVoteResultsEmbed(serverID) {
    let description = '';
    let counter = 0;
    let previousVoteCount;

    let results = this.getVoteResults(serverID);

    for (let result of results) {
      if (counter >= this.resultsLimit) break;

      if (description === '' && this.forcedLayer[serverID]) {
        description += `Forced Winner) ${result.layer}`;
        continue;
      }

      if (previousVoteCount === undefined || previousVoteCount > result.votes) {
        counter++;
        if (description !== '') description += '\n';
        description += `${counter}) `;
      } else {
        description += ', ';
      }

      let vote = 'vote';
      if (result.votes !== 1) vote += 's';

      description += `${result.layer} (${result.votes} ${vote})`;

      previousVoteCount = result.votes;
    }

    return {
      title: 'Map Vote - Current Results',
      description: `**${description}**`,
      color: 15943495
    };
  }
}
