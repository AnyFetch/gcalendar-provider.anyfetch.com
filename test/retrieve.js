'use strict';

require('should');

var googleapis = require('googleapis');
var config = require('../config/configuration.js');
var retrieve = require('../lib/helpers/retrieve.js');

describe("Retrieve code", function () {
  it("should list events", function (done) {
    var oauth2Client = new googleapis.auth.OAuth2(config.googleId, config.googleSecret, config.providerUrl + "/init/callback");
    oauth2Client.refreshToken_(config.testRefreshToken, function(err, tokens) {
      if(err) {
        return done(err);
      }

      oauth2Client.credentials = tokens;
      retrieve(oauth2Client, null, function(err, events) {
        if(err) {
          return done(err);
        }

        events.should.have.lengthOf(2);
        done();
      });
    });
  });

  it("should list events updated after specified date", function (done) {
    var oauth2Client = new googleapis.auth.OAuth2(config.googleId, config.googleSecret, config.providerUrl + "/init/callback");
    oauth2Client.refreshToken_(config.testRefreshToken, function(err, tokens) {
      if(err) {
        return done(err);
      }

      oauth2Client.credentials = tokens;
      retrieve(oauth2Client, new Date(2020, 7, 22), function(err, events) {
        if(err) {
          throw err;
        }

        events.should.have.lengthOf(0);
        done();
      });
    });
  });
});
