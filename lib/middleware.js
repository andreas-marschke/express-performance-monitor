"use strict";
/**
 * Middleware for express to access current instance of manager from
 * request callbacks.
 *
 * Adds `monitor` object to the `req` object passed into callbacks.
 * You can access the manager like so: `req.monitor.manager`
 *
 * Example usage in your express web app:
 * @example
 * var express = require("express"),
 *     monitor = require("express-monitor");
 *
 * // Setup your manager instance
 * var manager = new monitor.Manager({
 *   // your configuration here
 * });
 *
 * // add new custom field to the monitoring inventory
 * manager.addField({
 *   name: "main-page-request",
 *   type: "count",
 *   aggregate: 60,
 *   custom: {}
 * });
 *
 * // Create the middleware
 * var middleware = monitor.middleware(manager);
 * app.use(middleware);
 *
 * app.get("/", function(req, res) {
 *   req.monitor.manager.addDataPoint("main-page-request");
 * });
 *
 * @module middleware
 */
module.exports = function(manager) {
  var origWrite;
  return function(req, res, next) {
    origWrite = res.write;

    req.monitor = {
      manager: manager
    };

    res.write = function(data, encoding, callback) {
      req.monitor.manager.addDataPoint("transferredBytes", data.length);
      origWrite.apply(res, arguments);
    };

    req.monitor.manager.addDataPoint("requestCount");
    next();
  };
};
