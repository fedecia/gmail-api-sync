var gmailApiSync = require('../index.js');
var assert = require('assert');
var mailsender = require('gmail-sender-oauth');

//Load Google Api Project client secret.
var CLIENT_SECRET_PATH = 'test/client_secret.json';
gmailApiSync.setClientSecretsFile(CLIENT_SECRET_PATH);

//Using AccessToken;
var accessToken = {
    "access_token": "ya29.GlsyBDLbRnMV1NsaaQFRNJfOUjog-XC6IX9gReZFsrFrPPpdNYB6742P5CuIOuCBvN45i78mGreZ4Ktmn74VphwHpvQxxEPTfxjvPAbzSiyF0J1afGVvf2WXURnE",
    "refresh_token": "1/KXVGK6m2k_pNPTSffBHKzWR1TGkPEnEEeGgCNF6BwmH6LhIy0SBXv1atXJ5d31cJ",
    "token_type": "Bearer",
    "expiry_date": 1492639284694
};

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
                return callback(null, response);
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
                    return callback(err, null);
                }
            });
        }
    });
}

function sendMail(data,callback){
    var tokenSendScope = {"access_token":"ya29.Gls0BCfU20MWEoAolHto3qIhrYqBY55SDyxK_vrJBk82IwF6WGnYO6bOaj1sAdFe8KS7z_ZBRCo_m6WBbdqHbiyfOSWIo6-0TAAp_0uWW2bsPKkAzj5SbPXZMqvb","refresh_token":"1/iling5bFt8tLRurm2vuf4U2pj5Q7AvdBdLt6Dlod2BY","token_type":"Bearer","expiry_date":1492826551018};
    mailsender.setClientSecretsFile(CLIENT_SECRET_PATH);
    mailsender.send(tokenSendScope,data,callback);
}

