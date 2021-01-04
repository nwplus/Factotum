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
    discordServices.blackList.set(discordServices.welcomeChannel, 3000);

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
    discordServices.everyoneRole = roleManager.everyone.id;
    discordServices.hackerRole = foundRoles.get('Hacker')[1];
    discordServices.guestRole = foundRoles.get('Guest')[1];
    discordServices.attendeeRole = foundRoles.get('Attendee')[1];
    discordServices.mentorRole = foundRoles.get('Mentor')[1];
    discordServices.sponsorRole = foundRoles.get('Sponsor')[1];
    discordServices.staffRole = foundRoles.get('Staff')[1];

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
                    .setColor(discordServices.announcementEmbedColor)
                    .setTitle('Announcement')
                    .setDescription(change.doc.data()['content']);
                
                guild.channels.resolve(discordServices.announcementChannel).send('<@&' + discordServices.attendeeRole + '>', {embed: embed});
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
        if (!message.author.bot && !discordServices.checkForRole(message.member, discordServices.staffRole)) {
            (new Promise(res => setTimeout(res, discordServices.blackList.get(message.channel.id)))).then(() => discordServices.deleteMessage(message));
        }
    }

});

// If someone joins the server they get the guest role!
bot.on('guildMemberAdd', member => {

    var embed = new Discord.MessageEmbed()
        .setTitle('Welcome to the nwHacks 2021 Server!')
        .setDescription('We are very excited to have you here!')
        .addField('Gain more access by verifying yourself!', 'Go back to the welcome channel and use the !verify command. More info there!')
        .addField('Have a question?', 'Go to the welcome-assistance channel to talk with our staff!')
        .addField('Want to learn more about what I can do?', 'Use the !help command anywhere and I will send you a message!')
        .setColor(discordServices.embedColor);

    // found a bug where if poeple have DMs turned off, this send embed will fail and can make the role setup fail as well
    // we will add a .then where the user will get pinged on welcome-support to let him know to turn on DM from server
    member.send(embed).then(() => {
        discordServices.addRoleToMember(member, discordServices.guestRole);
    }).catch((error) => {
        if (error.code === 50007) {
            member.guild.channels.resolve(discordServices.welcomeSupport).send('<@' + member.id + '> I couldn\'t reach you :(.' + 
                '\n* Please turn on server DMs, explained in this link: https://support.discord.com/hc/en-us/articles/217916488-Blocking-Privacy-Settings-' + 
                '\n* Once this is done, please react to this message with 🤖 to let me know!').then(msg => {
                    msg.react('🤖');
                    const collector = msg.createReactionCollector((reaction, user) => user.id === member.id && reaction.emoji.name === '🤖');
                    
                    collector.on('collect', (reaction, user) => {
                        reaction.users.remove(user.id);
                        member.send(embed).then(msg => {
                            discordServices.addRoleToMember(member, discordServices.guestRole);
                            collector.stop();
                        }).catch(error => {
                            member.guild.channels.resolve(discordServices.welcomeSupport).send('<@' + member.id + '> Are you sure you made the changes? I couldnt reach you again :( !').then(msg => msg.delete({timeout: 8000}));
                        });
                    });
                });
        } else {
            throw error;
        }
    });
});

bot.login(config.token).catch(console.error);

