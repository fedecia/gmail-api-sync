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

gmailApiSync.authorizeWithToken(accessToken, function (err, oauth) {
    if (err) {
        console.log("Something went wrong: " + err);
        return;
    }
    else {
        gmailApiSync.queryMessages(oauth, "from:*.org", function (err, response) {
            if (err) {
                console.log("Something went wrong: " + err);
                return;
            }
            console.log(JSON.stringify(response));
        });
    }
});

//Using Server Auth, to get a new token run generate_server_auth.js and replace serverAuthCode the code from the visited URL.
var serverAuthCode = "4/-u9M18VcqVQya6Cj-M12TbSQE4PKmNN1g4XqUBXiUfY";

gmailApiSync.authorizeWithServerAuth(serverAuthCode, function (err, oauth) {
    if (err) {
        console.log("Something went wrong: " + err);
        return;
    }
    else {
        gmailApiSync.queryMessages(oauth, "from:*.org", function (err, response) {
            if (err) {
                console.log("Something went wrong: " + err);
                return;
            }
            console.log(JSON.stringify(response));
        });
    }


});
