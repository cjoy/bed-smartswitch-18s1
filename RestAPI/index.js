const express = require("express");
const sql = require("mssql");
const Client = require("azure-iothub").Client;
const Message = require("azure-iot-common").Message;
var bodyParser = require("body-parser");
var cloudMon = require("../SimulatedDevices/ReadDeviceToCloudMessages")

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

const port = process.env.PORT || 5000; // update this so that the front end can connect locally.
var server = app.listen(port, () =>
  console.log(`Smartswitch REST API listening on port ${port}!`)
);

/*
 * Checks the message for the special application property where the switch
 * status was just updated in the device.
 */
var checkSwitchUpdate = function (message)
{
	var data = message.body;
	var properties = message.applicationProperties.switched;
	if (data && properties && properties === "true")
	{
		deviceId = data.deviceId;
		newStatus = data.status ? "On" : "Off";
		console.log("Device " + deviceId + " switched to " + newStatus);
		var query = "update room_devices set status='" + newStatus + "' where deviceId='" + deviceId + "'";
		sql
			.connect(dbConfig)
			.then(pool => {
				return pool
				.request()
				.input("deviceId", sql.VarChar, deviceId)
				.input("newStatus", sql.VarChar, newStatus)
				.query('update room_devices set status=@newStatus where deviceId=@deviceId');
			})
			.then(result => {
				sql.close();
			})
			.catch(err => {
				sql.close();
			});
	}
};
cloudMon.monitorCloud(checkSwitchUpdate, iotHubConnectionString)

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
app.get("/api/v1/devices", (req, res) => {
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
      res.send("Unable to retreive devices");
      sql.close();
    });
});

// // fake auth endpoint
// app.post('/api/v3/sign-in', (req, res) => {
//     res.send({
//         status: true,
//         userID: 1,
//         error: null
//     })
// })

/**
 * write docs info here for what the function returns.
 */
app.get("/api/v3/devices", (req, res) => {
  sql
    .connect(dbConfig)
    .then(pool => {
      return pool
        .request()
        .input("userID", sql.VarChar, req.params.user_id)
        .query("select * from devices where user_id = @userID");
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

// all devices usage for a given month
app.get("/api/v2/devices/data/day/:month/:day/:deviceId", (req, res) => {
	sql
		.connect(dbConfig)
		.then(pool => {
			return pool
			.request()
			.input("day", sql.VarChar, req.params.day)
			.input("month", sql.VarChar, req.params.month)
			.input("deviceId", sql.VarChar, req.params.deviceId)
			.query(
				`select deviceId, hour, cast(minute as float) minute, (cast(usage as float)) usage from sensor_data where deviceId=@deviceId and month=@month and day= order by hour, minute`
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
app.get("/api/v2/devices/data/month/:month", (req, res) => {
  sql
    .connect(dbConfig)
    .then(pool => {
      return pool
        .request()
        .input("month", sql.VarChar, req.params.month)
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

/** GET /:deviceid  (eg. GET /Device1)
 * Get a single device's states
 */
app.get("/api/v1/device/:deviceid", (req, res) => 
{
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
app.post("/api/v1/device/:deviceid", (req, res) => 
{
	serviceClient.open(err =>
	{
		if (err) 
		{
			res.send(`Could not connect: ${err.message}`);
		} 
		else 
		{
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


app.post("/api/v1/user/register", (req, res) => 
{
	if (!req.body.username || !req.body.password) 
	{
		res.send({ message: "Please specify all user details", status: "OK" });
	}
	sql
		.connect(dbConfig)
		.then(pool => {
			return pool
			.request()
			.input("username", sql.VarChar, req.body.username)
			.input("password", sql.VarChar, req.body.password)
			.query(`
				INSERT INTO users (username, password)
				VALUES (@username, @password);
			`);
		})
		.then(result => {
			res.send({ message:'Successfully created user', status:'OK' });
			sql.close();
		})
		.catch(err => {
			res.send(err);
			sql.close();
		});
});

/**
 * POST /api/user/sign-in
 */
app.post("/api/v1/user/sign-in", (req, res) => 
{
	if (!req.body.username || !req.body.password) 
	{
		res.send({ message: "Please specify all user details", status: "OK" });
	}
	sql
		.connect(dbConfig)
		.then(pool => {
			return pool
			.request()
			.input("username", sql.VarChar, req.body.username)
			.input("password", sql.VarChar, req.body.password)
			.query(`SELECT id from users where password=@password and username=@username`);
		})
		.then(result => {
			const status = result.recordset.length  !== 0 ? true : false; 
			const userId = status ? result.recordset[0].id : -1;
			res.send({ status , userId, error: null });
			sql.close();
		})
		.catch(err => {
			res.send({ status: false, userId: -1, error: err });
			sql.close();
		});
});
 

app.get("/api/v3/devices/:username", (req, res) => {
	sql
		.connect(dbConfig)
		.then(pool => {
			return pool
			.request()
			.input("username", sql.VarChar, req.params.username)
			.query("select * from room_devices where username = @username");
		})
		.then(result => {
			const rooms = {};
			result.recordset.forEach((device) => 
			{
				if (!rooms[device.roomid])
				{
					rooms[device.roomid] = []
				}
				rooms[device.roomid].push(
				{
					id: device.deviceId,
					type: device.device_type,
					name: device.device_name,
					status: device.status === 'Off' ? false : true,
				});	
			});
			var i = 1;
			const roomData = [];
			Object.keys(rooms).forEach(room => 
			{
				data = 
				{ 
					roomID: i,
					name: room,
					devices: rooms[room],
				};
				roomData.push(data);
			}) 
			res.send(roomData);
			sql.close();
		})
		.catch(err => {
			console.log(err)
			res.send("Unable to retreive devices");
			sql.close();
		});
});

/**
 * Register devices
 */
app.post("/api/v1/register/device", (req, res) => 
{
	if (!req.body.deviceId || !req.body.deviceType || !req.body.deviceName || !req.body.roomName) 
	{
		res.send({ message: "Please specify all device details", status: "ERROR" });
	}
	sql
		.connect(dbConfig)
		.then(pool => {
			return pool
			.request()
			.input("username", sql.VarChar, req.body.username)
			.input("deviceId", sql.VarChar, req.body.deviceId)
			.input("deviceType", sql.VarChar, req.body.deviceType)
			.input("deviceName", sql.VarChar, req.body.deviceName)
			.input("roomName", sql.VarChar, req.body.roomName)
			.query(`
				IF EXISTS(select * from room_devices where deviceId=@deviceId)
				BEGIN
					IF EXISTS(select * from room_devices where deviceId=@deviceId and username='test')
					BEGIN
						UPDATE room_devices
							SET device_type=@deviceType, device_name=@deviceName, roomid=@roomName
							WHERE deviceId=@deviceId
					END
				END
				ELSE
				BEGIN
					INSERT INTO room_devices (username, deviceId, device_type, device_name, roomid, status)
					VALUES (@username, @deviceId, @deviceType, @deviceName, @roomName, 'Off');
				END
			`);
		})
		.then(result => {
			res.send({ message:'Successfully registered device', status:'OK' });
			sql.close();
		})
		.catch(err => {
			res.send(err);
			sql.close();
		});
});



