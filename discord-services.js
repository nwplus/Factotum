const Discord = require('discord.js');
const BotGuild = require('./db/mongo/BotGuild');

// where hackers join the wait list to talk to a sponsor
// at the moment its only one, planned to extend to multiple
var boothingWaitList = '748370272049954927';
module.exports.boothingWaitList = boothingWaitList;
// only sponsors should have access to this channel, this is
// where they accept/get the next group to talk to them
var sponsorConsoleChannel = '748397163997954108';
module.exports.sponsorConsoleChannel = sponsorConsoleChannel;
// the category where the sponsorConsole and boothingWaitlist
// channels are, used to add more private voice channels
var sponsorCategory = '738528333935018034';
module.exports.sponsorCategory = sponsorCategory;

/**
 * Checks if the member has a role, returns true if it does
 * @param {Discord.GuildMember} member - member to check role
 * @param {Discord.Snowflake} role - role ID to check for
 */
function checkForRole(member, role) {
    return member.roles.cache.has(role);
}
module.exports.checkForRole = checkForRole;

/**
 * Will send a message to a text channel and ping the user, can be deleted after a timeout.
 * @param {Discord.TextChannel} channel - the channel to send the message to
 * @param {Discord.Snowflake} userId - the user to tag on the message
 * @param {String} message - the message to send
 * @param {Number} timeout - timeout before delete if any, in seconds
 * @async
 * @returns {Promise<Discord.Message>}
 */
async function sendMsgToChannel(channel, userId, message, timeout = 0) {
    let msg = await channel.send('<@' + userId + '> ' + message);

    if (timeout) msg.delete({timeout: timeout * 1000}); // convert to milliseconds

    return msg;
}
module.exports.sendMsgToChannel = sendMsgToChannel;

/**
 * Send a Direct message to a member, option to delete after 10 seconds
 * @param {Discord.User | Discord.GuildMember} member - the user or member to send a DM to
 * @param {String | Discord.MessageEmbed} message - the message to send
 * @param {Boolean} isDelete - weather to delete message after 10 seconds
 * @async
 * @return {Promise<Discord.Message>}
 */
async function sendMessageToMember(member, message, isDelete = false) {
    return await member.send(message).then(msg => {
        if (isDelete === true) {
            msg.delete({timeout: 60000})
        }
        return msg;
    }).catch(async error => {
        if (error.code === 50007) {
            let botGuild;
            if (member?.guild) botGuild = await BotGuild.findById(member.guild.id);
            else throw Error(`I could not help ${member.id} due to not finding the guild he is trying to access. I need a member and not a user!`);

            member.guild.channels.resolve(botGuild.channelIDs.botSupportChannel).send('<@' + member.id + '> I couldn\'t reach you :(. Please turn on server DMs, explained in this link: https://support.discord.com/hc/en-us/articles/217916488-Blocking-Privacy-Settings-');
        } else {
            throw error;
        }
    });
    
}
module.exports.sendMessageToMember = sendMessageToMember;


/**
 * @typedef FieldInfo
 * @property {String} title - field title
 * @property {String} description - field description
 */

/**
 * @typedef EmbedOptions
 * @property {String} title - embed title
 * @property {String} description - embed description
 * @property {String} color - embed color
 * @property {Array<FieldInfo>} fields - embed fields
 */

/**
 * Sends an embed to a user via DM. Title and description are required, color and fields are optional.
 * @param {Discord.User | Discord.GuildMember} member - member to send embed to
 * @param {EmbedOptions} embedOptions - embed information
 * @param {Boolean} isDelete - should the message be deleted after some time?
 * @async
 * @returns {Promise<Discord.Message>}
 */
async function sendEmbedToMember(member, embedOptions, isDelete = false) {
    // check embedOptions
    if (embedOptions?.title === undefined || embedOptions?.title === '') throw new Error('A title is needed for the embed!');
    if (embedOptions?.description === undefined || embedOptions?.description === '') throw new Error('A description is needed for the embed!');
    if (embedOptions?.color === undefined || embedOptions?.color === '') embedOptions.color === '#ff0000';

    let embed = new Discord.MessageEmbed().setColor(embedOptions.color)
                        .setTitle(embedOptions.title)
                        .setDescription(embedOptions.description)
                        .setTimestamp();

    if (embedOptions?.fields) embedOptions.fields.forEach((fieldInfo, index) => embed.addField(fieldInfo.title, fieldInfo.description));

    return sendMessageToMember(member, embed, isDelete);
}
module.exports.sendEmbedToMember = sendEmbedToMember;

