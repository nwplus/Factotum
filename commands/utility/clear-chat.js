// Discord.js commando requirements
const { Command } = require('discord.js-commando');

// Command export
module.exports = class ClearChat extends Command {
    constructor(client) {
        super(client, {
            name: 'clearchat',
            group: 'utility',
            memberName: 'clear chat utility',
            description: 'Will clear the entire chat. Only available to admins!',
            guildOnly: true,
            args: [],
        });
    }

    async run (message) {
        if (message.member.roles.cache.some(r => r.name === "Admin")) {
            message.delete();
            //const fetched = await message.channel.fetch({limit : 100});
            await message.channel.bulkDelete(100).catch(console.error);
            message.guild.channels.cache.find(channel => channel.name === "logs").send("Cleared the channel: " + message.channel.name + ". By user: " + message.author.username);
        } else {
            message.member.send('Hey there, the command !clearchat is only available to Admins!');
            message.delete();
        }
    }

}