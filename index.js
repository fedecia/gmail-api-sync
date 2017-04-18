var fs = require('fs');
var readline = require('readline');
var google = require('googleapis');
var gmailApiParser = require('gmail-api-parse-message');
var googleAuth = require('google-auth-library');
var googleBatch = require('google-batch');
var batch = new googleBatch();
var googleApiBatch = googleBatch.require('googleapis');

var SCOPES = ['https://www.googleapis.com/auth/gmail.readonly'];
var credentials;

// Load client secrets from a local file.
var loadClientSecrets = function(clientSecretPath) {
	fs.readFile(clientSecretPath, function processClientSecrets(err, content) {
			if (err) {
					console.log('Error loading client secret file: ' + err);
					return;
			} else {
					credentials = JSON.parse(content);
			}
	});
}
/**
 * Create an OAuth2 client with the given credentials, and then execute the
 * given callback function.
 *
 * @param {Object} credentials The authorization client credentials.
 * @param {function} callback The callback to call with the authorized client.
 */
function authorize(accessToken, serverAuthCode, callback) {

    var clientSecret = credentials.installed.client_secret;
    var clientId = credentials.installed.client_id;
    var redirectUrl = credentials.installed.redirect_uris[0];
    var auth = new googleAuth();
    var oauth2Client = new auth.OAuth2(clientId, clientSecret, redirectUrl);

    // Check if we have previously stored a token.
    var token = accessToken;

    if (token == null || token === '') {
        getNewToken(oauth2Client, serverAuthCode, callback);
    } else {
        oauth2Client.credentials = token;
        callback(oauth2Client);
    }
//  });
}

/**
 * Get and store new token after prompting for user authorization, and then
 * execute the given callback with the authorized OAuth2 client.
 *
 * @param {google.auth.OAuth2} oauth2Client The OAuth2 client to get token for.
 * @param {getEventsCallback} callback The callback to call with the authorized
 *     client.
 */
function getNewToken(oauth2Client, serverAuthCode, callback) {
    if (serverAuthCode == null) {
        console.error('Please logout user and accept the new scope');
        callback();
    }
    var authUrl = oauth2Client.generateAuthUrl({
        access_type: 'offline',
        scope: SCOPES
    });


    oauth2Client.getToken(serverAuthCode, function (err, token) {
        if (err) {
            console.log('Error while trying to retrieve access token', err);
            return;
        }
        oauth2Client.credentials = token;
        callback(oauth2Client);
    });
}

function partialSyncListMessagesInitial(auth, historyId, callback) {
    var gmail = google.gmail('v1');
    gmail.users.history.list({
        auth: auth,
        userId: 'me',
        startHistoryId: historyId,
        historyTypes: 'messageAdded',
    }, function (err, response) {
        if (err) {
            console.error('partialSyncListMessagesInitial: The API returned an error: ' + err);
            return;
        }
        else {

            callback(response);
        }
    });
}
function partialSyncListMessagesPage(auth, resp, messages, callback) {
    var newMessages = [];
    if (resp.history == null) {
        return callback(messages);
    }
    resp.history.forEach(function (item) {
        newMessages.push(item.messages[0]);
    });
    messages = messages.concat(newMessages);

    var nextPageToken = resp.nextPageToken;
    if (nextPageToken) {
        var gmail = google.gmail('v1');
        gmail.users.history.list({
            auth: auth,
            userId: 'me',
            pageToken: nextPageToken,
            startHistoryId : resp.historyId,
        }, function (err, response) {
            if (err) {
                console.error('partialSyncListMessagesPage: The API returned an error: ' + err);
                return;
            } else {
                if (response.history != null) {
                }
                partialSyncListMessagesPage(auth, response, messages, callback);
            }
        });
    } else {
        console.log("New messages retrived: " + messages.length);
        callback(messages)
    }

}
function listMessagesInitial(auth, query, callback) {
    var gmail = google.gmail('v1');
    gmail.users.messages.list({
        auth: auth,
        userId: 'me',
        q: query,
    }, function (err, response) {
        if (err) {
            console.error('The API returned an error: ' + err);
            return;
        }
        else {
             callback(response)
        }
    });
}
function listMessagesPage(auth, query, resp, messages, callback) {
    if (resp.messages == null) {
        console.log("No new messages found: ")
        return callback(messages);
    }
    messages = messages.concat(resp.messages);

    var nextPageToken = resp.nextPageToken;
    if (nextPageToken) {
        console.log("has nextPageToken: " + nextPageToken);
        var gmail = google.gmail('v1');
        gmail.users.messages.list({
            auth: auth,
            userId: 'me',
            pageToken: nextPageToken,
            q: query,
        }, function (err, response) {
            if (err) {
                console.error('The API returned an error: ' + err);
                return;
            } else {
                if (response.messages != null) {
                }
                listMessagesPage(auth, query, response, messages, callback);
            }
        });
    } else {
        console.log("New messages retrived: " + messages.length);
        callback(messages)
    }

}

