'use strict';
/**
 * @file Retrieve events for the account
 */

var googleapis = require('googleapis');
var async = require('async');
var rarity = require('rarity');

var retrieveCalendars = function retrieveCalendars(oauth2Client, pageToken, calendars, cb) {
  var options = {
    auth: oauth2Client
  };

  if(pageToken) {
    options.pageToken = pageToken;
  }

  googleapis.calendar('v3').calendarList
    .list(options, function(err, res) {
      if (err) {
        return cb(err);
      }

      calendars = calendars.concat(res.items);

      if(res.nextPageToken) {
        retrieveCalendars(oauth2Client, res.nextPageToken, calendars, cb);
      }
      else {
        cb(null, calendars);
      }
    });
};

function dateStringISO(d) {
 function pad(n){ return n < 10 ? '0' + n : n; }
 return d.getUTCFullYear() + '-' +
      pad(d.getUTCMonth() + 1) + '-' +
      pad(d.getUTCDate()) + 'T' +
      pad(d.getUTCHours()) + ':' +
      pad(d.getUTCMinutes()) + ':' +
      pad(d.getUTCSeconds()) + 'Z';
}

var retrieveEventsFromCalendar = function retrieveEventsFromCalendar(oauth2Client, calendarId, cursor, pageToken, events, cb) {
  var options = {
    auth: oauth2Client,
    calendarId: calendarId,
    orderBy: 'updated',
    showDeleted: true
  };

  if(cursor) {
    options.updatedMin = dateStringISO(cursor);
  }

  if(pageToken) {
    options.pageToken = pageToken;
  }

  googleapis.calendar('v3').events
    .list(options, function(err, res) {
      if(err) {
        // GCalendar refuse a updatedMin lower than the calendar creation date
        // So, if we have this error (and a cursor != null), we can retry without updatedMin
        if(JSON.stringify(err).match(/The requested minimum modification time lies too far in the past/i) && options.updatedMin) {
          return retrieveEventsFromCalendar(oauth2Client, calendarId, null, pageToken, events, cb);
        }
        return cb(err);
      }

      events = events.concat(res.items);

      if(res.nextPageToken) {
        retrieveEventsFromCalendar(oauth2Client, calendarId, cursor, res.nextPageToken, events, cb);
      }
      else {
        cb(null, events);
      }
    });
};

/**
 * Download all events from the specified Google Account.
 *
 * @param {String} oauth2Client OAuth client to identify the account
 * @param {Date} cursor Retrieve  updated since this date
 * @param {Function} cb Callback. First parameter is the error (if any), second an array of all the contacts.
 */
module.exports = function retrieveEvents(oauth2Client, cursor, cb) {
  async.waterfall([
    function getCalendars(cb) {
      retrieveCalendars(oauth2Client, null, [], cb);
    },
    function filterCalendar(calendars, cb) {
      cb(null, calendars.filter(function(calendar) {
        return calendar.id.indexOf('calendar.google.com') === -1;
      }));
    },
    function getEvents(calendars, cb) {
      async.concat(calendars, function(calendar, cb) {
        retrieveEventsFromCalendar(oauth2Client, calendar.id, cursor, null, [], cb);
      }, cb);
    },
    function sortEvents(events, cb) {
      events.sort(function(event1, event2) {
        var date1 = new Date(event1.updated);
        var date2 = new Date(event2.updated);

        if(date1 < date2) {
          return -1;
        }
        else if(date1 > date2) {
          return 1;
        }
        else {
          return 0;
        }
      });

      cb(null, events.reverse());
    }
  ], cb);
};
