// Firebase requirements
const admin = require('firebase-admin');

// var to hold firestore
// const db = firebase.firestore()
const db = admin.firestore();
module.exports.db = db;

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
 * Verifies the any event member via their email.
 * @param {String} email - the user email
 * @param {String} id - the user's discord snowflake
 * @returns {Promise<String[]>} - the types this user is verified
 * @async
 * @throws Error if the email provided was not found.
 */
async function verify(email, id) {
    var userRef = db.collection('members').where('email', '==', email).limit(1);
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