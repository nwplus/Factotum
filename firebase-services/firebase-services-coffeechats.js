const firebase = require('firebase/app');
require('firebase/firestore');
const services = require('./firebase-services');

const db = services.db;

/////////////////////////////////////////////////////////////////////////////////////////////////
/////////////// Coffee chats ////////////////////////////////////////////////////////////////////
/////////////////////////////////////////////////////////////////////////////////////////////////


// Will create the taHelpList field for workshop
async function initCoffeeChat(activityName) {
    var workshopRef = db.collection(services.groups.activityGroup).doc(activityName).update({
        'teams' : [],
    });
}
module.exports.initCoffeeChat = initCoffeeChat;

// add group to coffee chat list
async function addGroup(activityName, groupMembers) {
    db.collection(services.groups.activityGroup).doc(activityName).update({
        'teams' : firebase.firestore.FieldValue.arrayUnion({'members' : groupMembers}),
    });
}
module.exports.addGroup = addGroup;

// grab all groups from the coffe chat activity
async function getGroup(activityName) {
    return await (await db.collection(services.groups.activityGroup).doc(activityName).get()).get('teams');
}
module.exports.getGroup = getGroup;