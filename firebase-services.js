

// Firebase requirements
const firebase = require('firebase/app');
require('firebase/firestore');

// var to hold firestore
const db = firebase.firestore();

// collection constats
const hackerGroup = 'hackers';
const sponsorGroup = 'sponsors';
const mentorGroup = 'mentors';
const staffGroup = 'staff'

module.exports.hackerGroup = hackerGroup;
module.exports.sponsorGroup = sponsorGroup;
module.exports.mentorGroup = mentorGroup;
module.exports.staffGroup = staffGroup;

// checks if the email is registerd
// Params: the collection you want to check on, options: check collection constants
async function verifyUser(email, group) {
    var userRef = db.collection(group).doc(email);
    var user = await userRef.get();
    if (user.exists) {
        userRef.update({
            'isVerified' : true,
        });
        return true;
    } else {
        return false;
    }
}

module.exports.verifyUser = verifyUser;

// setws the attendance to true for this email
// Params: the collection you want to check on, options: check collection constants
async function attendUser(email, group) {
    var userRef = db.collection(group).doc(email);
    var user = await userRef.get();
    if (user.exists) {
        userRef.update({
            'isAttending' : true,
        });
        return true;
    } else {
        return false;
    }
}

module.exports.attendUser = attendUser;
