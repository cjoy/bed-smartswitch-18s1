'use strict';

/*
 * Stating the identity of the device this app is simulating 
 * and the connection string used to send messages to the IoT 
 * Hub on behalf of the device.
 */
const deviceId = 'Device1';
const connectionString = 'HostName=TestIoT6324.azure-devices.net;DeviceId=TestIoT;SharedAccessKey=QlTeXamZ/nApomv+f02ntuon4gwFQCkizJV6ctBJS+E=';

/*
 * Creating the client object which acts as the simulated 
 * socket between the device and the IoT Hub.
 */
const clientFromConnectionString = require('azure-iot-device-mqtt').clientFromConnectionString;
const client = clientFromConnectionString(connectionString);

/*
 * Importing the message module for wrapping the JSON
 * data simulated by the app.
 */
const Message = require('azure-iot-device').Message;
const messageInterval = 60; 	// Delay between each message

/*
 * Initializing global variables tracking the state of
 * the device.
 */
const usageRating = 1;			// The typical electricity usage rating of the device
var deviceState = false;		// The current on/off state of the device

/*
 * Callback function for logging errors to the console when
 * sending a message to the device.
 */
function printResultFor(op) 
{
    return function printResult(err, res) 
    {
        if (err) console.log(op + ' error: ' + err.toString());
    };
}

/*
 * Callback function for receiving a message sent to the device
 * and updating the device state based on the message.
 */
var receiveMessageFromCloud = function (msg)
{
	console.log("Received message: " + msg.data);
	var data = JSON.parse(msg.data);
	deviceState = data.status;
	client.complete(msg, printResultFor('completed'));
}

/*
 * Callback function for sending a data packet from the device
 * to the IoT Hub in JSON string form.
 */
var sendMessageToCloud = function(data)
{
	var dataString = JSON.stringify(data);
	console.log("Sending message: " + dataString);
	client.sendEvent(message, printResultFor('send'));
}

/*
 * Callback function for the message loop service that determines
 * the usage of the past minute and sends it with the time and
 * device status to the IoT Hub.
 */
var messageLoop = function()
{
	var timeNow = new Date();
	var year = timeNow.getFullYear();
	var month = timeNow.getMonth() + 1;
	var day = timeNow.getDate();
	var hour = timeNow.getHours();
	var minute = timeNow.getMinutes();
	var status = deviceState;
	var usage = status ? usageRating * (0.7 + 0.6*Math.random()) : Math.random();

	var data = 
	{
		year: year,
		month: month,
		day: day,
		hour: hour,
		minute: minute,
		deviceId: deviceId,
		status: status,
		usage: usage,
	}

	sendMessageToCloud(data);
}

/*
 * Callback function for starting up the simulated data message loop.
 */
var connectCallback = function (err) 
{
    if (err) 
    {
        console.log('Could not connect: ' + err);
    } 
    else 
    {
        console.log('Client connected');
        client.on('message', receiveMessageFromCloud);
        setInterval(messageLoop, 5000);
    }
};

client.open(connectCallback);