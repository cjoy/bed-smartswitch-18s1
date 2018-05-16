const express = require("express");
const sql = require("mssql");
const Client = require("azure-iothub").Client;
const Message = require("azure-iot-common").Message;
var bodyParser = require("body-parser");

const dbConfig = {
  user: "comp6324admin",
  password: "COMP6324password",
  server: "smartswitch.database.windows.net",
  database: "smartswitch",
  options: {
    encrypt: true
  }
};

const iotHubConfig = {
  hostname: "SmartSwitch.azure-devices.net",
  sharedkey: "8Wrt9USCDDOQg/r4pK/IpZH6iRibnNHpv0wZ+GkL22M=",
  sharedkeyname: "iothubowner"
};

const iotHubConnectionString = `HostName=${
  iotHubConfig.hostname
};SharedAccessKeyName=${iotHubConfig.sharedkeyname};SharedAccessKey=${
  iotHubConfig.sharedkey
}`;
const serviceClient = Client.fromConnectionString(iotHubConnectionString);

const app = express();
app.use(express.json());
app.use(bodyParser.json());
app.use(function(req, res, next) {
  res.header("Access-Control-Allow-Origin", "*");
  res.header(
    "Access-Control-Allow-Headers",
    "Origin, X-Requested-With, Content-Type, Accept"
  );
  next();
});

/**
 * HELPER FUNCTIONS
 */

/*
 * Wait for the feedback of sending the message and print it
 * when it comes through showing the success state of sending
 * the message to the device.
 */
function receiveFeedback(err, receiver) {
  receiver.on("message", function(message) {
    console.log("Feedback message:");
    console.log(message.getData().toString("ascii"));
  });
}

/*
 * Print the resulting status of the send action.
 */
function printResultFor(op) {
  return function printResult(err, res) {
    if (err) console.log(op + " error: " + err.toString());
    if (res) console.log(op + " status: " + res.constructor.name);
  };
}

/**
 * API ROUTES
 */

/** GET /
 * Get list of devices
 */
app.get("/api/", (req, res) => {
  sql
    .connect(dbConfig)
    .then(pool => {
      return pool.request().query("select * from devices");
    })
    .then(result => {
      console.log(result.recordset);
      res.send(result.recordset);
      sql.close();
    })
    .catch(err => {
      res.send(err);
      //   res.send("Unable to retreive devices");
      console.log(err);
      sql.close();
    });
});

// fake auth endpoint
app.post("/api/v3/sign-in", (req, res) => {
  res.send({
    status: true,
    userID: 1,
    error: null
  });
});

/**
 * TODO:update this to also include the status.
 */
app.get("/api/v3/devices", (req, res) => {
  sql
    .connect(dbConfig)
    .then(pool => {
      return pool
        .request()
        .query(
          "select b.deviceId, sum(cast(b.usage as float)) as total_usage, max(b.last_update) as last_updated from user_devices a JOIN sensor_data b on a.deviceId= b.deviceId where b.last_update = (select max(last_update) from sensor_data) and a.username = 'test' group by b.deviceId"
        );
    })
    .then(result => {
      console.log(result.recordset);
      res.send(result.recordset);
      sql.close();
    })
    .catch(err => {
      //   res.send("Unable to retreive devices");
      res.send(err);
      sql.close();
    });
});

app.get("/api/v3/rooms", (req, res) => {
  sql
    .connect(dbConfig)
    .then(pool => {
      return pool
        .request()
        .input("userID", sql.VarChar, req.params.user_id)
        .query("select * from rooms where user_id = @userID");
    })
    .then(result => {
      console.log(result.recordset);
      res.send(result.recordset);
      sql.close();
    })
    .catch(err => {
      res.send("Unable to retreive devices");
      sql.close();
    });
});

app.get("/api/v2/devices", (req, res) => {
  sql
    .connect(dbConfig)
    .then(pool => {
      return pool
        .request()
        .query(
          `select distinct deviceid, usage, last_update, status from user_devices where last_update > dateadd(day, -90, getdate())`
        );
      // .query(`select DISTINCT a.deviceId, b.status, b.last_update from user_devices a JOIN sensor_data b on a.deviceId= b.deviceId where b.last_update = (select max(last_update) from sensor_data) and a.username = 'test' and b.deviceid = 'Device1';`)
    })
    .then(result => {
      res.send(result.recordset);
      sql.close();
    })
    .catch(err => {
      res.send(err);
      sql.close();
    });
});

// all devices usage for current month
app.get("/api/v2/devices/month", (req, res) => {
  var month = new Date().getMonth() + 1;
  sql
    .connect(dbConfig)
    .then(pool => {
      return pool
        .request()
        .input("month", sql.VarChar, month)
        .query(
          `select deviceId, sum(cast(usage as float)) usage from sensor_data where month = @month group by deviceId order by deviceId`
        );
    })
    .then(result => {
      res.send(result.recordset);
      sql.close();
    })
    .catch(err => {
      res.send(err);
      sql.close();
    });
});

// all devices usage for a given month
app.get("/api/v2/devices/:month", (req, res) => {
  sql
    .connect(dbConfig)
    .then(pool => {
      return pool
        .request()
        .input("month", sql.VarChar, req.params.month)
        .query(
          `select deviceId, sum(cast(usage as float)) usage from sensor_data where month = @month group by deviceId`
        );
    })
    .then(result => {
      res.send(result.recordset);
      sql.close();
    })
    .catch(err => {
      res.send(err);
      sql.close();
    });
});

/** GET /:deviceid  (eg. GET /Device1)
 * Get a single device's states
 */
app.get("/api/v1/:deviceid", (req, res) => {
  sql
    .connect(dbConfig)
    .then(pool => {
      return pool
        .request()
        .input("deviceId", sql.VarChar, req.params.deviceid)
        .query(`select * from sensor_data where deviceId = @deviceId`);
    })
    .then(result => {
      res.send(result.recordset);
      sql.close();
    })
    .catch(err => {
      res.send(err);
      sql.close();
    });
});

/** POST /:deviceid
 * Send a device message to the iot hub
 * {
 *  status: checked/unchecked
 * }
 */
app.post("/api/v1/:deviceid", (req, res) => {
  serviceClient.open(err => {
    if (err) {
      res.send(`Could not connect: ${err.message}`);
    } else {
      console.log("Service client connected");
      serviceClient.getFeedbackReceiver(receiveFeedback);
      let message = new Message(JSON.stringify(req.body));
      message.ack = "full";
      console.log("Sending message: ", req.body);
      serviceClient.send(req.params.deviceid, message, printResultFor("send"));
      res.send({ message: req.body, status: "OK" });
    }
  });
});

const port = process.env.PORT || 3000; // update this so that the front end can connect locally.
app.listen(port, () =>
  console.log(`Smartswitch REST API listening on port ${port}!`)
);
