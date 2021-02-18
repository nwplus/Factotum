// Firebase requirements
const firebase = require('firebase/app');
require('firebase/firestore');
const admin = require('firebase-admin');

// var to hold firestore
// const db = firebase.firestore()
const db = admin.firestore();
module.exports.db = db;


/**
 * @typedef FirebaseStatus
 * @property {String} HACKER_SUCCESS - hacker related job was successful
 * @property {String} HACKER_IN_USE - hacker related job was not successful due to operation already been done
 * @property {String} SPONSOR_SUCCESS - sponsor related job was successful
 * @property {String} SPONSOR_IN_USE - sponsor related job was not successful due to operation already been done
 * @property {String} MENTOR_SUCCESS - mentor related job was successful
 * @property {String} MENTOR_IN_USE - mentor related job was not successful due to operation already been done
 * @property {String} STAFF_SUCCESS - staff related job was successful
 * @property {String} STAFF_IN_USE - staff related job was not successful due to operation already been done
 * @property {String} FAILURE - the job was not successful due to an error or the user not being found
 */

/**
 * Different status used by firebase functions to let the user know what happened.
 * @type {FirebaseStatus}
 */
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
 * Retrieves a question from the db that has not already been asked at the Discord Contests, then marks the question as having been 
 * asked in the db.
 * @returns {Object | null} - the data object of a question or null if no more questions
 */
async function getQuestion() {
    //checks that the question has not been asked
    var qref = db.collection('questions').where('asked', '==', false).limit(1);
    var question = (await qref.get()).docs[0];
    //if there exists an unasked question, change its status to asked
    if (question != undefined) {
        question.ref.update({
            'asked' : true,
        });
        return question.data();
    }
    return null;
}
module.exports.getQuestion = getQuestion;


/**
 * Verifies the any event member via their email.
 * @param {String} email - the user email
 * @param {String} id - the user's discord snowflake
 * @returns {Promise<FirebaseStatus>} - one of the status constants
 * @async
 */
async function verifyUser(email, id) {
    var userRef = db.collection('members').where('email', '==', email).limit(1);
    var user = (await userRef.get()).docs[0];
    
    if(user) {
        var data = user.data();
        if(!data['isVerified']) {
            user.ref.update({
                'isVerified' : true,
                'discord-id' : id,
            });
            return data['type'] == 'hacker' ? status.HACKER_SUCCESS : data['type'] == 'mentor' ? status.MENTOR_SUCCESS : data['type'] == 'sponsor' ? status.SPONSOR_SUCCESS : status.STAFF_SUCCESS;
        } else {
            return data['type'] == 'hacker' ? status.HACKER_IN_USE : data['type'] == 'mentor' ? status.MENTOR_IN_USE : data['type'] == 'sponsor' ? status.SPONSOR_IN_USE : status.STAFF_IN_USE;
        }
    }
    return status.FAILURE;
}
module.exports.verifyUser = verifyUser;

/**
 * Will set the isAttending field to true, finds user via discord-id.
 * @param {String} id - discord user ID to identify
 * @returns {Promise<FirebaseStatus>}
 * @async
 */
async function attendUser(id) {
    var userRef = db.collection('members').where('discord-id', '==', id).limit(1);
    var user = (await userRef.get()).docs[0];

    if (user) {
        user.ref.update({
            'isAttending' : true,
        });

        return status.HACKER_SUCCESS;
    } else {
        return status.FAILURE;
    }
}
module.exports.attendUser = attendUser;

// /**
//  * Verify a hacker by their email. Will make sure the hacker was accepted.
//  * @param {String} email - the email of the hacker to verify
//  * @param {String} id - the user's discord id snowflake
//  * @private
//  * @returns {Promise<String>} - one of the status constants
//  */
// async function verifyHacker(email, id) {
//     var userRef = nwDB.collection('Hackathons').doc('nwHacks2021').collection('Applicants').where('basicInfo.email', '==', email).limit(1);
//     var user = (await userRef.get()).docs[0];

//     if (user != undefined) {
//         let data = user.data();
//         if (data['status'].applicationStatus === 'accepted' && (data['discord.isVerified'] == null || data['discord.isVerified'] == false) ) {
//             // user.ref.update({
//             //     'discord.id' : id,
//             //     'discord.isVerified' : true,
//             // });
//             return status.HACKER_SUCCESS;
//         } else return status.HACKER_IN_USE;
//     } else return status.FAILURE;
// }


// /**
//  * Verifies a discord member.
//  * @param {String} email - member's email with which to verify
//  * @param {String} id - member's discord id snowflake
//  * @returns {Promise<String>} - one of the status constants
//  */
// async function verify(email, id) {
//     // Check if hacker
//     var sts = await verifyHacker(email, id);
//     if(sts != status.FAILURE) {
//         return sts;
//     } else {
//         // check everything else
//         sts = await verifyUser(email, id);
//         return sts;
//     }
// }
// module.exports.verify = verify;

// // sets the attendance to true for this email, this only works with hackers!
// async function attendHacker(email) {
//     var userRef = nwDB.collection('Hackathons').doc('nwHacks2021').collection('Applicants').where('basicInfo.email', '==', email).limit(1);
//     var user = (await userRef.get()).docs[0];
//     if (user != undefined) {
//         data = user.data();
//         if (data['discord.isAttending'] == false) {
//             // user.ref.update({
//             //     'discord.isAttending' : true,
//             // });
//             return status.HACKER_SUCCESS;
//         } else if (data['discord.isAttending'] == true) {
//             return status.HACKER_IN_USE;
//         }
//     } else {
//         return status.FAILURE;
//     }
// }
// module.exports.attendHacker = attendHacker;