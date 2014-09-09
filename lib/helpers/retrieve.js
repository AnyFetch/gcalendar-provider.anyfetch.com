'use strict';
/**
 * @file Retrieve events for the account
 */

var googleapis = require('googleapis');
var async = require('async');

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

      calendars.concat(res.items);

      if (res.nextPageToken) {
        retrieveCalendars(oauth2Client, res.nextPageToken, calendars, cb);
      }
      else {
        cb(null, calendars);
      }
    });
};

var retrieveEventsFromCalendar = function(oauth2Client, calendarId, cursor, pageToken, events, cb) {
  var options = {
    auth: oauth2Client,
    calendarId: calendarId,
    orderBy: 'updated',
    showDeleted: true,
    singleEvents: true,
    updatedMin: cursor
  };

  if (pageToken) {
    options.pageToken = pageToken;
  }

  googleapis.calendar('v3').events
    .list(options, function(err, res) {
      if (err) {
        return cb(err);
      }

      events.concat(res.items);

      if (res.nextPageToken) {
        retrieveEventsFromCalendar(oauth2Client, calendarId, res.nextPageToken, events, cb);
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
