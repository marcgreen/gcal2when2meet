(function () {

document.body.appendChild(document.createElement('script')).src = 
  "http://code.jquery.com/jquery-1.9.0.min.js";
document.body.appendChild(document.createElement('script')).src =
  "https://apis.google.com/js/client.js?onload=GCAL";

// when2meet->gcal authentication
var clientId = "537319596359-qhp810o8dqoso7bt1lqqgn057d30dsht.apps.googleusercontent.com";
var scopes = "https://www.googleapis.com/auth/calendar.readonly";

function load() {
  console.log("load");
  gapi.auth.init(function () {
    gapi.client.load('calendar', 'v3', function () {
      reqCalendarList().then(function (calendars) {
        calendars = calendars.filter(function (c) { return c.selected; });
        return whenArray(calendars.map(reqEvents));
      }).done(function (events) {
        events = events.filter(function (es) { return es; });
        selectAll();
        if (events.length === 0) {
          alert("Didn't find any events in this time period." +
                " Note that when2meets that use days of the week instead of" +
                " specific dates are not yet supported.");
        } else {
          //console.log("events", flatten(events));
          flatten(events).forEach(deselectEvent);
        }
      });
    });
  });
}

function reqCalendarList() {
  var deferred = $.Deferred();

  gapi.client.calendar.calendarList.list().execute(function (res) {
    console.log(res);
    if (res.code === 401) {
      gapi.auth.authorize({
        client_id: clientId,
        scope: scopes
      }, function () {
        reqCalendarList().then(deferred.resolve);
      });
    } else {
      console.log("authorized!");
      deferred.resolve(res.items);
    }
  });

  return deferred.promise();
}

var events = [];

function reqEvents(calendar) {
  var deferred = $.Deferred();

  gapi.client.calendar.events.list({
    calendarId: calendar.id,
    singleEvents: true, // expand recurring events
    // TODO request events in DoW mode 
    // TODO fix timezone error in requesting events
    timeMin: new Date(TimeOfSlot[0] * 1000).toISOString(),
    timeMax: new Date(TimeOfSlot[TimeOfSlot.length-1] * 1000).toISOString()
  }).execute(function (res) {
    events.push(res);
    console.log(res);
    deferred.resolve(res.items);
  });

  return deferred.promise();
}

var errors = [];

function deselectEvent(event) {
  try {
    var startTime = convertTime(event.start.dateTime);
    var endTime = convertTime(event.end.dateTime) - 900;
    
    console.log(event);
    /*
    // Adjust data as necessary if w2m is in "day of week" mode
    if (isDoWCalendar() && event.recurringEventId) { // TODO check value of this on non recurring event
        startTime = normalizeDateTime(startTime);
        endtime = normalizeDateTime(endTime);
    }
  */
    toggleRange(startTime, endTime, false);
  } catch (e) {
    errors.push(e);
  }
}

// seconds until midnight of given weekday of some fixed week on w2m
var normalizationConstants = [
    279766800, // Sunday
    279763200, // Monday
    279849600,
    279936000,
    280022400,
    280108800,
    280195200
];

function isDoWCalendar() {
    var d = new Date(StepOfTime[0]);
    
    return (d.getTime() > normalizationConstants[0] &&
            d.getTime() < normalizationConstants[0]*7);
}

function normalizeDateTime() {
    
}


function selectAll() {
  toggleRange(TimeOfSlot[0], TimeOfSlot[TimeOfSlot.length-1], true);
}

function toggleRange(startTime, endTime, makeAvailable) {
  try {
    SelectFromHere(startTime);
    SelectToHere(endTime);
    ChangeToAvailable = makeAvailable;
    SelectStop();
  } catch (e) {
    errors.push(e);
  }
}

function flatten(arrs) {
  // reduce was overridden by Prototype.js so use reduceRight
  return arrs.reduceRight(function (a1, a2) { return a1.concat(a2); });
}

function whenArray(promiseArr) {
  return $.when.apply($, promiseArr).then(function () {
    return Array.prototype.slice.call(arguments);
  });
}

function convertTime(gcalTime) {
  var d = new Date(gcalTime);
  // if not on a quarter hour increment
  if (d.getMinutes() % 15 !== 0) {
    // round to the nearest half hour
    var m = (Math.round(d.getMinutes() / 30) * 30) % 60;
    var h = d.getMinutes() > 45 ? d.getHours() + 1 : d.getHours();
    d.setMinutes(m);
    d.setHours(h);
  }
  // convert from UTC to local time
  return (d.getTime() / 1000) - (d.getTimezoneOffset() * 60);
}

window.GCAL = load;
window.GCAL.errors = errors;
window.GCAL.events = events;

}());
