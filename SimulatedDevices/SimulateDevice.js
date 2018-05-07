'use strict';

/*
 * Checking that the user has specified the device name to simulate
 */
if (process.argv.length <= 2)
{
	console.log('Usage: node SimulateDevice.js <device_name>');
	process.exit(1);
}

/*
 * Getting the identity of the device this app is simulating 
 * from the command line arguments and the connection string 
 * used to send messages to the IoT Hub on behalf of the device.
 */
const finder = require('./DeviceConfigFinder')
const deviceId = process.argv[2];
const deviceConfig = finder.getdeviceConfig(deviceId);
const connectionString = deviceConfig.connectionString;

/*
 * Initializing global variables tracking the state of
 * the device.
 */
const usageRating = deviceConfig.usageRating;	// The typical electricity usage rating of the device in W/s
var deviceState = true;							// The current on/off state of the device

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
const messageInterval = 60; 					// Delay between each message

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
function receiveMessageFromCloud(msg)
{
	console.log("Received message: " + msg.data);
	var data = JSON.parse(msg.data);
	if(data.status === true || data.status === false)
	{
		deviceState = data.status;
	}
	client.complete(msg, printResultFor('completed'));
}

/*
 * Callback function for sending a data packet from the device
 * to the IoT Hub in JSON string form.
 */
function sendMessageToCloud(data)
{
	var dataString = JSON.stringify(data);
	var message = new Message(dataString);
	console.log("Sending message: " + dataString);
	client.sendEvent(message, printResultFor('send'));
}

/*
 * Callback function for the message loop service that determines
 * the usage of the past minute and sends it with the time and
 * device status to the IoT Hub.
 */
function messageLoop()
{
	var timeNow = new Date();
	var year = timeNow.getFullYear();
	var month = timeNow.getMonth() + 1;
	var day = timeNow.getDate();
	var hour = timeNow.getHours();
	var minute = timeNow.getMinutes();
	var status = deviceState ? "On" : "Off";
	var usage = deviceState 
		? messageInterval*usageRating*(0.9 + 0.2*Math.random()) // If the device is on, run at usageRate with 10% variance
		: Math.random(); // Otherwise just simulate the IoT device requiring power

	var data = 
	{
		year: year,
		month: month,
		day: day,
		hour: hour,
		minute: minute,
		deviceId: deviceId,
		status: status,
		usage: usage.toFixed(2),
	}

	sendMessageToCloud(data);
}

/*
 * Callback function for starting up the simulated data message loop.
 */
function connectCallback(err) 
{
    if (err) 
    {
        console.log('Could not connect: ' + err);
    } 
    else 
    {
        console.log('Client connected');
        client.on('message', receiveMessageFromCloud);
        setInterval(messageLoop, messageInterval*1000);
    }
};

client.open(connectCallback);