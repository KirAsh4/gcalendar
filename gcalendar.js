/* global Log, Module, moment */

/* Magic Mirror
 * Module: MyQuotes
 *
 */

Module.register("gcalendar",{

	// Module config defaults.
	defaults: {
		maximumEntries: 50, // Total Maximum Entries per week
		maximumNumberOfDays: 7,
		displaySymbol: true,
		defaultSymbol: "calendar",
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

	// Define required CSS.
	getStyles: function() {
		return ["gcalendar.css", "font-awesome.css"];
	},

	// Define start sequence.
	start: function() {
		Log.info("Starting module: " + this.name);

		// Set locale
		moment.locale(config.language);

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
		//console.log("Incoming events!");
		//console.dir(events);

		var wrapper = document.createElement("div");

		var weeklyCalendarTable = document.createElement("table");
		weeklyCalendarTable.className = 'xsmall';
		weeklyCalendarTable.id = 'weekly-cal-table';

		// Create THEAD section with day names
		var header = document.createElement("tHead");
		var headerTR = document.createElement("tr");

		for (day = 0; day <= 6; day++) {
			var headerTH = document.createElement("th");
			headerTH.className = 'weekly-cal-th';
			headerTH.scope = 'col';

			if (day == 0) {
				headerTH.innerHTML = this.translate("TODAY");
			} else if (day == 1) {
				headerTH.innerHTML = this.translate("TOMORROW");
			} else {
				headerTH.innerHTML = moment().add(day, "days").format("dddd");
			}
			headerTR.appendChild(headerTH);

			// This initializes the sub-array for this day witin the main weeksEvents[] array.
			weeksEvents[moment().add(day, "days").weekday()] = [];
		}
		header.appendChild(headerTR);
		weeklyCalendarTable.appendChild(header);

		// Parse all events into weeksEvents[] array
		for (var e in events) {
			var event = events[e];
			var eventDate = moment(event.startDate, "x").weekday();
			weeksEvents[eventDate].push(event);
		}

		// Create TFOOT section -- currently unused
		var footer = document.createElement('tFoot');
		var footerTR = document.createElement("tr");
		footerTR.id = "weekly-cal-tf";

		var footerTD = document.createElement("td");
		footerTD.colSpan ="7";
		footerTD.innerHTML = "&nbsp;";

		footerTR.appendChild(footerTD);
		footer.appendChild(footerTR);
		weeklyCalendarTable.appendChild(footer);

		// Create TBODY section
		var bodyContent = document.createElement('tBody');
		var bodyTR = document.createElement("tr");
		bodyTR.className = 'weekly-events-row';

		// Fill in events for their respective days
		for (day = 0; day <= 6; day++) {
			var dayEvents = this.sortByKey(weeksEvents[moment().add(day, "days").weekday()], "title");
			var bodyTD = document.createElement("td");
			bodyTD.className = 'dailyEvents';
			if (dayEvents.length > 0) {
				for (var e in dayEvents) {
					var eventWrapper = document.createElement("div");
					eventWrapper.className = "eventWrapper";
					eventWrapper.style.width = "100%";
					if (this.config.displaySymbol) {
						var symbol = document.createElement("div");
						symbol.className = "fa fa-" + this.symbolForUrl(dayEvents[e].url);
						eventWrapper.appendChild(symbol);
					}
					var eventContent = document.createElement("div");
					eventContent.className = "eventContent";
					eventContent.innerHTML = this.titleTransform(dayEvents[e].title);
					eventWrapper.appendChild(eventContent);
					bodyTD.appendChild(eventWrapper);
				}
			}
			bodyTR.appendChild(bodyTD);
		}
		bodyContent.appendChild(bodyTR);
		weeklyCalendarTable.appendChild(bodyContent);

		// GCalendar Section

		// Create Upper Hourly section (day names, whole day events, multi day events)
		var bodyContent = document.createElement("table");
		bodyContent.className = 'xsmall';

		var gridContainer = document.createElement("div");
		gridContainer.id = "gridcontainer"; //gridcontainer
		gridContainer.style.height = "250px";
		
		var topContainer = document.createElement("div");
		topContainer.id = "topcontainer"; //topcontainerwk
		gridContainer.appendChild(topContainer);

		var weekTop = document.createElement("table");
		weekTop.className = "weektop"; //wk-weektop wk-full-mode
		weekTop.cellPadding = "0px";
		weekTop.cellSpacing = "0px";

		var weekTopContent = document.createElement("tbody");
		var weekTopContentTR = document.createElement("tr");
		weekTopContentTR.className = "dayNames"; //wk-daynames

		var weekTopContentCorner = document.createElement("td");
		weekTopContentCorner.className = "wkCorner"; //wk-tzlabel
		weekTopContentTR.appendChild(weekTopContentCorner);

		for (day = 0; day <= 6; day++) {
			var weekTopContentTH = document.createElement("th");
			weekTopContentTH.scope = "col";

			var dayNameDiv = document.createElement("div");
			dayNameDiv.className = "dayNameDiv"; //wk-dayname

			var dayNameSpan = document.createElement("span");
			dayNameSpan.className = "dayNameSpan";
			if (day == 0) {
				dayNameSpan.innerHTML = this.translate("TODAY");
			} else if (day == 1) {
				dayNameSpan.innerHTML = this.translate("TOMORROW");
			} else {
				dayNameSpan.innerHTML = moment().add(day, "days").format("dddd");
			}

			dayNameDiv.appendChild(dayNameSpan);
			weekTopContentTH.appendChild(dayNameDiv);
			weekTopContentTR.appendChild(weekTopContentTH);
		}

		var dummyTH = document.createElement("th");
		dummyTH.className = "dummyth";
		dummyTH.style.width = "16px"
		dummyTH.rowspan = "3";
		//weekTopContentTR.appendChild(dummyTH);

		weekTopContent.appendChild(weekTopContentTR);
		weekTop.appendChild(weekTopContent);
		topContainer.appendChild(weekTop);
		bodyContent.appendChild(topContainer);

		// Create Hourly display
		var timedEvents = document.createElement("div");
		timedEvents.className = "timedEvents"; //wk-scrolltimedevents
		timedEvents.id = "timedEventsWk" //scrolltimedeventswk

		var timedEventsMainWrapper = document.createElement("div");
		timedEventsMainWrapper.className = "timedMainWrapper"; //tg-mainwrapper

		var timedEventsTable = document.createElement("table");
		timedEventsTable.className = "timedEventsTable"; //tg-timedevents
		timedEventsTable.id = "timedEventsTable"; //tgTable
		timedEventsTable.cellSpacing = "0px";
		timedEventsTable.cellPadding = "0px";

		var timedEventsTBody = document.createElement("tBody");
		var timedEventsTR = document.createElement("tr");
		timedEventsTR.style.height = "1px";

		var timedEventsTD = document.createElement("td");
		timedEventsTD.style.width = "60px";
		timedEventsTR.appendChild(timedEventsTD);

		var timedEventsTD = document.createElement("td");
		timedEventsTD.colSpan = "7";
		var spanWrapper = document.createElement("div");
		spanWrapper.className = "spanWrapper"; //tg-spanningwrapper
		var hourMarkers = document.createElement("div");
		hourMarkers.className = "hourMarkers"; //tg-hourmarkers
		for (hour = 0; hour <= 23; hour++) {
			var markerCell = document.createElement("div");
			markerCell.className = "markerCell"; //tg-markercell

			var dualMarker = document.createElement("div");
			dualMarker.className = "dualMarker"; //tg-dualmarker

			markerCell.appendChild(dualMarker);
			hourMarkers.appendChild(markerCell);
		}

		spanWrapper.appendChild(hourMarkers);
		timedEventsTD.appendChild(spanWrapper);

		var extraSpanWrapper = document.createElement("div");
		extraSpanWrapper.className = "spanWrapper extraSpanWrapper";

		timedEventsTD.appendChild(extraSpanWrapper);
		timedEventsTR.appendChild(timedEventsTD);

		timedEventsTBody.appendChild(timedEventsTR);
		timedEventsTable.appendChild(timedEventsTBody);

		calendarColumns = document.createElement("tr");

		hourLabels = document.createElement("td");
		hourLabels.className = "hourLabels"; //tg-times-pri

		for (hour = 0; hour <= 23; hour++) {
			var hourDiv = document.createElement("div");
			hourDiv.style.height = "42px";
			var hourLabel = document.createElement("div");
			hourLabel.className = "hourLabels";
			hourLabel.style.height = "42px";
			hourLabel.innerHTML = moment().startOf('day').add(hour, "hours").format("h:mm a");
			hourDiv.appendChild(hourLabel);
			hourLabels.appendChild(hourDiv);
		}

		calendarColumns.appendChild(hourLabels);

		for (column = 0; column <= 6; column++) {
			var dailyColumn = document.createElement("td");
			if (column == 6) {
				dailyColumn.className = "dailyColumn lastColumn"; //tg-col
			} else {
				dailyColumn.className = "dailyColumn"; //tg-col
			}

			var dayColumn = document.createElement("div");
			dayColumn.id = "column" + column; //tgcol#
			dayColumn.className = "columnWrapper"; //tg-col-eventwrapper
			dayColumn.style.height = "1008px";
			dayColumn.style.marginBottom = "-1008px";

			var gutter = document.createElement("div");
			gutter.className = "gutter"; //tg-gutter

			dayColumn.appendChild(gutter);
			dailyColumn.appendChild(dayColumn);

			var columnOverlay = document.createElement("div");
			columnOverlay.id = "columnoverlay" + column; //tgover#
			columnOverlay.className = "columnOverlayWrapper"; //tg-col-overlaywrapper

			dailyColumn.appendChild(columnOverlay);
			calendarColumns.appendChild(dailyColumn);
		}

		timedEventsTBody.appendChild(calendarColumns);
		timedEventsTable.appendChild(timedEventsTBody);
		timedEventsMainWrapper.appendChild(timedEventsTable);
		timedEvents.appendChild(timedEventsMainWrapper);

		bodyContent.appendChild(timedEvents);

		wrapper.appendChild(bodyContent);
		//wrapper.appendChild(weeklyCalendarTable);
		return wrapper;

	},

	/* sortByKey(array, key)
	 * I love alphabetical sorting!
	 */
	sortByKey: function(array, key) {
		return array.sort(function(a, b) {
			var x = a[key].toLowerCase();
			var y = b[key].toLowerCase();
			return ((x < y) ? -1 : ((x > y) ? 1 : 0));
		});
	},

	/* addCalendar(url)
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
				if (event.startDate < today + 7 * 24 * 60 * 60 * 1000) {
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

	/* symbolForUrl(url)
	 * Retrieves the symbol for a specific url.
	 *
	 * argument url sting - Url to look for.
	 *
	 * return string - The Symbol
	 */
	symbolForUrl: function(url) {
		for (var c in this.config.calendars) {
			var calendar = this.config.calendars[c];
			if (calendar.url === url && typeof calendar.symbol === "string")  {
				return calendar.symbol;
			}
		}

		return this.config.defaultSymbol;
	},
});