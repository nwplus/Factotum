const PermissionCommand = require('../../classes/permission-command');
const discordServices = require('../../discord-services');
const { Message } = require('discord.js');
const { Document } = require('mongoose');

// Command export
module.exports = class ChangeStampTime extends PermissionCommand {
    constructor(client) {
        super(client, {
            name: 'change-stamp-time',
            group: 'a_utility',
            memberName: 'new stamp time',
            description: 'Will set the given seconds as the new stamp time for activities.',
            guildOnly: true,
            args: [
                {
                    key: 'newTime',
                    prompt: 'new time for stamp collectors to use',
                    type: 'integer',
                },
            ],
        },
        {
            role: PermissionCommand.FLAGS.STAFF_ROLE,
            roleMessage: 'Hey there, the command !change-stamp-time is only available to staff!',
        });
    }

    /**
     * 
     * @param {Document} botGuild 
     * @param {Message} message 
     * @param {*} param2 
     */
    async runCommand(botGuild, message, {newTime}) {

        botGuild.stamps.stampCollectionTime = newTime;
        botGuild.save()

        discordServices.replyAndDelete(message, 'Stamp collection will now give hackers ' + newTime + ' seconds to collect stamp.');
    }

}