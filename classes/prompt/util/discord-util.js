const { Message, TextChannel } = require('discord.js');

/**
 * @module DiscordUtils
 */

/**
 * Sends a message to a user via a channel, waits for some time, then deletes the message.
 * @param {TextChannel} channel 
 * @param {String} userId 
 * @param {String} msgText 
 * @param {Number} [waitTime=5] - amount of time to wait in seconds
 */
async function channelMsgWaitDelete(channel, userId, msgText, waitTime = 5) {
    let msg = await channelMsg(channel, userId, msgText);
    await new Promise((resolve) => setTimeout(resolve, waitTime * 1000));
    await msg.delete();
}
module.exports.channelMsgWaitDelete = channelMsgWaitDelete;

/**
 * Sends a message to a user via a channel. The user is mentioned.
 * @param {TextChannel} channel 
 * @param {String} userId 
 * @param {String} msgText 
 * @returns {Promise<Message>}
 */
async function channelMsg(channel, userId, msgText) {
    return await channel.send(`<@${userId} ${msgText}`);
}
module.exports.channelMsg = channelMsg;