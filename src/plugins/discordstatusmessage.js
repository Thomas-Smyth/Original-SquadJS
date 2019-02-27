export default class DiscordStatusMessage {
  /**
   * Init the Discord Status Message Plugin
   *
   * @param client
   * @param {Object} serverStatusMessages
   * @param {Object} options
   */
  constructor(client, serverStatusMessages = {}, options = {}) {
    if (client) this.client = client;
    else throw new Error('DiscordStatusMessage must have a Discord.js client!');

    this.serverStatusMessages = serverStatusMessages;
    this.interval = options.interval || '5 minutes';
  }

  /**
   * Output plugin function to apply to the application.
   *
   * @returns {Function}
   */
  plugin() {
    return async (server, next) => {
      // Only run the plugin every x number of ticks.
      let statusMessages;
      if (this.serverStatusMessages.hasOwnProperty(server.id)) {
        statusMessages = this.serverStatusMessages[server.id];
      } else {
        return next();
      }

      // Build the embed.
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

      // Update the status messages.
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
