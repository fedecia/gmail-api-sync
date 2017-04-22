var gmailApiSync = require('../index.js');

//Load Google Api Project client secret.
gmailApiSync.setClientSecretsFile('./client_secret.json');
gmailApiSync.getNewServerAuthCode(['https://www.googleapis.com/auth/gmail.readonly'] ,function(message){
    console.log(message);
    console.log('If you need a accessToken to be generated as well, run: \n' +
        'node generate_access_token <SERVER_AUTH_CODE>, with the code you received from the visited URL.');
});
