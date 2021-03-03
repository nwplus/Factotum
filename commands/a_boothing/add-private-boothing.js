// Discord.js commando requirements
const PermissionCommand = require('../../classes/permission-command');
const discordServices = require('../../discord-services');

// Command export
module.exports = class CreatePrivates extends PermissionCommand {
    constructor(client) {
        super(client, {
            name: 'createprivates',
            group: 'a_boothing',
            memberName: 'create private voice channels',
            description: 'Will create x number of private voice channels for the sponsor boothing category.',
            guildOnly: true,
            args: [
                {
                    key: 'number',
                    prompt: 'number of private channels',
                    type: 'integer',
                },
            ],
        },
        {
            roleID: PermissionCommand.FLAGS.STAFF_ROLE,
            roleMessage: 'This command can only be ran by staff!',
        });
    }


    async runCommand(botGuild, message, {number}) {

        // make sure command is only used in the boothing-wait-list channel
        if (message.channel.name != 'boothing-wait-list') {
            discordServices.replyAndDelete(message, 'This command can only be ran in the boothing-wait-list channel!');
            return;
        }
        
        // get category
        var category = await message.guild.channels.cache.get(discordServices.sponsorCategory);

        // get private channels
        var channels = category.children.filter((value, index) => {
            if (value.name.includes('Private')){
                return true;
            } else {
                return false;
            }
        });

        // number of channels
        var amount = channels.size;

        var total = amount + number;                

        // create voice channels
        for (var index = amount + 1; index <= total; index++) {
            var channel = await message.guild.channels.create('Private-' + index, {type: 'voice', parent: category});
            await channel.createOverwrite(botGuild.roleIDs.memberRole, {VIEW_CHANNEL: false, SPEAK: true, VIDEO: true, USE_VAD: true});
        }

        // report success of workshop creation
        message.reply('Sponsor boothing now has ' + total + ' voice channels.');
        
    }

};