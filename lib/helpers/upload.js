'use strict';

var rarity = require('rarity');

var getDateFromObject = function(obj) {
  if (!obj) {
    return undefined;
  }

  if (obj.dateTime) {
    return new Date(obj.dateTime);
  }
  else if(obj.date) {
    return new Date(obj.date);
  }
  else {
    return undefined;
  }
};

/**
 * Upload `event` (containing event data) onto AnyFetch.
 *
 *
 * @param {Object} event Event to upload, plus anyfetchClient
 * @param {Object} anyfetchClient Client for upload
 * @param {Function} cb Callback to call once events has been uploaded.
 */
module.exports = function uploadEvent(event, anyfetchClient, cb) {

  var eventDocument = {
    identifier: event.identifier,
    actions: {
      show: event.htmlLink
    },
    creation_date: getDateFromObject(event.start),
    modification_date: event.updated,
    metadata: {},
    document_type: 'event',
    user_access: [anyfetchClient.accessToken]
  };

  eventDocument.metadata.startDate = getDateFromObject(event.start);
  eventDocument.metadata.endDate = getDateFromObject(event.end);
  eventDocument.metadata.name = event.summary;
  eventDocument.metadata.description = event.description;
  eventDocument.metadata.location = event.location;

  if(event.attendees) {
    var uniqueAttendees = [];
    event.attendees.forEach(function(item) {
      if(!uniqueAttendees.some(function(attendee) {
        if(attendee.email === item.email) {
          return true;
        }
      })) {
        uniqueAttendees.push(item);
      }
    });
    eventDocument.metadata.attendee = uniqueAttendees.map(function(attendee) {
      return {
        name: attendee.displayName,
        mail: attendee.email
      };
    });
  }
  else {
    eventDocument.metadata.attendee = [];
  }

  if(event.organizer) {
    eventDocument.metadata.organizer = {
      name: event.organizer.displayName,
      mail: event.organizer.email
    };

    eventDocument.metadata.attendee.push(eventDocument.metadata.organizer);
  }

  anyfetchClient.postDocument(eventDocument, rarity.slice(1, cb));
};
