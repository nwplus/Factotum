

// Available Roles
const guestRole = 'Guest';
const hackerRole = 'Hacker';
const attendeeRole = 'Attendee';
const mentorRole = 'Mentor';
const sponsorRole = 'Sponsor';
const staffRole = 'Staff';
const adminRole = 'Admin';
module.exports = {guestRole, hackerRole, attendeeRole, mentorRole, sponsorRole, staffRole, adminRole};


// Checks if the memeber has a role, returns true if it does
function checkForRole(member, role) {
    if(member.roles.cache.some(r => r.name === role)) {
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
    member.roles.add(member.guild.roles.cache.find(role => role.name === addRole));
}
module.exports.addRoleToMember = addRoleToMember;

// Remove a role to a member
function removeRolToMember(member, removeRole) {
    member.roles.remove(member.guild.roles.cache.find(role => role.name === removeRole));
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
    guild.channels.cache.find(channel => channel.name === "logs").send(message);
}
module.exports.discordLog = discordLog;