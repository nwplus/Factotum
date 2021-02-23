// Firebase requirements
require("firebase/firestore");
const csv = require('csv-parser')
const fs = require('fs')
require('dotenv').config()
const admin = require('firebase-admin');

// initialize firebase
function initializeFirebaseAdmin(adminSDK, databaseURL) {
    return admin.initializeApp({
        credential: admin.credential.cert(adminSDK),
        databaseURL: databaseURL,
    });
}
const adminSDK = JSON.parse(process.env.NWPLUSADMINSDK);
let app = initializeFirebaseAdmin(adminSDK, "https://nwplus-bot.firebaseio.com");

// save second argument as type of members to add
let type = process.argv[2];
if (type == undefined) {
    throw new Error('no defined type!')
}
// optional third argument; if "true", all their previous types will be overwritten by this new one
let overwrite = false;
if (process.argv[3] === 'true') {
    overwrite = true;
};

class Registration {
    constructor(email) {
        this.email = email
        this.types = [];
    }
}

const results = []
const all_regs = {}
fs.createReadStream('registrations.csv') // requires a registrations.csv file in root directory to run
    .pipe(csv())
    .on('data', (data) => results.push(data))
    .on('end', () => {
        const processed = results.map((row) => {
            const email = row['What is your primary email that can we contact you with?'] || row['Email Address']

            const r = new Registration(email)
            return r
        })

        processed.forEach(r => {
            all_regs[r.email] = r
        })


        var db = app.firestore();

        var all = db.collection("members").get().then(snapshot => {
            // get all ids and types of members already in collections and store in idMap
            let ids = snapshot.docs.map(doc => doc.id)
            let types = snapshot.docs.map(doc => doc.get('types'))
            let idMap = new Map(); // Map<string, array<Type>> where Type is an object consisting of the fields type and isVerified
            var i = 0;
            ids.forEach(id => {
                idMap.set(id, types[i]);
                i++;
            })

            let iterable = Object.entries(all_regs)
            console.log(`found ${iterable.length} registrations total!!`)

            console.log(`found ${ids.length} existing registrations, actually patching ${iterable.length - ids.length} new registrations`)
            while (iterable.length > 0) {
                var batch = db.batch()

                for (let [key, value] of iterable.splice(0, 500)) {
                    key = key.toLowerCase()
                    var docRef = db.collection("members").doc(key)
                    if (idMap.has(key)) {
                        // if overwrite is on, replace the Registration's existing types with just the new type
                        if (overwrite) {
                            value.types = [{ isVerified: false, type: type }]
                        } else {
                            // else retrieve the Registration's existing types and push the new type
                            value.types = idMap.get(key);
                            if (!idMap.get(key).some(role => role.type === type)) {
                                value.types.push({ isVerified: false, type: type })
                            }
                        }
                    } else {
                        // if member is new, just push current type into types array
                        value.types.push({ isVerified: false, type: type })
                    }
                    batch.set(docRef, Object.assign({}, value))
                }

                batch.commit()
                console.log('batch write success')
            }
            console.log('done!')
        })

    });