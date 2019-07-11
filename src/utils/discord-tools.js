const cleanChannel = async (client, channelID) => {
  const channel = await client.channels.get(channelID);

  let messages = await channel.fetchMessages({ limit: 100 });
  while (messages.size > 0) {
    await channel.bulkDelete(messages);
    messages = await channel.fetchMessages({ limit: 100 });
  }
};

export { cleanChannel };
