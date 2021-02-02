// Discord.js commando requirements
const PermissionCommand = require('../../classes/permission-command');
const firebaseServices = require('../../firebase-services/firebase-services');
const discordServices = require('../../discord-services');
const Discord = require('discord.js');

// Command export
module.exports = class Verification extends PermissionCommand {
    constructor(client) {
        super(client, {
            name: 'verify',
            group: 'verification',
            memberName: 'hacker verification',
            description: 'Will verify a guest to its correct role if their email is in our database.',
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
            dmOnly: true,
        });
    }

    /**
     * 
     * @param {Discord.Message} message 
     * @param {String} email 
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

        let guild = message.channel.client.guilds.cache.first();
        let member = guild.member(message.author.id);

        // check if the user needs to verify, else warn and return
        if (!discordServices.checkForRole(member, discordServices.roleIDs.guestRole)) {
            discordServices.sendEmbedToMember(member, {
                title: 'Verify Error',
                description: 'You do not need to verify, you are already more than a guest!'
            }, true);
            return;
        }

        // Call the verify function to get status
        var status = await firebaseServices.verify(email, message.author.id);

        // embed to send
        const embed = new Discord.MessageEmbed()
            .setTitle('Verification Process')
            .setColor(discordServices.colors.specialDMEmbedColor);
    
        switch(status) {
            case firebaseServices.status.HACKER_SUCCESS:
                embed.addField('You Have Been Verified!', 'Thank you for verifying your status with us, you now have access to most of the server.')
                    .addField('Don\'t Forget!', 'Remember you need to !attend <your email> in the attend channel that will open a few hours before the hackathon begins.');
                discordServices.replaceRoleToMember(member, discordServices.roleIDs.guestRole, discordServices.roleIDs.hackerRole);
                discordServices.addRoleToMember(member,discordServices.stampRoles.get(0));
                discordServices.discordLog(guild, "VERIFY SUCCESS : <@" + message.author.id + "> Verified email: " + email + " successfully and they are now a hacker!");
                break;
            case firebaseServices.status.SPONSOR_SUCCESS:
                embed.addField('You Have Been Verified!', 'Hi there sponsor, thank you very much for being part of nwhacks 2021 and for joining our discord!');
                discordServices.replaceRoleToMember(member, discordServices.roleIDs.guestRole, discordServices.roleIDs.sponsorRole);
                discordServices.discordLog(guild, "VERIFY SUCCESS : <@" + message.author.id + "> Verified email: " + email + " successfully and they are now a sponsor!");
                break;
            case firebaseServices.status.MENTOR_SUCCESS:
                embed.addField('You Have Been Verified!', 'Hi there mentor, thank you very much for being part of nwhacks 2021 and for joining our discord!');
                discordServices.replaceRoleToMember(member, discordServices.roleIDs.guestRole, discordServices.roleIDs.mentorRole);
                discordServices.discordLog(guild, "VERIFY SUCCESS : <@" + message.author.id + "> Verified email: " + email + " successfully and he is now a mentor!");
                break;
            case firebaseServices.status.STAFF_SUCCESS:
                embed.addField('Welcome To Your Server!', 'Welcome to your discord server! If you need to know more about what I can do please call !help.');
                discordServices.replaceRoleToMember(member, discordServices.roleIDs.guestRole, discordServices.roleIDs.staffRole);
                discordServices.discordLog(guild, "VERIFY SUCCESS : <@" + message.author.id + "> Verified email: " + email + " successfully and he is now a staff!");
                break;
            case firebaseServices.status.FAILURE:
                embed.addField('ERROR 404', 'Hi there, the email you tried to verify yourself with is not' +
                ' in our system, please make sure your email is well typed. If you think this is an error' +
                ' please contact us in the welcome-support channel.')
                    .setColor('#fc1403');
                discordServices.discordLog(guild, 'VERIFY ERROR : <@' + message.author.id + '> Tried to verify email: ' + email + ' and failed! I couldn\'t find that email!');
                break;
            default:
                embed.addField('ERROR 401', 'Hi there, it seems the email you tried to verify with is already in use or you were not accepted! Please make ' +
                    'sure that you have the correct email. If you think this is an error please contact us in the welcome-support channel.')
                    .setColor('#fc1403');
                    discordServices.discordLog(guild, 'VERIFY WARNING : <@' + message.author.id + '> Tried to verify email: ' + email + ' and failed! He already verified or was not accepted!');
                break;
        }
        discordServices.sendMessageToMember(member, embed);
    }

};