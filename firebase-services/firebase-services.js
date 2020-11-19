// Firebase requirements
const firebase = require('firebase/app');
require('firebase/firestore');

// var to hold firestore
const db = firebase.firestore();
module.exports.db = db;

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



// checks if the email is registerd
// Params: the collection you want to check on, options: check collection constants
async function verifyUser(email, group) {
    var userRef = db.collection(group).doc(email);
    var user = await userRef.get();
    if(user.exists) {
        var data = user.data();
        if(data['isVerified'] == false) {
            userRef.update({
                'isVerified' : true,
            });
            return internalStatus.SUCCESS;
        } else if (data['isVerified'] == true) {
            return internalStatus.FAILTURE_IN_USE;
        }
    }
    return internalStatus.FAILURE;
}

// checks all possible groups for the given email, will return 
// a different status for each different success or in use case, failure will
// be the very end case.
async function verify(email) {
    // Check if hacker
    var sts = await verifyUser(email, groups.hackerGroup);
    if(sts == internalStatus.SUCCESS) {
        return status.HACKER_SUCCESS;
    } else if(sts == internalStatus.FAILTURE_IN_USE) {
        return status.HACKER_IN_USE;
    } else {
        // Check if sponsor
        sts = await verifyUser(email, groups.sponsorGroup);
        if(sts == internalStatus.SUCCESS) {
            return status.SPONSOR_SUCCESS;
        } else if(sts == internalStatus.FAILTURE_IN_USE) {
            return status.SPONSOR_IN_USE;
        } else {
            // Check if mentor
            sts = await verifyUser(email, groups.mentorGroup);
            if(sts == internalStatus.SUCCESS) {
                return status.MENTOR_SUCCESS;
            } else if(sts == internalStatus.FAILTURE_IN_USE) {
                return status.MENTOR_IN_USE;
            } else {
                // Check if staff
                sts = await verifyUser(email, groups.staffGroup);
                if(sts == internalStatus.SUCCESS) {
                    return status.STAFF_SUCCESS;
                } else if(sts == internalStatus.FAILTURE_IN_USE) {
                    return status.STAFF_IN_USE;
                } else {
                    // NOTHING WORKED
                    return status.FAILURE;
                }
            }
        }
    }
}
module.exports.verify = verify;

// sets the attendance to true for this email, this only works with hackers!
async function attendHacker(email) {
    var userRef = db.collection(groups.hackerGroup).doc(email);
    var user = await userRef.get();
    if (user.exists) {
        data = user.data();
        if (data['isAttending'] == false) {
            userRef.update({
                'isAttending' : true,
            });
            return status.HACKER_SUCCESS;
        } else if (data['isAttending'] == true) {
            return status.HACKER_IN_USE;
        }
    } else {
        return status.FAILURE;
    }
}
module.exports.attendHacker = attendHacker;