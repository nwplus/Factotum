
const firebaseActivity = require('./firebase-services/firebase-services-activities');
const Discord = require('discord.js');

// Available Roles
var guestRole = '778651193362481213';
var hackerRole = '738519785028976741';
var attendeeRole = '742896999556448357';
var mentorRole = '747527454200955051';
var sponsorRole = '738519983981723748';
var staffRole = '738519363904077916';
var adminRole = '738491577596641311';
var everyoneRole = '738475671977722058';
var stamp0Role = '776690929557831680';
var stamp1Role = '776694051482107944';
var stamp2Role = '777163284679229461';
var stamp3Role = '777163346456870913';
var stamp4Role = '777163367814922250';
var stamp5Role = '777163388631253002';
var stamp6Role = '777163410269011990';
var stamp7Role = '777163427328163850';
var stamp8Role = '777163452560048168';
var stamp9Role = '777163468053938186';
var stamp10Role = '777163488019480586';
var stamp11Role = '777163506902237196';
var stamp12Role = '777163524568776704';
var stamp12Role = '777163524568776704';
var stamp13Role = '784224112909221948';
var stamp14Role = '784224898230779945';
var stamp15Role = '784224924633923635';
var stamp16Role = '784224943730327592';
var stamp17Role = '781404770803908609';
var stamp18Role = '781404769133527040';
var stamp19Role = '784224999698726942';
var stamp20Role = '784225017172590622';
module.exports.everyoneRole = everyoneRole;
module.exports.hackerRole = hackerRole;
module.exports.guestRole = guestRole;
module.exports.adminRole = adminRole;
module.exports.attendeeRole = attendeeRole;
module.exports.mentorRole = mentorRole;
module.exports.sponsorRole = sponsorRole;
module.exports.staffRole = staffRole;
module.exports.stamp0Role = stamp0Role;
module.exports.stamp1Role = stamp1Role;
module.exports.stamp2Role = stamp2Role;
module.exports.stamp3Role = stamp3Role;
module.exports.stamp4Role = stamp4Role;
module.exports.stamp5Role = stamp5Role;
module.exports.stamp6Role = stamp6Role;
module.exports.stamp7Role = stamp7Role;
module.exports.stamp8Role = stamp8Role;
module.exports.stamp9Role = stamp9Role;
module.exports.stamp10Role = stamp10Role;
module.exports.stamp11Role = stamp11Role;
module.exports.stamp12Role = stamp12Role;
module.exports.stamp13Role = stamp13Role;
module.exports.stamp14Role = stamp14Role;
module.exports.stamp15Role = stamp15Role;
module.exports.stamp16Role = stamp16Role;
module.exports.stamp17Role = stamp17Role;
module.exports.stamp18Role = stamp18Role;
module.exports.stamp19Role = stamp19Role;
module.exports.stamp20Role = stamp20Role;

/**
 * A collection of all the stamp roles.
 * @type {Discord.Collection<Number, String>} - <StampNumber, roleID>
 */
var stampRoles = new Discord.Collection();
let listOfStampRoles = [stamp0Role, stamp1Role, stamp2Role, stamp3Role, stamp4Role, stamp5Role, stamp6Role, stamp7Role, stamp8Role, stamp9Role, stamp10Role, stamp11Role,
    stamp12Role, stamp13Role, stamp14Role, stamp15Role, stamp16Role, stamp17Role, stamp18Role, stamp19Role, stamp20Role];
listOfStampRoles.forEach((value, index) => stampRoles.set(index, value));
module.exports.stampRoles = stampRoles;


var embedColor = '#26fff4';
module.exports.embedColor = embedColor;

var questionEmbedColor = '#f4ff26';
module.exports.questionEmbedColor = questionEmbedColor;

var announcementEmbedColor = '#9352d9';
module.exports.announcementEmbedColor = announcementEmbedColor;

var tfTeamEmbedColor = '#60c2e6';
module.exports.tfTeamEmbedColor = tfTeamEmbedColor;

var tfHackerEmbedColor = '#d470cd';
module.exports.tfHackerEmbedColor = tfHackerEmbedColor;

var specialDMEmbedColor = '#fc6b03';
module.exports.specialDMEmbedColor = specialDMEmbedColor;

/**
 * A list of channels where messages will get deleted after x amount of tipe
 * @type {Map<Discord.Snowflake, Number>} - <text channel snowflake, Number>
 */
const blackList = new Map();
module.exports.blackList = blackList;

var stampCollectTime = 60;
module.exports.stampCollectTime = stampCollectTime;

// Common channels

// announcement channel
var announcementChannel = '784254136040161310';
module.exports.announcementChannel = announcementChannel;

