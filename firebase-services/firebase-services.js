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
            'asked': true,
        });
        return question.data();
    }
    return null;
}
module.exports.getQuestion = getQuestion;

/**
 * Retrieves self-care reminder from the db that has not already been sent, 
 * then marks the reminder as having been asked in the db.
 * @returns {Object | null} - the data object of a reminder or null if no more reminders
 */
async function getReminder() {
    //checks that the reminder has not been sent
    var qref = db.collection('reminders').where('sent', '==', false).limit(1);
    var reminder = (await qref.get()).docs[0];
    //if there reminder unsent, change its status to asked
    if (reminder != undefined) {
        reminder.ref.update({
            'sent' : true,
        });
        return reminder.data();
    }
    return null;
}
module.exports.getReminder = getReminder;


/**
 * @typedef {Object} Member
 * @property {String} email - the email of the member
 * @property {Boolean} isVerified - whether member has already verified
 * @property {String} type - role a member has in the server
 */

/**
 * Checks to see if the input email matches or is similar to emails in the database
 * Returns an array of objects containing emails that match or are similar, along with the verification status of each, 
 * and returns empty array if none match
 * @param {String} email - email to check
 * @returns {Promise<Array<Member>>} - array of members with similar emails to parameter email
 */
async function checkEmail(email) {
    const snapshot = (await db.collection('members').get()).docs; // retrieve snapshot as an array of documents in the Firestore
    var foundEmails = [];
    snapshot.forEach(memberDoc => {
        // compare each member's email with the given email
        if (memberDoc.get('email') != null) {
            let compare = memberDoc.get('email');
            // if the member's emails is similar to the given email, retrieve and add the email, verification status, and member type of
            // the member as an object to the array
            if (compareEmails(email.split('@')[0], compare.split('@')[0])) {
                foundEmails.push({
                    email: compare,
                    type: memberDoc.get('type')
                });
            };
        }
    });
    return foundEmails;
}
module.exports.checkEmail = checkEmail;

/**
 * Uses Levenshtein Distance to determine whether two emails are within 5 Levenshtein Distance
 * @param {String} searchEmail - email to search for similar emails for
 * @param {String} dbEmail - email from db to compare to searchEmail
 * @returns {Boolean} - Whether the two emails are similar
 */
function compareEmails(searchEmail, dbEmail) {
    // matrix to track Levenshtein Distance with
    var matrix = new Array(searchEmail.length);
    var searchEmailChars = searchEmail.split('');
    var dbEmailChars = dbEmail.split('');
    // initialize second dimension of matrix and set all elements to 0
    for (var i = 0; i < matrix.length; i++) {
        matrix[i] = new Array(dbEmail.length);
        for (var j = 0; j < matrix[i].length; j++) {
            matrix[i][j] = 0;
        }
    }
    // set all elements in the top row and left column to increment by 1
    for (var i = 1; i < searchEmail.length; i++) {
        matrix[i][0] = i;
    }
    for (var j = 1; j < dbEmail.length; j++) {
        matrix[0][j] = j;
    }
    // increment Levenshtein Distance by 1 if there is a letter inserted, deleted, or swapped; store the running tally in the corresponding
    // element of the matrix
    var substitutionCost;
    for (var j = 1; j < dbEmail.length; j++) {
        for (var i = 1; i < searchEmail.length; i++) {
            if (searchEmailChars[i] === dbEmailChars[j]) {
                substitutionCost = 0;
            } else {
                substitutionCost = 1;
            }
            matrix[i][j] = Math.min(matrix[i - 1][j] + 1, matrix[i][j - 1] + 1, matrix[i - 1][j - 1] + substitutionCost);
        }
    }
    return matrix[searchEmail.length - 1][dbEmail.length - 1] <= (Math.min(searchEmail.length, dbEmail.length) / 2);
}

/**
 * Finds the email of user with given first and last names 
 * @param {String} firstName - first name of member to match with database
 * @param {String} lastName - last name of member to match with database
 * @returns {String} - email of given member
 */
async function checkName(firstName, lastName) {
    const snapshot = (await db.collection('members').get()).docs; // snapshot of Firestore as array of documents
    snapshot.forEach(memberDoc => {
        if (memberDoc.get('firstName') != null && memberDoc.get('lastName') != null && memberDoc.get('firstName').toLowerCase() === firstName.toLowerCase()
            && memberDoc.get('lastName').toLowerCase() === lastName.toLowerCase()) { // for each document, check if first and last names match given names
            return memberDoc.get('email');
        }
    });
    return null;
}
module.exports.checkName = checkName;

/**
 * Adds new document in Firebase members collection for manually verified member
 * @param {String} email - email of member verified
 * @param {GuildMember} member - member verified
 * @param {String} type - type of participant verified
 */
async function addUserData(email, member, type) {
    var newDocument = db.collection('members').doc();
    if (type === 'hacker') {
        var verifyLearn = false;
        if (new Date() < new Date(2021, 1, 28)) {
            verifyLearn = true;
        }
        newDocument.set({
            'email': email,
            'type': 'hacker',
            'discord-id': member.id,
            'canVerifyLearn': true,
            'canVerifycmdf': true,
            'verifiedLearn': verifyLearn,
            'verifiedcmdf': !verifyLearn,
        });
    } else {
        newDocument.set({
            'email': email,
            'type': type,
            'discord-id': member.id,
            'verified': true,
        });
    }
}
module.exports.addUserData = addUserData;
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

    if (user) {
        var data = user.data();
        if (!data['isVerified']) {
            user.ref.update({
                'isVerified': true,
                'discord-id': id,
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
            'isAttending': true,
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