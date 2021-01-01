require('dotenv-flow').config({
    path: '../',
});
require("firebase/firestore");
const firebase = require('firebase/app');


const firebaseConfig = {
    apiKey: process.env.FIREBASEAPIKEY,
    authDomain: process.env.FIREBASEAUTHDOMAIN,
    databaseURL: process.env.FIREBASEURL,
    projectId: process.env.FIREBASEPROJECTID,
    storageBucket: process.env.FIREBASEBUCKET,
    messagingSenderId: process.env.FIREBASESENDERID,
    appId: process.env.FIREBASEAPPID,
    measurementId: process.env.FIREBASEMEASUREMENTID
};

// initialize firebase
const app = firebase.initializeApp(firebaseConfig);
const db = firebase.firestore(app);

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


let email = 'jacky@nwplus.io';

let response = verifyUser(email, '00000000000')

console.log(response);

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
        console.log(data);
        if(data['isVerified'] == false || data['isVerified'] == null) {
            // user.ref.update({
            //     'isVerified' : true,
            //     'discord id' : id,
            // });
            console.log(data['type']);
            return data['type'] == 'mentor' ? status.MENTOR_SUCCESS : data['type'] == 'sponsor' ? status.SPONSOR_SUCCESS : status.STAFF_SUCCESS;
        } else if (data['isVerified'] == true) {
            return status.FAILURE;
        }
    }
    return status.FAILURE;
}