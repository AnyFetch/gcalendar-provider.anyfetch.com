'use strict';

var googleapis = require('googleapis');
var rarity = require('rarity');
var async = require('async');
var TokenError = require('anyfetch-provider').TokenError;

var config = require('../config/configuration.js');
var retrieveEvents = require('./helpers/retrieve.js');

module.exports = function updateAccount(serviceData, cursor, queues, cb) {
  // Retrieve all events since last call
  var newCursor = new Date();

  async.waterfall([
    function refreshTokens(cb) {
      var oauth2Client = new googleapis.auth.OAuth2(config.googleId, config.googleSecret, serviceData.callbackUrl);
      oauth2Client.refreshToken_(serviceData.tokens.refresh_token, function(err, tokens) {
        if(err) {
          if(err.toString().match(/token/i)) {
            return cb(new TokenError());
          }
          return cb(err);
        }

        if(typeof tokens !== 'object' || !tokens.access_token) {
          return cb(new TokenError());
        }

        tokens.refresh_token = serviceData.tokens.refresh_token;
        serviceData.tokens = tokens;
        oauth2Client.credentials = tokens;
        retrieveEvents(oauth2Client, cursor, cb);
      });
    },
    function handleEvents(events, cb) {
      // Handle events and identifier => htmlLink
      events.forEach(function(event) {
        event.identifier = event.htmlLink;

        if(event.status === 'cancelled') {
          // On first run, we can safely skip the DELETION as there is no documents on API to be removed
          if(cursor) {
            queues.deletion.push(event);
          }
        }
        else {
          queues.addition.push(event);
        }
      });

      cb(null, newCursor, serviceData);
    }
  ], cb);
};
