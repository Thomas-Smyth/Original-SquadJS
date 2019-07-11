import { Client } from 'discord.js';

export default class DiscordStatusMessage {
  constructor(client, channelID, messageID, options = {}) {
    if (client instanceof Client === false)
      throw new Error("client must be an instance of Discord.js' Client");
    if (typeof channelID !== 'string')
      throw new Error(
        'channelID must be a string containing the channel ID for the message'
      );

    this.client = client;
    this.channelID = channelID;
    this.messageID = messageID;

    this.color = options.color || 15943495;

    this.tick = this.tick.bind(this);
  }

  async tick(server, next) {
    let channel;
    try {
      channel = await this.client.channels.get(this.channelID);
    } catch (err) {
      console.log(
        `DiscordStatusMessage - Failed to find channel... ${err.message}`
      );
      return next();
    }

    let message;
    try {
      message = await channel.fetchMessage(this.messageID);
    } catch (err) {
      console.log(
        `DiscordStatusMessage - Failed to find message... ${err.message}`
      );
      return next();
    }

    try {
      await message.edit({ embed: this.buildEmbed(server) });
    } catch (err) {
      console.log(
        `DiscordStatusMessage - Failed to edit message... ${err.message}`
      );
      return next();
    }

    return next();
  }

  buildEmbed(server) {
    let fields = [
      {
        name: 'Player Count',
        value: `\`\`\`${server.playerCount} (+${server.reserveQueueLength +
          server.publicQueueLength}) / ${server.publicPlayerSlots} (+${
          server.reservePlayerSlots
        })\`\`\``
      },
      {
        name: 'Current Map',
        value: `\`\`\`${server.currentLayer || 'Layer not set!'}\`\`\``,
        inline: true
      },
      {
        name: 'Next Map',
        value: `\`\`\`${server.nextLayer || 'Layer not set!'}\`\`\``,
        inline: true
      },
      {
        name: 'Previous 4 Layers',
        value: `\`\`\`${server.layerHistory
          .map(r => r.layer)
          .slice(0, 4)
          .join('\n')}\`\`\``
      }
    ];

    if (server.playerCountHistory.length > 10) {
      let growth = server.playerCount - server.playerCountHistory[10];

      fields.splice(1, 0, {
        name: 'Player Count Growth',
        value: `\`\`\`${
          growth >= 0 ? '+' : ''
        }${growth} players in the past 5 minutes.\`\`\``
      });
    }

    return {
      title: `${server.name || 'Placeholder Server Name'} - Server Stats`,
      color: this.color,
      fields
    };
  }
}
