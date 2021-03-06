/* global Log, Module, moment */

/* Magic Mirror
 * Module: MyQuotes
 *
 */

Module.register("gcalendar",{

	// Module config defaults.
	defaults: {
		maximumEntries: 10, // Total Maximum Entries
		maximumNumberOfDays: 365,
		fetchInterval: 5 * 60 * 1000,
		updateInterval: 10 * 60 * 1000,
		fadeSpeed: 4000,
		calendars: [
			{
				url: "http://www.calendarlabs.com/templates/ical/US-Holidays.ics",
			},
		],
		titleReplace: {
			"De verjaardag van ": "",
			"'s birthday": ""
		},
},


	// Define required scripts.
	getScripts: function() {
		return ["moment.js"];
	},

	// Define required scripts.
	getStyles: function() {
		return ["gcalendar.css", "font-awesome.css"];
	},

	// Define start sequence.
	start: function() {
		Log.info("Starting module: " + this.name);

		/*
		// Schedule update timer.
		var self = this;
		setInterval(function() {
			self.updateDom(self.config.fadeSpeed);
		}, this.config.updateInterval);
		*/

		for (var c in this.config.calendars) {
			var calendar = this.config.calendars[c];
			calendar.url = calendar.url.replace("webcal://", "http://");
			this.addCalendar(calendar.url);
		}

		this.calendarData = {};
		this.loaded = false;
	},

	// Override socket notification handler.
	socketNotificationReceived: function(notification, payload) {
		if (notification === "CALENDAR_EVENTS") {
			if (this.hasCalendarURL(payload.url)) {
				this.calendarData[payload.url] = payload.events;
				this.loaded = true;
			}
		} else if (notification === "FETCH_ERROR") {
			Log.error("Calendar Error. Could not fetch calendar: " + payload.url);
		} else if (notification === "INCORRECT_URL") {
			Log.error("Calendar Error. Incorrect url: " + payload.url);
		} else {
			Log.log("Calendar received an unknown socket notification: " + notification);
		}

		this.updateDom(this.config.animationSpeed);
	},
	
	// Override dom generator.
	getDom: function() {

		var events = this.createEventList();
		var weeksEvents = [];
		console.log("Incoming events!");
		console.dir(events);

		var wrapper = document.createElement("div");
		wrapper.className = 'table-div';
		wrapper.style.width = '100%';

		var daysRow = document.createElement("div");
		daysRow.className = 'tr-div daysRow';

		var dayNameWrapper = document.createElement("div");
		dayNameWrapper.className ='td-div';

		for (day = 0; day <= 6; day++) {
			dayDiv = dayNameWrapper.cloneNode(true);
			dayDiv.className = 'td-div';
			var dayName = document.createElement("div");
			dayName.className = 'dayNames';
			dayName.innerHTML = moment().add(day, "days").format("ddd");
			dayDiv.appendChild(dayName);
			daysRow.appendChild(dayDiv);
			weeksEvents[moment().add(day, "days").weekday()] = [];
		}

		wrapper.appendChild(daysRow);

		var eventsRow = document.createElement("Div");
		eventsRow.className = 'tr-div eventsRow';
		
		var eventsWrapper = document.createElement("div");
		eventsWrapper.className = 'td-div eventWrap';

		var eventContent = document.createElement("div");
		eventContent.className = 'event';
		
		for (var e in events) {
			var event = events[e];
			var eventDate = moment(event.startDate, "x").weekday();
			weeksEvents[eventDate].push(event);
		}

		for (day = 0; day <= 6; day++) {
			var dayEvents = weeksEvents[moment().add(day, "days").weekday()];
			evWrapper = eventsWrapper.cloneNode(true);
			if (dayEvents.length > 0) {
				//console.log("Events on: " + moment().add(day, "days").format("ddd"));
				for (var e in dayEvents) {
					// console.log(this.titleTransform(dayEvents[e].title));
					evContent = eventContent.cloneNode(true);
					evContent.innerHTML = this.titleTransform(dayEvents[e].title);
					evWrapper.appendChild(evContent);
				}
			}
			eventsRow.appendChild(evWrapper);
		}

		wrapper.appendChild(eventsRow);
		return wrapper;

	},

	/* createEventList(url)
	 * Requests node helper to add calendar url.
	 *
	 * argument url sting - Url to add.
	 */
	addCalendar: function(url) {
		this.sendSocketNotification("ADD_CALENDAR", {
			url: url,
			maximumEntries: this.config.maximumEntries,
			maximumNumberOfDays: this.config.maximumNumberOfDays,
			fetchInterval: this.config.fetchInterval
		});
	},

	/* hasCalendarURL(url)
	 * Check if this config contains the calendar url.
	 *
	 * argument url sting - Url to look for.
	 *
	 * return bool - Has calendar url
	 */
	hasCalendarURL: function(url) {
		for (var c in this.config.calendars) {
			var calendar = this.config.calendars[c];
			if (calendar.url === url) {
				return true;
			}
		}

		return false;
	},

	/* createEventList()
	 * Creates the sorted list of all events.
	 *
	 * return array - Array with events.
	 */
	createEventList: function() {
		var events = [];
		var today = moment().startOf("day");
		for (var c in this.calendarData) {
			var calendar = this.calendarData[c];
			for (var e in calendar) {
				var event = calendar[e];
				event.url = c;
				event.today = event.startDate >= today && event.startDate < (today + 24 * 60 * 60 * 1000);
				if (event.startDate <= today + 7 * 24 * 60 * 60 * 1000) {
					events.push(event);
				}
			}
		}

		events.sort(function(a, b) {
			return a.startDate - b.startDate;
		});

		return events.slice(0, this.config.maximumEntries);
	},

	/* titleTransform(title)
	 * Transforms the title of an event for usage.
	 * Replaces parts of the text as defined in config.titleReplace.
	 * Shortens title based on config.maxTitleLength
	 *
	 * argument title string - The title to transform.
	 *
	 * return string - The transformed title.
	 */
	titleTransform: function(title) {
		for (var needle in this.config.titleReplace) {
			var replacement = this.config.titleReplace[needle];
			title = title.replace(needle, replacement);
		}

		title = this.shorten(title, this.config.maxTitleLength);
		return title;
	},

	/* shorten(string, maxLength)
	 * Shortens a sting if it's longer than maxLenthg.
	 * Adds an ellipsis to the end.
	 *
	 * argument string string - The string to shorten.
	 * argument maxLength number - The max lenth of the string.
	 *
	 * return string - The shortened string.
	 */
	shorten: function(string, maxLength) {
		if (string.length > maxLength) {
			return string.slice(0,maxLength) + "&hellip;";
		}

		return string;
	},

});
