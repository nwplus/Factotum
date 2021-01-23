const { Collection } = require("discord.js");
const Discord = require("discord.js");
const discordServices = require('../discord-services');

class Ticket {
    constructor(guild, question, caveOptions, requester, hackers, number, ticketMsg) {
        this.guild = guild;
        this.category;
        this.question = question;
        this.text;
        this.voice;
        this.caveOptions = caveOptions;
        this.requester = requester;
        this.hackers = hackers;
        this.hackercount = hackers.size + 1;
        this.mentors = [];
        this.number = number;
        this.ticketMsg = ticketMsg;
        this.interval;
        this.init();
    }

    async createCategory() {
        this.category = await this.guild.channels.create("Ticket - " + this.number, {
            type: 'category',
            permissionOverwrites: [
                {
                    id: discordServices.everyoneRole,
                    deny: ['VIEW_CHANNEL'],
                }
            ]
        });

        this.text = await this.guild.channels.create('banter', {
            type: 'text',
            parent: this.category
        });

        this.voice = await this.guild.channels.create('discussion', {
            type: 'voice',
            parent: this.category
        });
    }

    async init() {

        /**
         * @type {Discord.Collection<Discord.Snowflake, Discord.GuildEmoji>} - <guild emoji snowflake, guild emoji>
         */
        const ticketEmojis = new Discord.Collection();
        ticketEmojis.set(this.caveOptions.giveHelpEmoji.name, this.caveOptions.giveHelpEmoji);

        // the embed used to inform hackers and users of the open ticket, sent to the ticket text channel
        const openTicketEmbed = new Discord.MessageEmbed()
            .setColor(discordServices.embedColor)
            .setTitle('Original Question')
            .setDescription('<@' + this.requester.id + '> has the question: ' + this.question);

        /**
         * The message with the infomration embed sent to the ticket channel.
         * We have it up here for higher scope!
         * @type {Discord.Message}
         */
        var openTicketEmbedMsg;

        let ticketPermissions = { 'VIEW_CHANNEL': true, 'USE_VAD': true };

        const ticketCollector = this.ticketMsg.createReactionCollector((reaction, user) => !user.bot && ticketEmojis.has(reaction.emoji.name));

        ticketCollector.on('collect', async (reaction, helper) => {
            if (reaction.emoji.name === this.caveOptions.joinTicketEmoji.name) {
                // add new mentor to existing ticket channels
                await this.category.updateOverwrite(helper, ticketPermissions);
                this.text.send('<@' + helper.id + '> Has joined the ticket!').then(msg => msg.delete({ timeout: 10000 }));
                this.mentors.push(helper.id);

                this.ticketMsg.edit(this.ticketMsg.embeds[0].addField('More hands on deck!', '<@' + helper.id + '> Joined the ticket!'));
                openTicketEmbedMsg.edit(openTicketEmbedMsg.embeds[0].addField('More hands on deck!', '<@' + helper.id + '> Joined the ticket!'));
            } else {
                // edit incoming ticket with mentor information
                this.ticketMsg.edit(this.ticketMsg.embeds[0].addField('This ticket is being handled!', '<@' + helper.id + '> Is helping this team!')
                    .addField('Still want to help?', 'Click the ' + this.caveOptions.joinTicketEmoji.toString() + ' emoji to join the ticket!')
                    .setColor('#80c904'));
                this.ticketMsg.react(this.caveOptions.joinTicketEmoji);
                ticketEmojis.delete(this.caveOptions.giveHelpEmoji.name);
                ticketEmojis.set(this.caveOptions.joinTicketEmoji.name, this.caveOptions.joinTicketEmoji);

                // new ticket, create channels and add users
                await this.createCategory();
                await this.category.updateOverwrite(helper, ticketPermissions);
                await this.category.updateOverwrite(this.requester, ticketPermissions);
                this.hackers.forEach((user, snowflake, map) => this.category.updateOverwrite(user, ticketPermissions));

                let leaveTicketEmoji = '👋🏽';
                openTicketEmbed.addField('Thank you for helping this team.', '<@' + helper.id + '> Best of luck!')
                    .addField('When done:', '* React to this message with ' + leaveTicketEmoji + ' to lose access to these channels!');

                openTicketEmbedMsg = await this.text.send(openTicketEmbed);
                openTicketEmbedMsg.react(leaveTicketEmoji);

                this.mentors.push(helper.id);

                // send message mentioning all the parties involved so they get a notification
                let notificationMessage = '<@' + helper.id + '> <@' + this.requester.id + '>';
                this.hackers.forEach(user => notificationMessage.concat('<@' + user.id + '>'));
                this.text.send(notificationMessage).then(msg => msg.delete({ timeout: 15000 }));

                const looseAccessCollector = openTicketEmbedMsg.createReactionCollector((reaction, user) => !user.bot && reaction.emoji.name === leaveTicketEmoji);

                looseAccessCollector.on('collect', async (reaction, exitUser) => {
                    for (var i = 0; i < this.mentors.length; i++) {
                        if (this.mentors[i] === exitUser.id) {
                            this.mentors.splice(i, 1);
                        }
                    }

                    if (this.hackers.has(exitUser) || this.requester.id === exitUser.id) {
                        this.hackercount--;
                    }

                    if (this.hackercount === 0) {
                        ticketCollector.stop();
                        looseAccessCollector.stop();
                        await discordServices.deleteChannel(this.voice);
                        await discordServices.deleteChannel(this.text);
                        await discordServices.deleteChannel(this.category);

                        this.ticketMsg.edit(this.ticketMsg.embeds[0].setColor('#128c1e').addField('Ticket Closed', 'This ticket has been closed!! Good job!'));
                    } else if (this.mentors.length == 0) {
                        this.deletionSequence();
                        this.interval = setInterval(() => this.deletionSequence(), 60 * 1000);//change number in deployment
                    } else {
                        this.category.updateOverwrite(exitUser, { VIEW_CHANNEL: false, SEND_MESSAGES: false, READ_MESSAGE_HISTORY: false });
                    }
                });




            }
        });
    }


    async deletionSequence() {
        var hackerMentions = '<@' + this.requester.id + '>';
        this.hackers.forEach(user => hackerMentions.concat('<@' + user.id + '>'));
        this.text.send(hackerMentions + ' Hello! Just checking in.\n' + //might change the wording later to depend on situation
            'If your problem has been solved and you have all the information you need, please click the 👋 emoji above to leave the channel.\n' +
            'If you need to keep the channel, please click the emoji below, otherwise this ticket will be deleted soon.')
            .then((warning) => {
                warning.react('🔄');
                const deletionCollector = warning.createReactionCollector((reaction, user) => !user.bot && reaction.emoji.name === '🔄', { time: 30 * 1000, max: 1 }); //change number in deployment
                deletionCollector.on('end', async (collected) => {
                    if (collected.size == 0) {
                        clearInterval(this.interval);
                        await this.voice.delete();
                        await this.text.delete();
                        await this.category.delete();
                        this.ticketMsg.edit(this.ticketMsg.embeds[0].setColor('#128c1e').addField('Ticket Closed', 'This ticket has been closed!! Good job!'));
                    } else {
                        await this.text.send('You have indicated that you need more time. I\'ll check in with you later!');
                    }
                });
            });

    }
}

module.exports = Ticket;