// // Discord.js commando requirements
// const { Command } = require('discord.js-commando');
// const discordServices = require('../../discord-services');

// // Command export
// module.exports = class HideUnhide extends Command {
//     constructor(client) {
//         super(client, {
//             name: 'hide-unhide',
//             group: 'a_activity',
//             memberName: 'hide or unhide an activity',
//             description: 'Will add or remove permissions to everyone except staff to see the activity.',
//             guildOnly: true,
//             args: [
//                 {
//                     key: 'activityName',
//                     prompt: 'the workshop name',
//                     type: 'string',
//                 },
//                 {
//                     key: 'toHide',
//                     prompt: 'should the activity be hidden?',
//                     type: 'boolean',
//                 },
//                 {
//                     key: 'categoryChannelKey',
//                     prompt: 'snowflake of the activity\'s category',
//                     type: 'string',
//                     default: '',
//                 },
//             ],
//         });
//     }

//     // Run function -> command body
//     async run(message, {activityName, toHide, categoryChannelKey}) {
//         discordServices.deleteMessage(message);

//         // make sure command is only used in the admin console
//         // only members with the staff tag can run this command!
//         if (!(discordServices.checkForRole(message.member, discordServices.roleIDs.staffRole))) {
//             discordServices.replyAndDelete(message, 'You do not have permission for this command, only staff can use it!');
//             return;
//         }

//         // get category
//         var category;
//         if (categoryChannelKey === '') {
//             category = await message.guild.channels.cache.find(channel => channel.type === 'category' && channel.name.endsWith(activityName));
//         } else {
//             category = message.guild.channels.resolve(categoryChannelKey);
//         }

//         // if no category then report failure and return
//         if (category === undefined) {
//             // if the category does not exist
//             discordServices.replyAndDelete(message,'The workshop named: ' + activityName +', does not exist! Did not remove voice channels.');
//             return;
//         }

//         // NOTE:
//         // * It appears that the discord api takes a LONG time to change the name once the category has been changed a few times
//         // * For our purposes, we are okay with hiding it only initially and then un-hiding, after that no more hiding allowed
//         // * Will make sure this rule is followed in !new-activity console
//         // * UPDATE: it appears the problem was using category.name inside the setName method, using a simple variable solved the issue

//         // update overwrites
//         if (toHide) {
//             // category = await category.setName('HIDDEN-' + category.name);
//             category.updateOverwrite(discordServices.roleIDs.memberRole, {VIEW_CHANNEL: false});
//             category.updateOverwrite(discordServices.roleIDs.mentorRole, {VIEW_CHANNEL: false});
//             category.updateOverwrite(discordServices.roleIDs.sponsorRole, {VIEW_CHANNEL: false});
//         } else {
//             // category = await category.setName(category.name.replace('HIDDEN-', ''));
//             category.updateOverwrite(discordServices.roleIDs.memberRole, {VIEW_CHANNEL: true});
//             category.updateOverwrite(discordServices.roleIDs.mentorRole, {VIEW_CHANNEL: true});
//             category.updateOverwrite(discordServices.roleIDs.sponsorRole, {VIEW_CHANNEL: true});
//         }

//         // report success of channel deletions
//         discordServices.replyAndDelete(message,'Workshop session named: ' + activityName + ' has changed visibility.');
//     }
// };
