const commando = require('discord.js-commando');
const Discord = require('discord.js');


require('dotenv-flow').config();

// Firebase requirements
var firebase = require('firebase/app');

// firebase config
const firebaseConfig = {
    apiKey: process.env.FIREBASEAPIKEY,
    authDomain: process.env.FIREBASEAUTHDOMAIN,
    databaseURL: process.env.FIREBASEURL,
    projectId: process.env.FIREBASEPROJECTID,
    storageBucket: process.env.FIREBASEBUCKET,
    messagingSenderId: process.env.FIREBASESENDERID,
    appId: process.env.FIREBASEAPPID,
    measurementId: process.env.FIREBASEMEASUREMENTID
};

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
firebase.initializeApp(firebaseConfig);

// initialize nw firebase
const nwFirebase = firebase.initializeApp(nwFirebaseConfig, 'nwFirebase');

const discordServices = require('./discord-services');
const Prompt = require('./classes/prompt');
const firebaseServices = require('./firebase-services/firebase-services');


const config = {
    token: process.env.TOKEN,
    owner: process.env.OWNER,
}
const bot = new commando.Client({
    commandPrefix: '!',
    owner: config.owner,
});

bot.registry
    .registerDefaultTypes()
    .registerGroup('verification', 'Verification group')
    .registerGroup('utility', 'utility group')
    .registerGroup('a_boothing', 'boothing group for admins')
    .registerGroup('a_activity', 'activity group for admins')
    .registerGroup('a_start_commands', 'advanced admin commands')
    .registerGroup('a_utility', 'utility commands for admins')
    .registerDefaultGroups()
    .registerDefaultCommands({
        unknownCommand: false,
        help: false,
    })
    .registerCommandsIn(__dirname + '/commands');

bot.once('ready', async () => {
    console.log(`Logged in as ${bot.user.tag}!`);
    bot.user.setActivity('Ready to hack!');

    // add verify and attend channels to the black list
    discordServices.blackList.set(discordServices.channelIDs.welcomeChannel, 3000);

    // check roles
    // we asume the bot is only in one guild!
    var guild = bot.guilds.cache.first();
    var roleManager = await guild.roles.fetch();

    // disable the attend command
    bot.registry.commands.get('attend').setEnabledIn(guild, false);

    // roles we are looking for
    // dict key: role name, value: list of color and then id (snowflake)
    var initialRoles = new Map([
        ['Guest', ['#969C9F']], ['Hacker', ['#006798']], ['Attendee', ['#0099E1']],
        ['Mentor', ['#CC7900']], ['Sponsor', ['#F8C300']], ['Staff', ['#00D166']]
    ]);

    // found roles, dict same as above
    var foundRoles = new Map();

    // loop over every role to search for roles we need
    roleManager.cache.each((role) => {
        // remove from roles list if name matches and add it to found roles
        if (initialRoles.has(role.name)) {
            foundRoles.set(role.name, [role.color, role.id]);
            initialRoles.delete(role.name);
        }
    });

    // loop over remaining roles to create them
    for (let [key, value] of initialRoles) {
        var roleObject = await roleManager.create({
            data: {
                name: key,
                color: value[0],
            }
        });
        // add role to found roles because it has been created
        foundRoles.set(key, [value[0], roleObject.id]);
    }

    // update values for discord services role snowflake
    discordServices.roleIDs.everyoneRole = roleManager.everyone.id;
    discordServices.roleIDs.hackerRole = foundRoles.get('Hacker')[1];
    discordServices.roleIDs.guestRole = foundRoles.get('Guest')[1];
    discordServices.roleIDs.attendeeRole = foundRoles.get('Attendee')[1];
    discordServices.roleIDs.mentorRole = foundRoles.get('Mentor')[1];
    discordServices.roleIDs.sponsorRole = foundRoles.get('Sponsor')[1];
    discordServices.roleIDs.staffRole = foundRoles.get('Staff')[1];

    // var to mark if gotten documents once
    var isInitState = true;

    // start query listener for announcements
    nwFirebase.firestore().collection('Hackathons').doc('nwHacks2021').collection('Announcements').onSnapshot(querySnapshot => {
        // exit if we are at the initial state
        if (isInitState) {
            isInitState = false;
            return;
        }

        querySnapshot.docChanges().forEach(change => {
            if (change.type === 'added') {
                const embed = new Discord.MessageEmbed()
                    .setColor(discordServices.colors.announcementEmbedColor)
                    .setTitle('Announcement')
                    .setDescription(change.doc.data()['content']);
                
                guild.channels.resolve(discordServices.channelIDs.announcementChannel).send('<@&' + discordServices.roleIDs.attendeeRole + '>', {embed: embed});
            }
        })
    })
});

// Listeners for the bot

// error event
bot.on('error', (error) => {
    console.log(error)
    discordServices.discordLog(bot.guilds.cache.first(), )
});

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
            '\nstack: ' + error.stack + 
            `\nException origin: ${origin}`)
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
    // Deletes all messages to any channel in the black list with a 5 second timout
    // this is to make sure that if the message is for the bot, it is able to get it
    // bot and staff messeges are not deleted
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
        .addField('Gain more access by verifying yourself!', 'React to this message with ' + verifyEmoji + ' and follow my instructions!')
        .addField('Have a question?', 'Go to the welcome-assistance channel to talk with our staff!')
        .addField('Want to learn more about what I can do?', 'Use the !help command anywhere and I will send you a message!')
        .setColor(discordServices.colors.embedColor);

    let msg = await member.send(embed);

    discordServices.addRoleToMember(member, discordServices.roleIDs.guestRole);

    msg.react(verifyEmoji);

    let verifyCollector = msg.createReactionCollector((reaction, user) => !user.bot && reaction.emoji.name === verifyEmoji);

    verifyCollector.on('collect', async (reaction, user) => {
        try {
            var email = (await Prompt.messagePrompt('What email did you get accepted to this event? Please send it now!', 'string', member.user.dmChannel, member.id, 25)).content;
        } catch (error) {
            console.log(error);
        }
        reaction.users.remove(user.id);

        let success = await verify(member, email, member.guild);

        if (success) {
            verifyCollector.stop();
        }

    });
}

