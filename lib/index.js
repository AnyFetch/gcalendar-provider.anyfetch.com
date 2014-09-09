'use strict';
/**
 * This object contains all the handlers to use for this providers
 */
var googleapis = require('googleapis');
var rarity = require('rarity');
var async = require('async');
var CancelError = require('anyfetch-provider').CancelError;

var config = require('../config/configuration.js');
var retrieveEvents = require('./helpers/retrieve.js');
var uploadEvent = require('./helpers/upload.js');

var redirectToService = function(callbackUrl, cb) {
  var oauth2Client = new googleapis.auth.OAuth2(config.googleId, config.googleSecret, callbackUrl);

  // generate consent page url for Google Calendar access, even when user is not connected (offline)
  var redirectUrl = oauth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: ['https://www.googleapis.com/auth/calendar.readonly', 'https://www.googleapis.com/auth/userinfo.email'],
    approval_prompt: 'force', // Force resending a refresh_token
  });

  cb(null, redirectUrl, {redirectUrl: redirectUrl, callbackUrl: callbackUrl});
};

var retrieveTokens = function(reqParams, storedParams, cb) {
  if(reqParams.error === "access_denied") {
    return cb(new CancelError());
  }

  async.waterfall([
    function getToken(cb) {
      var oauth2Client = new googleapis.auth.OAuth2(config.googleId, config.googleSecret, storedParams.callbackUrl);
      oauth2Client.getToken(reqParams.code, rarity.carryAndSlice([oauth2Client], 3, cb));
    },
    function getUserInfo(oauth2Client, tokens, cb) {
      oauth2Client.credentials = tokens;
      googleapis.oauth2('v2').userinfo.get({auth: oauth2Client}, rarity.carryAndSlice([tokens], 3, cb));
    },
    function callFinalCb(tokens, data, cb) {
      cb(null, data.email, {tokens: tokens, callbackUrl: storedParams.callbackUrl});
    }
  ], cb);
};

var updateAccount = function(serviceData, cursor, queues, cb) {
  // Retrieve all events since last call
  if(!cursor) {
    cursor = new Date(1970);
  }
  var newCursor = new Date();

  async.waterfall([
    function refreshTokens(cb) {
      var oauth2Client = new googleapis.auth.OAuth2(config.googleId, config.googleSecret, serviceData.callbackUrl);
      oauth2Client.refreshToken_(serviceData.tokens.refresh_token, rarity.carryAndSlice([oauth2Client], 3, cb));
    },
    function callRetrieveEvents(oauth2Client, tokens, cb) {
      tokens.refresh_token = serviceData.tokens.refresh_token;
      serviceData.tokens = tokens;
      oauth2Client.credentials = tokens;
      retrieveEvents(oauth2Client, cursor, cb);
    },
    function handleEvents(events, cb) {
      // Handle events and identifier => htmlLink
      events.forEach(function(event) {
        event.identifier = event.htmlLink;

        if (event.status === 'cancelled') {
          queues.deletion.push(event);
        }
        else {
          queues.addition.push(event);
        }
      });

      cb(null, newCursor, serviceData);
    }
  ], cb);
};

var additionQueueWorker = function(job, cb) {
  uploadEvent(job.task, job.anyfetchClient, cb);
};

var deletionQueueWorker = function(job, cb) {
  console.log("Deleting", job.task.identifier);
  job.anyfetchClient.deleteDocumentByIdentifier(job.task.identifier, rarity.slice(1, cb));
};

additionQueueWorker.concurrency = config.concurrency;
deletionQueueWorker.concurrency = config.concurrency;

module.exports = {
  connectFunctions: {
    redirectToService: redirectToService,
    retrieveTokens: retrieveTokens
  },
  updateAccount: updateAccount,
  workers: {
    addition: additionQueueWorker,
    deletion: deletionQueueWorker
  },

  config: config
};
