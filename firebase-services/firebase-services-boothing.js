const firebase = require('firebase/app');
require('firebase/firestore');
const services = require('./firebase-services');

/////////////////////////////////////////////////////////////////////////////////////////////////
/////////////// Boothing ////////////////////////////////////////////////////////////////////////
/////////////////////////////////////////////////////////////////////////////////////////////////

// create a new booth in the booth group and set the waitlist embed
async function startBooth(boothName, embedSnowFlake) {
    var booth = db.collection(services.groups.boothGroup).doc(boothName);
    booth.collection('waitlist');

    booth.set({
        'waitlist embed': embedSnowFlake,
    });
}
module.exports.startBooth = startBooth;

// add group to a specific booth's wait list
async function addGroupToBooth(boothName, captain, group) {
    var waitlist = db.collection(services.groups.boothGroup).doc(boothName).collection('waitlist');
    
    // get or create new doc for this group in waitlist
    var spot = waitlist.doc(captain);

    // if the spot does not excist then we set the values, if it does we return hacker in use status
    if (!(await spot.get()).exists) {
        spot.set({
            'group': group,
            'timestamp': firebase.firestore.Timestamp.now(),
        });
        return (await waitlist.get()).docs.length;
    } else {
        return services.services.status.HACKER_IN_USE;
    }
}
module.exports.addGroupToBooth = addGroupToBooth;

// get next two groups, one to join a sponsor, the next to let know they are next
async function getNextForBooth(boothName) {
    var nextTwoQuery = await db.collection(boothGroup).doc(boothName).collection('waitlist').orderBy('timestamp').limit(2).get().catch(console.error);
    var nextTwo = nextTwoQuery.docs;

    // map to return
    var map = {
        'next group': [],
        'current group': []
    };

    // if none in list then return error status
    if (nextTwo.length === 0) {
        return services.status.FAILURE;
    } else if (nextTwo.length === 2) {
        var group = nextTwo[1].data()['group'];
        group.push(nextTwo[1].id);
        map['next group'] = group;
    }

    var group = nextTwo[0].data()['group'];
    group.push(nextTwo[0].id);
    map['current group']= group;

    nextTwo[0].ref.delete();

    return map;
}
module.exports.getNextForBooth = getNextForBooth;

// return the position of the user in the wait list
async function positionInBooth(boothName, captain) {
    var waitlist = await db.collection(services.groups.boothGroup).doc(boothName).collection('waitlist').orderBy('timestamp').get();

    // make sure there are items in list
    if (waitlist.length != 0) {
        return waitlist.docs.findIndex(snapshot => snapshot.id === captain) + 1;
    } else {
        return services.status.FAILURE;
    }
}
module.exports.positionInBooth = positionInBooth;

// remove the group from a booth wait list
async function removeGroupFromBooth(boothName, captain) {
    db.collection(services.groups.boothGroup).doc(boothName).collection('waitlist').doc(captain).delete();
}
module.exports.removeGroupFromBooth = removeGroupFromBooth;


////////////////// OLD /////////////////////////////////////////////////////


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
        return services.status.HACKER_IN_USE;
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
        return services.status.FAILURE;
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
        return services.status.FAILURE;
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
        return services.status.HACKER_SUCCESS;
    } else {
        return services.status.FAILURE;
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