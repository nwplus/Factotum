const { GuildMember, Guild } = require('discord.js');
const discordServices = require('../discord-services');
const firebaseServices = require('../firebase-services/firebase-services');

/**
 * @class Verification
 */
class Verification {

    /**
     * Verifies a guild member into a guild.
     * @param {GuildMember} member - member to verify
     * @param {String} email - email to verify with
     * @param {Guild} guild
     * @async
     * @static
     */
    static async verify(member, email, guild) {
        // make email lowercase
        email = email.toLowerCase();

        // regex to validate email
        const re = /^(([^<>()[\]\.,;:\s@\"]+(\.[^<>()[\]\.,;:\s@\"]+)*)|(\".+\"))@(([^<>()[\]\.,;:\s@\"]+\.)+[^<>()[\]\.,;:\s@\"]{2,})$/i;

        // let user know he has used the command incorrectly and exit
        if (email === '' || !re.test(email)) {
            discordServices.sendMessageToMember(member, 'The email you sent me is not valid, please try again!', true);
            return;
        }

        // try to get member types, error will mean no email was found
        try {
            var types = await firebaseServices.verify(email, member.id);
        } catch (error) {
            discordServices.sendEmbedToMember(member, {
                title: 'Verification Failure',
                description: 'The email provided was not found! If you need assistance ask an admin for help!',
            });
            discordServices.discordLog(guild, `VERIFY FAILURE : <@${member.id}> Verified email: ${email} but was a failure, I could not find that email!`);
            return;
        }

        // check for types, if no types it means they are already verified with those types
        if (types.length === 0) {
            discordServices.sendEmbedToMember(member, {
                title: 'Verification Warning',
                description: 'We found your email, but you are already verified! If this is not the case let an admin know!',
                color: '#fc1403',
            });
            discordServices.discordLog(guild, `VERIFY WARNING : <@${member.id}> Verified email: ${email} but he was already verified for all types!`);
            return;
        }

        let correctTypes = [];
        
        // check for correct types with botGuild verification info and give the roles
        types.forEach((type, index, array) => {
            if (discordServices.verificationRoles.has(type)) {
                discordServices.addRoleToMember(member, discordServices.verificationRoles.get(type));
                correctTypes.push(type);
            }
        });

        // extra check to see if types were found, give stamp role if available and let user know of success
        if (correctTypes.length > 0) {
            discordServices.replaceRoleToMember(member, discordServices.roleIDs.guestRole, discordServices.roleIDs.memberRole);
            if (discordServices.stampRoles.has(0)) discordServices.addRoleToMember(member, discordServices.stampRoles.get(0));
            discordServices.sendEmbedToMember(member, {
                title: 'cmd-f 2021 Verification Success',
                description: `You have been verified as a ${correctTypes.join()}, good luck and have fun!`,
                color: discordServices.colors.specialDMEmbedColor,
            });
            discordServices.discordLog(guild, `VERIFY SUCCESS : <@${member.id}> Verified email: ${email} successfully as ${correctTypes.join()}`);
        } else {
            discordServices.sendEmbedToMember(member, {
                title: 'Verification Error',
                description: 'There has been an error, contact an admin ASAP!',
                color: '#fc1403',
            });
            discordServices.discordLog(guild, `VERIFY ERROR : <@${member.id}> Verified email: ${email} had types available, but I could not find them on the botGuild!`);
        }
    }


    /**
     * Will attend the user and give it the attendee role.
     * @param {GuildMember} member 
     */
    static async attend(member) {
        try {
            // wait for attend to end, then give role
            await firebaseServices.attend(member.id);
            discordServices.addRoleToMember(member, discordServices.roleIDs.attendeeRole);
            discordServices.sendEmbedToMember(member, {
                title: 'Attendance Success',
                description: 'You have been marked as attending, thank you and good luck!',
                color: discordServices.colors.specialDMEmbedColor,
            });
            discordServices.discordLog(member.guild, `ATTEND SUCCESS : <@${member.id}> has been marked as attending!`);
        } catch (error) {
            // email was not found, let admins know!
            discordServices.discordLog(member.guild, `ATTEND WARNING : <@${member.id}> tried to attend but I could not find his discord ID! He might be an impostor!!!`);
        }
    }

}
module.exports = Verification;