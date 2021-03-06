"use strict";
/*global setImmediate, env node */

var state = {
  lastStart: 0
};

var base = [
  {
    name: "requestCount",
    type: "count",
    aggregate: 60,
    custom: {}
  },
  {
    name: "transferredBytes",
    type: "cumulative",
    aggregate: 60,
    custom: {}
  }
];

/**
 * Object containing configuration for customfields, data retention,
 * aggregation, and exposed services
 *
 * @typedef {Object} ConfigObject
 * @property {number} maxRetention - time in milliseconds to retain monitoring data see {@link Manager#checkRetention} for more info
 * @property {number} aggregate - Time in seconds to aggregate values for, ie. values accumulate for 60s before being averaged and a new array created
 * @property {string[]} apis - array of enabled API interfaces for performance data retrieval
 * @property {APIConfigObject} server - API configuration object containing per API interface configuration
 * @property {Object} module - referenced modules matchign your enabled API interfaces
 * @property {CustomFieldObject[]} [customFields] - Any custom fields you wish to configure
 * @memberof Manager
 */

/**
 * Define the configuration for a state field holding statistics for the current instance
 *
 * @typedef FieldConfig
 * @property {string} name - name of the state counter
 * @property {string} type - type of counter values are: ("cumulative"|"avg"|"count")
 * @property {number} aggregate - time in seconds to wait until a set of counted state values are aggregated
 * @property {Object} custom - Custom config data field mostly used for documentation and interaction with API interfaces
 * @memberof Manager
 */

/**
 * Monitoring configuration and state manager
 *
 * Create an instance of this class to start your monitoring and exposed interfaces
 * depending on your configuration.
 *
 * @constructor
 *
 * @param {ConfigObject} config - Configuration object
 */
function Manager(config) {
  this.config = config || {};

  base.forEach(function(v) {
    this.addField(v);
  }, this);

  state.lastStart = this.getTime();

  if (this.config.customFields && this.config.customFields.length > 0) {
    this.config.customFields.forEach(function(v) {
      this.addField(v);
    }, this);
  }

  this.servers = {};

  setImmediate(this.checkRetention.bind(this));

  this.startServices();
};

/**
 * Add new counter fields to accept state data for
 *
 * @param {FieldConfig} config - Configuration object defining counter behavior
 */
Manager.prototype.addField = function(config) {
  if (!state[config.name]) {
    state[config.name] = {
      config: {
        type: config.type,
        aggregate: config.aggregate || this.config.aggregate,
        custom: config.custom
      },
      data: [],
      last: null,
      start: this.getTime()
    };
  }
};

/**
 * Starts a service
 *
 * Calls an API services stop function before it's start function if
 * it detects an already active instance of the API Service
 *
 * @param {example#APIConfig} config - new configuration see {@link example#APIObject} for more information
 */
Manager.prototype.startServices = function(_config) {
  var config = _config || this.config;
  if (config.apis && config.apis.length > 0) {
    for (var apiIndex in config.apis) {
      var api = config.apis[apiIndex];
      if (config.server && config.server.hasOwnProperty(api)) {
        if (this.servers.hasOwnProperty(api) && this.servers[api].active()) {
          this.servers[api].stop();
        }
        this.servers[api] = config.module[api](this, config.server[api]);
        this.servers[api].start();
      }
    }
    this.config.apis = config.apis;
  }
};

/**
 * Stops a service
 *
 * @param {example#APIConfig} config - new configuration see {@link example#APIObject} for more information
 */
Manager.prototype.stopServices = function(_config) {
  var config = _config || this.config;

  if (config.apis && config.apis.length > 0) {
    for (var apiIndex in config.apis) {
      var api = config.apis[apiIndex];
      if (config.server && config.server.hasOwnProperty(api)) {
        if (this.servers.hasOwnProperty(api) && this.servers[api].active()) {
          this.servers[api].stop();
        }
      }
    }
  }
};

/**
 * Adds a new datapoint to an existing state field
 *
 * @param {string} name - Name of the counter/field
 * @param value - Value to add to the existing counter
 */
Manager.prototype.addDataPoint = function(name, value) {
  setImmediate(function() {
    if (state[name].config.type === "count") {
      this.addNumericDataPoint(name, 1);
    } else if (state[name].config.type === "cumulative") {
      this.addNumericDataPoint(name, value);
    } else if (state[name].config.type === "avg") {
      this.addAveragedNumericDataPoint(name, value);
    } else {
      state[name].data.push([value, this.getTime()]);
    }
  }.bind(this));
};

/**
 * Checks Retention against last state value start to validate if this state field needs to be refreshed
 *
 * @param {string} name - name of the field
 * @param {DateTimeEpoch} time - time to match against last refresh or next time of retention
 * @return {boolean} - If true needs to be rotated
 */
