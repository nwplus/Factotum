
const envfile = require('envfile');
const fs = require('fs');

// add the file path in this requires
const adminSDKConfig = require('../../nwplus-bot-admin-sdk.json');

// copy and paste the logs output to the .env file
console.log(JSON.stringify(adminSDKConfig));
