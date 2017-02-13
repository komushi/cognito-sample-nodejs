'use strict';
var Q = require("q");
var outlook = require('node-outlook');

var getAllEvents = function(user) {

	var d = Q.defer();

  // Set up oData parameters
  var queryParams = {
    '$select': 'Subject,Start,End,Attendees',
    '$orderby': 'Start/DateTime desc',
    // '$top': 10
  };

  // Set the API endpoint to use the v2.0 endpoint
  outlook.base.setApiEndpoint('https://graph.microsoft.com/v1.0');
  // Set the anchor mailbox to the user's SMTP address
  outlook.base.setAnchorMailbox(user._json.email);

  outlook.calendar.getEvents({token: user.authInfo.access_token, odataParams: queryParams},
    function(error, result){
      if (error) {
        console.log('getEvents returned an error: ' + error);
        d.reject(new Error(error));
      } else if (result) {
        console.log('getEvents returned ' + result.value.length + ' events.');
        
        var events = [];

        result.value.forEach(function(event) {
          // console.log('  Subject: ' + event.subject);
          // console.log('  Event dump: ' + JSON.stringify(event));
          // console.log(JSON.stringify(event));
          var attendees = [];
          event.attendees.forEach(function(attendee) { 
            attendees.push({name : attendee.emailAddress.name, email : attendee.emailAddress.address});
          });
          events.push({id: event.id, subject : event.subject, start : event.start.dateTime, end : event.end.dateTime, attendees : attendees});
        });

        // console.log(events);

        d.resolve(events);
      }
    });

  return d.promise;
}

module.exports = {getAllEvents : getAllEvents};