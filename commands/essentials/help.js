// Discord.js commando requirements
const { Command, CommandoGuild } = require('discord.js-commando');
const { deleteMessage, checkForRole } = require('../../discord-services');
const { MessageEmbed } = require('discord.js');
const firebaseUtil = require('../../db/firebase/firebaseUtil');

/**
 * The help command shows all the available commands for the user via DM message.
 * @category Commands
 * @subcategory Essentials
 * @extends Command
 */
class Help extends Command {
    constructor(client) {
        super(client, {
            name: 'help',
            group: 'essentials',
            memberName: 'help user',
            description: 'Will send available commands depending on role!',
            hidden: true,
        });
    }

    /**
     * @param {Message} message
     */
    async run(message) {

        let initBotInfo = await firebaseUtil.getInitBotInfo(message.guild.id);

        /** @type {CommandoGuild} */
        let guild = message.guild;
        
        /** @type {Command[]} */
        var commands = [];

        var commandGroups;

        // if message on DM then send hacker commands
        if (message.channel.type === 'dm') {
            commandGroups = this.client.registry.findGroups('utility', true);
        } else {
            deleteMessage(message);

            if ((checkForRole(message.member, initBotInfo.roleIDs.staffRole))) {
                commandGroups = this.client.registry.groups;
            } else {
                commandGroups = this.client.registry.findGroups('utility', true);
            }
        }

        // add all the commands from the command groups
        commandGroups.forEach((value) => {
            if (guild.isGroupEnabled(value)) {
                value.commands.forEach((command, index) => {
                    if (guild.isCommandEnabled(command)) commands.push(command);
                });
            }
        });

        var length = commands.length;

        const textEmbed = new MessageEmbed()
            .setColor(initBotInfo.colors.embedColor)
            .setTitle('Commands Available for you')
            .setDescription('All other interactions with me will be via emoji reactions!')
            .setTimestamp();

        // add each command as a field in the embed
        for (var i = 0; i < length; i++) {
            let command = commands[i];
            if (command.format != null) {
                textEmbed.addField(this.client.commandPrefix + command.name, command.description + ', arguments: ' + command.format);
            } else {
                textEmbed.addField(this.client.commandPrefix + command.name, command.description + ', no arguments');
            }
        }

        message.author.send(textEmbed);
    }
}
module.exports = Help;
