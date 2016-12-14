"use strict";
var express = require("express"),
    app = express(),
    http = require("http");

/**
 * Simple Web REST API to access the Monitor state and observe the
 * performance metrics of your application.
 *
 * Exposed API Endpoints are:
 *  - `GET` `/json/state`: returns the entire state object as a JSON Object
 *  - `GET` `/json/uptime`: Get the current uptime in a JS epoch (UNIX Epoch in milliseconds)
 *  - `GET` `/json/stats/counters`: Get all state fields as a JSON Array  wrapped in an JSON object eg. `{ "counter": ["requestCount", "transferredBytes"] }`
 *  - `GET` `/json/stats/counter/:name`: Get the current valueset for a given counter ie. `transferredBytes` (`GET /json/stats/counter/transferredBytes` returns `{ "data": {} }`)
 *
 * Configuration options for this API module is are:
 *  - `port`: TCP port to bind to on the host
 *  - `listen`: IP to listen on
 *
 * @example
 * monitor = require("express-monitor")
 * // Use the monitor.apis.web module to expose the web REST API
 * var manager = new monitor.Manager({
 *   maxRetention: 1000 * 60 * 2,
 *   aggregate: 60,
 *   apis: ["web"],
 *   server: {
 *     web: {
 *       port: 3001,
 *       listen: "0.0.0.0"
 *     }
 *   },
 *   module: {
 *     web: monitor.apis.web
 *   },
 *   customFields: []
 * });
 * @module monitor.apis.web
 */
module.exports = function(manager, config) {
  app.get("/json/state", function(req, res) {
    res.json(manager.getState());
  });

  app.get("/json/stats/uptime", function(req, res) {
    var state = manager.getState();

    res.json({ uptime: (new Date().getTime()) - state.lastStart });
  });

  app.get("/json/stats/counters", function(req, res) {
    var state = manager.getState();

    function isField() {
      return typeof state[v] === "object";
    }
    res.json({counters: Object.keys(state).filter(isField)});
  });

  app.get("/json/stats/counter/:name", function(req, res) {
    var state = manager.getState();
    var name = req.params.name;
    if (state[name] && typeof state[name] === "object") {
      res.json({data: state[name].data});
    } else {
      res.json({error: "Could not find counter for name: " + name});
    }
  });

  var server = http.createServer(app);
  return {
    start: function() {
      server.listen(config.port, config.listen, function() {
        console.log("Monitoring started, port:", config.port, "on host:", config.listen);
      });
    },
    stop: function() {
      server.close(function() {
        console.log("Stopped minitoring web service");
      });
    },
    active: function() {
      return server.listening;
    }
  };
};
