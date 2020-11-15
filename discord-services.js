
const { Command } = require('discord.js-commando');
const firebaseActivity = require('./firebase-services/firebase-services-activities');

// Available Roles
var guestRole = '742896900419747961';
var hackerRole = '738519785028976741';
var attendeeRole = '742896999556448357';
var mentorRole = '747527454200955051';
var sponsorRole = '738519983981723748';
var staffRole = '738519363904077916';
var adminRole = '738491577596641311';
var everyoneRole = '738475671977722058';
var rookie0Role = '776690929557831680';
var rookie1Role = '776694051482107944';
var star2Role = '777163284679229461';
var star3Role = '777163346456870913';
var star4Role = '777163367814922250';
var life5Role = '777163388631253002';
var life6Role = '777163410269011990';
var life7Role = '777163427328163850';
var life8Role = '777163452560048168';
var life9Role = '777163468053938186';
var eagle10Role = '777163488019480586';
var eagle11Role = '777163506902237196';
var eagle12Role = '777163524568776704';
module.exports.everyoneRole = everyoneRole;
module.exports.hackerRole = hackerRole;
module.exports.guestRole = guestRole;
module.exports.adminRole = adminRole;
module.exports.attendeeRole = attendeeRole;
module.exports.mentorRole = mentorRole;
module.exports.sponsorRole = sponsorRole;
module.exports.staffRole = staffRole;
module.exports.rookie0Role = rookie0Role;
module.exports.rookie1Role = rookie1Role;
module.exports.star2Role = star2Role;
module.exports.star3Role = star3Role;
module.exports.star4Role = star4Role;
module.exports.life5Role = life5Role;
module.exports.life6Role = life6Role;
module.exports.life7Role = life7Role;
module.exports.life8Role = life8Role;
module.exports.life9Role = life9Role;
module.exports.eagle10Role = eagle10Role;
module.exports.eagle11Role = eagle11Role;
module.exports.eagle12Role = eagle12Role;

// other project wide vars
var embedColor = '#0099ff'
module.exports.embedColor = embedColor;

// Common channels

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
// channel where the bot can log important things like verifications, 
// clear chat calls, etc
var adminLogChannel = '743197503884755045';

// channel where guests will use the !verify command,
// usualy the welcome channel
var welcomeChannel = '743192401434378271';
module.exports.welcomeChannel = welcomeChannel;

// where hackers can call the !attend command, usually a 
// hidden channel in a hidden category, open only day of the event
var attendChannel = '747581999363129474';
module.exports.attendChannel = attendChannel;

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

// where hackers and other users can call the !createchannel command
// to create new private channels for them and their team
var channelcreationChannel = '754396445494214789';
module.exports.channelcreationChannel = channelcreationChannel;


// Checks if the memeber has a role, returns true if it does
async function checkForRole(member, role) {
    var hasRole = await member.roles.cache.get(role);
    if(hasRole != undefined) {
        return true;
    } else {
        return false;
    }
}
module.exports.checkForRole = checkForRole;

// Send a Direct meesage to a member, option to delete after 5 seconds
async function sendMessageToMember(member, message, isDelete = false) {
    var msg = await member.send(message);
    if (isDelete === true) {
        msg.delete({timeout: 5000})
    }
    return msg;
}
module.exports.sendMessageToMember = sendMessageToMember;

// Add a role to a member
function addRoleToMember(member, addRole) {
    member.roles.add(addRole);
}
module.exports.addRoleToMember = addRoleToMember;

// Remove a role to a member
function removeRolToMember(member, removeRole) {
    member.roles.remove(removeRole);
}
module.exports.removeRolToMember = removeRolToMember;

// Replaces one role for the other
function replaceRoleToMember(member, removeRole, addRole) {
    removeRolToMember(member, removeRole);
    addRoleToMember(member, addRole);
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
async function addVoiceChannelsToActivity(activityName, number, category, channelManager) {
    // udpate db and get total number of channels
    var total = await firebaseActivity.addVoiceChannels(activityName, number);

    // grab index where channel naming should start, in case there are already channels made
    var index = total - number;

    // create voice channels
    for (; index < total; index++) {
        channelManager.create(activityName + '-' + index, {type: 'voice', parent: category, permissionOverwrites : [
            {
                id: hackerRole,
                deny: ['VIEW_CHANNEL'],
            },
            {
                id: attendeeRole,
                deny: ['VIEW_CHANNEL'],
                allow: ['USE_VAD', 'SPEAK'],
            },
            {
                id: sponsorRole,
                deny: ['VIEW_CHANNEL'],
            },
            {
                id: mentorRole,
                allow: ['VIEW_CHANNEL', 'USE_VAD', 'SPEAK', 'MOVE_MEMBERS'],
            },
            {
                id: staffRole,
                allow: ['VIEW_CHANNEL', 'USE_VAD', 'SPEAK', 'MOVE_MEMBERS'],
            }
        ]
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

    // grab index where channel naming should start, in case there are already channels made
    // we remove one because we are counting from 0
    // remove voice channels
    for (var index = total - 1; index >= final; index--) {
        var channelName = activityName + '-' + index;
        var channel = await category.children.find(channel => channel.name === channelName);
        channel.delete();
    }

    return final;
}
module.exports.removeVoiceChannelsToActivity = removeVoiceChannelsToActivity;

// deletes a message if the message hasn't been deleted already
function deleteMessage(message) {
    if (message.deleted === false) {
        message.delete();
    }
}
module.exports.deleteMessage = deleteMessage;