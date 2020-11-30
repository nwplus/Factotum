const commando = require('discord.js-commando');
const Discord = require('discord.js');

require('dotenv-flow').config();

// Firebase requirements
var firebase = require('firebase/app');

// firebase config
var firebaseConfig = {
    apiKey: process.env.FIREBASEAPIKEY,
    authDomain: process.env.FIREBASEAUTHDOMAIN,
    databaseURL: process.env.FIREBASEURL,
    projectId: process.env.FIREBASEPROJECTID,
    storageBucket: process.env.FIREBASEBUCKET,
    messagingSenderId: process.env.FIREBASESENDERID,
    appId: process.env.FIREBASEAPPID,
    measurementId: process.env.FIREBASEMEASUREMENTID
};

// initialize firebase
firebase.initializeApp(firebaseConfig);

const discordServices = require('./discord-services');
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
    .registerGroup('a_teamformation', 'team formation group for admins')
    .registerGroup('a_mentors', 'mentor group for admins')
    .registerGroup('a_channel_creation', 'channel creation commands')
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

    // check roles
    // we asume the bot is only in one guild!
    var guild = bot.guilds.cache.first();
    var roleManager = await guild.roles.fetch();

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
    firebaseServices.db.collection('announcements').onSnapshot(querySnapshot => {
        // exit if we are at the initial state
        if (isInitState) {
            isInitState = false;
            return;
        }

        querySnapshot.docChanges().forEach(change => {
            if (change.type === 'added') {
                const embed = new Discord.MessageEmbed()
                    .setColor(discordServices.announcementEmbedColor)
                    .setTitle(change.doc.data()['text']);
                
                guild.channels.resolve(discordServices.announcementChannel).send('<@&' + discordServices.attendeeRole + '> ANNOUNCEMENT!\n', {embed: embed});
            }
        })
    })
});



bot.on('error', console.error);

bot.on('message', async message => {

    // Deletes all messages to welcome that are not !verify or that are not from a staff or the bot
    if (message.channel.id === discordServices.welcomeChannel) {
        if (!message.content.startsWith('!verify') && message.author.bot === false && !discordServices.checkForRole(message.member, discordServices.staffRole)) {
            discordServices.replyAndDelete(message, 'This channel is only to run the verify command.');
            message.delete({timeout: 2000});
        }
    }

});

// Listeners for the bot

// If someone joins the server they get the guest role!
bot.on('guildMemberAdd', member => {
    discordServices.addRoleToMember(member, discordServices.guestRole);
    member.send("Welcome to the nwHacks Server, please verify your status with us in the welcome channel" +
        " by using the !verify <your email> command. If you have any questions feel free to contact our staff " +
        "at the welcome-support channel. We are so excited to have you here!");
});

bot.login(config.token).catch(console.error);

