"use strict";
module.exports = {
  Manager: require("./lib/manager"),
  middleware: require("./lib/middleware"),
  apis: {
    web: require("./lib/apis/web")
  }
};
