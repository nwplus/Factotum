const { Schema, model } = require('mongoose');

const BotGuildClass = require('../../classes/Bot/bot-guild');

/**
 * @class BotGuild
 */
const BotGuildSchema = new Schema({

    roleIDs: {
        memberRole: {
            type: String,
        },
        staffRole: {
            type: String,
        },
        adminRole: {
            type: String,
        },
        everyoneRole: {
            type: String,
        },
        mentorRole: {
            type: String,
        }
    },

    channelIDs: {
        adminConsole: {
            type: String,
        },
        adminLog: {
            type: String,
        },
        botSpamChannel: {
            type: String,
        },
        incomingTicketsChannel: {
            type: String,
        },
        mentorRoleSelectionChannel: {
            type: String,
        },
        requestTicketChannel: {
            type: String,
        }
    },

    verification: {
        isEnabled: {
            type: Boolean,
            default: false,
        },
        guestRoleID: {
            type: String,
        },
        welcomeSupportChannelID: {
            type: String,
        },
        verificationRoles: {
            type: Map,
            default: new Map(),
        }
    },

    // stamps: {
    //     isEnabled: {
    //         type: Boolean,
    //         default: false,
    //     },
    //     stampRoleIDs: {
    //         type: Map,
    //         default: new Map(),
    //     },
    //     stamp0thRoleId: {
    //         type: String,
    //     },
    //     stampCollectionTime: {
    //         type: Number,
    //         default: 60,
    //     },
    // },

    embedColor: {
        type: String,
        default: '#26fff4',
    },

    _id: {
        type: String,
        required: true,
    },

    isSetUpComplete: {
        type: Boolean,
        default: false,
    },
});

BotGuildSchema.loadClass(BotGuildClass);

const BotGuild = model('BotGuild', BotGuildSchema);

module.exports = BotGuild;