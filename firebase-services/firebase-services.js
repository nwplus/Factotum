// Firebase requirements
const { firestore } = require('firebase/app');
const firebase = require('firebase/app');
require('firebase/firestore');

// var to hold firestore
const db = firebase.firestore();
const nwDB = firebase.firestore(firebase.apps.find((value, index, app) => value.name === 'nwFirebase'));
module.exports.db = db;
module.exports.nwDB = nwDB;

// collection constats
const groups = {
    hackerGroup : 'hackers',
    sponsorGroup : 'sponsors',
    mentorGroup : 'mentors',
    staffGroup : 'staff',
    activityGroup : 'activities',
    boothGroup : 'booths',
}
module.exports.groups = groups;

// Enum used internaly for firebase functions returns
const internalStatus = {
    // Everything worked well
    SUCCESS: 1,
    // Email was not found
    FAILURE: 2,
    // Email was found but already in use
    FAILTURE_IN_USE: 3,
}

// Enum used publicly for firebase function returns
const status = {
    HACKER_SUCCESS: "C1",
    HACKER_IN_USE: "C2",
    SPONSOR_SUCCESS: "C3",
    SPONSOR_IN_USE: "C4",
    MENTOR_SUCCESS: "C5",
    MENTOR_IN_USE: "C6",
    STAFF_SUCCESS: "C7",
    STAFF_IN_USE: "C8",
    FAILURE: "C0",
}
module.exports.status = status;



/**
 * Verifies the mentor/sponsor/staff member via their email.
 * @param {String} email - the user email
 * @param {String} id - the user's discord snowflake
 * @private
 * @returns {Promise<String>} - one of the status constants
 */
async function verifyUser(email, id) {
    var userRef = db.collection('members').where('email', '==', email).limit(1);
    var user = (await userRef.get()).docs[0];
    if(user != undefined) {
        var data = user.data();
        if(data['isVerified'] == false) {
            // user.ref.update({
            //     'isVerified' : true,
            //     'discord id' : id,
            // });
            return data['type'] == 'mentor' ? status.MENTOR_SUCCESS : data['type'] == 'sponsor' ? status.SPONSOR_SUCCESS : status.STAFF_SUCCESS;
        } else if (data['isVerified'] == true) {
            return status.FAILURE;
        }
    }
    return status.FAILURE;
}


/**
 * Verify a hacker by their email. Will make sure the hacker was accepted.
 * @param {String} email - the email of the hacker to verify
 * @param {String} id - the user's discord id snowflake
 * @private
 * @returns {Promise<String>} - one of the status constants
 */
async function verifyHacker(email, id) {
    var userRef = nwDB.collection('Hackathons').doc('nwHacks2021').collection('Applicants').where('basicInfo.email', '==', email).limit(1);
    var user = (await userRef.get()).docs[0];

    if (user != undefined) {
        let data = user.data();
        if (data['status'].applicationStatus === 'accepted' && (data['discord.isVerified'] == null || data['discord.isVerified'] == false) ) {
            // user.ref.update({
            //     'discord.id' : id,
            //     'discord.isVerified' : true,
            // });
            return status.HACKER_SUCCESS;
        } else return status.HACKER_IN_USE;
    } else return status.FAILURE;
}


/**
 * Verifies a discord member.
 * @param {String} email - member's email with which to verify
 * @param {String} id - member's discord id snowlfake
 * @returns {Promise<String>} - one of the status constants
 */
async function verify(email, id) {
    // Check if hacker
    var sts = await verifyHacker(email, id);
    if(sts != status.FAILURE) {
        return sts;
    } else {
        // check everything else
        sts = await verifyUser(email, id);
        return sts;
    }
}
module.exports.verify = verify;

// sets the attendance to true for this email, this only works with hackers!
async function attendHacker(email) {
    var userRef = nwDB.collection('Hackathons').doc('nwHacks2021').collection('Applicants').where('basicInfo.email', '==', email).limit(1);
    var user = (await userRef.get()).docs[0];
    if (user != undefined) {
        data = user.data();
        if (data['discord.isAttending'] == false) {
            // user.ref.update({
            //     'discord.isAttending' : true,
            // });
            return status.HACKER_SUCCESS;
        } else if (data['discord.isAttending'] == true) {
            return status.HACKER_IN_USE;
        }
    } else {
        return status.FAILURE;
    }
}
module.exports.attendHacker = attendHacker;