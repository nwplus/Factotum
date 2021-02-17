const Commando = require('discord.js-commando');
const Discord = require('discord.js');


require('dotenv-flow').config();

// Firebase requirements
var firebase = require('firebase/app');
const mongoUtil = require('./db/mongoUtil');

const admin = require('firebase-admin');

const nwFirebaseConfig = {
    apiKey: process.env.NWFIREBASEAPIKEY,
    authDomain: process.env.NWFIREBASEAUTHDOMAIN,
    databaseURL: process.env.NWFIREBASEURL,
    projectId: process.env.NWFIREBASEPROJECTID,
    storageBucket: process.env.NWFIREBASEBUCKET,
    messagingSenderId: process.env.NWFIREBASESENDERID,
    appId: process.env.NWFIREBASEAPPID,
    measurementId: process.env.NWFIREBASEMEASUREMENTID
}

// initialize firebase
// firebase.initializeApp(firebaseConfig);
const adminSDK = require('./nwplus-bot-admin-sdk.json');
admin.initializeApp({
    credential: admin.credential.cert(adminSDK),
    databaseURL: "https://nwplus-bot.firebaseio.com",
});

// initialize nw firebase
const nwFirebase = firebase.initializeApp(nwFirebaseConfig, 'nwFirebase');

const discordServices = require('./discord-services');
const Prompt = require('./classes/prompt');
const Verification = require('./classes/verification');


const config = {
    token: process.env.TOKEN,
    owner: process.env.OWNER,
}
const bot = new Commando.Client({
    commandPrefix: '!',
    owner: config.owner,
});

bot.registry
    .registerDefaultTypes()
    .registerGroup('a_boothing', 'boothing group for admins')
    .registerGroup('a_activity', 'activity group for admins')
    .registerGroup('a_start_commands', 'advanced admin commands')
    .registerGroup('a_utility', 'utility commands for admins')
    .registerGroup('utility', 'utility commands for users')
    .registerGroup('verification', 'verification commands')
    .registerGroup('essentials', 'essential commands for any guild', true)
    .registerDefaultGroups()
    .registerDefaultCommands({
        unknownCommand: false,
        help: false,
    })
    .registerCommandsIn(__dirname + '/commands');

bot.once('ready', async () => {
    console.log(`Logged in as ${bot.user.tag}!`);
    bot.user.setActivity('Ready to hack!');

    await mongoUtil.mongooseConnect();

    bot.guilds.cache.forEach(async (guild, key, guilds) => {
        let botGuild = await BotGuild.findById(guild.id);

        if (!botGuild) {
            BotGuild.create({
                _id: guild.id,
            });
        }

    });
});

bot.on('guildCreate', /** @param {Commando.CommandoGuild} guild */(guild) => {
    bot.registry.groups.forEach((group, key, map) => {
        if (!group.guarded) guild.setGroupEnabled(group, false);
    });

    BotGuild.create({
        _id: guild.id,
    });
});

// Listeners for the bot

// error event
// bot.on('error', (error) => {
//     console.log(error)
//     discordServices.discordLog(bot.guilds.cache.first(), )
// });

bot.on('commandError', (command, error) => {
    console.log(
        'Error on command: ' + command.name +
        'Uncaught Rejection, reason: ' + error.name +
        '\nmessage: ' + error.message +
        '\nfile: ' + error.fileName +
        '\nline number: ' + error.lineNumber +
        '\nstack: ' + error.stack
    );

    discordServices.discordLog(bot.guilds.cache.first(),
        new Discord.MessageEmbed().setColor('#ed3434')
            .setTitle('Command Error')
            .setDescription('Error on command: ' + command.name +
                'Uncaught Rejection, reason: ' + error.name +
                '\nmessage: ' + error.message +
                '\nfile: ' + error.fileName +
                '\nline number: ' + error.lineNumber +
                '\nstack: ' + error.stack)
            .setTimestamp()
    );
});

process.on('uncaughtException', (error, origin) => {
    console.log(
        'Uncaught Rejection, reason: ' + error.name +
        '\nmessage: ' + error.message +
        '\nfile: ' + error.fileName +
        '\nline number: ' + error.lineNumber +
        '\nstack: ' + error.stack +
        `Exception origin: ${origin}`
    );
    discordServices.discordLog(bot.guilds.cache.first(),
        new Discord.MessageEmbed().setColor('#ed3434')
            .setTitle('Uncaught Rejection')
            .setDescription('Uncaught Rejection, reason: ' + error.name +
                '\nmessage: ' + error.message +
                '\nfile: ' + error.fileName +
                '\nline number: ' + error.lineNumber +
                '\nstack: ' + error.stack +
                `\nException origin: ${origin}`)
            .setTimestamp()
    );
});

