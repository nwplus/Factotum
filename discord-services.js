
const firebaseActivity = require('./firebase-services/firebase-services-activities');

var guestRole = '774734424045649950';
var hackerRole = '784252997327650816'; //784252997327650816
var attendeeRole = '774735971375120404';
var mentorRole = '774734376222195755';
var sponsorRole = '774734345968812043';
var staffRole = '774734326554296320';
var adminRole = '773400712234663965';
var everyoneRole = '772898802604310538';

var stamp0Role = '781404710779224115';
var stamp1Role = '781404761273794601';
var stamp2Role = '781404770476097536';
var stamp3Role = '781404766974640128';
var stamp4Role = '781404765133078549';
var stamp5Role = '784224898230779945';
var stamp6Role = '781404768336609290';
var stamp7Role = '784224981386133525';
var stamp8Role = '784224964001005589';
var stamp9Role = '781404767809044491';
var stamp10Role = '781404771612622868';
var stamp11Role = '781404769691631627';
var stamp12Role = '782684483072950272';
var stamp13Role = '782684457357410314';
var stamp14Role = '784224112909221948';
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


// other project wide vars
var embedColor = '#26fff4';
module.exports.embedColor = embedColor;
var questionEmbedColor = '#f4ff26';
module.exports.questionEmbedColor = questionEmbedColor;
var announcementEmbedColor = '#8f26ff';
module.exports.announcementEmbedColor = announcementEmbedColor;
var tfTeamEmbedColor = '#1929ff';
module.exports.tfTeamEmbedColor = tfTeamEmbedColor;
var tfHackerEmbedColor = '#ff33f1';
module.exports.tfHackerEmbedColor = tfHackerEmbedColor;
var specialDMEmbedColor = '#fc6b03';
module.exports.specialDMEmbedColor = specialDMEmbedColor;

const blackList = new Map();
module.exports.blackList = blackList;

var stampCollectTime = 60;
module.exports.stampCollectTime = stampCollectTime;

// Common channels

// announcement channel
var announcementChannel = '773402116173332490';
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
var adminConsolChannel = '774754336215269386';
// channel where the bot can log important things like verifications, 
// clear chat calls, etc
var adminLogChannel = '774754260570079252';

// channel where guests will use the !verify command,
// usualy the welcome channel
var welcomeChannel = '773401606120800257';
module.exports.welcomeChannel = welcomeChannel;

// where hackers can call the !attend command, usually a 
// hidden channel in a hidden category, open only day of the event
var attendChannel = '774754493081714699';
module.exports.attendChannel = attendChannel;

// where hackers can emoji to let the bot know if they are looking
// for a team or a hacker(s)
var teamformationChannel = '782500884545273886';
module.exports.teamformationChannel = teamformationChannel;
// channel where team bios are posted, hackers shouldn't be able to post
var recruitingChannel = '782506417079713802';
module.exports.recruitingChannel = recruitingChannel;
// channel where hacker bios are posted, hackers shouldn't be able to post
var lookingforteamChannel = '782506451746816000';
module.exports.lookingforteamChannel = lookingforteamChannel;

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

// deletes a message if the message hasn't been deleted already
function deleteMessage(message, timeout = 0) {
    if (message.deleted === false) {
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