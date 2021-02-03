// Discord.js commando requirements
const PermissionCommand = require('../../classes/permission-command');
const firebaseServices = require('../../firebase-services/firebase-services');
const Discord = require('discord.js');
const discordServices = require('../../discord-services');

// Command export
module.exports = class Attendance extends PermissionCommand {
    constructor(client) {
        super(client, {
            name: 'attend',
            group: 'verification',
            memberName: 'hacker attendance',
            description: 'Will mark a hacker as attending and upgrade role to Attendee. Can only be called once!',
            args: [
                {
                    key: 'email',
                    prompt: 'Please provide your email address',
                    type: 'string',
                    default: '',
                },
                
            ],
        },
        {
            dmOnly: true
        });
    }

    /**
     * 
     * @param {Discord.Message} message 
     * @param {String} param1 
     */
    async runCommand(message, { email }) {
        // make email lowercase
        email = email.toLowerCase();

        // regex to validate email
        const re = /^(([^<>()[\]\.,;:\s@\"]+(\.[^<>()[\]\.,;:\s@\"]+)*)|(\".+\"))@(([^<>()[\]\.,;:\s@\"]+\.)+[^<>()[\]\.,;:\s@\"]{2,})$/i;

        // let user know he has used the command incorrectly and exit
        if (email === '' || !re.test(email)) {
            discordServices.sendMessageToMember(message.author, 'You have used the verify command incorrectly! \nPlease write a valid email after the command like this: !verify email@gmail.com');
            return;
        }

        // check if the user needs to attend, else warn and return
        if (discordServices.checkForRole(member, discordServices.roleIDs.attendeeRole)) {
            discordServices.sendEmbedToMember(member, {
                title: 'Attend Error',
                description: 'You do not need to attend! Happy hacking!!!'
            }, true);
            return;
        }

        let guild = message.channel.client.guilds.cache.first();
        let member = guild.member(message.author.id);
        
        // call the firebase services attendhacker function
        var status = await firebaseServices.attendHacker(email);

        // embed to use
        const embed = new Discord.MessageEmbed()
            .setColor(discordServices.colors.specialDMEmbedColor)
            .setTitle('Attendance Process');

        // Check the returned status and act accordingly!
        switch(status) {
            case firebaseServices.status.HACKER_SUCCESS:
                embed.addField('Thank you for attending nwHacks 2021', 'Happy hacking!!!');
                discordServices.addRoleToMember(member, discordServices.roleIDs.attendeeRole);
                discordServices.discordLog(guild, "ATTEND SUCCESS : <@" + message.author.id + "> with email: " + email + " is attending nwHacks 2021!");
                break;
            case firebaseServices.status.HACKER_IN_USE:
                embed.addField('Hi there, this email is already marked as attending', 'Have a great day!')
                break;
            case firebaseServices.status.FAILURE:
                embed.addField('ERROR 401', 'Hi there, the email you tried to attend with is not' +
                    ' in our system, please make sure your email is well typed. If you think this is an error' +
                    ' please contact us in the support channel.')
                    .setColor('#fc1403');
                discordServices.discordLog(guild, "ATTEND ERROR : <@" + message.author.id + "> with email: " + email + " tried to attend but I did not find his email!");
                break;
        }
        discordServices.sendMessageToMember(member, embed);
    }

};