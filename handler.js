
'use strict';
const serverless = require('serverless-http');
const app = require('./src/index'); // Adjusted the path to point to index.js in the src directory

module.exports.app = serverless(app);

