var gmailApiSync = require('../index.js');
var assert = require('assert');

//Load Google Api Project client secret.
gmailApiSync.setClientSecretsFile('./client_secret.json');

//Using AccessToken;
var accessToken = {
    "access_token": "ya29.GlsyBDLbRnMV1NsaaQFRNJfOUjog-XC6IX9gReZFsrFrPPpdNYB6742P5CuIOuCBvN45i78mGreZ4Ktmn74VphwHpvQxxEPTfxjvPAbzSiyF0J1afGVvf2WXURnE",
    "refresh_token": "1/KXVGK6m2k_pNPTSffBHKzWR1TGkPEnEEeGgCNF6BwmH6LhIy0SBXv1atXJ5d31cJ",
    "token_type": "Bearer",
    "expiry_date": 1492639284694
}

//Full Sync
function fullSyncTest(options, callback) {
    gmailApiSync.authorizeWithToken(accessToken, function (err, oauth) {
        if (err) {
            console.log("Something went wrong: " + err);
            return callback(err, null);
        }
        else {
            gmailApiSync.queryMessages(oauth, options, function (err, response) {
                if (err) {
                    console.log("Something went wrong: " + err);
                    return callback(err, null);
                }
                //console.log(JSON.stringify(response));
                callback(null, response);
            });
        }
    });
}

//Partial Sync
function partialSync(options, callback) {
    //var historyId = 13855;

    gmailApiSync.authorizeWithToken(accessToken, function (err, oauth) {
        if (err) {
            console.log("Something went wrong: " + err);
            return callback(err, null);
        }
        else {
            gmailApiSync.syncMessages(oauth, options, function (err, response) {
                if (!err) {
                    // console.log(JSON.stringify(response));
                    callback(null, response);
                } else {
                    callback(err, null);
                }
            });
        }
    });
}
var firstOptions = {
    // query: '',
    format: 'metadata'
};


fullSyncTest(firstOptions, function (err, firstResponse) {
    if (err) {console.error(err)}
    else {
        var options = {
            historyId: firstResponse.historyId,
            format: 'list'
        };
        console.log('historyId: '+ firstResponse.historyId);

        partialSync(options, function (err, response) {
            if (err) {{console.error(err)}}
            else {
                console.log('historyId: '+ response.historyId);
                assert.equal(0, response.emails.length);

            }
        })

    }
});