/**
 * Will let the member know how to fix their DM issue.
 * @param {Error} error - the error
 * @param {Discord.GuildMember} member - the member with the error
 * @throws Error if the given error is not a DM error
 */
async function fixDMIssue(error, member) {
    if (error.code === 50007) {
        member.guild.channels.resolve(discordServices.channelIDs.welcomeSupport).send('<@' + member.id + '> I couldn\'t reach you :(.' + 
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
                        member.guild.channels.resolve(discordServices.channelIDs.welcomeSupport).send('<@' + member.id + '> Are you sure you made the changes? I couldn\'t reach you again 😕').then(msg => msg.delete({timeout: 8000}));
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
 * @param {Discord.Guild} guild - guild to verify member in
 * @returns {Promise<Boolean>} - true if successful
 * @private
 * @async
 */
async function verify(member, email, guild) {
    // make email lowercase
    email = email.toLowerCase();

    // regex to validate email
    const re = /^(([^<>()[\]\.,;:\s@\"]+(\.[^<>()[\]\.,;:\s@\"]+)*)|(\".+\"))@(([^<>()[\]\.,;:\s@\"]+\.)+[^<>()[\]\.,;:\s@\"]{2,})$/i;

    // let user know he has used the command incorrectly and exit
    if (email === '' || !re.test(email)) {
        discordServices.sendMessageToMember(member, 'The email you sent me is not valid, please try again!');
        return;
    }

    // check if the user needs to verify, else warn and return
    if (!discordServices.checkForRole(member, discordServices.roleIDs.guestRole)) {
        discordServices.sendEmbedToMember(member, {
            title: 'Verify Error',
            description: 'You do not need to verify, you are already more than a guest!'
        }, true);
        return;
    }

    // Call the verify function to get status
    var status = await firebaseServices.verify(email, member.id);

    // embed to send
    const embed = new Discord.MessageEmbed()
        .setTitle('Verification Process')
        .setColor(discordServices.colors.specialDMEmbedColor);

    switch(status) {
        case firebaseServices.status.HACKER_SUCCESS:
            embed.addField('You Have Been Verified!', 'Thank you for verifying your status with us, you now have access to most of the server.')
                .addField('Don\'t Forget!', 'Remember you need to !attend <your email> in the attend channel that will open a few hours before the hackathon begins.');
            discordServices.replaceRoleToMember(member, discordServices.roleIDs.guestRole, discordServices.roleIDs.hackerRole);
            discordServices.addRoleToMember(member,discordServices.stampRoles.get(0));
            discordServices.discordLog(guild, "VERIFY SUCCESS : <@" + member.id + "> Verified email: " + email + " successfully and they are now a hacker!");
            break;
        case firebaseServices.status.SPONSOR_SUCCESS:
            embed.addField('You Have Been Verified!', 'Hi there sponsor, thank you very much for being part of nwhacks 2021 and for joining our discord!');
            discordServices.replaceRoleToMember(member, discordServices.roleIDs.guestRole, discordServices.roleIDs.sponsorRole);
            discordServices.discordLog(guild, "VERIFY SUCCESS : <@" + member.id + "> Verified email: " + email + " successfully and they are now a sponsor!");
            break;
        case firebaseServices.status.MENTOR_SUCCESS:
            embed.addField('You Have Been Verified!', 'Hi there mentor, thank you very much for being part of nwhacks 2021 and for joining our discord!');
            discordServices.replaceRoleToMember(member, discordServices.roleIDs.guestRole, discordServices.roleIDs.mentorRole);
            discordServices.discordLog(guild, "VERIFY SUCCESS : <@" + member.id + "> Verified email: " + email + " successfully and he is now a mentor!");
            break;
        case firebaseServices.status.STAFF_SUCCESS:
            embed.addField('Welcome To Your Server!', 'Welcome to your discord server! If you need to know more about what I can do please call !help.');
            discordServices.replaceRoleToMember(member, discordServices.roleIDs.guestRole, discordServices.roleIDs.staffRole);
            discordServices.discordLog(guild, "VERIFY SUCCESS : <@" + member.id + "> Verified email: " + email + " successfully and he is now a staff!");
            break;
        case firebaseServices.status.FAILURE:
            embed.addField('ERROR 404', 'Hi there, the email you tried to verify yourself with is not' +
            ' in our system, please make sure your email is well typed. If you think this is an error' +
            ' please contact us in the welcome-support channel.')
                .setColor('#fc1403');
            discordServices.discordLog(guild, 'VERIFY ERROR : <@' + member.id + '> Tried to verify email: ' + email + ' and failed! I couldn\'t find that email!');
            break;
        default:
            embed.addField('ERROR 401', 'Hi there, it seems the email you tried to verify with is already in use or you were not accepted! Please make ' +
                'sure that you have the correct email. If you think this is an error please contact us in the welcome-support channel.')
                .setColor('#fc1403');
                discordServices.discordLog(guild, 'VERIFY WARNING : <@' + member.id + '> Tried to verify email: ' + email + ' and failed! He already verified or was not accepted!');
            break;
    }
    discordServices.sendMessageToMember(member, embed);
    return true;
}