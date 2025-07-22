const PermissionCommand = require("../../classes/permission-command");
const { replyAndDelete } = require("../../discord-services");
const { Message } = require("discord.js");

/**
 * Change the time users get to react to get a stamp from activity stamp distributions. It defaults to 60 seconds.
 * @category Commands
 * @subcategory Stamps
 * @extends PermissionCommand
 */
class ChangeStampTime extends PermissionCommand {
  constructor(client) {
    super(
      client,
      {
        name: "change-stamp-time",
        group: "stamps",
        memberName: "new stamp time",
        description:
          "Will set the given seconds as the new stamp time for activities.",
        guildOnly: true,
        args: [
          {
            key: "newTime",
            prompt: "new time for stamp collectors to use",
            type: "integer",
          },
        ],
      },
      {
        role: PermissionCommand.FLAGS.STAFF_ROLE,
        roleMessage:
          "Hey there, the command !change-stamp-time is only available to staff!",
      },
    );
  }

  /**
   * @param {FirebaseFirestore.DocumentData | null | undefined} initBotInfo
   * @param {Message} message
   * @param {Object} args
   * @param {Number} args.newTime
   */
  async runCommand(initBotInfo, message, { newTime }) {
    initBotInfo.stamps.stampCollectionTime = newTime;
    initBotInfo.save();

    replyAndDelete(
      message,
      "Stamp collection will now give hackers " +
        newTime +
        " seconds to collect stamp.",
    );
  }
}
module.exports = ChangeStampTime;
