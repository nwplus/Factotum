const admin = require('firebase-admin');

/**
 * The firebase services module has firebase related helper functions.
 * @module FirebaseServices
 */

/**
 * All the firebase apps in play stored by their name.
 * @type {Map<String, admin.app.App>}
 */
const apps = new Map();
module.exports.apps = apps;

/**
 * Will start an admin connection with the given name
 * @param {String} name - name of the connection
 * @param {JSON} adminSDK - the JSON file with admin config
 * @param {String} databaseURL - the database URL
 */
function initializeFirebaseAdmin(name, adminSDK, databaseURL) {
    let app = admin.initializeApp({
        credential: admin.credential.cert(adminSDK),
        databaseURL: databaseURL,
    }, name);

    apps.set(name, app);
}

/**
 * The firebase utility module has some useful mongo related helper functions.
 * @module FirebaseUtil
 */

/** @type {FirebaseFirestore.Firestore | undefined} */
let _db;

module.exports = {
    apps,

    /**
     * Starts a connection to new firestore
     */
    async connect(appName) {
        if (appName) {
            const app = apps.get(appName);
            if (!app) {
                throw new Error(`No Firebase app initialized with the name ${appName}`);
            }
            _db = app.firestore();
        } else {
            _db = admin.firestore();
        }
        console.log('Connected to Firebase Firestore');
    },

    initializeFirebaseAdmin,

    getDb() {
        if (!_db) {
            throw new Error('Firestore is not initialized. Call connect() first.');
        }
        return _db;
    },

    getBotGuildCol() {
        return _db.collection('botGuilds');
    },
    getExternalProjectsCol() {
        if (!_db) {
            throw new Error('Firestore is not initialized, call connect() first.');
        }
        return _db.collection('ExternalProjects');
    },
    getFactotumSubCol() {
        const externalProjectsCol = this.getExternalProjectsCol();
        if (!externalProjectsCol) {
            throw new Error('ExternalProjects collection is not initialized.');
        }
        return externalProjectsCol.doc('Factotum').collection('InitBotInfo');
    },
    /**
     * @param {string} guildId 
     */
    getSavedMessagesSubCol(guildId) {
        const factotumSubCol = this.getFactotumSubCol();
        return factotumSubCol.doc(guildId).collection('SavedMessages');
    },

    /**
     * @param {String} appName
     * @returns {Firestore} Firestore instance for the given app
     */
    getFirestoreInstance(appName) {
        const app = apps.get(appName);
        if (!app) {
            throw new Error(`No Firebase app initialized with the name ${appName}`);
        }
        return app.firestore();
    },

    async mongooseConnect() {
        // this is no longer needed but keeping for now
        return Promise.resolve();
    },

    // FIREBASE SERVICE FUNCTIONS IMPORTED BELOW
    /**
     * Retrieves a question from the db that has not already been asked at the Discord Contests, then marks the question as having been 
     * asked in the db.
     * @param {String} guildId - the id of the guild
     * @returns {Object | null} - the data object of a question or null if no more questions
     */
    async getQuestion(guildId) {
        //checks that the question has not been asked
        let questionReference = module.exports.getFactotumSubCol().doc(guildId)
            .collection('Questions').where('asked', '==', false).limit(1);
        let question = (await questionReference.get()).docs[0];
        //if there exists an unasked question, change its status to asked
        if (question != undefined) {
            question.ref.update({
                'asked': true,
            });
            return question.data();
        }
        return null;
    },

    /**
     * Retrieves self-care reminder from the db that has not already been sent, 
     * then marks the reminder as having been asked in the db.
     * @param {String} guildId - the guild id
     * @returns {Object | null} - the data object of a reminder or null if no more reminders
     */
    async getReminder(guildId) {
        //checks that the reminder has not been sent
        let qref = module.exports.getFactotumSubCol().doc(guildId)
            .collection('Reminders').where('sent', '==', false).limit(1);
        let reminder = (await qref.get()).docs[0];
        //if there reminder unsent, change its status to asked
        if (reminder != undefined) {
            reminder.ref.update({
                'sent': true,
            });
            return reminder.data();
        }
        return null;
    },

    /**
     * Checks to see if the input email matches or is similar to emails in the database
     * Returns an array of objects containing emails that match or are similar, along with the verification status of each, 
     * and returns empty array if none match
     * @param {String} email - email to check
     * @param {String} guildId - the guild id
     * @returns {Promise<Array<Member>>} - array of members with similar emails to parameter email
     */
    async checkEmail(email, guildId) {
        const cleanEmail = email.trim().toLowerCase();
        const docRef = getFactotumDoc().collection('guilds').doc(guildId).collection('members').doc(cleanEmail); 
        const doc = await docRef.get();
        return doc.data();
    },

    /**
     * Uses Levenshtein Distance to determine whether two emails are within 5 Levenshtein Distance
     * @param {String} searchEmail - email to search for similar emails for
     * @param {String} dbEmail - email from db to compare to searchEmail
     * @returns {Boolean} - Whether the two emails are similar
     * @private
     */
    compareEmails(searchEmail, dbEmail) {
        // matrix to track Levenshtein Distance with
        let matrix = new Array(searchEmail.length);
        let searchEmailChars = searchEmail.split('');
        let dbEmailChars = dbEmail.split('');
        // initialize second dimension of matrix and set all elements to 0
        for (let i = 0; i < matrix.length; i++) {
            matrix[i] = new Array(dbEmail.length);
            for (let j = 0; j < matrix[i].length; j++) {
                matrix[i][j] = 0;
            }
        }
        // set all elements in the top row and left column to increment by 1
        for (let i = 1; i < searchEmail.length; i++) {
            matrix[i][0] = i;
        }
        for (let j = 1; j < dbEmail.length; j++) {
            matrix[0][j] = j;
        }
        // increment Levenshtein Distance by 1 if there is a letter inserted, deleted, or swapped; store the running tally in the corresponding
        // element of the matrix
        let substitutionCost;
        for (let j = 1; j < dbEmail.length; j++) {
            for (let i = 1; i < searchEmail.length; i++) {
                if (searchEmailChars[i] === dbEmailChars[j]) {
                    substitutionCost = 0;
                } else {
                    substitutionCost = 1;
                }
                matrix[i][j] = Math.min(matrix[i - 1][j] + 1, matrix[i][j - 1] + 1, matrix[i - 1][j - 1] + substitutionCost);
            }
        }
        return matrix[searchEmail.length - 1][dbEmail.length - 1] <= (Math.min(searchEmail.length, dbEmail.length) / 2);
    },

    /**
     * Finds the email of user with given first and last names
     * @param {String} firstName - first name of member to match with database
     * @param {String} lastName - last name of member to match with database
     * @param {String} guildId - the guild id
     * @returns {Promise<String>} - email of given member
     * @private
     */
    async checkName(firstName, lastName, guildId) {
        const snapshot = (await getFactotumDoc().collection('guilds').doc(guildId).collection('members').get()).docs; // snapshot of Firestore as array of documents
        for (const memberDoc of snapshot) {
            if (
                memberDoc.get('firstName') &&
                memberDoc.get('lastName') &&
                memberDoc.get('firstName').toLowerCase() === firstName.toLowerCase() &&
                memberDoc.get('lastName').toLowerCase() === lastName.toLowerCase()
            ) {
                return memberDoc.get('email');
            }
        }
        return null;
    },

    /**
     * Adds a new guild member to the guild's member collection. Email is used as ID, there can be no duplicates.
     * @param {String} email - email of member verified
     * @param {String[]} types - types this user might verify for
     * @param {String} guildId - the guild id
     * @param {GuildMember} [member={}] - member verified
     * @param {String} [firstName=''] - users first name
     * @param {String} [lastName=''] - users last name
     * @async
     */
    async addUserData(email, type, guildId, overwrite) {
        const cleanEmail = email.trim().toLowerCase();
        const documentRef = getFactotumDoc().collection('guilds').doc(guildId).collection('members').doc(cleanEmail);
        const doc = await documentRef.get();

        if (doc.exists && !overwrite) {
            const types = doc.data().types || [];
            const containsType = types.some(existingType => existingType.type === type);
            if (!containsType) {
                types.push({ type, isVerified: false });
            }
            await documentRef.update({ types });
        } else {
            const data = { email: cleanEmail, types: [{ isVerified: false, type }] };
            await documentRef.set(data);
        }
    },

    /**
     * Verifies the any event member via their email.
     * @param {String} email - the user email
     * @param {String} id - the user's discord snowflake
     * @param {String} guildId - the guild id
     * @returns {Promise<String[]>} - the types this user is verified
     * @async
     * @throws Error if the email provided was not found.
     */
    async verify(email, id, guildId) {
        let emailLowerCase = email.trim().toLowerCase();
        let userRef = getFactotumDoc().collection('guilds').doc(guildId).collection('members').where('email', '==', emailLowerCase).limit(1);
        let user = (await userRef.get()).docs[0];
        if (user) {
            let returnTypes = [];

            /** @type {FirebaseUser} */
            let data = user.data();

            data.types.forEach((value, index, array) => {
                if (!value.isVerified) {
                    value.isVerified = true;
                    value.VerifiedTimestamp = admin.firestore.Timestamp.now();
                    returnTypes.push(value.type);
                }
            });

            data.discordId = id;

            user.ref.update(data);

            return returnTypes;
        } else {
            throw new Error('The email provided was not found!');
        }
    },

    /**
     * Attends the user via their discord id
     * @param {String} id - the user's discord snowflake
     * @param {String} guildId - the guild id
     * @returns {Promise<String[]>} - the types this user is verified
     * @async
     * @throws Error if the email provided was not found.
     */
    async attend(id, guildId) {
        let userRef = getFactotumDoc().collection('guilds').doc(guildId).collection('members').where('discordId', '==', id).limit(1);
        let user = (await userRef.get()).docs[0];

        if (user) {
            /** @type {FirebaseUser} */
            let data = user.data();

            data.types.forEach((value, index, array) => {
                if (value.isVerified) {
                    value.isAttending = true;
                    value.AttendingTimestamp = admin.firestore.Timestamp.now();
                }
            });

            user.ref.update(data);
        } else {
            throw new Error('The discord id provided was not found!');
        }
    },

    /**
     * check if codex is set to active (very hacky atm, it's just a document in the "codex" collection with a boolean 
     * field called "active")
     * @param {String} guildId 
     * @returns boolean of whether codex is set to active
     */
    async checkCodexActive(guildId) {
        let ref = getFactotumDoc().collection('guilds').doc(guildId).collection('codex').doc('active');
        let activeRef = await ref.get();
        const data = activeRef.data();
        return data.active;
    },

    /**
     * stores email to firebase collection
     * @param {String} guildId 
     * @param {String} collection - name of collection to store email in
     * @param {String} email - user's email
     */
    async saveToFirebase(guildId, collection, email) {
        let ref = getFactotumDoc().collection('guilds').doc(guildId).collection(collection).doc(email.toLowerCase());
        /** @type {FirebaseUser} */
        let data = {
            email: email.toLowerCase()
        };

        await ref.set(data);
    },

    async lookupById(guildId, memberId) {
        const userRef = getFactotumDoc().collection('guilds').doc(guildId).collection('members').where('discordId', '==', memberId).limit(1);
        const user = (await userRef.get()).docs[0];
        return user ? user.data().email : undefined;
    },

    async saveToLeaderboard(guildId, memberId) {
        const userRef = module.exports.getFactotumSubCol().doc(guildId)
            .collection('QuestionsLeaderboard').doc(memberId);
        const user = await userRef.get();
        if (user.exists) {
            const data = user.data();
            data.points++;
            await userRef.update(data);
        } else {
            const data = { memberId, points: 1 };
            await userRef.set(data);
        }
    },

    async retrieveLeaderboard(guildId) {
        const snapshot = (await module.exports.getFactotumSubCol().doc(guildId).collection('QuestionsLeaderboard').get()).docs;
        const winners = snapshot.map(doc => doc.data()).sort((a, b) => b.points - a.points);
        return winners;
    },

};

function getFactotumDoc() {
    return _db.collection('ExternalProjects').doc('Factotum');
}

/**
 * Gets the InitBotInfo document by guild ID
 * @param {string} guildId
 */
async function getInitBotInfo(guildId) {
    const doc = await module.exports.getFactotumSubCol().doc(guildId).get();
    return doc.exists ? doc.data() : null;
}

/**
 * Creates a new InitBotInfo document for a new guild
 * @param {string} guildId
 */
async function createInitBotInfoDoc(guildId) {
    return await module.exports.getFactotumSubCol().doc(guildId).set({});
}

module.exports.getInitBotInfo = getInitBotInfo;
module.exports.createInitBotInfoDoc = createInitBotInfoDoc;