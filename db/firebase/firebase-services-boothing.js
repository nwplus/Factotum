const firebase = require('firebase/app');
require('firebase/firestore');
const services = require('./firebase-services');

const db = services.db;

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

    // if the spot does not exist then we set the values, if it does we return hacker in use status
    if (!(await spot.get()).exists) {
        spot.set({
            'group': group,
            'timestamp': firebase.firestore.Timestamp.now(),
        });
        return (await waitlist.get()).docs.length;
    } else {
        return services.status.HACKER_IN_USE;
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
    db.collection(services.groups.boothGroup).doc(boothName).collection('waitlist').doc(captain).delete().catch(err => console.log(err));
}
module.exports.removeGroupFromBooth = removeGroupFromBooth;