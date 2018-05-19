const express = require("express");
const sql = require("mssql");
const Client = require("azure-iothub").Client;
const Message = require("azure-iot-common").Message;
const bodyParser = require("body-parser");
const cloudMon = require("../SimulatedDevices/ReadDeviceToCloudMessages");
const azure = require("./AzureConfig");

const dbConfig = azure.dbConfig;
const iotHubConnectionString = azure.IoTHubConnectionString;
const serviceClient = Client.fromConnectionString(iotHubConnectionString);

const app = express();
app.use(express.json());
app.use(bodyParser.json());
app.use(function(req, res, next) 
{
    res.header("Access-Control-Allow-Origin", "*");
    res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
    next();
});

const port = process.env.PORT || 5000; // update this so that the front end can connect locally.
const server = app.listen(port, () => console.log(`Smartswitch REST API listening on port ${port}!`));

/*
 * Checks the message for the special application property where the switch
 * status was just updated in the device.
 */
var checkSwitchUpdate = function(message) 
{
    var data = message.body;
    var properties = message.applicationProperties.switched;
    if (data && properties && properties === "true") 
    {
        deviceId = data.deviceId;
        newStatus = data.status ? "On" : "Off";
        console.log("Device " + deviceId + " switched to " + newStatus);
        sql
            .connect(dbConfig)
            .then(pool => 
            {
                return pool
                    .request()
                    .input("deviceId", sql.VarChar, deviceId)
                    .input("newStatus", sql.VarChar, newStatus)
                    .query('update registered_devices set status=@newStatus where deviceId=@deviceId');
            })
            .then(result => 
            {
                sql.close();
            })
            .catch(err => 
            {
                sql.close();
            });
    }
};
cloudMon.monitorCloud(checkSwitchUpdate, iotHubConnectionString)

/*
 * Print the resulting status of the send action.
 */
function printResultFor(op) 
{
    return function printResult(err, res) 
    {  
        if (err) console.log(op + " error: " + err.toString());
        if (res) console.log(op + " status: " + res.constructor.name);
    };
}

/** 
 * POST /:deviceid
 * Sends a message from the IoT hub to the device identified by the deviceId
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

            let message = new Message(JSON.stringify(req.body));
            message.ack = "full";

            console.log("Sending message: ", req.body);
            serviceClient.send(req.params.deviceid, message, printResultFor("send"));
            res.send({ message: req.body, status: "OK" });
        }
    });
});

/** 
 * GET /
 * Gets a list of all existing devices from the database
 */
app.get("/api/v1/devices", (req, res) => 
{
    sql
        .connect(dbConfig)
        .then(pool => 
        {
            return pool.request().query("SELECT * FROM devices");
        })
        .then(result => 
        {
            console.log(result.recordset);
            res.send(result.recordset);
            sql.close();
        })
        .catch(err => 
        {
            res.send("Unable to retreive devices");
            sql.close();
        });
});

/** 
 * GET /
 * Gets the device ids of all the devices registered to a customer identified by userid
 */
app.get("/api/v3/devices", (req, res) => 
{
    sql
        .connect(dbConfig)
        .then(pool => 
        {
            return pool
                .request()
                .input("userID", sql.VarChar, req.params.user_id)
                .query("SELECT * FROM user_devices WHERE user_id = @userID");
        })
        .then(result => 
        {
            console.log(result.recordset);
            res.send(result.recordset);
            sql.close();
        })
        .catch(err => 
        {
            res.send("Unable to retreive devices");
            sql.close();
        });
});

/** 
 * GET /
 * Gets the rooms of all the devices registered to a customer identified by userid
 */
app.get("/api/v3/rooms", (req, res) => 
{
    sql
        .connect(dbConfig)
        .then(pool => 
        {
            return pool
                .request()
                .input("userID", sql.VarChar, req.params.user_id)
                .query("SELECT * FROM rooms WHERE user_id = @userID");
        })
        .then(result => 
        {
            console.log(result.recordset);
            res.send(result.recordset);
            sql.close();
        })
        .catch(err => 
        {
            res.send("Unable to retreive devices");
            sql.close();
        });
});

/** 
 * GET /:month/:day/:deviceId
 * Gets usage data for a particular device for the given day ordered by hour and minute
 */
app.get("/api/v2/devices/data/day/:month/:day/:deviceId", (req, res) => 
{
    sql
        .connect(dbConfig)
        .then(pool => 
        {
            return pool
                .request()
                .input("day", sql.VarChar, req.params.day)
                .input("month", sql.VarChar, req.params.month)
                .input("deviceId", sql.VarChar, req.params.deviceId)
                .query(`
                    SELECT deviceId, hour, cast(minute as float) minute, (cast(usage as float)) usage 
                    FROM sensor_data 
                    WHERE deviceId=@deviceId and month=@month and day=@day
                    ORDER BY hour, minute
                `);
        })
        .then(result => 
        {
            res.send(result.recordset);
            sql.close();
        })
        .catch(err => 
        {
            res.send(err);
            sql.close();
        });
});


