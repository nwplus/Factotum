const commando = require('discord.js-commando');
require('dotenv-flow').config();
const config = {
    token: process.env.token,
    owner: process.env.owner,
}
const bot = new commando.Client({
    commandPrefix: '!',
    owner: config.owner,
});

bot.registry
    .registerDefaultTypes()
    .registerGroup('verification', 'Verification group')
    .registerDefaultGroups()
    .registerDefaultCommands()
    .registerCommandsIn(__dirname + '/commands');

bot.once('ready', () => {
    console.log(`Logged in as ${bot.user.tag}!`);
    bot.user.setActivity('Ready to hack!');
});



bot.on('error', console.error);

// Listeners for the bot
bot.on('guildMemberAdd', member => {
    member.roles.add(member.guild.roles.cache.find(role => role.name === "Guest"));
    member.send("Welcome to the nwHacks Server, please verify your status with us in the welcome channel" +
        " by using the !verify <your email> command. If you have any questions feel free to contact our staff " +
        "at the welcome-support channel. We are so excited to have you here!");
});


bot.login(config.token);

