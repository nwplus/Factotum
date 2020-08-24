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
module.exports = class Attendace extends Command {
    constructor(client) {
        super(client, {
            name: 'attend',
            group: 'verification',
            memberName: 'hacker attendance',
            description: 'Will mark a hacker as attending and upgrade role to Attendee',
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
        if (message.member.roles.cache.some(r => r.name === "Hacker")) {
            if (await this.checkForValidation(email, hackerGroup) == true) {
                message.member.send('Thank you for attending nwHacks 2020. Happy hacking!!!');
                message.member.roles.add(message.member.guild.roles.cache.find(role => role.name === "Attendee"));
                message.guild.channels.cache.find(channel => channel.name === "logs").send("Hacker with email " + email +
                    " is attending nwHacks 2020!");
            }
            else {
                message.member.send('Hi there, the email you tried to attend with is not' +
                    ' in our system, please make sure your email is well typed. If you think this is an error' +
                    ' please contact us in the welcome-support channel.');
            }

        } else {
            message.member.send('Hi there, it seems you are already marked as attendee, or you do not need to be marked as attendee. Happy hacking!');
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
               'isAttending' : true,
           });
           return true;
       } else {
           return false;
       }
    }



};