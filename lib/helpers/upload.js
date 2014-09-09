'use strict';

var rarity = require('rarity');

/**
 * Upload `event` (containing event data) onto AnyFetch.
 *
 *
 * @param {Object} event Event to upload, plus anyfetchClient
 * @param {Object} anyfetchClient Client for upload
 * @param {Function} cb Callback to call once events has been uploaded.
 */
module.exports = function(event, anyfetchClient, cb) {
  console.log("Uploading ", event.identifier);

  var eventDocument = {
    identifier: event.identifier,
    actions: {
      show: event.htmlLink
    },
    creation_date: event.created,
    modification_date: event.updated,
    metadata: {},
    document_type: 'event',
    user_access: [anyfetchClient.accessToken]
  };
  
  anyfetchClient.postDocument(eventDocument, rarity.slice(1, cb));
};
