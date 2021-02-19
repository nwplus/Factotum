const Commando = require('discord.js-commando');
const Discord = require('discord.js');


require('dotenv-flow').config();

// Firebase requirements
var firebase = require('firebase/app');

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
const firebaseServices = require('./firebase-services/firebase-services');


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
});

bot.on('guildCreate', /** @param {Commando.CommandoGuild} guild */(guild) => {
    bot.registry.groups.forEach((group, key, map) => {
        if (!group.guarded) guild.setGroupEnabled(group, false);
    });

    console.log('inside guild create!');
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

            verifyNew(member, email, member.guild);
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

/**
 * Verifies a guild member into a guild.
 * @param {Discord.GuildMember} member - member to verify
 * @param {String} email - email to verify with
 * @param {Discord.Guild} guild
 * @private
 * @async
 */
async function verifyNew(member, email, guild) {
    // make email lowercase
    email = email.toLowerCase();

    // regex to validate email
    const re = /^(([^<>()[\]\.,;:\s@\"]+(\.[^<>()[\]\.,;:\s@\"]+)*)|(\".+\"))@(([^<>()[\]\.,;:\s@\"]+\.)+[^<>()[\]\.,;:\s@\"]{2,})$/i;

    // let user know he has used the command incorrectly and exit
    if (email === '' || !re.test(email)) {
        discordServices.sendMessageToMember(member, 'The email you sent me is not valid, please try again!', true);
        return;
    }

    // try to get member types, error will mean no email was found
    try {
        var types = await firebaseServices.verify(email, member.id);
    } catch (error) {
        discordServices.sendEmbedToMember(member, {
            title: 'Verification Failure',
            description: 'The email provided was not found! If you need assistance ask an admin for help!',
        });
        discordServices.discordLog(guild, `VERIFY FAILURE : <@${member.id}> Verified email: ${email} but was a failure, I could not find that email!`);
        return;
    }

    // check for types, if no types it means they are already verified with those types
    if (types.length === 0) {
        discordServices.sendEmbedToMember(member, {
            title: 'Verification Warning',
            description: 'We found your email, but you are already verified! If this is not the case let an admin know!',
            color: '#fc1403',
        });
        discordServices.discordLog(guild, `VERIFY WARNING : <@${member.id}> Verified email: ${email} but he was already verified for all types!`);
        return;
    }

    let correctTypes = [];
    
    // check for correct types with botGuild verification info and give the roles
    types.forEach((type, index, array) => {
        if (discordServices.verificationRoles.has(type)) {
            discordServices.addRoleToMember(member, discordServices.verificationRoles.get(type));
            correctTypes.push(type);
        }
    });

    // extra check to see if types were found, give stamp role if available and let user know of success
    if (correctTypes.length > 0) {
        discordServices.replaceRoleToMember(member, discordServices.roleIDs.guestRole, discordServices.roleIDs.memberRole);
        if (discordServices.stampRoles.has(0)) discordServices.addRoleToMember(member, discordServices.stampRoles.get(0));
        discordServices.sendEmbedToMember(member, {
            title: 'cmd-f 2021 Verification Success',
            description: `You have been verified as a ${correctTypes.join()}, good luck and have fun!`,
            color: discordServices.colors.specialDMEmbedColor,
        });
        discordServices.discordLog(guild, `VERIFY SUCCESS : <@${member.id}> Verified email: ${email} successfully as ${correctTypes.join()}`);
    } else {
        discordServices.sendEmbedToMember(member, {
            title: 'Verification Error',
            description: 'There has been an error, contact an admin ASAP!',
            color: '#fc1403',
        });
        discordServices.discordLog(guild, `VERIFY ERROR : <@${member.id}> Verified email: ${email} had types available, but I could not find them on the botGuild!`);
    }


}   