// where hackers join the wait list to talk to a sponsor
// at the moment its only one, planned to extend to multiple
var boothingWaitList = '748370272049954927';
module.exports.boothingWaitList = boothingWaitList;
// only sponsors should have access to this channel, this is
// where they accept/get the next group to talk to them
var sponsorConsoleChannel = '748397163997954108';
module.exports.sponsorConsoleChannel = sponsorConsoleChannel;
// the category where the sponsorConsole and boothingwaitlist
// channels are, used to add more private voice channels
var sponsorCategory = '738528333935018034';
module.exports.sponsorCategory = sponsorCategory;

// console where most commands are accessible, only staff
// should have access to this
var adminConsolChannel = '748955441484005488';
module.exports.adminConsoleChannel = adminConsolChannel;
// channel where the bot can log important things like verifications, 
// clear chat calls, etc
var adminLogChannel = '743197503884755045';
// channel where the bot can ping members with DM off
var botSupportChannel = '784910416224583751';

// channel where guests will use the !verify command,
// usualy the welcome channel
var welcomeChannel = '773401606120800257';
module.exports.welcomeChannel = welcomeChannel;
var welcomeSupport = '742896827082211419';
module.exports.welcomeSupport = welcomeSupport;

// where hackers can emoji to let the bot know if they are looking
// for a team or a hacker(s)
var teamformationChannel = '770354140961570857';
module.exports.teamformationChannel = teamformationChannel;
// channel where team bios are posted, hackers shouldn't be able to post
var recruitingChannel = '770354487595499592';
module.exports.recruitingChannel = recruitingChannel;
// channel where hacker bios are posted, hackers shouldn't be able to post
var lookingforteamChannel = '770354521733857320';
module.exports.lookingforteamChannel = lookingforteamChannel;

/**
 * The team roulette channel.
 * @type {String} - channel snowflake
 */
var teamRouletteChannel = '794727255166681118';
module.exports.teamRouletteChannel = teamRouletteChannel;

// where hackers and other users can call the !createchannel command
// to create new private channels for them and their team
var channelcreationChannel = '754396445494214789';
module.exports.channelcreationChannel = channelcreationChannel;

// where the bot will send reports to
// should be a admin or mod only channel
var incomingReportChannel = '782683901998137355';
module.exports.incomingReportChannel = incomingReportChannel;


// naming conventions

var activityTextChannelName = 'activity-banter';
module.exports.activityTextChannelName = activityTextChannelName;

var activityVoiceChannelName = 'activity-room';
module.exports.activityVoiceChannelName = activityVoiceChannelName;


// helper function

// Checks if the memeber has a role, returns true if it does
function checkForRole(member, role) {
    return member.roles.cache.has(role);
}
module.exports.checkForRole = checkForRole;

/**
 * Send a Direct meesage to a member, option to delete after 10 seconds
 * @param {Discord.User | Discord.GuildMember} member - the user or member to send a DM to
 * @param {String | Discord.MessageEmbed} message - the message to send
 * @param {Boolean} isDelete - weather to delete message after 10 seconds
 * @async
 * @return {Discord.Message}
 */
async function sendMessageToMember(member, message, isDelete = false) {
    return await member.send(message).then(msg => {
        if (isDelete === true) {
            msg.delete({timeout: 60000})
        }
        return msg;
    }).catch(error => {
        if (error.code === 50007) {
            member.guild.channels.resolve(botSupportChannel).send('<@' + member.id + '> I couldn\'t reach you :(. Please turn on server DMs, explained in this link: https://support.discord.com/hc/en-us/articles/217916488-Blocking-Privacy-Settings-');
        } else {
            throw error;
        }
    });
    
}
module.exports.sendMessageToMember = sendMessageToMember;

/**
 * @typedef EmbedOptions
 * @property {String} title - embed title
 * @property {String} description - embed description
 * @property {String} color - embed color
 */

/**
 * 
 * @param {Discord.User | Discord.GuildMember} member - member to send embed to
 * @param {EmbedOptions} embedOptions - embed infomration
 * @param {Boolean} isDelete - should the message be deleted after some time?
 * @async
 * @returns {Discord.Message}
 */
