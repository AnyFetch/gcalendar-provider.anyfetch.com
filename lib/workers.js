'use strict';

var rarity = require('rarity');

var uploadEvent = require('./helpers/upload.js');

module.exports.addition = function additionQueueWorker(job, cb) {
  uploadEvent(job.task, job.anyfetchClient, cb);
};

module.exports.deletion = function deletionQueueWorker(job, cb) {
  console.log("Deleting", job.task.identifier);
  job.anyfetchClient.deleteDocumentByIdentifier(job.task.identifier, rarity.slice(1, function(err) {
    if(err && err.toString().match(/expected 204 "No Content", got 404 "Not Found"/i)) {
      err = null;
    }

    cb(err);
  }));
};
