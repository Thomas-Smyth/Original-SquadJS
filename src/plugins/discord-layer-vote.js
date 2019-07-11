import { Client } from 'discord.js';
import { cleanChannel } from '../utils/discord-tools';
import SquadLayers from '../utils/squad-layers';

export default class DiscordLayerVote {
  constructor(server, client, channelID, filter, options = {}) {
    if (client instanceof Client === false)
      throw new Error("client must be an instance of Discord.js' Client");
    if (typeof channelID !== 'string')
      throw new Error(
        'channelID must be a string containing the channel ID for the vote'
      );

    this.server = server;
    this.client = client;
    this.client.on('message', this.handleMessage.bind(this));
    this.channelID = channelID;
    this.currentResultsMessage = null;

    this.prefix = options.prefix || '!';
    this.color = options.color || 486651;
    this.resultsLength = options.resultsLength || 5;
    this.forceVoteTag = options.forceVoteTag || ['discord admin'];

    this.filter = filter;
    this.layerNumbers = {};

    this.historyCompliantOptions = {
      layerTolerance: options.layerTolerance || 4,
      mapTolerance: options.mapTolerance || 2,
      timeTolerance: options.timeTolerance || 4 * 60 * 60 * 1000
    };

    this.voters = {};
    this.votes = {};
    this.previousVotes = {};

    this.forcedLayer = null;
    this.previousForcedLayer = null;

    this.tick = this.tick.bind(this);
  }

  prepare() {
    this.layerRotation = SquadLayers.filterLayers(this.filter);
    this.constructLayerNumbers();
  }

  applyFilter(filter) {
    this.layerRotation = SquadLayers.filterLayers(filter);
    this.filter = filter;
  }

  clearFilter(filter) {
    this.layerRotation = SquadLayers.listLayers();
    this.filter = filter;
  }

  constructLayerNumbers() {
    this.layerRotation.forEach((layer, key) => {
      this.layerNumbers[key + 1] = layer;
    });
  }

  getLayerFromNumber(number) {
    if (this.layerNumbers[number]) return this.layerNumbers[number];
    else return false;
  }

  async tick(server, next) {
    // on first tick or layer change restart vote
    if (server.firstTick || server.layerChange) {
      let channel;
      try {
        channel = await this.client.channels.get(this.channelID);
      } catch (err) {
        console.log(
          `DiscordLayerVote - Failed to find channel... ${err.message}`
        );
        return next();
      }

      await cleanChannel(this.client, channel.id);

      // save copy of old votes and clear the votes
      if (Object.keys(this.votes).length > 0) {
        this.previousVotes = this.votes;
        this.previousForcedLayer = this.forcedLayer;
        await channel.send({ embed: this.buildOldResultsEmbed() });
      }
      this.votes = {};
      this.voters = {};
      this.forcedLayer = null;

      await channel.send({ embed: this.buildLayerNumbersEmbed() });

      const currentResultsMessage = await channel.send({
        embed: this.buildCurrentResultsEmbed()
      });
      this.currentResultsMessage = currentResultsMessage.id;
    }

    if (server.adminChangeNextLayer && !this.forcedLayer)
      this.forcedLayer = server.nextLayer;

    let layer = this.forcedLayer
      ? this.forcedLayer
      : this.getVoteWinner(this.votes);
    if (layer) server.nextLayer = layer;
    return next();
  }

  buildLayerNumbersEmbed() {
    let fields = [];
    let currentField = '';
    let lastMap = null;

    for (let i = 1; i <= this.layerRotation.length; i++) {
      let layer = this.getLayerFromNumber(i);

      // create new field for new layer category
      if (lastMap !== null && lastMap !== SquadLayers[layer].map) {
        fields.push({
          name: lastMap,
          value: `\`\`\`${currentField}\`\`\``
        });
        currentField = '';
      }

      currentField += `${i}) ${layer}\n`;

      lastMap = SquadLayers[layer].map;
    }

    return {
      title: 'Layer Numbers',
      color: this.color,
      fields
    };
  }

  buildCurrentResultsEmbed() {
    let resultText = '';

    if (this.forcedLayer) resultText += `Forced) ${this.forcedLayer}\n`;

    let counter = 1;
    let counterVotes = null;
    for (let result of this.getVoteResult(this.votes)) {
      if (counterVotes && counterVotes !== result.votes) counter += 1;
      counterVotes = result.votes;

      resultText += `${counter}) ${result.layer} - ${result.votes} vote${
        result.votes === 1 ? '' : 's'
      }\n`;
    }
    if (resultText === '') resultText += 'No votes casted.';

    return {
      title: 'Layer Vote',
      color: this.color,
      description:
        'To vote use the command `!mapvote <layer number / name>` in this channel.',
      fields: [
        {
          name: 'Results',
          value: `\`\`\`${resultText}\`\`\``
        }
      ]
    };
  }