/** 
 * GET /:month
 * Gets cumulative usage data for all devices for the given month ordered by grouped by deviceId
 */
app.get("/api/v2/devices/data/month/:month", (req, res) => 
{
    sql
        .connect(dbConfig)
        .then(pool => 
        {
            return pool
                .request()
                .input("month", sql.VarChar, req.params.month)
                .query(`
                    SELECT deviceId, sum(cast(usage as float)) usage 
                    FROM sensor_data WHERE month = @month 
                    GROUP BY deviceId 
                    ORDER BY deviceId
                `);
        })
        .then(result => 
        {
            res.send(result.recordset);
            sql.close();
        })
        .catch(err => 
        {
            res.send(err);
            sql.close();
        });
});

/** 
 * POST /
 * Inserts a new username and password into the database user table
 */
app.post("/api/v1/user/register", (req, res) => 
{
    if (!req.body.username || !req.body.password) 
    {
        res.send({ message: "Please specify all user details", status: "OK" });
    }
    sql
        .connect(dbConfig)
        .then(pool => 
        {
            return pool
                .request()
                .input("username", sql.VarChar, req.body.username)
                .input("password", sql.VarChar, req.body.password)
                .query(`
				INSERT INTO users (username, password)
				VALUES (@username, @password);
			`);
        })
        .then(result => 
        {
            res.send({ message: 'Successfully created user', status: 'OK' });
            sql.close();
        })
        .catch(err => 
        {
            res.send(err);
            sql.close();
        });
});

/** 
 * POST /
 * Queries the db for a matching username and password pair to the ones passed in to authenticate a user
 */
app.post("/api/v1/user/sign-in", (req, res) => 
{
    if (!req.body.username || !req.body.password) 
    {
        res.send({ message: "Please specify all user details", status: "OK" });
    }
    sql
        .connect(dbConfig)
        .then(pool => 
        {
            return pool
                .request()
                .input("username", sql.VarChar, req.body.username)
                .input("password", sql.VarChar, req.body.password)
                .query(`SELECT id FROM users WHERE password=@password and username=@username`);
        })
        .then(result => 
        {
            const status = result.recordset.length !== 0 ? true : false;
            const userId = status ? result.recordset[0].id : -1;
            res.send({ status, userId, error: null });
            sql.close();
        })
        .catch(err => 
        {
            res.send({ status: false, userId: -1, error: err });
            sql.close();
        });
});

/** 
 * GET /
 * Searches for the tuple (deviceid,roomid,devicetype,devicename,status) from the database and 
 * categorises the devices according to room.
 */
app.get("/api/v3/devices/:username", (req, res) => 
{
    sql
        .connect(dbConfig)
        .then(pool => 
        {
            return pool
                .request()
                .input("username", sql.VarChar, req.params.username)
                .query("SELECT * FROM registered_devices WHERE username = @username");
        })
        .then(result => 
        {
            sql.close();
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
        })
        .catch(err => 
        {
            console.log(err)
            res.send("Unable to retreive devices");
            sql.close();
        });
});

/** 
 * POST /
 * Inserts or updates a device's details in the registered_devices table of the database depending
 * on whether the device already exists. 
 */
app.post("/api/v1/register/device", (req, res) => 
{
    if (!req.body.deviceId || !req.body.deviceType || !req.body.deviceName || !req.body.roomName) 
    {
        res.send({ message: "Please specify all device details", status: "ERROR" });
    }
    sql
        .connect(dbConfig)
        .then(pool => 
        {
            return pool
                .request()
                .input("username", sql.VarChar, req.body.username)
                .input("deviceId", sql.VarChar, req.body.deviceId)
                .input("deviceType", sql.VarChar, req.body.deviceType)
                .input("deviceName", sql.VarChar, req.body.deviceName)
                .input("roomName", sql.VarChar, req.body.roomName)
                .query(`
                    IF EXISTS(select * from registered_devices where deviceId=@deviceId)
                    BEGIN
                        IF EXISTS(select * from registered_devices where deviceId=@deviceId and username='test')
                        BEGIN
                            UPDATE registered_devices
                                SET device_type=@deviceType, device_name=@deviceName, roomid=@roomName
                                WHERE deviceId=@deviceId
                        END
                    END
                    ELSE
                    BEGIN
                        INSERT INTO registered_devices (username, deviceId, device_type, device_name, roomid, status)
                        VALUES (@username, @deviceId, @deviceType, @deviceName, @roomName, 'Off');
                    END
			`);
        })
        .then(result => 
        {
            res.send({ message: 'Successfully registered device', status: 'OK' });
            sql.close();
        })
        .catch(err => 
        {
            res.send(err);
            sql.close();
        });
});
