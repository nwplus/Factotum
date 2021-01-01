require('dotenv-flow').config({
    path: '../',
});
require("firebase/firestore");


// Firebase requirements
const firebase = require('firebase/app');

// firebase config
const firebaseConfig = {
    apiKey: process.env.FIREBASEAPIKEY,
    authDomain: process.env.FIREBASEAUTHDOMAIN,
    databaseURL: process.env.FIREBASEURL,
    projectId: process.env.FIREBASEPROJECTID,
    storageBucket: process.env.FIREBASEBUCKET,
    messagingSenderId: process.env.FIREBASESENDERID,
    appId: process.env.FIREBASEAPPID,
    measurementId: process.env.FIREBASEMEASUREMENTID
};

// initialize firebase
const app = firebase.initializeApp(firebaseConfig);
const db = firebase.firestore(app);


let sponsorList = [
'mandy.xiao@hootsuite.com',
'kush.patel@hootsuite.com',
'donovan@gscloudsolutions.com',
'jennifer.macfarlane@hootsuite.com',
'calvin.lobo@hootsuite.com'
]


let mentorList = ['tywalker@microsoft.com',
'rpdjacinto@gmail.comm',
'jesus.delvalle@bayer.comm',
'ben.t@utexas.edum',
'janetchen906@gmail.comm',
'cameronshum@hotmail.comm',
'harinwu99@gmail.comm',
'sofia@legible.comm',
'siunami.matt@gmail.comm',
'chadjmccolm@gmail.comm',
'stellamariam@gmail.comm',
'chang.han@ubc.cam',
'ufukbatmaz@gmail.com',
's.jatin1903@gmail.comm',
'kevinjaic@gmail.com',
'pujaakhurana@gmail.com',
'achinth@student.ubc.ca',
'shardul.nayak@gmail.com',
'ksbystrom@gmail.com',
'calvin.cheng.cc@outlook.com',
'mlam8428@gmail.com',
'anthony@anthonychu.ca',
'carlosyu868@gmail.com',
'ADRIANO.SELAVILES@GMAIL.COM',
'paulcu@gmail.com',
'marc.ho380@gmail.com',
'tonyzshen@gmail.com',
'akashpl2002@outlook.com',
'anushkagupta20128@gmail.com',
'jleung513@gmail.com',
'adam.mitha@gmail.com',
'srjordon414@gmail.com',
'theovb@me.com',
'developerm29@gmail.com',
'chunghufamily@gmail.com',
'evelynylchua@gmail.com',
'liam.armstrong124@gmail.com',
'me@anand.io',
'tripathy.prateek@gmail.com',
'krishmunot@gmail.com',
'yashramesh982000@gmail.com',
'mo@mohammad.dev',
'farzan.nadeem@hotmail.com']

let staffList = [
'adel@nwplus.io',
'alex@nwplus.io',
'alexander@nwplus.io',
'alice@nwplus.io',
'allison@nwplus.io',
'andy@nwplus.io',
'anlin@nwplus.io',
'anne@nwplus.io',
'audri@nwplus.io',
'ben@nwplus.io',
'berger@nwplus.io',
'bonny@nwplus.io',
'carmen@nwplus.io',
'cayenne@nwplus.io',
'christy@nwplus.io',
'daniel@nwplus.io',
'daniels@nwplus.io',
'derek@nwplus.io',
'elaine@nwplus.io',
'giulio@nwplus.io',
'ian@nwplus.io',
'jacky@nwplus.io',
'jacob@nwplus.io',
'jenny@nwplus.io',
'jess@nwplus.io',
'jill@nwplus.io',
'john@nwplus.io',
'joice@nwplus.io',
'jp@nwplus.io',
'karan@nwplus.io',
'kevinwu@nwplus.io',
'kevin@nwplus.io',
'maggie@nwplus.io',
'marisa@nwplus.io',
'mary@nwplus.io',
'michael@nwplus.io',
'michelle@nwplus.io',
'nicholas@nwplus.io',
'philip@nwplus.io',
'philman@nwplus.io',
'rebecca@nwplus.io',
'rebubu@nwplus.io',
'ryan@nwplus.io',
'sandy@nwplus.io',
'shirley@nwplus.io',
'shuting@nwplus.io',
'sophie@nwplus.io',
'stephanie@nwplus.io',
'suzanne@nwplus.io',
'tiffany@nwplus.io',
]

let staff2 = ['victoria@nwplus.io',
    'victorial@nwplus.io',
    'vincent@nwplus.io']

staff2.forEach((value, index, list) => {
    db.collection('members').doc().set({
        'name' : value.substring(0, value.indexOf('@')),
        'email' : value,
        'type' : 'staff',
        'isVerified' : false
    });
});

// staffList.forEach((value, index, list) => {
//     db.collection('members').doc().set({
//         'name' : value.substring(0, value.indexOf('@')),
//         'email' : value,
//         'type' : 'staff',
//         'isVerified' : false
//     });
// });


// mentorList.forEach((value, index, list) => {
//     db.collection('members').doc().set({
//         'name' : value.substring(0, value.indexOf('@')),
//         'email' : value,
//         'type' : 'mentor',
//         'isVerified' : false
//     });
// });

// sponsorList.forEach((value, index, list) => {
//     db.collection('members').doc().set({
//         'name' : value.substring(0, value.indexOf('@')),
//         'email' : value,
//         'type' : 'sponsor',
//         'isVerified' : false
//     });
// });