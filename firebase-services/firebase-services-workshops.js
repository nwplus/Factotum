const firebase = require('firebase/app');
require('firebase/firestore');
const services = require('./firebase-services');

const db = services.db;

/////////////////////////////////////////////////////////////////////////////////////////////////
/////////////// Workshop ////////////////////////////////////////////////////////////////////////
/////////////////////////////////////////////////////////////////////////////////////////////////

// add hacker to workshop ta help list
// return status and position in list
async function addHacker(workshopName, username) {
    // get workshop ref
    var workshopRef =  db.collection(services.groups.activityGroup).doc(workshopName);

    // get list
    var workshop = await workshopRef.get();
    var list = workshop.get('taHelpList');

    // return a failure if list does not exist
    if (list == undefined) {
        return services.status.FAILURE;
    } else if (list.includes(username)) {
        return services.status.HACKER_IN_USE;
    }

    // add to list
    var res = await workshopRef.update({
        'taHelpList' : firebase.firestore.FieldValue.arrayUnion(username),
    });

    // return list with status and then position in wait list
    return [services.status.HACKER_SUCCESS, list.length + 1];

}
module.exports.addHacker = addHacker;

// Will create the taHelpList field for workshop
async function initWorkshop(activityName) {
    var workshopRef = db.collection(services.groups.activityGroup).doc(activityName).update({
        'taHelpList' : [],
        'questions' : [],
    });
}
module.exports.initWorkshop = initWorkshop;

// will get the next person in the workshop ta help list
async function getNext(workshopName) {

    var workshopRef = db.collection(services.groups.activityGroup).doc(workshopName);
    var workshop = await workshopRef.get();

    var list = workshop.get('taHelpList');

    if (list === undefined) {
        return services.status.FAILURE;
    }

    var nextUser = list.shift();

    if (nextUser === undefined) {
        return services.status.MENTOR_IN_USE;
    }

    await workshopRef.update({
        'taHelpList' : list,
    });

    return nextUser;
}
module.exports.getNext = getNext;

// will get the remaining users in ta wait list
async function leftToHelp(workshopName) {
    var workshopRef = db.collection(services.groups.activityGroup).doc(workshopName);
    var workshop = await workshopRef.get();

    var list = workshop.get('taHelpList');

    return list.length;
}
module.exports.leftToHelp = leftToHelp;

// add question to the question bank
async function addQuestionTo(workshopName, question, username) {
    // get workshop ref
    var workshopRef =  db.collection(services.groups.activityGroup).doc(workshopName);

    // get list
    var workshop = await workshopRef.get();
    var list = workshop.get('questions');

    // return a failure if list does not exist
    if (list == undefined) {
        return services.status.FAILURE;
    }

    // add to list
    await workshopRef.update({
        'questions' : firebase.firestore.FieldValue.arrayUnion({'name' : username, 'question' : question}),
    });

    return services.status.HACKER_SUCCESS;

}
module.exports.addQuestionTo = addQuestionTo;