/**
 * Add a role to a member
 * @param {Discord.GuildMember} member - the guild member to give a role to
 * @param {Discord.RoleResolvable} addRole - the role to add to the member
 */
function addRoleToMember(member, addRole) {
    member.roles.add(addRole).catch(error => {
        console.log(error);
        // try one more time
        member.roles.add(addRole).catch(error => {
            // now send error to admins
            discordLog(member.guild, '@everyone The member <@' + member.user.id + '> did not get the role <@&' + member.guild.roles.cache.get(addRole).id +'> please help me!');
        });
    });
}
module.exports.addRoleToMember = addRoleToMember;

/**
 * Remove a role to a member
 * @param {Discord.GuildMember} member - the guild member to give a role to
 * @param {Discord.RoleResolvable} removeRole - the role to add to the member
 */
function removeRolToMember(member, removeRole) {
    member.roles.remove(removeRole).catch(error => {
        // try one more time
        member.roles.remove(removeRole).catch(error => {
            // now send error to admins
            discordLog(member.guild, '@everyone The member <@' + member.user.id + '> did not loose the role ' + member.guild.roles.cache.get(removeRole).id + ', please help me!');
        });
    });
}
module.exports.removeRolToMember = removeRolToMember;

/**
 * Replaces one role for the other
 * @param {Discord.GuildMember} member - member to change roles to
 * @param {Discord.RoleResolvable} removeRole - role to remove
 * @param {Discord.RoleResolvable} addRole - role to add
 */
function replaceRoleToMember(member, removeRole, addRole) {
    addRoleToMember(member, addRole);
    removeRolToMember(member, removeRole);
}
module.exports.replaceRoleToMember = replaceRoleToMember;

/**
 * Log a message on the log channel
 * @param {Discord.Guild} guild - the guild being used
 * @param {String | Discord.MessageEmbed} message - message to send to the log channel
 * @async
 */
async function discordLog(guild, message) {
    let botGuild = await BotGuild.findById(guild.id);
    if (botGuild.channelIDs.adminLog) guild.channels.cache.get(botGuild.channelIDs.adminLog).send(message);
}
module.exports.discordLog = discordLog;

/**
 * Reply to message and delete 5 seconds later
 * @param {Discord.Message} message - the message to reply to
 * @param {String} reply - the string to reply
 */
async function replyAndDelete(message, reply) {
    var msg = await message.reply(reply);
    msg.delete({timeout: 5000});
}
module.exports.replyAndDelete = replyAndDelete;

/**
 * Deletes a message if the message hasn't been deleted already
 * @param {Discord.Message} message - the message to delete
 * @param {Number} timeout - the time to wait in milliseconds
 */
function deleteMessage(message, timeout = 0) {
    if (!message.deleted && message.deletable &&  message.channel.type != 'dm') {
        message.delete({timeout: timeout});
    } else if (message.channel.type === 'dm' && message.author.bot) {
        message.delete({timeout: timeout})
    }
}
module.exports.deleteMessage = deleteMessage;

/**
 * Delete the given channel if it is not deleted already
 * @param {Discord.Channel} channel 
 */
async function deleteChannel(channel) {
    if (!channel.deleted) {
        await channel.delete().catch(console.error);
    }
}
module.exports.deleteChannel = deleteChannel;

/**
 * Returns a random color as a hex string.
 * @returns {String} - hex color
 */
function randomColor() {
    return Math.floor(Math.random()*16777215).toString(16);
}
module.exports.randomColor = randomColor;

/**
 * Validates an email using a reg exp.
 * @param {String} email - the email to validate
 * @returns {Boolean} true if valid email, false otherwise
 */
function validateEmail(email) {
    // make email lowercase
    email = email.toLowerCase();

    // regex to validate email
    const re = /^(([^<>()[\]\.,;:\s@\"]+(\.[^<>()[\]\.,;:\s@\"]+)*)|(\".+\"))@(([^<>()[\]\.,;:\s@\"]+\.)+[^<>()[\]\.,;:\s@\"]{2,})$/i;

    // let user know he has used the command incorrectly and exit
    if (email === '' || !re.test(email)) {
        return false;
    } else {
        return true;
    }
}
module.exports.validateEmail = validateEmail;