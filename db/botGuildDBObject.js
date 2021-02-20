const { Schema, model } = require('mongoose');

const BotGuildClass = require('../classes/bot-guild');

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
    },

    channelIDs: {
        adminConsole: {
            type: String,
        },
        adminLog: {
            type: String,
        },
        botSupportChannel: {
            type: String,
        },
    },

    verification: {
        isEnabled: {
            type: Boolean,
            default: false,
        },
        guestRoleID: {
            type: String,
        },
        welcomeChannelID: {
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

    attendance: {
        isEnabled: {
            type: Boolean,
            default: false,
        },
        attendeeRoleID: {
            type: String,
        },
    },

    stamps: {
        isEnabled: {
            type: Boolean,
            default: false,
        },
        /** @type {Collection<String, Number>} - <RoleId, Stamp Number> */
        stampRoleIDs: {
            type: Map,
            default: new Map(),
        },
        /** @type {Number} - the first stamp role Id given to all users */
        stamp0thRoleId: {
            type: Number,
        },
        stampCollectionTime: {
            type: Number,
            default: 60,
        },
    },

    report: {
        isEnabled: {
            type: Boolean,
            default: false,
        },
        incomingReportChannelID: {
            type: String,
        },
    },

    announcement: {
        isEnabled: {
            type: Boolean,
            default: false,
        },
        announcementChannelID: {
            type: String,
        },
    },

    blackList: {
        type: Map,
        default: new Map(),
    },

    caves: {
        type: Map,
        default: new Map(),
    },

    colors: {
        embedColor: {
            type: String,
            default: '#26fff4',
        },
        questionEmbedColor: {
            type: String,
            default: '#f4ff26',
        },
        announcementEmbedColor: {
            type: String,
            default: '#9352d9',
        },
        tfTeamEmbedColor: {
            type: String,
            default: '#60c2e6',
        },
        tfHackerEmbedColor: {
            type: String,
            default: '#d470cd',
        },
        specialDMEmbedColor: {
            type: String,
            default: '#fc6b03',
        }, 
    },

    _id: {
        type: String,
        required: true,
    },

    isSetUpComplete: {
        type: Boolean,
        default: false,
    }
});

BotGuildSchema.loadClass(BotGuildClass);

const BotGuild = model('BotGuild', BotGuildSchema);

module.exports = BotGuild;