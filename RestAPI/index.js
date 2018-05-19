const express = require("express");
const sleep = require('sleep');
const sql = require("mssql");
const Client = require("azure-iothub").Client;
const Message = require("azure-iot-common").Message;
const bodyParser = require("body-parser");
const cloudMon = require("../SimulatedDevices/ReadDeviceToCloudMessages");
const azure = require("./AzureConfig");

const dbConfig = azure.dbConfig;
const sqlConnPool = new sql.ConnectionPool(dbConfig);
sqlConnPool.connect().then(() => {console.log("Database connected");});

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

//#region =================================   AZURE CLOUD COMMUNICATION   =================================== //

// =============================================   GET LIVE SWITCH UPDATE   ============================================== //

/*
 * Checks the message for the special application property where the switch
 * status was just updated in the device.
 */
cloudMon.monitorCloud(iotHubConnectionString, function(message) 
{
    var data = message.body;
    var properties = message.applicationProperties.switched;
    if (data && properties && properties === "true") 
    {
        deviceId = data.deviceId;
        newStatus = data.status ? "On" : "Off";
        console.log("Device " + deviceId + " switched to " + newStatus);
        var request = new sql.Request(sqlConnPool);
        request
            .input("deviceId", sql.VarChar, deviceId)
            .input("newStatus", sql.VarChar, newStatus)
            .query("UPDATE registered_devices SET status=@newStatus WHERE deviceId=@deviceId");
        var request2 = new sql.Request(sqlConnPool);
        request2
            .input("deviceId", sql.VarChar, deviceId)
            .input("newStatus", sql.VarChar, newStatus)
            .query("UPDATE registered_devices_copy SET status=@newStatus WHERE deviceId=@deviceId");
    }
});

// =============================================   CHANGE DEVICE STATE   ============================================== //

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
            return;
        }
        let message = new Message(JSON.stringify(req.body));
        message.ack = "full";

        console.log("Sending message: ", req.body);
        serviceClient.send(req.params.deviceid, message, function printResult(err, res) 
        {  
            if (err) console.log("Send error: " + err.toString());
        });
        res.send({ message: req.body, status: "OK" });
    });
});

//#endregion

//#region  =====================================  LOGIN : USER SIGN-IN   ====================================== //

// =============================================  AUTHENTICATE USER   ============================================== //

/** 
 * POST /
 * Queries the db for a matching username and password pair to the ones passed in to authenticate a user
 */
app.post("/api/v1/user/sign-in", (req, res) => 
{
    if (!req.body.username || !req.body.password) 
    {
        res.send({ message: "Please specify all user details", status: "OK" });
        return;
    }
    var request = new sql.Request(sqlConnPool);
    request
        .input("username", sql.VarChar, req.body.username)
        .input("password", sql.VarChar, req.body.password)
        .query(`SELECT customerId, username FROM users_copy WHERE password=@password and username=@username`, function(err, result) 
        {
            if (err) 
            {
                console.error(err);
                res.status(500).send({ status: false, userId: -1, username: "None", error: err });
                return;
            }
            console.log(result.recordset)
            const status = result.recordset.length !== 0 ? true : false;
            const userId = status ? result.recordset[0].customerId : -1;
            const username = status ? result.recordset[0].username : "None";
            res.status(200).send({ status, userId, username, error: null });
        });
});

//#endregion

//#region  =====================================  DASHBOARD : GET SENSOR DATA   ====================================== //

// =====================================   GET SENSOR DATA FOR GIVEN DAY   ====================================== //

/** 
 * GET /:month/:day/:deviceId
 * Gets usage data for a particular device for the given day ordered by hour and minute
 */
app.get("/api/v2/devices/data/day/:month/:day/:deviceId", (req, res) => 
{
    var request = new sql.Request(sqlConnPool);
    request
        .request()
        .input("day", sql.VarChar, req.params.day)
        .input("month", sql.VarChar, req.params.month)
        .input("deviceId", sql.VarChar, req.params.deviceId)
        .query(`
            SELECT deviceId, hour, cast(minute as float) minute, (cast(usage as float)) usage 
            FROM sensor_data 
            WHERE deviceId=@deviceId and month=@month and day=@day
            ORDER BY hour, minute
        `, 
        function(err, result) 
        {
            if (err) 
            {
                console.error(err);
                res.status(500).send(err.message);
                return;
            }
            res.status(200).json(result.recordset);
        });
});

// =====================================   GET SENSOR DATA FOR GIVEN MONTH   ====================================== //

/** 
 * // TODO Copy to new version to accept username
 * GET /:month
 * Gets cumulative usage data for all devices for the given month ordered by grouped by deviceId
 */
app.get("/api/v2/devices/data/month/:month", (req, res) => 
{
    var request = new sql.Request(sqlConnPool);
    request
        .input("month", sql.VarChar, req.params.month)
        .query(`
            SELECT deviceId, sum(cast(usage as float)) usage 
            FROM sensor_data WHERE month = @month 
            GROUP BY deviceId 
            ORDER BY deviceId
        `, 
        function(err, result) 
        {
            if (err) 
            {
                console.error(err);
                res.status(500).send(err.message);
                return;
            }
            res.status(200).send(result.recordset);
        });
});

//#endregion

//#region  ======================================  DEVICES : GET BUILDING DEVICE INFO   ================================ //

/** 
 * GET /
 * Searches for the tuple (deviceid,productid,roomid,devicetype,devicename,status) from the database and 
 * categorises the devices according to product.
 */
