// Discord.js commando requirements
const PermissionCommand = require('../../classes/permission-command');
const firebaseServices = require('../../firebase-services/firebase-services');
const Discord = require('discord.js');
const discordServices = require('../../discord-services');
const Verification = require('../../classes/verification');
const BotGuildModel = require('../../classes/bot-guild');

// Command export
module.exports = class Attend extends PermissionCommand {
    constructor(client) {
        super(client, {
            name: 'attend',
            group: 'verification',
            memberName: 'hacker attendance',
            description: 'Will mark a hacker as attending and upgrade role to Attendee. Can only be called once!',
            args: [
                {
                    key: 'guildId',
                    prompt: 'Please provide the server ID, ask admins for it!',
                    type: 'integer',
                },
            ],
        },
        {
            dmOnly: true
        });
    }

    /**
     * Attends a member.
     * @param {BotGuildModel} botGuild
     * @param {Discord.Message} message 
     * @param {String} guildId 
     */
    async runCommand(botGuild, message, { guildId }) {
        // check if the user needs to attend, else warn and return
        if (discordServices.checkForRole(message.author, botGuild.attendance.attendeeRoleID)) {
            discordServices.sendEmbedToMember(message.author, {
                title: 'Attend Error',
                description: 'You do not need to attend! Happy hacking!!!'
            }, true);
            return;
        }

        let guild = this.client.guilds.cache.get(guildId);
        if (!guild) {
            discordServices.sendEmbedToMember(message.author, {
                title: 'Attendance Failure',
                description: 'The given server ID is not valid. Please try again!',
            });
            return;
        }
        let member = guild.member(message.author.id);
        
        // call the firebase services attendHacker function
        Verification.attend(member, botGuild);
    }

};