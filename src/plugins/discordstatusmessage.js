export default class DiscordStatusMessage {
  constructor(client, serverStatusMessages = {}, options = {}) {
    if (client) this.client = client;
    else throw new Error('DiscordStatusMessage must have a Discord.js client!');

    this.serverStatusMessages = serverStatusMessages;
    this.interval = options.interval || '5 minutes';
  }

  plugin() {
    return async (server, next) => {
      let statusMessages;
      if (this.serverStatusMessages.hasOwnProperty(server.id)) {
        statusMessages = this.serverStatusMessages[server.id];
      } else {
        return next();
      }

      let embed = {
        title: `${server.name} - Server Stats`,
        color: 15943495,
        fields: [
          {
            name: 'Player Count',
            value: `\`\`\`${server.populationCount} (+${server.reserveQueue +
              server.publicQueue}) / ${server.publicSlots} (+${
              server.reserveSlots
            })\`\`\``
          },
          {
            name: 'Current Map',
            value: `\`\`\`${server.currentLayer || 'Map not set!'}\`\`\``,
            inline: true
          },
          {
            name: 'Next Map',
            value: `\`\`\`${server.nextLayer || 'Map not set!'}\`\`\``,
            inline: true
          }
        ]
      };

      let populationGrowth = server.populationGrowth;
      if (populationGrowth > 0) populationGrowth = `+${populationGrowth}`;

      if (populationGrowth !== undefined)
        embed.fields.splice(1, 0, {
          name: 'Player Growth',
          value: `\`\`\`${populationGrowth} players in the past ${
            this.interval
          } minutes\`\`\``
        });

      statusMessages.forEach(async statusMessage => {
        try {
          let channel = await this.client.channels.get(statusMessage.channelID);
          try {
            let message = await channel.fetchMessage(statusMessage.messageID);
            message.edit({ embed });
          } catch (e) {
            console.log(
              `Error fetching message - most likely did not exist: ${e}`
            );
          }
        } catch (e) {
          console.log(
            `Error fetching channel - most likely did not exist: ${e}`
          );
        }
      });

      return next();
    };
  }
}
