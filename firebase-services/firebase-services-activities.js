require('firebase/firestore');
const services = require('./firebase-services');

const db = services.db;
/////////////////////////////////////////////////////////////////////////////////////////////////
/////////////// Activity ////////////////////////////////////////////////////////////////////////
/////////////////////////////////////////////////////////////////////////////////////////////////


// Creates a workshop in the workshops collection
async function create(workshopName) {
    var doc = await db.collection(services.groups.activityGroup).doc(workshopName).set(
        {
            'privateVoiceNumber' : 0,
        }
    );
}
module.exports.create = create;

// Remove a workshop in the workshops collection
async function remove(workshopName) {
    var doc = await db.collection(services.groups.activityGroup).doc(workshopName).delete();
}
module.exports.remove = remove;


// updates a workshop
async function addVoiceChannels(workshopName, number) {
    var ref = db.collection(services.groups.activityGroup).doc(workshopName);
    var doc = await ref.get();

    // get current number of channels and adds them the new new number of channels
    var current = doc.get('privateVoiceNumber');
    var total = number + current;
    ref.update({
        'privateVoiceNumber' : total,
    });
    return total;

}
module.exports.addVoiceChannels = addVoiceChannels;

// updates a workshop by removing x number of private channels
async function removeVoiceChannels(workshopName, number) {
    var ref = db.collection(services.groups.activityGroup).doc(workshopName);
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
module.exports.removeVoiceChannels = removeVoiceChannels;

// get number of private channels
async function numOfVoiceChannels(activityName) {
    var ref = db.collection(services.groups.activityGroup).doc(activityName);
    var doc = await ref.get();
    return doc.get('privateVoiceNumber');

}
module.exports.numOfVoiceChannels = numOfVoiceChannels;