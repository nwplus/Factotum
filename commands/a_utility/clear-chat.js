const { Command } = require('@sapphire/framework');
const { Interaction } = require('discord.js');
const { discordLog } = require('../../discord-services');


class ClearChat extends Command {
    constructor(context, options) {
        super(context, {
          ...options,
          description: 'Clear most recent 100 messages younger than 2 weeks.'
        });
    }

    registerApplicationCommands(registry) {
        registry.registerChatInputCommand((builder) =>
          builder
            .setName(this.name)
            .setDescription(this.description)
        )
    }

    /**
     * @param {Interaction} interaction
     * @param {Object} args - the command arguments
     * @param {Boolean} args.keepPinned - if true any pinned messages will not be removed
     */
    async chatInputRun (interaction, {keepPinned}) {

        if (keepPinned) {
            // other option is to get all channel messages, filter of the pined channels and pass those to bulkDelete, might be to costly?
            var messagesToDelete = interaction.channel.messages.cache.filter(msg => !msg.pinned);
            await interaction.channel.bulkDelete(messagesToDelete, true).catch(console.error);
        } else {
            // delete messages and log to console
            await interaction.channel.bulkDelete(100, true).catch(console.error);
        }
        discordLog(interaction.guild, 'CHANNEL CLEAR ' + interaction.channel.name);
    }
}
module.exports = ClearChat;
