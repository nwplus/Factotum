const { GuildMember, Guild } = require('discord.js');
const discordServices = require('../discord-services');
const firebaseServices = require('../db/firebase/firebase-services');
const BotGuildModel = require('./bot-guild');
const winston = require('winston');

/**
 * @class Verification
 */
class Verification {

    /**
     * Verifies a guild member into a guild.
     * @param {GuildMember} member - member to verify
     * @param {String} email - email to verify with
     * @param {Guild} guild
     * @param {BotGuildModel} botGuild
     * @async
     * @static
     * @throws Error if email is not valid!
     */
    static async verify(member, email, guild, botGuild) {
        if (!discordServices.validateEmail(email)) {
            throw new Error('Email is not valid!!');
        }

        let logger = winston.loggers.get(guild.id);

        // try to get member types, error will mean no email was found
        try {
            var types = await firebaseServices.verify(email, member.id, member.guild.id);
        } catch (error) {
            logger.warning(`The email provided (${email}) by user ${member.id} was not found, got an error: ${error}`, { event: 'Verification' });
            discordServices.sendEmbedToMember(member, {
                title: 'Verification Failure',
                description: 'The email provided was not found! If you need assistance ask an admin for help!',
            });
            discordServices.discordLog(guild, `VERIFY FAILURE : <@${member.id}> Verified email: ${email} but was a failure, I could not find that email!`);
            return;
        }

        // check for types, if no types it means they are already verified with those types
        if (types.length === 0) {
            logger.warning(`An email was found but the user ${member.id} is already set as verified. Email used: ${email}`, { event: 'Verification' });
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
            if (botGuild.verification.verificationRoles.has(type)) {
                let roleId = botGuild.verification.verificationRoles.get(type);
                logger.verbose(`User ${member.id} has type ${type} in list index ${index} and it was found, he got the role ${roleId}`, { event: 'Verification' });
                discordServices.addRoleToMember(member, roleId);
                correctTypes.push(type);
            } else {
                logger.error(`User ${member.id} has type ${type} in list index ${index} and it was not found in the botGuild verification roles map.`, { event: 'Verification' });
            }

        });

        // extra check to see if types were found, give stamp role if available and let user know of success
        if (correctTypes.length > 0) {
            discordServices.replaceRoleToMember(member, botGuild.verification.guestRoleID, botGuild.roleIDs.memberRole);
            if (botGuild.stamps.isEnabled) discordServices.addRoleToMember(member, botGuild.stamps.stamp0thRoleId);
            discordServices.sendEmbedToMember(member, {
                title: `${guild.name} Verification Success`,
                description: `You have been verified as a ${correctTypes.join()}, good luck and have fun!`,
                color: botGuild.colors.specialDMEmbedColor,
            });
            discordServices.discordLog(guild, `VERIFY SUCCESS : <@${member.id}> Verified email: ${email} successfully as ${correctTypes.join()}.`);
            logger.event(`User ${member.id} was verified with email ${email} successfully as ${correctTypes.join()}.`, { event: 'Verification' });
        } else {
            discordServices.sendEmbedToMember(member, {
                title: 'Verification Error',
                description: 'There has been an error, contact an admin ASAP!',
                color: '#fc1403',
            });
            discordServices.discordLog(guild, `VERIFY ERROR : <@${member.id}> Verified email: ${email} had types available, but I could not find them on the botGuild!`);
            logger.error(`User ${member.id} Verified email: ${email} had types available, but I could not find them on the botGuild!`, { event: 'Verification' });
        }
    }


    /**
     * Will attend the user and give it the attendee role.
     * @param {GuildMember} member 
     * @param {BotGuildModel} botGuild
     */
    static async attend(member, botGuild) {
        try {
            // wait for attend to end, then give role
            await firebaseServices.attend(member.id, member.guild.id);
            discordServices.addRoleToMember(member, botGuild.attendance.attendeeRoleID);
            discordServices.sendEmbedToMember(member, {
                title: 'Attendance Success',
                description: 'You have been marked as attending, thank you and good luck!',
                color: botGuild.colors.specialDMEmbedColor,
            });
            discordServices.discordLog(member.guild, `ATTEND SUCCESS : <@${member.id}> has been marked as attending!`);
            winston.loggers.get(botGuild._id).event(`User ${member.id} was marked as attending!`, { event: 'Verification' });
        } catch (error) {
            // email was not found, let admins know!
            discordServices.discordLog(member.guild, `ATTEND WARNING : <@${member.id}> tried to attend but I could not find his discord ID! He might be an impostor!!!`);
            winston.loggers.get(botGuild._id).warning(`User ${member.id} could not be marked as attending, I could not find his discord ID, he could be an impostor! Got the error: ${error}`, { event: 'Verification' });
        }
    }

}
module.exports = Verification;