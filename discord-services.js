const Discord = require('discord.js');

// Available Roles

/**
 * All the available roles from server creation.
 */
module.exports.roleIDs = {
    guestRole : null,
    hackerRole : null,
    attendeeRole : null,
    mentorRole : null,
    sponsorRole : null,
    staffRole : null,
    adminRole : null,
    everyoneRole : null,
    memberRole: null,
}

/**
 * A collection of all the stamp roles.
 * @type {Discord.Collection<Number, String>} - <StampNumber, roleID>
 */
var stampRoles = new Discord.Collection();
module.exports.stampRoles = stampRoles;

/**
 * All the custom colors available to the bot.
 * @type {Object}
 */
module.exports.colors = {
    embedColor : '#26fff4',
    questionEmbedColor : '#f4ff26',
    announcementEmbedColor : '#9352d9',
    specialDMEmbedColor : '#fc6b03',
}

/**
 * A list of channels where messages will get deleted after x amount of time
 * @type {Map<Discord.Snowflake, Number>} - <text channel snowflake, Number>
 */
const blackList = new Map();
module.exports.blackList = blackList;

/**
 * The time given to users to send password to the stamp collector
 * @type {Number}
 */
var stampCollectTime = 60;
module.exports.stampCollectTime = stampCollectTime;

// Common channels

const channelIDs = {

    /**
     * The admin console where admins can run commands.
     * @type {String}
     */
    adminConsoleChannel : null,
  
    /**
     * The channel where the bot will log things.
     * @type {String}
     */
    adminLogChannel : null,

    /**
     * Where the bot can send messages to users when DM is not available.
     * @type {String}
     */
    botSupportChannel : null,

    /**
     * Where the bot will send reports.
     * @type {String}
     */
    incomingReportChannel : null,

    /**
     * The first channel users have access to, where the verify command is used.
     * @type {String}
     */
    welcomeChannel : null,

    /**
     * Support channel available to new users.
     * @type {String}
     */
    welcomeSupport : null,
}
module.exports.channelIDs = channelIDs;


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
    }).catch(error => {
        if (error.code === 50007) {
            member.guild.channels.resolve(this.channelIDs.botSupportChannel).send('<@' + member.id + '> I couldn\'t reach you :(. Please turn on server DMs, explained in this link: https://support.discord.com/hc/en-us/articles/217916488-Blocking-Privacy-Settings-');
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
        // try one more time
        member.roles.add(addRole).catch(error => {
            // now send error to admins
            discordLog(member.guild, '@everyone The member <@' + member.user.id + '> did not get the role ' + member.guild.roles.cache.get(addRole) +' please help me!');
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
            discordLog(member.guild, '@everyone The member <@' + member.user.id + '> did not loose the role ' + member.guild.roles.cache.get(removeRole) + ', please help me!');
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
 */
function discordLog(guild, message) {
    //if (channelIDs?.adminLogChannel) guild.channels.cache.get(channelIDs.adminLogChannel).send(message);
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
 * True if channel is admin console channel
 * @param {Discord.Channel} channel - channel to check
 * @returns {Boolean}
 */
function isAdminConsole(channel) {
    return channel.id === this.channelIDs.adminConsoleChannel;
}
module.exports.isAdminConsole = isAdminConsole;

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