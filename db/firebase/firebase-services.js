const { GuildMember, } = require('discord.js');
const admin = require('firebase-admin');

/**
 * All the firebase apps in play stored by their name.
 * @type {Map<String, admin.app.App>}
 */
const apps = new Map();
module.exports.apps = apps;

/**
 * Will start an admin connection with the given name
 * @param {String} name - name of the connection
 * @param {JSON} adminSDK - the JSON file with admin config
 * @param {String} databaseURL - the database URL
 */
function initializeFirebaseAdmin(name, adminSDK, databaseURL) {
    let app = admin.initializeApp({
    credential: admin.credential.cert(adminSDK),
    databaseURL: databaseURL,
    }, name);

    apps.set(name, app);

}
module.exports.initializeFirebaseAdmin = initializeFirebaseAdmin;



/**
 * @typedef UserType
 * @property {String} type
 * @property {Boolean} isVerified
 * @property {Date} timestamp
 */

/**
 * @typedef FirebaseUser
 * @property {String} email
 * @property {String} discordId
 * @property {UserType[]} types
 */

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
 * @private
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
 * @private
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
 * @param {String[]} types - types this user might verify for
 */
function addUserData(email, member, types) {
    var newDocument = db.collection('members').doc();
    /** @type {FirebaseUser} */
    let data = {
        email: email.toLowerCase(),
        discordId: member.id,
        types: types.map((type, index, array) => {
            /** @type {UserType} */
            let userType = {
                type: type,
                isVerified: false,
            }
            return userType;
        }),
    };

    newDocument.set(data);
}
module.exports.addUserData = addUserData;
/**
 * Verifies the any event member via their email.
 * @param {String} email - the user email
 * @param {String} id - the user's discord snowflake
 * @returns {Promise<String[]>} - the types this user is verified
 * @async
 * @throws Error if the email provided was not found.
 */
async function verify(email, id) {
    var userRef = db.collection('members').where('email', '==', email.toLowerCase()).limit(1);
    var user = (await userRef.get()).docs[0];

    if (user) {
        let returnTypes = [];

        /** @type {FirebaseUser} */
        var data = user.data();

        data.types.forEach((value, index, array) => {
            if (!value.isVerified) {
                value.isVerified = true;
                value.VerifiedTimestamp = admin.firestore.Timestamp.now();
                returnTypes.push(value.type);
            }
        });

        data.discordId = id;

        user.ref.update(data);

        return returnTypes;
    } else {
        throw new Error('The email provided was not found!');
    }
}
module.exports.verify = verify;

/**
 * Attends the user via their discord id
 * @param {String} id - the user's discord snowflake
 * @returns {Promise<String[]>} - the types this user is verified
 * @async
 * @throws Error if the email provided was not found.
 */
async function attend(id) {
    var userRef = db.collection('members').where('discordId', '==', id).limit(1);
    var user = (await userRef.get()).docs[0];

    if (user) {
        /** @type {FirebaseUser} */
        var data = user.data();

        data.types.forEach((value, index, array) => {
            if (value.isVerified) {
                value.isAttending = true;
                value.AttendingTimestamp = admin.firestore.Timestamp.now();
            }
        });

        user.ref.update(data);
    } else {
        throw new Error('The email provided was not found!');
    }
}
module.exports.attend = attend;