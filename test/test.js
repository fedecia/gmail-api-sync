var gmailApiSync = require('../index.js');
var assert = require('assert');

//Load Google Api Project client secret.
gmailApiSync.setClientSecretsFile('test/client_secret.json');

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

describe('FullSync', function () {
    describe('#queryMessages("from:*.mil")', function () {
        it('should return no messages for .mil domain', function (done) {
            var options = {query: 'from:*.mil'};
            fullSyncTest(options, function (err, response) {
                if (err) done(err);
                else {
                    assert.equal(0, response.emails.length);
                    done();
                }
            });

        });
    });
    describe('#queryMessages("subject:mocha-tests-are-fun-not!")', function () {
        it('should return 1 message subject "mocha-tests-are-fun-not!"', function (done) {
            var options = {query: 'subject:mocha-tests-are-fun-not!',
            format : 'list'};
            fullSyncTest(options, function (err, response) {
                if (err) done(err);
                else {
                    assert.equal(1, response.emails.length);
                    done();
                }
            });

        });
    });
});
describe('PartialSync', function () {
    describe('#syncMessages(lastestHistoryId)', function () {
        it('should return no messages new messages', function (done) {
            this.timeout(3000);
            var firstOptions = {
                query: '',
                format: 'list'
            };
            fullSyncTest(firstOptions, function (err, firstResponse) {
                if (err) done(err);
                else {
                    var options = {
                        historyId: firstResponse.historyId,
                        format: 'list'
                    };
                    partialSync(options, function (err, response) {
                        if (err) done(err);
                        else {
                            assert.equal(0, response.emails.length);
                            done();
                        }
                    })

                }
            });

        });
    });
});


//Using Server Auth, to get a new token run generate_server_auth.js and replace serverAuthCode the code from the visited URL.
// var serverAuthCode = "4/-u9M18VcqVQya6Cj-M12TbSQE4PKmNN1g4XqUBXiUfY";
//
// gmailApiSync.authorizeWithServerAuth(serverAuthCode, function (err, oauth) {
//     if (err) {
//         console.log("Something went wrong: " + err);
//         return;
//     }
//     else {
//         gmailApiSync.queryMessages(oauth, "from:*.org", function (err, response) {
//             if (err) {
//                 console.log("Something went wrong: " + err);
//                 return;
//             }
//             console.log(JSON.stringify(response));
//         });
//     }
// });