Manager.prototype.requiresRotation = function(name, time) {
  var nextRetention = (state[name].last === null ? 0 : state[name].last) + (state[name].config.aggregate * 1000);
  return state[name].last === null || time > nextRetention;
};

/**
 * Adds a new data point to a set state counter of type `avg`. It will  pre-aggregate statistics based
 * on the current retention cycle and store current state in the data array where the last index is always the
 * most recent set of datapoints.
 *
 * Each set of datapoints bounded by their retention time will have the following contents at their respective indices:
 *  - [0] time of first insertion - used to determine next rotation
 *  - [1] array of raw values - raw values collected over the retention time frame, this will be emptied for rotated indices
 *  - [2] max value - Highest value during retention window
 *  - [3] min value - Lowest value during retention window
 *  - [4] number of values - current number of values collected during retention window
 *  - [5] average of current aggregate frame - average over all values of current retention
 *
 * @param {string} name - name of counter to add to
 * @param {number} value - numeric counter value to add to current dataset
 */
Manager.prototype.addAveragedNumericDataPoint = function(name, value) {
  var time = this.getTime();

  function minMax() {
    // Set maximum for current aggregate frame
    if (state[name].data[state[name].data.length - 1][2] < value) {
      state[name].data[state[name].data.length - 1][2] = value;
    }

    // Set minimum for current aggregate frame
    if (state[name].data[state[name].data.length - 1][3] > value) {
      state[name].data[state[name].data.length - 1][3] = value;
    }
  }

  function updateAvg() {
    function addup(a, b) {
      return a + b;
    }
    state[name].data[state[name].data.length - 1][4] += 1;
    state[name].data[state[name].data.length - 1][5] = state[name].data[state[name].data.length - 1][1].reduce(addup) / state[name].data[state[name].data.length - 1][4];
  }

  function createNew() {
    state[name].last = time;
    // Values are:
    //  - [0] time of first insertion
    //  - [1] array of raw values
    //  - [2] max value
    //  - [3] min value
    //  - [4] number of values
    //  - [5] average of current aggregate frame
    state[name].data.push([time, [value], value, value, 1, value]);
  }

  if (!state[name].last && this.requiresRotation(name, time)) {
    createNew();
  } else if (state[name].last && this.requiresRotation(name, time)) {
    state[name].data[state[name].data.length - 1][1].push(value);

    minMax();
    updateAvg();

    // Reset Array to empty to reduce memory footprint
    state[name].data[state[name].data.length - 1][1] = [];

    createNew();
  } else if (!this.requiresRotation(name, time)) {
    state[name].data[state[name].data.length - 1][1].push(value);

    minMax();
    updateAvg();
  }
};

/**
 * Increments a numeric counter in for the current data field, full data array index is rotated out once retention hits
 * @param {string} name - name of the counter to increment
 * @param {number} value - value to increment the counter by
 */
Manager.prototype.addNumericDataPoint = function(name, value) {
  var time = this.getTime();

  if (this.requiresRotation(name, time)) {
    state[name].last = time;
    state[name].data.push([time, value]);
  } else if (!this.requiresRotation(name, time)) {
    state[name].data[state[name].data.length - 1][1] += value;
  }
};

/**
 * Get current unix epoch in milliseconds
 *
 * @returns {number} - Unix Epoch time in milliseconds
 */
Manager.prototype.getTime = function() {
  return (new Date()).getTime();
};

/**
 * Starts re-occuring timer to checking data arrays of all counter fields against retention time. Should a dataset age exceed this timing
 * Remove it from the set and re-assign the data array with the old elements filtered out
 */
Manager.prototype.checkRetention = function() {
  this.cron("checkRetention", function() {
    var lastRetention = this.getTime() - this.config.maxRetention;
    Object.keys(state).forEach(function(name) {
      if (state.hasOwnProperty(name) && state[name].data) {
        state[name].data = state[name].data.filter(function(v) {
          return v[0] > lastRetention;
        });
      }
    });
  });
};

/**
 * Execute a scheduled function after time in milliseconds
 *
 * @param {string} cronName - Name of timer used for bookkeeping of the current timer
 * @param {function} callback - function to call in current manager instances context
 * @param {number} [timeout] - optional custom timeout for function call to occur otherwise {@link ConfigObject#maxRetention}
 */
Manager.prototype.cron = function(cronName, callback, timeout) {
  if (this["_" + cronName]) {
    clearTimeout(this["_" + cronName]);
  }

  var retention = timeout || this.config.maxRetention;
  function call() {
    return setTimeout(function() {
      (callback.bind(this))();
      this["_" + cronName] = (call.bind(this))();
    }.bind(this), retention);
  }

  this["_" + cronName] = (call.bind(this))();
};

/**
 * Get current state dataset
 * @returns {State} - current state object containing field and configuration data
 */
Manager.prototype.getState = function() {
  return state;
};

module.exports = Manager;