app.get("/api/v3/buildings/devices/:customerId", (req, res) => 
{
    var request = new sql.Request(sqlConnPool);
    request
        .input("customerId", sql.VarChar, req.body.customerId)
        .query(`
            SELECT * FROM registered_devices_copy 
            WHERE productId IN (SELECT productId FROM products WHERE customerId=@customerId)
        `,
        function(err, result)
        {
            if (err) 
            {
                console.error(err);
                res.status(500).send(err.message);
                return;
            }
            const records = {};
            result.recordset.forEach((record) =>
            {
                if (!records[record.productId]) 
                {
                    records[record.productId] = []
                }
                records[record.productId].push(record)
            });
            const products = {};
            var i = 1;
            const productData = [];
            Object.keys(records).forEach((product) =>
            {
                const rooms = {};
                records[product].forEach((device) => 
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
                var j = 1;
                const roomData = [];
                Object.keys(rooms).forEach(room => 
                {
                    data = 
                    {
                        roomID: j,
                        name: room,
                        devices: rooms[room],
                    };
                    j += 1;
                    roomData.push(data);
                })
                productData.push(
                {
                    productID: i,
                    rooms: roomData
                })
                i += 1;
            });
            console.log(JSON.stringify(productData));
            res.status(200).send(productData);
        });
});

//#region  ======================================  DEVICES : GET ROOM DEVICE INFO   ================================ //

/** 
 * GET /
 * Searches for the tuple (deviceid,roomid,devicetype,devicename,status) from the database and 
 * categorises the devices according to room.
 */
app.get("/api/v3/room/devices/:username", (req, res) => 
{
    console.log(req.params);
    var request = new sql.Request(sqlConnPool);
    request
        .input("customerId", sql.VarChar, req.params.username)
        .query(`
            SELECT * FROM registered_devices_copy 
            WHERE productId IN (SELECT productId FROM products WHERE customerId=@customerId)
        `,
        function(err, result)
        {
            if (err) 
            {
                console.error(err);
                res.status(500).send(err.message);
                return;
            }
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
                i += 1
                roomData.push(data);
            })
            res.status(200).send(roomData);
        });
});

//#endregion

//#region  ======================================  REGISTER : REGISTER/UNREGISTER DEVICES   ======================= //

// =============================================   REGISTER DEVICE   ============================================== //

/** 
 * POST /
 * Inserts or updates a device's details in the registered_devices table of the database depending
 * on whether the device already exists. 
 */
app.post("/api/v1/register/device/", (req, res) => 
{
    if (!req.body.deviceId || !req.body.deviceType || !req.body.deviceName || !req.body.roomName) 
    {
        res.send({ message: "Please specify all device details", status: "ERROR" });
        return;
    }
    var request = new sql.Request(sqlConnPool);
    request
        .input("username", sql.VarChar, req.body.username)
        .input("deviceId", sql.VarChar, req.body.deviceId)
        .input("deviceType", sql.VarChar, req.body.deviceType)
        .input("deviceName", sql.VarChar, req.body.deviceName)
        .input("roomName", sql.VarChar, req.body.roomName)
        .query(`
            IF EXISTS(SELECT * FROM registered_devices WHERE deviceId=@deviceId)
            BEGIN
                IF EXISTS(SELECT * FROM registered_devices WHERE deviceId=@deviceId AND username=@username)
                BEGIN
                    UPDATE registered_devices
                        SET device_type=@deviceType, device_name=@deviceName, roomid=@roomName
                        WHERE deviceId=@deviceId
                END
            END
            ELSE
            BEGIN
                IF EXISTS(SELECT * FROM devices WHERE deviceId=@deviceId)
                BEGIN
                    IF EXISTS (SELECT status FROM sensor_data WHERE last_update = (SELECT max(last_update) FROM sensor_data WHERE deviceId=@deviceId) AND deviceId=@deviceId)
                    BEGIN 
                        INSERT INTO registered_devices (deviceId, username, roomid, device_type, device_name, status) 
                        VALUES (@deviceId, @username, @roomName, @deviceType, @deviceName, (SELECT status FROM sensor_data WHERE last_update = (SELECT max(last_update) FROM sensor_data WHERE deviceId=@deviceId) AND deviceId=@deviceId))
                    END
                    ELSE
                    BEGIN
                        INSERT INTO registered_devices (deviceId, username, roomid, device_type, device_name, status) 
                        VALUES ('Device11', @username, @roomName, @deviceType, @deviceName, 'Off')
                    END
                END
            END`, 
            function(err, result) 
            {
                if (err) 
                {
                    console.error(err);
                    res.status(500).send(err);
                    return;
                }
                console.log("Register: " + result)
                res.status(200).send({ message: "Success" });
            });
});

// =============================================   UNREGISTER DEVICE   ============================================== //

/** 
 * POST /
 * Removes a device from the registered_devices table for a specified user if the device is registered to them. 
 */
app.post("/api/v1/unregister/device/", (req, res) => 
{
    var request = new sql.Request(sqlConnPool);
    request
        .input("username", sql.VarChar, req.body.username)
        .input("deviceId", sql.VarChar, req.body.deviceId)
        .query(`
            IF EXISTS(SELECT * FROM registered_devices WHERE deviceId=@deviceId AND username=@username)
            BEGIN
                DELETE FROM registered_devices WHERE deviceId=@deviceId
            END`, 
            function(err, result) 
            {
                if (err) 
                {
                    console.error(err);
                    res.status(500).send(err);
                    return;
                }
                console.log(`Unregister: ${req.body.username} ${req.body.deviceId}` + result)
                res.status(200).send({ message: "Success" });
            });
});

//#endregion