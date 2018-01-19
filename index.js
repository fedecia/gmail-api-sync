var debug = require('debug')('gmail-api-sync');
var fs = require('fs');
var google = require('googleapis');
var gmailApiParser = require('gmail-api-parse-message');
var googleAuth = require('google-auth-library');
var googleBatch = require('google-batch');
var batch = new googleBatch();
var sortBy = require('sort-by');

var SCOPES = ['https://www.googleapis.com/auth/gmail.readonly'];
var credentials = null;
var clientSecretPath;

exports.setClientSecretsFile = function (path) {
    clientSecretPath = path;
};
exports.resetCredentials = function (callback) {
    credentials = null;
    loadClientSecrets(callback);
};

// Load client secrets from a local file.
var loadClientSecrets = function (callback) {
    fs.readFile(clientSecretPath, function processClientSecrets(err, content) {
        if (err) {
            debug('Error loading client secret file: ' + err);
            return callback(err);
        } else {
            credentials = JSON.parse(content);
            return callback();
        }
    });
};

function checkCredentials(callback) {
    if (!credentials) {
        loadClientSecrets(function (err) {
            if (err) {
                debug('Error loading credentials.');
                return callback(err);
            }
            else {
                return callback();
            }
        });
    } else {
        return callback();
    }
}

function createOauth2Client() {
    var clientSecret = credentials.installed.client_secret;
    var clientId = credentials.installed.client_id;
    var redirectUrl = credentials.installed.redirect_uris[0];
    var auth = new googleAuth();
    return new auth.OAuth2(clientId, clientSecret, redirectUrl);
}

/**
 * Get and store new token after prompting for user authorization, and then
 * execute the given callback with the authorized OAuth2 client.
 *
 */
exports.getNewServerAuthCode = function (newScopes,callback) {
    var scopes = SCOPES;
    if (newScopes) {
        scopes = newScopes;
    }
    checkCredentials(function (err) {
        if (err) {
            debug('Unable to load credentials. Is Client secret set?');
            return;
        }
        var oauth2Client = createOauth2Client();
        var authUrl = oauth2Client.generateAuthUrl({
            access_type: 'offline',
            scope: scopes
        });
        debug('Authorize this app by visiting this url: ', authUrl);
        callback('Authorize this app by visiting this url: ' + authUrl);

    });
};


/**
 * Create an OAuth2 client with the given credentials, and then execute the
 * given callback function.
 *
 * @param {Object} accessToken The token to create an Oauth2 object.
 * @param {function} callback The callback to call with the authorized client.
 */
exports.authorizeWithToken = function (accessToken, callback) {
    if (!accessToken) {
        return callback(new Error('serverAuthCode cannot be null'), null);
    }
    checkCredentials(function (err) {
        if (err) {
            return callback(err, null);
        }
        var oauth2Client = createOauth2Client();
        oauth2Client.credentials = accessToken;
        callback(null, oauth2Client);
    });
};

exports.getNewAccesToken = function (serverAuthCode, callback) {
    checkCredentials(function (err) {
        if (err) {
            return callback(err, null);
        }
        var oauth2Client = createOauth2Client();
        oauth2Client.getToken(serverAuthCode, function (err, token) {
            if (err) {
                return callback(new Error('Error while trying to retrieve access token. ' + err), null);
            } else {
                return callback(null, token);
            }
        });
    });

};

exports.authorizeWithServerAuth = function (serverAuthCode, callback) {
    this.getNewAccesToken(serverAuthCode, function (err, token) {
        if (err) {
            return callback(new Error('Error while trying to retrieve access token. ' + err), null);
        } else {
            var oauth2Client = createOauth2Client();
            oauth2Client.credentials = token;
            callback(null, oauth2Client);
        }
    });
};

function getCurrentHistoryId(auth, callback){
    var gmail = google.gmail('v1');
    gmail.users.getProfile({
        auth: auth,
        userId: 'me'
    }, function (err, response) {
        if (response) {
            return callback(response.historyId);
        } else
            return callback(null);
    });
}

function partialSyncListMessagesInitial(auth, historyId, callback) {
    var gmail = google.gmail('v1');
    gmail.users.history.list({
        auth: auth,
        userId: 'me',
        startHistoryId: historyId,
        historyTypes: 'messageAdded'
    }, function (err, response) {
        if (err) {
            if (err.code == 404){
                getCurrentHistoryId(auth, function (currentHistoryId) {
                    response = {messages : [], historyId : currentHistoryId};
                    new Error('partialSyncListMessagesInitial: Gmail message not found for historyId: '+ historyId);
                    return callback(null, response);
                });
            } else
                return callback(new Error('partialSyncListMessagesInitial: Gmail API returned an error: ' + err), null);
        }
        else {
            return callback(null, response);
        }
    });
}
function partialSyncListMessagesPage(auth, resp, messages, callback) {
    var newMessages = [];
    if (resp.history == null) {
        return callback(null, messages, resp.historyId);
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
            startHistoryId: resp.historyId
        }, function (err, response) {
            if (err) {
                return callback(new Error('partialSyncListMessagesPage: The API returned an error: ' + err), null);
            } else {
                partialSyncListMessagesPage(auth, response, messages, callback);
            }
        });
    } else {
        debug('New messages retrived: ' + messages.length);
        callback(null, messages);
    }

}
function listMessagesInitial(auth, query, callback) {
    var gmail = google.gmail('v1');
    gmail.users.messages.list({
        auth: auth,
        userId: 'me',
        q: query
    }, function (err, response) {
        if (err) {
            return callback(new Error('listMessagesInitial: The API returned an error: ' + err), null);
        }
        else {
            callback(null, response);
        }
    });
}
function listMessagesPage(auth, query, resp, messages, callback) {
    if (resp.messages == null) {
        debug('No new messages found: ');
        return callback(null, messages);
    }
    messages = messages.concat(resp.messages);

    var nextPageToken = resp.nextPageToken;
    if (nextPageToken) {
        var gmail = google.gmail('v1');
        gmail.users.messages.list({
            auth: auth,
            userId: 'me',
            pageToken: nextPageToken,
            q: query
        }, function (err, response) {
            if (err) {
                return callback(new Error('listMessagesPage: The API returned an error: ' + err), null);
            } else {
                listMessagesPage(auth, query, response, messages, callback);
            }
        });
    } else {
        debug('New messages retrived: ' + messages.length);
        callback(null, messages);
    }

}

