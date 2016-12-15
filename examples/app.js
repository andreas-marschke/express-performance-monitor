"use strict";
var express = require("express"),
    fs = require("fs"),
    monitor = require("../index");

var app = express();
var manager = new monitor.Manager({
  maxRetention: 1000 * 60 * 2,
  aggregate: 60,
  apis: ["web"],
  server: {
    web: {
      port: 3001,
      listen: "0.0.0.0"
    }
  },
  module: {
    web: monitor.apis.web
  },
  customFields: []
});
var middleware = monitor.middleware(manager);

app.use(middleware);
app.get("/", function(req, res) {
  console.log("Request Received for /");

  res.send(fs.readFileSync("../README.md").toString("ascii"));
});

app.get("/README.md", function(req, res) {
  res.sendfile("./REAMDE.md");
});

app.listen(3000, function() {
  console.log("Listening on localhost:3000");
});
