# express-monitor

> Monitoring tooling agnostic Express Application Server in-process performance monitoring middleware and agent

With `express-monitor` provides node application server developers with a flexible way of implementing service specific monitoring over a
unified interface. You can monitor your current express app, internals, add new monitoring fields and extend the exposed monitoring data

## Example Configuration

In this simplified example we 

```javascript

var Manager = require("express-monitor").Manager;

var app = require("express")();

var manager = new monitor.Manager({
	maxRetention: 1000 * 60 * 5,
	aggregate: 60,
	apis: ["web"],
	server: {
		"web": {
			port: 3001,
			listen: "0.0.0.0"
		}
	});

var middleware = require("express-monitor").middleware(manager);
// IMPORTANT: to make sure we see everythin add this as the first middleware in your middleware stack
app.use(middleware);

app.get("/", function(req, res) {
  res.sendStatus(200);
});

app.listen(3000, function() {
  console.log("Listening on localhost:3000");
});
```

Out of the box you will get statistics for:
 - CPU utilization
 - memory usage
 - request count
 - transferred bytes

for each network request sent through your express app.

## Adding custom fields

The middleware will store aggregated performance data specific to the type of data you wish to collect.

Depending on the metrics you are interested in different types of aggregation can be applied. Here are a few examples we already provide:

### Average aggregation
```json
{
  "name": "memory",
  "type": "avg",
  "aggregate": 60
}
```

Example usage:

```javascript
var pidusage = require("pidusage");
pidusage.stat(process.pid, function(err, stat) {
	if (err) {
		return;
	}
	manager.addDataPoint("memory", stat.memory);
});
```

Averaged over each event and collected data this will store the last minute of memory and aggregate the metric

### Counter aggregation
```json
{
  "name": "requestCount",
  "type": "count",
  "aggregate": 60
}
```

Example usage:

```javascript
manager.addDataPoint("requestCount");
```

Count-style aggregation with a configuration like this will provide a counter that will reset every minute and have a histogram for the last minute
of the counter.

### Summized or cumulative aggregation

```json
{
  "name": "transferredBytes",
  "type": "cumulative",
  "aggregate": 60
}
```
Example usage:

```javascript
manager.addDataPoint("transferredBytes", data.length);
```

This is a special type of the Counter where the value added to the counter is not affixed to the a single increment but the value passed into the
datapoint addition call.

## Express Middleware

Interacting with the Manager instance during your express applications lifecycle is possible using the express Request object parameter passed into
every callback.

You can find it under the `req.monitor.manager` object in your callback:
```javascript
app.get("/status", function(req, res) {
  res.json(req.monitor.manager.getState());
});
```

Please review the API documentation for more information on how to interact with the Manager instance.

# Integration with Monitoring Tools

Using the API Module infrastructure you are free to either use the provided API endpoint modules provided out of the box with this package
or write your own module. Have a look at the `lib/apis/example.js` for a simple example of how to implement your own API endpoints applicable
for your environment.