function fullSyncListMessages(auth, query, callback) {
    var messages = [];
    listMessagesInitial(auth, query, function (err, resp) {
        if (err) {
            return callback(err, null);
        }
        listMessagesPage(auth, query, resp, messages, function (err, messages) {
            if (err) {
                return callback(err, null);
            }
            callback(null, messages);
        });
    });
}

function partialSyncListMessages(auth, historyId, callback) {
    var messages = [];
    partialSyncListMessagesInitial(auth, historyId, function (err, resp) {
        if (err) {
            return callback(err, null);
        }
        partialSyncListMessagesPage(auth, resp, messages, function (err, messages, historyId) {
            if (err) {
                return callback(err, null);
            }
            callback(null, messages, historyId);
        });
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
};

exports.getMessages = function (oauth, options, messageIds, callback) {
    batch.setAuth(oauth);
    var gmail = google.gmail({
        version: 'v1'
    });
    var gmailApiFormat;
    switch (options.format) {
    case 'list':
        gmailApiFormat = 'metadata';
        break;
    case 'metadata':
        gmailApiFormat = 'metadata';
        break;
    case 'raw':
        gmailApiFormat = 'raw';
        break;
    case 'full':
        gmailApiFormat = 'full';
        break;
    default:
        gmailApiFormat = 'full';
    }

    var messages = [];
    messageIds.forEach(function (messageId) {
        var params = {
            googleBatch: true,
            userId: 'me',
            id: messageId.id,
            format: gmailApiFormat
        };
        batch.add(gmail.users.messages.get(params));
    });

    batch.exec(function (err, responses, errorDetails) {
        if (err) {
            return callback(new Error('The API returned an error: ' + JSON.stringify(errorDetails)), null);
        }

        responses.forEach(function (response) {
            var message = {};
            if (response.body.error) {
                debug('message not found');
            }
            else {
                message.id = response.body.id;
                message.historyId = response.body.historyId;
                message.raw = response.body.raw;
                //        debug(message.historyId);
                if (response.body.payload) {
                    message.subject = getHeader(response.body.payload.headers, 'Subject');
                    message.from = getHeader(response.body.payload.headers, 'From');
                    message.to = getHeader(response.body.payload.headers, 'To');
                    message.date = getHeader(response.body.payload.headers, 'Date');
                    var parsedMessage = gmailApiParser(response.body);
                    message.textHtml = parsedMessage.textHtml;
                    message.textPlain = parsedMessage.textPlain;
                }

                messages.push(message);
            }
        });
        batch.clear();
        //        debug(JSON.stringify(messages));
        callback(null, messages);
    });
};

function getHistoryId(oauth, message, callback) {
    exports.getMessages(oauth, {format: 'list'}, [message], function (err, parsedMessages) {
        if (err) {
            return callback(err, null);
        }
        
        var historyId = parsedMessages[0].historyId;
        return callback(null, historyId);
    });

}

function getLastEmail(emails){
    var lastEmail = emails.sort(sortBy('-id'))[0];
    debug('last email: ' +JSON.stringify(lastEmail));
    return lastEmail;

}

exports.queryMessages = function (oauth, options, callback) {
    var response = {};
    fullSyncListMessages(oauth, options.query, function (err, messages) {
        if (err) {
            return callback(err, null);
        }
        if (messages.length === 0) {
            response.emails = [];
            return callback(null, response);
        }

        if (options.format === 'list') {
            response.emails = messages;
            getHistoryId(oauth, getLastEmail(messages), function (err, historyId) {
                if (err) {
                    return callback(err, null);
                }
                response.historyId = historyId;
                return callback(null, response);
            });
        }
        else {
            exports.getMessages(oauth, options, messages, function (err, emails) {
                if (err) {
                    return callback(err, null);
                }
                response.emails = emails;
                response.historyId = getLastEmail(emails).historyId;
                callback(null, response);
            });
        }
    });
};

exports.syncMessages = function (oauth, options, callback) {
    var response = {};
    partialSyncListMessages(oauth, options.historyId, function (err, messages,historyId) {
        if (err) {
            return callback(err, null);
        }
        if (messages.length === 0) {
            response.historyId = historyId;
            response.emails = [];
            return callback(null, response);
        }
        if (options.format === 'list') {
            response.emails = messages;
            getHistoryId(oauth, messages[messages.length - 1], function (err, historyId) {
                if (err) {
                    return callback(err, null);
                }
                response.historyId = historyId;
                return callback(null, response);
            });

        }
        exports.getMessages(oauth, options, messages, function (err, newEmails) {
            if (err) {
                return callback(err, null);
            }
            response.emails = newEmails;
            if (newEmails[newEmails.length - 1])
                response.historyId = newEmails[newEmails.length - 1].historyId;
            else {
                response.historyId = historyId;
            }
            callback(null, response);
        });
    });


};
