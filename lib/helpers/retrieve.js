'use strict';
/**
 * @file Retrieve events for the account
 */

var googleapis = require('googleapis');
var async = require('async');
var rarity = require('rarity');

var retrieveCalendars = function(oauth2Client, pageToken, calendars, cb) {
  var options = {
    auth: oauth2Client
  };

  if (pageToken) {
    options.pageToken = pageToken;
  }

  googleapis.calendar('v3').calendarList
    .list(options, function(err, res) {
      if (err) {
        return cb(err);
      }

      calendars = calendars.concat(res.items);

      if (res.nextPageToken) {
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

var retrieveEventsFromCalendar = function(oauth2Client, calendarId, cursor, pageToken, events, cb) {
  var options = {
    auth: oauth2Client,
    calendarId: encodeURIComponent(calendarId),
    orderBy: 'updated',
    showDeleted: true
  };

  if (cursor) {
    options.updatedMin = dateStringISO(cursor);
  }

  if (pageToken) {
    options.pageToken = pageToken;
  }

  googleapis.calendar('v3').events
    .list(options, function(err, res) {
      if (err) {
        return cb(err);
      }

      events = events.concat(res.items);

      if (res.nextPageToken) {
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
      async.filter(calendars, function(calendar, cb) {
        cb(calendar.id.indexOf('calendar.google.com') === -1);
      }, rarity.pad([null], cb));
    },
    function getEvents(calendars, cb) {
      async.concat(calendars, function(calendar, cb) {
        retrieveEventsFromCalendar(oauth2Client, calendar.id, cursor, null, [], cb);
      }, cb);
    },
    function sortEvents(events, cb) {
      async.sortBy(events, function(event, cb) {
        cb(null, new Date(event.updated));
      }, function(err, events) {
        cb(err, events.reverse());
      });
    }
  ], cb);
};
