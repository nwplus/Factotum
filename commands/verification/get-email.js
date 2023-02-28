const { Command } = require('@sapphire/framework');
const BotGuild = require('../../db/mongo/BotGuild')
const { lookupById } = require('../../db/firebase/firebase-services');

class GetEmails extends Command {
    constructor(context, options) {
        super(context, { 
            ...options, 
            description: 'Check the email of a given user if they have it linked to their Discord ID in our database.'
        });
    }
  
    registerApplicationCommands(registry) {
      registry.registerContextMenuCommand((builder) =>
        builder 
          .setName(this.name)
          .setType(2)
      );
    }
    async contextMenuRun(interaction) {
        const guild = interaction.guild;
        const userId = interaction.user.id;
        this.botGuild = this.botGuild = await BotGuild.findById(guild.id);

        if (!guild.members.cache.get(userId).roles.cache.has(this.botGuild.roleIDs.staffRole) && !guild.members.cache.get(userId).roles.cache.has(this.botGuild.roleIDs.adminRole)) {
            return this.error({ message: 'You do not have permissions to run this command!', ephemeral: true })
        }
        
        let botSpamChannel = guild.channels.resolve(this.botGuild.channelIDs.botSpamChannel);

        const email = await lookupById(guild.id, interaction.targetUser.id)
        if (email) {
            interaction.reply({ content: 'Visit <#' + this.botGuild.channelIDs.botSpamChannel + '> for the results', ephemeral: true });
            botSpamChannel.send('<@' + interaction.targetUser.id + '>\'s email is: ' + email);
            return;
        } else {
            interaction.reply({ content: 'Visit <#' + this.botGuild.channelIDs.botSpamChannel + '> for the results', ephemeral: true });
            botSpamChannel.send('<@' + interaction.targetUser.id + '>\'s email is not in our database!');
            return;
        }
    }
}

module.exports = {
    GetEmails
};
