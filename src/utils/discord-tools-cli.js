import { Client } from 'discord.js';
import { cleanChannel } from './discord-tools';
const client = new Client();

const args = process.argv.slice(2);

client.on('ready', async () => {
  switch (args[0]) {
    case 'cleanChannel':
      console.log(`Cleaning channel ${args[1]}...`);
      await cleanChannel(client, args[1]);
      console.log(`Channel ${args[1]} cleaned.`);
      break;
    case 'placeholderMessage':
      console.log(`Creating placeholder message in channel ${args[1]}`);
      const message = await client.channels.get(args[1]).send('Placeholder');
      console.log(
        `Placeholder message created in channel  ${args[1]}. ID: ${message.id}`
      );
      break;
    default:
      console.log('Command not found');
  }
  process.exit();
});

// Place your Discord Bot token here.
client.login('discord-login-token');
