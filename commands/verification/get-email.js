const { Command } = require('@sapphire/framework');
const firebaseUtil = require('../../db/firebase/firebaseUtil');
const { lookupById } = require('../../db/firebase/firebaseUtil');

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
        this.initBotInfo = await firebaseUtil.getInitBotInfo(interaction.guild.id);

        if (!guild.members.cache.get(userId).roles.cache.has(this.initBotInfo.roleIDs.staffRole) && !guild.members.cache.get(userId).roles.cache.has(this.initBotInfo.roleIDs.adminRole)) {
            return this.error({ message: 'You do not have permissions to run this command!', ephemeral: true })
        }
        
        let botSpamChannel = guild.channels.resolve(this.initBotInfo.channelIDs.botSpamChannel);

        const email = await lookupById(guild.id, interaction.targetUser.id)
        if (email) {
            interaction.reply({ content: 'Visit <#' + this.initBotInfo.channelIDs.botSpamChannel + '> for the results', ephemeral: true });
            botSpamChannel.send('<@' + interaction.targetUser.id + '>\'s email is: ' + email);
            return;
        } else {
            interaction.reply({ content: 'Visit <#' + this.initBotInfo.channelIDs.botSpamChannel + '> for the results', ephemeral: true });
            botSpamChannel.send('<@' + interaction.targetUser.id + '>\'s email is not in our database!');
            return;
        }
    }
}

module.exports = {
    GetEmails
};
