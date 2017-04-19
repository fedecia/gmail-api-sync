var gmailApiSync = require('../index.js');

//Load Google Api Project client secret.
gmailApiSync.setClientSecretsFile('./client_secret.json');
gmailApiSync.getNewServerAuthCode();
