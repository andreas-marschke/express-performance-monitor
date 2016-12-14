"use strict";
/*global it,describe*/

var assert = require("chai").assert;

describe("Manager Tests -", function() {
  var libRequirePath = "../lib/manager";
  it("Should work on require()", function(){
    require(libRequirePath);
  });

  it("Should instantiate", function() {
    var Manager = require(libRequirePath);
    var manager = new Manager();
    assert.instanceOf(manager, Manager);
  });

  it("Should return a base state with requestCount and transferredBytes", function() {
    var Manager = require(libRequirePath);
    var manager = new Manager();

    assert.isFunction(manager.getState);
    var state = manager.getState();

    var expect = {
      lastStart: new Date().getTime(),
      requestCount: {
        config: {
          type: "count",
          aggregate: 60,
          custom: {}
        },
        data: [],
        last: null,
        start: new Date().getTime()
      },
      transferredBytes: {
        config: {
          type: "cumulative",
          aggregate: 60,
          custom: {}
        },
        data: [],
        last: null,
        start: new Date().getTime()
      }
    };

    assert.closeTo(expect.lastStart, state.lastStart, 1000);

    assert.closeTo(expect.requestCount.start, state.requestCount.start, 1000);
    assert.closeTo(expect.transferredBytes.start, state.transferredBytes.start, 1000);

    assert.deepEqual(expect.requestCount.config, state.requestCount.config);
    assert.deepEqual(expect.transferredBytes.config, state.transferredBytes.config);

    assert.isNull(state.requestCount.last);
    assert.isNull(state.transferredBytes.last);
  });

  // FIXME: This might change should we decide to allow users to customize basic counters
  it("Should not override an existing field when adding", function() {

    var Manager = require(libRequirePath);
    var manager = new Manager();

    var mockConfig = {
      name: "requestCount",
      type: "count",
      aggregate: 90,
      custom: {}
    };

    var expect = {
      requestCount: {
        config: {
          type: "count",
          aggregate: 60,
          custom: {}
        },
        data: [],
        last: null,
        start: new Date().getTime()
      }
    };

    manager.addField(mockConfig);
    var state = manager.getState();

    assert.closeTo(expect.requestCount.start, state.requestCount.start, 1000);
    assert.deepEqual(expect.requestCount.config, state.requestCount.config);
    assert.isNull(state.requestCount.last);
  });

  it("Should create a new field based on configuration", function() {

    var Manager = require(libRequirePath);
    var manager = new Manager();

    var mockConfig = {
      name: "apiRequestCount",
      type: "count",
      aggregate: 90,
      custom: {}
    };

    var expect = {
      apiRequestCount: {
        config: {
          type: "count",
          aggregate: 90,
          custom: {}
        },
        data: [],
        last: null,
        start: new Date().getTime()
      }
    };

    manager.addField(mockConfig);
    var state = manager.getState();

    assert.closeTo(expect.apiRequestCount.start, state.apiRequestCount.start, 1000);
    assert.deepEqual(expect.apiRequestCount.config, state.apiRequestCount.config);
    assert.isNull(state.apiRequestCount.last);
  });

  it("Should start a configured service", function(done) {

    var Manager = require(libRequirePath);
    var manager = new Manager();

    var mockService = function(_manager, config) {
      assert.instanceOf(_manager, Manager);

      return {
        start: function() {
          done();
        },
        stop: function() {

        },
        active: function() {
          return false;
        }
      };
    };

    var mockConfig = {
      apis: ["mock"],
      module: {
        mock: mockService
      },
      server: {
        mock: {}
      }
    };

    manager.startServices(mockConfig);
  });

  it("Should stop an active service before re-starting it", function(done) {

    var Manager = require(libRequirePath);
    var manager = new Manager();
    var running = false;
    var mockService = function(_manager, config) {
      assert.instanceOf(_manager, Manager);

      return {
        start: function() {
          running = true;
        },
        stop: function() {
          done();
        },
        active: function() {
          return running;
        }
      };
    };

    var mockConfig = {
      apis: ["mock"],
      module: {
        mock: mockService
      },
      server: {
        mock: {}
      }
    };

    manager.startServices(mockConfig);
    manager.startServices(mockConfig);
  });

  it("Should call the same callback 3 times with about 100ms distance between calls", function(done) {
    var Manager = require(libRequirePath);
    var manager = new Manager();
    var counter = 0;
    var expect = 3;
    var lastCall = new Date().getTime();
    var hundredMil = 100;
    manager.cron("testTimer", function() {
      counter++;
      assert.closeTo(new Date().getTime() - hundredMil, lastCall, 10);
      if (counter === expect) {
        done();
      }
      lastCall = new Date().getTime();
    }, hundredMil);
  });
});
