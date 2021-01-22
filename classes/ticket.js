const { Collection } = require("discord.js");

class Ticket {
    constructor(guild, question, hackers, mentors, number, emojis) {
        this.guild = guild;
        this.category;
        this.question = question;
        this.text;
        this.voice;
        this.hackers = hackers;
        this.mentors = mentors;
        this.number = number;
        this.emojis = emojis;
    }

    async init() {
        this.createCategory();
    }

    async createCategory() {
        this.category = await this.guild.channels.createChannel("Ticket - " + number, {
            type: 'category',
            permissionOverwrites: [
                {
                    id: discordServices.everyoneRole,
                    deny: ['VIEW_CHANNEL'],
                }
            ]
        });

        this.text = await this.guild.channels.createChannel('banter', {
            type:'text',
            parent: this.category
        });

        this.text = await this.guild.channels.createChannel('discussion', {
            type:'voice',
            parent: this.category
        });
    }

    
}