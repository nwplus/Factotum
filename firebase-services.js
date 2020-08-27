

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

// Enum used internaly for firebase functions returns
const internalStatus = {
    // Everything worked well
    SUCCESS: 1,
    // Email was not found
    FAILURE: 2,
    // Email was found but already in use
    FAILTURE_IN_USE: 3,
}

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

// Enum used publicly for firebase function returns
const status = {
    HACKER_SUCCESS: 1,
    HACKER_IN_USE: 2,
    SPONSOR_SUCCESS: 3,
    SPONSOR_IN_USE: 4,
    MENTOR_SUCCESS: 5,
    MENTOR_IN_USE: 6,
    STAFF_SUCCESS: 7,
    STAFF_IN_USE: 8,
    FAILURE: 0,
}
module.exports.status = status;

// checks all possible groups for the given email, will return 
// a different status for each different success or in use case, failure will
// be the very end case.
async function verify(email) {
    // Check if hacker
    var sts = await verifyUser(email, hackerGroup);
    if(sts == internalStatus.SUCCESS) {
        return status.HACKER_SUCCESS;
    } else if(sts == internalStatus.FAILTURE_IN_USE) {
        return status.HACKER_IN_USE;
    } else {
        // Check if sponsor
        sts = await verifyUser(email, sponsorGroup);
        if(sts == internalStatus.SUCCESS) {
            return status.SPONSOR_SUCCESS;
        } else if(sts == internalStatus.FAILTURE_IN_USE) {
            return status.SPONSOR_IN_USE;
        } else {
            // Check if mentor
            sts = await verifyUser(email, mentorGroup);
            if(sts == internalStatus.SUCCESS) {
                return status.MENTOR_SUCCESS;
            } else if(sts == internalStatus.FAILTURE_IN_USE) {
                return status.MENTOR_IN_USE;
            } else {
                // Check if staff
                sts = await verifyUser(email, staffGroup);
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
    var userRef = db.collection(hackerGroup).doc(email);
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

// Add username to boothing wait list
// returns status or nothing if successfull
async function addToWaitList(username) {
    var userRef = db.collection('boothing-wait-list').doc(username);
    var user = await userRef.get();

    // make sure the user is not alreayd in the waitlist
    if (!user.exists) {
        // add user to waitlist with timestamp
        userRef.set({
            'time' : firebase.firestore.Timestamp.now(),
        });
    } else {
        // if he is already in the waitlist then return the status
        return status.HACKER_IN_USE;
    }
}
module.exports.addToWaitList = addToWaitList;

// get next username from wait list
// returns status or username of next hacker
async function getFromWaitList() {
    var docuemntQuery = await db.collection('boothing-wait-list').orderBy('time').limit(1).get().catch(console.error);
    var docs = docuemntQuery.docs;
    // Check to make sure there is something in the list, if there is non then there are no more poeple in the list!
    if (docs.length === 0) {
        return status.FAILURE;
    } else {
        var uid = docs[0].id;
        return uid;
    }
    
}
module.exports.getFromWaitList = getFromWaitList;

// return the position of the given username
// returns a status or index in waitlist
async function positionInWaitList(username) {
    var query = await db.collection('boothing-wait-list').orderBy('time').get();

    // make sure ther are docuemnts in the list
    if (query.docs.length > 0) {

        // Funciton to be used in findIndex
        // returns true if its id equals the username given
        function checkUsername(queryDoc) {
            return queryDoc.id === username;
        }

        // Need to add 1 becuase we start counting at 0
        return query.docs.findIndex(checkUsername) + 1;
    } else {
        return status.FAILURE;
    }
}
module.exports.positionInWaitList = positionInWaitList;

// will remove the username from the waitlist
// returns a status
async function removeFromWaitList(username) {
    var userRef = db.collection('boothing-wait-list').doc(username);
    var user = await userRef.get();

    // make sure the user is in the waitlist before deleting
    if (user.exists) {
        await userRef.delete();
        return status.HACKER_SUCCESS;
    } else {
        return status.FAILURE;
    }
}
module.exports.removeFromWaitList = removeFromWaitList;