

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
const activityGroup = 'activities'

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
async function addToWaitList(username, usernameList) {
    var userRef = db.collection('boothing-wait-list').doc(username);
    var user = await userRef.get();

    // make sure the user is not alreayd in the waitlist
    if (!user.exists) {
        // add user to waitlist with timestamp
        userRef.set({
            'time' : firebase.firestore.Timestamp.now(),
            'buddies' : usernameList,
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
    var docuemntQuery = await db.collection('boothing-wait-list').orderBy('time').limit(2).get().catch(console.error);
    var docs = docuemntQuery.docs;
    // Check to make sure there is something in the list, if there is non then there are no more poeple in the list!
    if (docs.length === 0) {
        return status.FAILURE;
    } else if (docs.length === 1) {
        // return only the currentList

        // current group
        var currentList = docs[0].data()['buddies'];
        currentList.push(docs[0].id);

        // remove current group
        removeFromWaitList(docs[0].id);

        // next group
        var nextList = [];

        var map = new Map([['currentGroup', currentList], ['nextGroup', nextList]]);

        return map;
    } else {
        // return the current list and the next group

        // current group
        var currentList = docs[0].data()['buddies'];
        currentList.push(docs[0].id);

        // remove current group
        removeFromWaitList(docs[0].id);

        // next group
        var nextList = [
            docs[1].id,
        ];

        var map = new Map([['currentGroup', currentList], ['nextGroup', nextList]]);

        return map;
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

// will return the number of hackers in the waitlist
// returns a number
async function numberInWaitList() {
    var collection = await db.collection('boothing-wait-list').get();
    return collection.size;
}
module.exports.numberInWaitList = numberInWaitList;

// Creates a workshop in the workshops collection
async function createActivity(workshopName) {
    var doc = await db.collection(activityGroup).doc(workshopName).set(
        {
            'privateVoiceNumber' : 0,
        }
    );
}
module.exports.createActivity = createActivity;

// Remove a workshop in the workshops collection
async function removeActivity(workshopName) {
    var doc = await db.collection(activityGroup).doc(workshopName).delete();
}
module.exports.removeActivity = removeActivity;


// updates a workshop
async function activityAddPrivates(workshopName, number) {
    var ref = db.collection(activityGroup).doc(workshopName);
    var doc = await ref.get();

    // get current number of channels and adds them the new new number of channels
    var current = doc.get('privateVoiceNumber');
    var total = number + current;
    ref.update({
        'privateVoiceNumber' : total,
    });
    return total;

}
module.exports.activityAddPrivates = activityAddPrivates;

// updates a workshop by remivng x number of private channels
async function activityRemovePrivates(workshopName, number) {
    var ref = db.collection(activityGroup).doc(workshopName);
    var doc = await ref.get();

    // get current number of channels and adds them the new new number of channels
    var current = doc.get('privateVoiceNumber');
    var total = current - number;

    // min can be 0, anything less will round up to 0
    if (total < 0) {
        total = 0;
    }

    ref.update({
        'privateVoiceNumber' : total,
    });
    return current;

}
module.exports.activityRemovePrivates = activityRemovePrivates;

// get number of private channels
async function activityPrivateChannels(activityName) {
    var ref = db.collection(activityGroup).doc(activityName);
    var doc = await ref.get();
    return doc.get('privateVoiceNumber');

}
module.exports.activityPrivateChannels = activityPrivateChannels;

// add hacker to workshop ta help list
async function addToTAHelp(workshopName, username) {
    // get workshop ref
    var workshopRef =  db.collection(activityGroup).doc(workshopName);

    // get list
    var workshop = await workshopRef.get();
    var list = workshop.get('taHelpList');

    // return a failure if list does not excist
    if (list == undefined) {
        return status.FAILURE;
    } else if (list.includes(username)) {
        return status.HACKER_IN_USE;
    }

    // add to list
    await workshopRef.update({
        'taHelpList' : firebase.firestore.FieldValue.arrayUnion(username),
    });

    return status.HACKER_SUCCESS;

}
module.exports.addToTAHelp = addToTAHelp;

// Will create the taHelpList field for workshop
async function intiTAHelpFor(workshopName) {
    var workshopRef = db.collection(activityGroup).doc(workshopName).update({
        'taHelpList' : [],
        'questions' : [],
    });
}
module.exports.intiTAHelpFor = intiTAHelpFor;

// will get the next person in the workshop ta help list
async function getFromTAHelpList(workshopName) {

    var workshopRef = db.collection(activityGroup).doc(workshopName);
    var workshop = await workshopRef.get();

    var list = workshop.get('taHelpList');

    if (list === undefined) {
        return status.FAILURE;
    }

    var nextUser = list.shift();

    if (nextUser === undefined) {
        return status.MENTOR_IN_USE;
    }

    await workshopRef.update({
        'taHelpList' : list,
    });

    return nextUser;
}
module.exports.getFromTAHelpList = getFromTAHelpList;

// will get the remaining users in ta wait list
async function leftInTAHelpList(workshopName) {
    var workshopRef = db.collection(activityGroup).doc(workshopName);
    var workshop = await workshopRef.get();

    var list = workshop.get('taHelpList');

    return list.length;
}
module.exports.leftInTAHelpList = leftInTAHelpList;

// add question to the question bank
async function addQuestionTo(workshopName, question, username) {
    // get workshop ref
    var workshopRef =  db.collection(activityGroup).doc(workshopName);

    // get list
    var workshop = await workshopRef.get();
    var list = workshop.get('questions');

    // return a failure if list does not excist
    if (list == undefined) {
        return status.FAILURE;
    }

    // add to list
    await workshopRef.update({
        'questions' : firebase.firestore.FieldValue.arrayUnion({'name' : username, 'question' : question}),
    });

    return status.HACKER_SUCCESS;

}
module.exports.addQuestionTo = addQuestionTo;