const PermissionCommand = require('../../classes/permission-command');
const discordServices = require('../../discord-services');

// Command export
module.exports = class ChangeStampTime extends PermissionCommand {
    constructor(client) {
        super(client, {
            name: 'stamptime',
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
            roleID: discordServices.adminRole,
            roleMessage: 'Hey there, the command !stamptime is only available to Admins!',
        });
    }

    async runCommand(message, {newTime}) {

        discordServices.stampCollectTime = newTime;

        discordServices.replyAndDelete(message, 'Stamp collection will now give hackers ' + newTime + ' seconds to collect stamp.');
    }

}