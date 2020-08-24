// Discord.js commando requirements
const { Command } = require('discord.js-commando');

// Firebase requirements
var firebase = require('firebase/app');
require('firebase/firestore');

// var to hold firestore
const db = firebase.firestore();

// collection constats
const hackerGroup = 'hackers';
const sponsorGroup = 'sponsors';
const mentorGroup = 'mentors';
const staffGroup = 'staff'

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
        if (message.member.roles.cache.some(r => r.name === "Guest")) {
            if (await this.checkForValidation(email, hackerGroup) == true) {
                message.member.send('Thank you for verifing your status with us, you now have acces to ' +
                    ' most of the server. Remember you need to !attend <your email> in the attend channel that will' +
                    ' open a few hours before the hackathon beggins.');
                message.member.roles.add(message.member.guild.roles.cache.find(role => role.name === "Hacker"));
                message.member.roles.remove(message.member.guild.roles.cache.find(role => role.name === "Guest"));
                message.guild.channels.cache.find(channel => channel.name === "logs").send("Verified email " + email +
                    " successfully and he is now a hacker!");
            }
            else if (await this.checkForValidation(email, sponsorGroup) == true) {
                message.member.send('Hi there sponsor, thank you very much for being part of nwHacks and for joining our discord!');
                message.member.roles.add(message.member.guild.roles.cache.find(role => role.name === "Sponsor"));
                message.member.roles.remove(message.member.guild.roles.cache.find(role => role.name === "Guest"));
                message.guild.channels.cache.find(channel => channel.name === "logs").send("Verified email " + email +
                    " successfully and he is now a sponsor!");
            }
            else if (await this.checkForValidation(email, mentorGroup) == true) {
                message.member.send('Hi there mentor, thank you very much for being part of nwHacks and for joining our discord!');
                message.member.roles.add(message.member.guild.roles.cache.find(role => role.name === "Mentor"));
                message.member.roles.remove(message.member.guild.roles.cache.find(role => role.name === "Guest"));
                message.guild.channels.cache.find(channel => channel.name === "logs").send("Verified email " + email +
                    " successfully and he is now a mentor!");
            }
            else if (await this.checkForValidation(email, staffGroup) == true) {
                message.member.send('Hi there mate! Welcome to your discord! If you need to know more about what I can do please call !help.');
                message.member.roles.add(message.member.guild.roles.cache.find(role => role.name === "Staff"));
                message.member.roles.remove(message.member.guild.roles.cache.find(role => role.name === "Guest"));
                message.guild.channels.cache.find(channel => channel.name === "logs").send("Verified email " + email +
                    " successfully and he is now a staff!");
            }
            else {
                message.member.send('Hi there, the email you tried to verify yourself with is not' +
                    ' in our system, please make sure your email is well typed. If you think this is an error' +
                    ' please contact us in the welcome-support channel.');
            }

        } else {
            message.member.send('Hi there, it seems you have tried to verify your email when you are already more then a guest. No need to do it agian!');
        }
        message.delete();
        
    }

    // checks if the email is registerd
    // Params: the collection you want to check on, options: check collection constants
    async checkForValidation(email, group) {
       var userRef = db.collection(group).doc(email);
       var user = await userRef.get();
       if (user.exists) {
           userRef.set({
               'isVerified' : true,
           });
           return true;
       } else {
           return false;
       }
    }



};