describe('FullSync', function () {
    describe('#queryMessages("from:*.mil")', function () {
        it('should return no messages for .mil domain', function (done) {
            var options = {query: 'from:*.mil'};
            fullSyncTest(options, function (err, response) {
                if (err) return done(err);
                else {
                    assert.equal(0, response.emails.length);
                    return done();
                }
            });

        });
    });
    describe('#queryMessages("subject:mocha-tests-are-fun-not!,format:list")', function () {
        it('should return 1 message for subject "mocha-tests-are-fun-not!"', function (done) {
            var options = {
                query: 'subject:mocha-tests-are-fun-not!',
                format: 'list'
            };
            fullSyncTest(options, function (err, response) {
                if (err) return done(err);
                else {
                    assert.equal(1, response.emails.length);
                    assert.equal('15b8cdae6ecf4714', response.emails[0].id);
                    return done();
                }
            });

        });
    });
    describe('#queryMessages("subject:mocha-tests-are-fun-not!,format:raw")', function () {
        it('should return 1 message with the raw', function (done) {
            var options = {
                query: 'subject:mocha-tests-are-fun-not!',
                format: 'raw'
            };
            fullSyncTest(options, function (err, response) {
                if (err) return done(err);
                else {
                    assert.equal(1, response.emails.length);
                    assert.notEqual(response.emails[0].raw, null);
                    return done();
                }
            });

        });
    });
    describe('#queryMessages("subject:mocha-tests-are-fun-not!,format:metadata")', function () {
        it('should return 1 message with the right metadata', function (done) {
            var options = {
                query: 'subject:mocha-tests-are-fun-not!',
                format: 'metadata'
            };
            fullSyncTest(options, function (err, response) {
                if (err) return done(err);
                else {
                    assert.equal(response.emails[0].subject,'mocha-tests-are-fun-not!');
                    assert.equal(response.emails[0].id,'15b8cdae6ecf4714');
                    return done();
                }
            });

        });
    });
    describe('#queryMessages("subject:mocha-tests-are-fun-not!,format:full")', function () {
        it('should return 1 parsed message for subject "mocha-tests-are-fun-not!"', function (done) {
            var options = {
                query: 'subject:mocha-tests-are-fun-not!',
                format: 'full'
            };
            fullSyncTest(options, function (err, response) {
                if (err) return done(err);
                else {
                    assert.equal(response.emails.length,1);
                    assert.equal(response.emails[0].id,'15b8cdae6ecf4714');
                    assert.equal(response.emails[0].textHtml,'<div dir=\"ltr\"><br></div>');
                    assert.equal(response.emails[0].textPlain,'\r\n');                    done();
                }
            });

        });
    });
    describe('#queryMessages("subject:mocha-tests-are-fun-not!")', function () {
        it('should return 1 parsed message with format = null', function (done) {
            var options = {query: 'subject:mocha-tests-are-fun-not!'};
            fullSyncTest(options, function (err, response) {
                if (err) return done(err);
                else {
                    assert.equal(response.emails.length,1);
                    assert.equal(response.emails[0].id,'15b8cdae6ecf4714');
                    assert.equal(response.emails[0].textHtml,'<div dir=\"ltr\"><br></div>');
                    assert.equal(response.emails[0].textPlain,'\r\n');
                    return done();
                }
            });

        });
    });
});
var lastHistoryId;
describe('PartialSync', function () {
    describe('#syncMessages(lastestHistoryId)', function () {

        it('should return no messages new messages', function (done) {
            var firstOptions = {
                query: '',
                format: 'list'
            };
            fullSyncTest(firstOptions, function (err, firstResponse) {
                if (err) return done(err);
                else {
                    lastHistoryId = firstResponse.historyId;
                    var options = {
                        historyId: lastHistoryId,
                        format: 'list'
                    };
                    partialSync(options, function (err, secondResponse) {
                        if (err) return done(err);
                        else {
                            lastHistoryId = secondResponse.historyId;
                            assert.equal(secondResponse.emails.length,0);
                            return done();
                        }
                    })

                }
            });

        });

        it('should return just the newly sent email', function (done) {
            var firstOptions = {
                query: '',
                format: 'list'
            };
            fullSyncTest(firstOptions, function (err, firstResponse) {
                if (err) done(err);
                else {
                    lastHistoryId = firstResponse.historyId;
                    var data = {from: 'bestgrouptest@gmail.com', to: 'bestgrouptest@gmail.com', subject: 'Nice email', content: 'This is a test' };

                    sendMail(data,function (err,resp) {
                        if (err) {
                            return done(err);
                        }
                        var options = {
                            historyId: lastHistoryId,
                            format: 'metadata'
                        };
                        setTimeout(function () {
                            partialSync(options, function (err, response) {
                                if (err) return done(err);
                                else {
                                    assert.equal(response.emails.length,1);
                                    assert.equal(response.emails[0].to,data.to);
                                    assert.equal(response.emails[0].subject,data.subject);
                                    assert(response.emails[0].from.includes(data.from));
                                    return done();
                                }
                            });

                        },300);

                    })
                }
            })
        });
    });
});

describe('Authentication',function(){
    describe('#authorizeWithServerAuth(invalidCode))',function () {
      it('should error with trying to auth with invalid/expired code',function (done) {
          var serverAuthCode = "4/-u9M18VcqVQya6Cj-M12TbSQE4PKmNN1g4XqUBXiUfY";
          gmailApiSync.authorizeWithServerAuth(serverAuthCode,function (err,oauth) {
              if (err){
                  done()
              }else {
                  done(oauth);
              }

          });
      });
    });
    describe('#authorizeWithToken(invalidToken))',function () {
        it('should error with trying to auth with invalid/expired token',function (done) {
            var invalidToken = {
                "access_token": "ya29.-dfjsdfodsjfoajdf-invalid",
                "refresh_token": "1/dfjsdfodsjfoajdf-invalid",
                "token_type": "Bearer",
                "expiry_date": 1492639284694
            };
            gmailApiSync.authorizeWithToken(invalidToken,function (err,oauth) {
                if (err){
                    done(err);
                }else {
                    var options = {query: 'from:nodomain.com', format: 'list'};
                    gmailApiSync.queryMessages(oauth,options,function (err,resp) {
                        if (err) done();
                        else{
                            done(resp);
                        }

                    })
                }

            });
        });
    });
    describe('#authorizeWithToken(validToken))',function () {
        it('should return an Oauth2 object when trying to auth with a valid token',function (done) {
            gmailApiSync.authorizeWithToken(accessToken,function (err,oauth) {
                if (err){
                    done(err)
                }else {
                    var options = {query: 'from:nodomain.com', format: 'list'};
                    gmailApiSync.queryMessages(oauth,options,function (err,resp) {
                        if (err) done(err);
                        else{
                            assert.equal(resp.emails.length,0);
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
