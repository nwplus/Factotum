// Discord.js commando requirements
const { Command } = require('discord.js-commando');
const firebaseServices = require('../../firebase-services');

// Command export
module.exports = class Verificaiton extends Command {
    constructor(client) {
        super(client, {
            name: 'verify',
            group: 'verification',
            memberName: 'hacker verificaiton',
            description: 'Will verify a guest to its correct role if his/her email is in our databse',
            guildOnly: true,
            args: [
                {
                    key: 'email',
                    prompt: 'Please provide your email address',
                    type: 'string',
                },
                
            ],
        });
    }

    // Run function -> command body
    async run(message, { email }) {

        // Make sure it is only used in the welcome channel
        if (message.channel.name === 'welcome') {
            // Make sure only guests can call this command
            if (message.member.roles.cache.some(r => r.name === "Guest")) {

                // Call the verify function to get status
                var status = await firebaseServices.verify(email);
    
                switch(status) {
                    case firebaseServices.status.HACKER_SUCCESS:
                        message.member.send('Thank you for verifing your status with us, you now have acces to ' +
                        ' most of the server. Remember you need to !attend <your email> in the attend channel that will' +
                        ' open a few hours before the hackathon beggins.');
                        message.member.roles.add(message.member.guild.roles.cache.find(role => role.name === "Hacker"));
                        message.member.roles.remove(message.member.guild.roles.cache.find(role => role.name === "Guest"));
                        message.guild.channels.cache.find(channel => channel.name === "logs").send("Verified email " + email +
                            " successfully and he is now a hacker!");
                        break;
                    case firebaseServices.status.HACKER_IN_USE:
                        message.member.send('Hi there, it seems the email you tried to verify with is already in use! Please make ' +
                        'sure that you have the correct email. If you think this is an error please contact us in the welome-support channel.');
                        break;
                    case firebaseServices.status.SPONSOR_SUCCESS:
                        message.member.send('Hi there sponsor, thank you very much for being part of nwHacks and for joining our discord!');
                        message.member.roles.add(message.member.guild.roles.cache.find(role => role.name === "Sponsor"));
                        message.member.roles.remove(message.member.guild.roles.cache.find(role => role.name === "Guest"));
                        message.guild.channels.cache.find(channel => channel.name === "logs").send("Verified email " + email +
                            " successfully and he is now a sponsor!");
                        break;
                    case firebaseServices.status.SPONSOR_IN_USE:
                        message.member.send('Hi there sponsor, thank you very much for being part of nwHacks, we would love to give you access ' +
                        'to our discord but the email you used to verify is already in use! If you think this is a mistake in our part please ' + 
                        'let us know in the welcome-support channel.');
                        break;
                    case firebaseServices.status.MENTOR_SUCCESS:
                        message.member.send('Hi there mentor, thank you very much for being part of nwHacks and for joining our discord!');
                        message.member.roles.add(message.member.guild.roles.cache.find(role => role.name === "Mentor"));
                        message.member.roles.remove(message.member.guild.roles.cache.find(role => role.name === "Guest"));
                        message.guild.channels.cache.find(channel => channel.name === "logs").send("Verified email " + email +
                        " successfully and he is now a mentor!");
                        break;
                    case firebaseServices.status.MENTOR_IN_USE:
                        message.member.send('Hi there mentor, thank you very much for being part of nwHacks, we would love to give you access ' +
                        'to our discord but the email you used to verify is already in use! If you think this is a mistake in our part please ' + 
                        'let us know in the welcome-support channel.');
                        break;
                    case firebaseServices.status.STAFF_SUCCESS:
                        message.member.send('Hi there mate! Welcome to your discord! If you need to know more about what I can do please call !help.');
                        message.member.roles.add(message.member.guild.roles.cache.find(role => role.name === "Staff"));
                        message.member.roles.remove(message.member.guild.roles.cache.find(role => role.name === "Guest"));
                        message.guild.channels.cache.find(channel => channel.name === "logs").send("Verified email " + email +
                        " successfully and he is now a staff!");
                        break;
                    case firebaseServices.status.STAFF_IN_USE:
                        message.member.send('Hi there mate! It seems this email is already in use! If this is a mistake let my creator know via slack!');
                        break;
                    case firebaseServices.status.FAILURE:
                        message.member.send('Hi there, the email you tried to verify yourself with is not' +
                        ' in our system, please make sure your email is well typed. If you think this is an error' +
                        ' please contact us in the welcome-support channel.');
                        break;
                }
            } else {
                message.member.send('Hi there, it seems you have tried to verify your email when you are already more then a guest. No need to do it agian!');
            }
        } else {
            message.member.send('Hi, the !verify command is only available in the welcome channel!');
        }
        message.delete();
    }

};