function fullSyncListMessages(auth, query, callback) {
    var messages = [];
    listMessagesInitial(auth, query, function (resp) {
        listMessagesPage(auth, query, resp, messages, function (messages) {
            callback(messages);
        })
    });
}

function partialSyncListMessages(auth, historyId, callback) {
    var messages = [];
    partialSyncListMessagesInitial(auth, historyId, function (resp) {
        partialSyncListMessagesPage(auth, resp, messages, function (messages) {
            callback(messages);
        })
    });
}

var getHeader = function (headers, name) {
    var header = '';
    headers.forEach(function (entry) {
        if (entry.name === name) {
            header = entry.value;
        }
    });
    return header;
}

function getMessages(auth, messageIds, callback) {
    batch.setAuth(auth);
    var gmail = googleApiBatch.gmail({
        version : 'v1'
    });
    var messages = [];
    messageIds.forEach(function(messageId){
        var params = {
            googleBatch : true,
            userId : "me",
            id: messageId.id
        };
        batch.add(gmail.users.messages.get(params));
    });

    batch.exec(function(err, responses, errorDetails){
        if (err) {
            console.error('The API returned an error: ' + JSON.stringify(errorDetails));
            return callback();
        }

        responses.forEach(function(response){
            if( response.body.payload != null) {
                var subject = getHeader(response.body.payload.headers, 'Subject');
                var from = getHeader(response.body.payload.headers, 'From');
                var date = getHeader(response.body.payload.headers, 'Date');
                var id = response.body.id;

                var parsedMessage = gmailApiParser(response.body);
                var textHtml = parsedMessage.textHtml;
								var textPlain = parsedMessage.textPlain;
                var historyId = response.body.historyId;
  
								var message = {
                    id: id,
                    date: date,
                    from: from,
                    subject: subject,
                    textHtml: textHtml,
										textPlain: textPlain,
                    historyId: historyId
                };
                messages.push(message);
            } else {
                //console.log("Skipping message with no body:" + JSON.stringify(response.body));
            }
        });
        batch.clear();
        callback(messages);
    });
}

var queryMessages = function (oauth, query, callback) {
	var response = {};
	fullSyncListMessages(oauth, query, function (messages) {
		if (messages.length === 0) {
				response.emails = [];
				return callback(response);
		}
		getMessages(oauth, messages, function (emails) {
				response.emails = emails;
				response.historyId = emails[0].historyId;
				callback(response);
		});
	});
}

var syncMessages = function (oauth, historyId, callback) {
		var response = {};
		partialSyncListMessages(oauth, historyId, function (messages) {
				if (messages.length === 0) {
						response.emails = [];
						return callback(response);
				}
				getMessages(oauth, messages, function (newEmails) {
								response.emails = newEmails;
								response.historyId = newEmails[newEmails.length - 1].historyId;
								callback(response);
				});
		});
	

}

module.exports = {loadClientSecrets, authorize, queryMessages,syncMessages, getMessages};
