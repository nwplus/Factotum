// Discord.js commando requirements
const { Command } = require('discord.js-commando');
const firebaseServices = require('../../firebase-services/firebase-services');
const firebaseBoothing = require('../../firebase-services/firebase-services-boothing')
const discordServices = require('../../discord-services');
const Discord = require('discord.js');

// Command export
module.exports = class StartBoothing extends Command {
    constructor(client) {
        super(client, {
            name: 'startb',
            group: 'a_boothing',
            memberName: 'start boothing',
            description: 'Will start the boothing functionality with emoji collectors.',
            guildOnly: true,
            args: [],
        });
    }

    // Run function -> command body
    async run(message) {
        discordServices.deleteMessage(message);
        // make sure command is only used in the boothing-wait-list channel
        if (message.channel.name != 'boothing-wait-list') {
            discordServices.replyAndDelete(message, 'This command can only be ran in the boothing-wait-list channel!');
            return;
        }
        // only memebers with the Attendee tag can run this command!
        if (!(await discordServices.checkForRole(message.member, discordServices.staffRole))) {
            discordServices.replyAndDelete(message, 'This command can only be ran by staff!');
            return;
        }
        
        ////// hacker side message
        // message to send describing the different emojis
        const textEmbed = new Discord.MessageEmbed()
            .setColor(discordServices.embedColor)
            .setTitle('Sponsor Boothing')
            .setDescription('Welcome to our sponsor booth! Please react to one of the emojis below to get started!')
            .addField('Join Wait List Alone', 'If you want to join the wait list by yourself please react to ' + ':sunglasses:')
            .addField('Joine Wait List with Group', 'If you want to join the wait list with a group of friends, please react to ' + ':family_mwgb:' + ' and follow the promts.');

        var msg = await message.channel.send(textEmbed);
        await msg.react('😎');
        await msg.react('👨‍👩‍👦‍👦');

        ////// sponsor side message
        // send wait list message to sponsors
        var sponsorChannel = await message.guild.channels.resolve(discordServices.sponsorConsoleChannel);

        const sponsorEmbed = new Discord.MessageEmbed()
            .setColor(discordServices.embedColor)
            .setTitle('The Wait List')
            .setDescription('This is the wait list, it will always stay up to date! To get the next group react to this message with 🤝');

        var sponsorMsg = await sponsorChannel.send(sponsorEmbed);
        await sponsorMsg.react('🤝');


        // booth name
        var boothName = 'Example Name';
        // init the booth in firebase
        firebaseBoothing.startBooth(boothName, sponsorMsg.id);


        // reaction collector for sponsor console (wait list) in sponsor only text channel
        const getNextFilter = ((reaction, user) => user.bot === false && reaction.emoji.name === '🤝');
        const getNextCollector = sponsorMsg.createReactionCollector(getNextFilter);

        getNextCollector.on('collect', async (reaction, user) => {
            await this.getNextFromWaitList(reaction, user, message, sponsorChannel, boothName, sponsorMsg);
        });


        // reaction collector for hacker sign up, located in public text channel
        const filter = (reaction, user) => {
            return user.bot === false && reaction.emoji.name === '😎' || reaction.emoji.name === '👨‍👩‍👦‍👦';
        };
        const collector = msg.createReactionCollector(filter);  // collector will run forever since no time limit set

        collector.on('collect', async (reaction, user) => {
            await this.joinWaitList(user, reaction, message, boothName, sponsorMsg);
        });
    }


    // will add the user and possible group (that this will ask for), to the sponsor wait list
    async joinWaitList(user, reaction, message, boothName, sponsorMsg) {
        // grab username of member to join wait list
        var username = user.username;

        // need an empty list for group
        var usernameList = [];

        // if reaction is of group ask for group members
        if (reaction.emoji.name === '👨‍👩‍👦‍👦') {
            await message.channel.send('<@' + user.id + '> Please tag all your group members in a message!').then(async (msg) => {
                // filter for message collector, only from this user
                const msgFilter = m => m.author.id === user.id;

                await msg.channel.awaitMessages(msgFilter, { max: 1 }).then(ms => {
                    // given a list of messages, so grab firts
                    var m = ms.first();
                    // grab all the mentions in the message
                    var members = m.mentions.members;
                    members.each(mem => usernameList.push(mem.user.username));

                    // remove messages
                    m.delete();
                    msg.delete();
                });
            });
        }

        var statusOrSpot = await firebaseBoothing.addGroupToBooth(boothName, username, usernameList);

        // If the user is alredy in the waitlist then tell him that and return 
        if (statusOrSpot === firebaseServices.status.HACKER_IN_USE) {
            discordServices.sendMessageToMember(user, 'Hey there! It seems you are already on the wait list, if you would like to ' +
                'know your spot please run the !requestposition command right here!', true);
            return;
        }

        // get number of hackers in wait list
        var number = statusOrSpot;

        // message to be sent to hacker
        const dmEmbed = new Discord.MessageEmbed()
            .setColor(discordServices.embedColor)
            .setTitle('Sponsor Boothing Wait List')
            .setDescription('Hey there! We got you singed up to talk to a sponsor! Sit tight in the voice channel. If you ' +
                'are not in the voice channel when its your turn you will be skipped, and we do not want that to happen!')
            .addField('Wait list position', 'You are number: ' + number + ' in the wait list.')
            .addField('!position', 'Command you can call in this DM to get your spot in the wait list.')
            .addField('Remove from Wait List', 'If you want to be removed from the wait list please react this message with 🚫.');

        // send message to hacker and react with emoji 
        var dm = await discordServices.sendMessageToMember(user, dmEmbed);
        await dm.react('🚫');

        // filter for emoji to remove from wait list
        const dmFilter = (reaction, sr) => {
            return reaction.emoji.name === '🚫' && !sr.bot;
        };

        // emoji await in case user wants to remvoe themselves from the waitlist
        dm.awaitReactions(dmFilter, { max: 1 })
            .then(async (collected) => {
                // remove original dm message
                dm.delete({ timeout: 3000 });

                // remove from wait list
                firebaseBoothing.removeGroupFromBooth(boothName, username);
                discordServices.sendMessageToMember(user, 'Hey there! You have ben removed from the waitlist, thanks for letting us know!', true);

                // remove group from wait list
                var embed = sponsorMsg.embeds[0];
                var fields = embed.fields;
                fields = fields.filter(field => !field.name.includes(user.username));
                embed.fields = fields;
                sponsorMsg.edit(embed);

            });

        // add new group to the wait list
        var embed = sponsorMsg.embeds[0];
        embed.addField('#' + embed.fields.length + ' ' + user.username, 'Is waiting to talk with someone!');
        sponsorMsg.edit(embed);
    }


    // will grab the next group in the wait list and move them to the sponsor's voice channel
    async getNextFromWaitList(reaction, user, message, sponsorChannel, boothName, sponsorMsg) {
        // remove the reaction
        reaction.users.remove(user.id);

        // grab the sponsors voice channel
        var sponsor = await message.guild.members.fetch(user.id);
        var sponsorVoice = sponsor.voice.channel;

        // if the sponsor is not in a voice channel warn him and return
        if (sponsorVoice === null) {
            sponsorChannel.send('<@' + user.id + '> Please join a voice channel before asking me to assing you a group!').then(msg => msg.delete({ timeout: 5000 }));
            return;
        }

        var listOrStatus = await firebaseBoothing.getNextForBooth(boothName);

        // if failure let sponsor know there are no groups and return
        if (listOrStatus === firebaseServices.status.FAILURE) {
            sponsorChannel.send('<@' + user.id + '> There are no groups waiting!').then(msg => msg.delete({ timeout: 5000 }));
            return;
        }

        // get groups
        var currentGroup = listOrStatus['current group'];
        var nextGroup = listOrStatus['next group'];

        // let next group know they are next
        nextGroup.forEach(async (username) => {
            var member = await message.guild.members.cache.find(member => member.user.username === username);
            discordServices.sendMessageToMember(member, 'You are next! Get ready to talk to a sponsor, make sure you are in the waitlist voice channel!');
        });

        // bool to see if someone was added to the voice channel
        var isAdded = false;

        // let current group know they are now in with a sponsor
        for (var i = 0; i < currentGroup.length; i++) {
            var member = await message.guild.members.cache.find(member => member.user.username === currentGroup[i]);
            try {
                await member.voice.setChannel(sponsorVoice);
                isAdded = true;
                discordServices.sendMessageToMember(member, 'Hey hey, a sponsor is ready to talk to you! You are now live!');
            } catch (err) {
                discordServices.sendMessageToMember(member, 'Hi there! We tried to get you in a voice channel with a sponsor but you were not available. ' +
                    'Remember you need to stay in the wait list voice channel! If you would like to try again please call the command again in the boothin-wait-list text chanel.' +
                    'If you were in a group and one of your friends made it into the private call then join the waitlist voicechannel ASAP so the sponsor can add you manualy!');
            }
        }

        // if no one was added skip this team and let the sponsor know!
        if (isAdded === false) {
            sponsorChannel.send('<@' + user.id + '> The team is not available right now! They have been skiped, please try again.').then(msg => msg.delete({ timeout: 5000 }));
        } else {
            sponsorChannel.send('<@' + user.id + '> The group has been added! Happy talking!!!').then(msg => msg.delete({ timeout: 5000 }));
        }

        // remove user from wait list in channel
        var embed = sponsorMsg.embeds[0];
        var fields = embed.fields;
        fields = fields.filter(field => !field.name.includes('#0 '));
        embed.fields = fields;
        sponsorMsg.edit(embed);
    }
};