async function sendEmbedToMember(member, embedOptions, isDelete = false) {
    // check embedOptions
    if (embedOptions?.title === undefined) throw new Error('A title is needed for the embed!');
    if (embedOptions?.description === undefined) throw new Error('A description is needed for the embed!');
    if (embedOptions?.color === undefined) embedOptions.color === '#ff0000';

    let embed = new Discord.MessageEmbed().setColor(embedOptions.color)
                        .setTitle(embedOptions.title)
                        .setDescription(embedOptions.description)
                        .setTimestamp();

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
 * @param {String | Discord.Role} removeRole - the role to add to the member
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

// Replaces one role for the other
function replaceRoleToMember(member, removeRole, addRole) {
    addRoleToMember(member, addRole);
    removeRolToMember(member, removeRole);
}
module.exports.replaceRoleToMember = replaceRoleToMember;

// Log a message on the log channel
function discordLog(guild, message) {
    guild.channels.cache.get(adminLogChannel).send(message);
}
module.exports.discordLog = discordLog;

// reply to message and delete 5 seconds later
async function replyAndDelete(message, reply) {
    var msg = await message.reply(reply);
    msg.delete({timeout: 5000});
}
module.exports.replyAndDelete = replyAndDelete;

// true if channel is admin console channel
function isAdminConsole(channel) {
    return channel.id === adminConsolChannel;
}
module.exports.isAdminConsole = isAdminConsole;

// will add given number of voice channels to the given activity, the category object of the activity is necessary
async function addVoiceChannelsToActivity(activityName, number, category, channelManager, isPrivate, maxUsers = 0) {
    // udpate db and get total number of channels
    var total = await firebaseActivity.addVoiceChannels(activityName, number);

    // grab index where channel naming should stampt, in case there are already channels made
    var index = total - number;

    // create voice channels
    for (; index < total; index++) {
        channelManager.create('🔊Room' + '-' + index, {
            type: 'voice', 
            parent: category, 
            userLimit: maxUsers === 0 ? undefined : maxUsers
        }).then(channel => {
            channel.updateOverwrite(attendeeRole, {VIEW_CHANNEL: isPrivate ? false : true, USE_VAD: true, SPEAK: true});
            channel.updateOverwrite(sponsorRole, {VIEW_CHANNEL: isPrivate ? false : true, USE_VAD: true, SPEAK: true});
            channel.updateOverwrite(mentorRole, {MOVE_MEMBERS: true, USE_VAD: true});
        }).catch(console.error);
    }

    return total;
}
module.exports.addVoiceChannelsToActivity = addVoiceChannelsToActivity;

// will remove given number of voice channels from the activity
// returns the final number of channels in the activity
async function removeVoiceChannelsToActivity(activityName, number, category){
    // udpate db and get total number of channels
    var total = await firebaseActivity.removeVoiceChannels(activityName, number);

    // grab the final number of channels there should be, no less than 0
    var final = total - number;
    if (final < 0) {
        final = 0;
    }

    // grab index where channel naming should stampt, in case there are already channels made
    // we remove one because we are counting from 0
    // remove voice channels
    for (var index = total - 1; index >= final; index--) {
        var channelName = '🔊Room' + '-' + index;
        var channel = await category.children.find(channel => channel.name.endsWith(channelName));
        if (channel != undefined) {
            deleteChannel(channel);
        }
    }

    return final;
}
module.exports.removeVoiceChannelsToActivity = removeVoiceChannelsToActivity;

// will make all voice channels except the general one private to attendees and sponsors
async function changeVoiceChannelPermissions(activityName, category, toHide) {
    // udpate db and get total number of channels
    var total = await firebaseActivity.numOfVoiceChannels(activityName);

    // grab index where channel naming should stampt, in case there are already channels made
    // we remove one because we are counting from 0
    // remove voice channels
    for (var index = total - 1; index >= 0; index--) {
        var channelName = 'Room' + '-' + index;
        var channel = await category.children.find(channel => channel.name.endsWith(channelName));
        if (channel != undefined) {
            channel.updateOverwrite(attendeeRole, {VIEW_CHANNEL: toHide ? false : true});
            channel.updateOverwrite(sponsorRole, {VIEW_CHANNEL: toHide ? false : true});
        }
    }
}
module.exports.changeVoiceChannelPermissions = changeVoiceChannelPermissions;

// will add a max amount of users to the activity voice channels
async function addLimitToVoiceChannels(activityName, category, limit) {
    // udpate db and get total number of channels
    var total = await firebaseActivity.numOfVoiceChannels(activityName);

    // grab index where channel naming should stampt, in case there are already channels made
    // we remove one because we are counting from 0
    // remove voice channels
    for (var index = total - 1; index >= 0; index--) {
        var channelName = '🔊Room' + '-' + index;
        var channel = await category.children.find(channel => channel.name.endsWith(channelName));
        if (channel != undefined) {
            await channel.edit({userLimit: limit});
        }
    }
}
module.exports.addLimitToVoiceChannels = addLimitToVoiceChannels;

/**
 * Deletes a message if the message hasn't been deleted already
 * @param {Discord.Message} message - the message to delete
 * @param {Number} timeout - the time to wait in milliseconds
 */
function deleteMessage(message, timeout = 0) {
    if (!message.deleted && message.deletable) {
        message.delete({timeout: timeout});
    }
}
module.exports.deleteMessage = deleteMessage;

async function deleteChannel(channel) {
    if (!channel.deleted) {
        await channel.delete().catch(console.error);
    }
}
module.exports.deleteChannel = deleteChannel;