  buildOldResultsEmbed() {
    let voteWinner = this.getVoteWinner(this.previousVotes);
    let voteResult;

    if (this.previousForcedLayer)
      voteResult = `${this.previousForcedLayer} was selected by an admin.`;
    else if (voteWinner)
      voteResult = `${voteWinner} won the vote as it had the most votes and was suitable for the current player count.`;
    else
      voteResult =
        'No layers voted for were suitable for the current player count.';

    let resultText = '';

    if (this.previousForcedLayer)
      resultText += `Forced) ${this.previousForcedLayer}\n`;

    let counter = 1;
    let counterVotes = null;
    for (let result of this.getVoteResult(this.previousVotes)) {
      if (counterVotes && counterVotes !== result.votes) counter += 1;
      counterVotes = result.votes;

      resultText += `${counter}) ${result.layer} - ${result.votes} vote${
        result.votes === 1 ? '' : 's'
      }\n`;
    }
    if (resultText === '') resultText += 'No votes casted.';

    return {
      title: 'Previous Layer Vote',
      color: this.color,
      description: `${voteResult}`,
      fields: [
        {
          name: 'Results',
          value: `\`\`\`${resultText}\`\`\``
        }
      ]
    };
  }

  async handleMessage(msg) {
    if (msg.author.bot) return;
    if (msg.content.indexOf(this.prefix) !== 0) return;
    if (msg.channel.id !== this.channelID) return;

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
        this.replyToMessage(msg, 'Unrecognised command!');
    }
  }

  replyToMessage(msg, response) {
    msg.author.send(response);
    msg.delete();
  }

  async handleVote(msg, args, forced = false) {
    let layer = args.join(' ');
    if (!isNaN(layer)) layer = this.getLayerFromNumber(layer);

    let message;
    if (!forced) {
      // check map is compliant
      if (!SquadLayers.isLayer(layer)) {
        this.replyToMessage(msg, `\`${layer}\` is not a Squad layer!`);
        return;
      }

      if (!SquadLayers.isInRotation(this.layerRotation, layer)) {
        this.replyToMessage(msg, `\`${layer}\` is not in the layer rotation!`);
        return;
      }

      if (
        !SquadLayers.isHistoryCompliant(
          this.server.layerHistory,
          layer,
          this.historyCompliantOptions
        )
      ) {
        this.replyToMessage(msg, `\`${layer}\` was played too recently!`);
        return;
      }

      let warning = '';
      if (!SquadLayers.isPlayerCountCompliant(this.server.playerCount, layer)) {
        warning =
          'Be advised, this layer is not suitable for the current player count so will not be played unless the player count changes.';
      }

      let voterID = msg.author.id;

      // remove existing vote
      if (this.voters[voterID] !== undefined) {
        this.votes[this.voters[voterID]]--;
        if (this.votes[this.voters[voterID]] === 0) {
          delete this.votes[this.voters[voterID]];
        }
      }

      // add new vote
      this.voters[voterID] = layer;
      if (isNaN(this.votes[layer])) this.votes[layer] = 1;
      else this.votes[layer]++;

      message = `You voted for \`${layer}\`. ${warning}`;
    } else {
      if (!msg.member.roles.some(r => this.forceVoteTag.includes(r.name))) {
        this.replyToMessage(msg, 'You do not have permissions to do this!');
        return;
      }

      if (layer === 'cancel') {
        this.forcedLayer = null;
        this.server.adminChangeNextLayer = false;
        message = `You unforced the winner of the vote.`;
      } else {
        if (!SquadLayers.isLayer(layer)) {
          this.replyToMessage(msg, `\`${layer}\` is not a Squad layer!`);
          return;
        }
        this.forcedLayer = layer;
        this.server.adminChangeNextLayer = true;
        message = `You forced the winner of the vote to be \`${layer}\`.`;
      }
    }

    // update current results
    let currentResultsMessage;
    try {
      currentResultsMessage = await msg.channel.messages.get(
        this.currentResultsMessage
      );
    } catch (err) {
      console.log(
        `DiscordLayerVote - Failed to find message... ${err.message}`
      );
      return;
    }

    try {
      await currentResultsMessage.edit({
        embed: this.buildCurrentResultsEmbed(this.server)
      });
    } catch (err) {
      console.log(
        `DiscordLayerVote - Failed to edit message... ${err.message}`
      );
      return;
    }

    this.replyToMessage(msg, message);
  }

  getVoteResult(votes) {
    let results = [];

    for (let votedLayer in votes) {
      // results empty case
      if (results.length === 0) {
        results.push({
          layer: votedLayer,
          votes: votes[votedLayer]
        });
        continue;
      }

      // other cases
      let inserted = false;
      for (let i = 0; i < results.length; i++) {
        if (results[i].votes < votes[votedLayer]) {
          results.splice(i, 0, {
            layer: votedLayer,
            votes: votes[votedLayer]
          });

          inserted = true;
          break;
        }
      }

      if (!inserted)
        results.push({
          layer: votedLayer,
          votes: votes[votedLayer]
        });
    }

    return results;
  }

  getVoteWinner(votes) {
    for (let result of this.getVoteResult(votes)) {
      if (
        SquadLayers.isPlayerCountCompliant(
          this.server.playerCount,
          result.layer
        )
      )
        return result.layer;
    }
    return false;
  }
}
