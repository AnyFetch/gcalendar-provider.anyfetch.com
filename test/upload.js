'use strict';

var request = require('supertest');
var AnyFetchProvider = require('anyfetch-provider');
var Anyfetch = require('anyfetch');

require('should');

var config = require('../config/configuration.js');
var serverConfig = require('../lib/');

describe("Workflow", function () {
  before(AnyFetchProvider.debug.cleanTokens);

  // Create a fake HTTP server
  Anyfetch.setApiUrl('http://localhost:1337');
  var apiServer = Anyfetch.createMockServer();
  apiServer.listen(1337);

  before(function(done) {
    AnyFetchProvider.debug.createToken({
      anyfetchToken: 'fake_gc_access_token',
      data: {
        tokens: {
          refresh_token: config.testRefreshToken
        },
        callbackUrl: config.providerUrl + "/init/callback"
      },
      cursor: null,
      accountName: 'accountName'
    }, done);
  });

  it("should upload data to AnyFetch", function(done) {
    serverConfig.config.retry = 0;
    var server = AnyFetchProvider.createServer(serverConfig.connectFunctions, __dirname + '/../lib/workers.js', __dirname + '/../lib/update.js', serverConfig.config);

    var count = 0;
    apiServer.override('post', '/documents', function(req, res) {
      req.params.should.have.property('identifier');
      req.params.should.have.property('actions');
      req.params.should.have.property('creation_date');
      req.params.should.have.property('modification_date');
      req.params.should.have.property('document_type', 'event');
      req.params.should.have.property('user_access');

      req.params.should.have.property('metadata');
      req.params.metadata.should.have.property('startDate');
      req.params.metadata.should.have.property('endDate');
      req.params.metadata.should.have.property('name');
      req.params.metadata.should.have.property('attendee');
      req.params.metadata.should.have.property('organizer');

      count += 1;
      res.send(200);
    });

    request(server)
      .post('/update')
      .send({
        access_token: 'fake_gc_access_token',
        api_url: 'http://localhost:1337',
        documents_per_update: 2500
      })
      .expect(202)
      .end(function(err) {
        if(err) {
          throw err;
        }
      });

    server.usersQueue.on('job.task.failed', function(job, err) {
      done(err);
    });

    server.usersQueue.on('job.update.failed', function(job, err) {
      done(err);
    });

    server.usersQueue.once('empty', function() {
      count.should.eql(2);
      done();
    });
  });
});
