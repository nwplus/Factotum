const { MongoClient, Db,  } = require('mongodb');
const mongoose = require('mongoose');

const url = 'mongodb+srv://dev-user:' + process.env.MONGODBPASSWORD + '@cluster-dev.j87rm.mongodb.net/test?retryWrites=true&w=majority&useNewUrlParser=true&useUnifiedTopology=true';
const mongooseUrl = 'mongodb+srv://dev-user:' + process.env.MONGODBPASSWORD + '@cluster-dev.j87rm.mongodb.net/data';
/** @type {Db} */
var _db;

module.exports = {

    /**
     * Starts a connection to MongoDB
     */
    async connect() {
        const mongoClient = new MongoClient(url);

        await mongoClient.connect();

        console.log('Connected to mongoDB');
        _db = mongoClient.db('data');
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
        _db = await mongoose.connect(mongooseUrl, {useNewUrlParser: true, useUnifiedTopology: true});
    }

};