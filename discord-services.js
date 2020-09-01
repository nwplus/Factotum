

// Available Roles
const guestRole = '742896900419747961';
const hackerRole = '738519785028976741';
const attendeeRole = '742896999556448357';
const mentorRole = '747527454200955051';
const sponsorRole = '738519983981723748';
const staffRole = '738519363904077916';
const adminRole = '738491577596641311';
module.exports = {guestRole, hackerRole, attendeeRole, mentorRole, sponsorRole, staffRole, adminRole};

// Common channels
const boothingWaitList = '748370272049954927';
const adminLogChannel = '743197503884755045';
module.exports = {boothingWaitList};


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

// Send a Direct meesage to a member
function sendMessageToMember(member, message) {
    member.send(message);
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