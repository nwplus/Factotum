const fs = require('fs');

/** 
 * The firebase SDK ENV setter helps users convert firebase admin 
 * sdk json files to text to add to env file.
 * @module FirebaseSDKENVSetter 
 */

// add the file path in this requires
const adminSDKConfig = require('');

// copy and paste the logs output to the .env file
console.log(JSON.stringify(adminSDKConfig));
