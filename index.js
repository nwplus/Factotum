const commando = require('discord.js-commando');

require('dotenv-flow').config();

// Firebase requirements
var firebase = require('firebase/app');

// firebase config
var firebaseConfig = {
    apiKey: "AIzaSyAhSTmLUzz-MeTD2X0qzfdELyoERLnzYGo",
    authDomain: "nwplus-bot.firebaseapp.com",
    databaseURL: "https://nwplus-bot.firebaseio.com",
    projectId: "nwplus-bot",
    storageBucket: "nwplus-bot.appspot.com",
    messagingSenderId: "712141696288",
    appId: "1:712141696288:web:62e554d609ed89bb0d3b45",
    measurementId: "G-VPRQ5SQVCB"
};

// initialize firebase
firebase.initializeApp(firebaseConfig);

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
    .registerGroup('h_boothing', 'boothing group for hackers')
    .registerGroup('s_boothing', 'boothing group for sponsorship')
    .registerGroup('a_activity', 'activity group for admins')
    .registerGroup('h_workshop', 'workshop group for hackers')
    .registerGroup('m_workshop', 'workshop group for mentors and tas')
    .registerGroup('a_teamformation', 'team formation group for admins')
    .registerDefaultGroups()
    .registerDefaultCommands()
    .registerCommandsIn(__dirname + '/commands');

bot.once('ready', () => {
    console.log(`Logged in as ${bot.user.tag}!`);
    bot.user.setActivity('Ready to hack!');
});



bot.on('error', console.error);

bot.on('message', async message => {

    // Deletes all messages to welcome that are not !verify or that are not from a staff or the bot
    if (message.channel.id === '743192401434378271') {
        if (!message.content.startsWith('!verify') && message.author.bot === false && !( await discordServices.checkForRole(message.member, discordServices.staffRole)) ) {
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

