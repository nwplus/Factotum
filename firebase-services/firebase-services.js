// Firebase requirements
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