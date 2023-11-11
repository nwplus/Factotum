const { Command } = require('@sapphire/framework');
require('dotenv').config();
const FirebaseServices = require('../../db/firebase/firebase-services');
const fetch = require('node-fetch');

/**
 * The self care command will send pre made reminders from firebase to the command channel. These reminders are self
 * care reminders. Will prompt a role to mention with each reminder. We recommend that be an opt-in role. 
 * @category Commands
 * @subcategory Admin-Utility
 * @extends Command
 */
class LoadQuestions extends Command {
    constructor(context, options) {
        super(context, {
            ...options,
            description: 'Adds Discord Contest questions to database',
        });
    }

    registerApplicationCommands(registry) {
        registry.registerChatInputCommand((builder) =>
            builder
                .setName(this.name)
                .setDescription(this.description)
                .addAttachmentOption(option =>
                    option.setName('questions')
                        .setDescription('JSON file only! Make sure each question is an object.')
                        .setRequired(true))
        ), 
        {
            idHints: '1171789829479079976',
        };
    }

    async chatInputRun(interaction) {
        // const adminSDK = JSON.parse(process.env.NWPLUSADMINSDK);
        // let app = FirebaseServices.initializeFirebaseAdmin('factotum', adminSDK, 'https://nwplus-bot.firebaseio.com');

        const guildId = interaction.guild.id;
        const file = interaction.options.getAttachment('questions');
        let res;
        await interaction.deferReply();
        try {
            const response = await fetch(file.url);
            res = await response.json();

            let db = FirebaseServices.apps.get('nwPlusBotAdmin').firestore();
            var count = 0;
            res.forEach(question => {
                count++;

                var docRef = db.collection('guilds').doc(guildId).collection('questions').doc();
                docRef.set({ ...question, asked: false });
            });
            await interaction.editReply({ content: count + ' questions added!', ephemeral: true });
        } catch (error) {
            await interaction.editReply({ content: 'Something went wrong! Error msg: ' + error, ephemeral: true });
        }
    }
}
module.exports = LoadQuestions;
