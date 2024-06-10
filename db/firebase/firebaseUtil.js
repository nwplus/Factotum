const admin = require('firebase-admin');

admin.initializeApp({
    credential: admin.credential.applicationDefault(),
    databaseURL: `https:${process.env.FIREBASE_DATABASE_URL}.firebaseio.com`,
});

const firestore = admin.firestore();

// require('firebase/firestore');
/**
 * The firebase utility module has some useful mongo related helper functions.
 * @module FirebaseUtil
 */

/** @type {Db} */
var _db;

module.exports = {

    /**
     * Starts a connection to new firestore
     */
    async connect() {
        console.log('before connecting with firebase');
        _db = firestore;
        console.log('Connected to Firebase Firestore');
    },

    /**
     * @returns {Db}
     */
    getDb() {
        return _db;
    },

    /**
     * @returns {Collection}
     */
    getBotGuildCol() {
        return _db.collection('botGuilds');
    },

    async mongooseConnect() {
        // this is no longer needed but keeping for now
        return Promise.resolve();
    }

};