process.on('unhandledRejection', (error, promise) => {
    console.log('Unhandled Rejection at:', promise,
        'Unhandled Rejection, reason: ' + error.name +
        '\nmessage: ' + error.message +
        '\nfile: ' + error.fileName +
        '\nline number: ' + error.lineNumber +
        '\nstack: ' + error.stack
    );
    discordServices.discordLog(bot.guilds.cache.first(),
        new Discord.MessageEmbed().setColor('#ed3434')
            .setTitle('Unhandled Rejection')
            .setDescription('Unhandled Rejection, reason: ' + error.name +
                '\nmessage: ' + error.message +
                '\nfile: ' + error.fileName +
                '\nline number: ' + error.lineNumber)
            .setTimestamp()
    );
});

process.on('exit', () => {
    console.log('Node is exiting!');
    discordServices.discordLog(bot.guilds.cache.first(),
        new Discord.MessageEmbed().setColor('#ed3434')
            .setTitle('Unhandled Rejection')
            .setDescription('The program is shutting down!')
            .setTimestamp());
});

bot.on('message', async message => {
    // Deletes all messages to any channel in the black list with the specified timeout
    // this is to make sure that if the message is for the bot, it is able to get it
    // bot and staff messages are not deleted
    if (discordServices.blackList.has(message.channel.id)) {
        if (!message.author.bot && !discordServices.checkForRole(message.member, discordServices.roleIDs.staffRole)) {
            (new Promise(res => setTimeout(res, discordServices.blackList.get(message.channel.id)))).then(() => discordServices.deleteMessage(message));
        }
    }

});

// If someone joins the server they get the guest role!
bot.on('guildMemberAdd', async member => {
    try {
        await greetNewMember(member);
    } catch (error) {
        await fixDMIssue(error, member);
    }
});

bot.login(config.token).catch(console.error);


/**
 * Greets a member!
 * @param {Discord.GuildMember} member - the member to greet
 * @throws Error if the user has server DMs off
 */
async function greetNewMember(member) {
    let verifyEmoji = '🍀';

    var embed = new Discord.MessageEmbed()
        .setTitle('Welcome to the nwHacks 2021 Server!')
        .setDescription('We are very excited to have you here!')
        .addField('Have a question?', 'Go to the welcome-assistance channel to talk with our staff!')
        .addField('Want to learn more about what I can do?', 'Use the !help command anywhere and I will send you a message!')
        .setColor(discordServices.colors.embedColor);

    if (discordServices.roleIDs?.guestRole) embed
        .addField('Gain more access by verifying yourself!', 'React to this message with ' + verifyEmoji + ' and follow my instructions!\n');
    let msg = await member.send(embed);

    // if verification is on then give guest role and let user verify
    if (discordServices.roleIDs?.guestRole) {
        discordServices.addRoleToMember(member, discordServices.roleIDs.guestRole);

        msg.react(verifyEmoji);
        let verifyCollector = msg.createReactionCollector((reaction, user) => !user.bot && reaction.emoji.name === verifyEmoji);

        verifyCollector.on('collect', async (reaction, user) => {
            try {
                var email = (await Prompt.messagePrompt({prompt: 'What email did you get accepted with? Please send it now!', channel: member.user.dmChannel, userId: member.id}, 'string', 30)).content;
            } catch (error) {
                discordServices.sendEmbedToMember(member, {
                    title: 'Verification Error',
                    description: 'Email was not provided, please try again!'
                }, true);
                return;
            }

            try {
                Verification.verify(member, email, member.guild);
            } catch (error) {
                discordServices.sendEmbedToMember(member, {
                    title: 'Verification Error',
                    description: 'Email provided is not valid! Please try again.'
                }, true);
            }
        });
    }
    // if verification is off, then just ive member role
    else {
        discordServices.addRoleToMember(member, discordServices.roleIDs.memberRole);
    }
}

/**
 * Will let the member know how to fix their DM issue.
 * @param {Error} error - the error
 * @param {Discord.GuildMember} member - the member with the error
 * @throws Error if the given error is not a DM error
 */
async function fixDMIssue(error, member) {
    if (error.code === 50007) {
        let channelID = discordServices.channelIDs?.welcomeSupport || discordServices.channelIDs.botSupportChannel;

        member.guild.channels.resolve(channelID).send('<@' + member.id + '> I couldn\'t reach you :(.' +
            '\n* Please turn on server DMs, explained in this link: https://support.discord.com/hc/en-us/articles/217916488-Blocking-Privacy-Settings-' +
            '\n* Once this is done, please react to this message with 🤖 to let me know!').then(msg => {
                msg.react('🤖');
                const collector = msg.createReactionCollector((reaction, user) => user.id === member.id && reaction.emoji.name === '🤖');

                collector.on('collect', (reaction, user) => {
                    reaction.users.remove(user.id);
                    try {
                        greetNewMember(member);
                        collector.stop();
                        msg.delete();
                    } catch (error) {
                        member.guild.channels.resolve(channelID).send('<@' + member.id + '> Are you sure you made the changes? I couldn\'t reach you again 😕').then(msg => msg.delete({ timeout: 8000 }));
                    }
                });
            });
    } else {
        throw error;
    }
}