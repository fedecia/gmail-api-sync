var gmailApiSync = require('../index.js');

//Load Google Api Project client secret.
gmailApiSync.setClientSecretsFile('./client_secret.json');

//Using AccessToken;
var accessToken = {
    "access_token": "ya29.GlsyBDLbRnMV1NsaaQFRNJfOUjog-XC6IX9gReZFsrFrPPpdNYB6742P5CuIOuCBvN45i78mGreZ4Ktmn74VphwHpvQxxEPTfxjvPAbzSiyF0J1afGVvf2WXURnE",
    "refresh_token": "1/KXVGK6m2k_pNPTSffBHKzWR1TGkPEnEEeGgCNF6BwmH6LhIy0SBXv1atXJ5d31cJ",
    "token_type": "Bearer",
    "expiry_date": 1492639284694
}
var options = {query: 'subject:mocha-tests-are-fun-not!',
    format : 'list'};

gmailApiSync.authorizeWithToken(accessToken, function (err, oauth) {
    if (err) {
        console.log("Something went wrong: " + err);
        return
    }
    else {
        gmailApiSync.queryMessages(oauth, options, function (err, response) {
            if (err) {
                console.log("Something went wrong: " + err);
                return;
            }
            console.log('resp :' + JSON.stringify(response));

        });
    }
});

options = {
    historyId: 15000,
    format: 'metadata'
};

gmailApiSync.authorizeWithToken(accessToken, function (err, oauth) {
    if (err) {
        console.log("Something went wrong: " + err);
        return ;
    }
    else {
        gmailApiSync.syncMessages(oauth, options, function (err, response) {
            if (!err) {
                console.log(JSON.stringify(response));

            } else {
                return;
            }
        });
    }
});