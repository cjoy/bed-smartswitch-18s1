'use strict';

/*
 * Checking that the user has specified the device name to send
 * the message to as well as the 'true' or 'false' 'on'-state to
 * set the device to.
 */
if (process.argv.length <= 3)
{
	console.log('Usage: node SendCloudToDeviceMessage.js <device_name> <json_message>');
	process.exit(1);
}
const deviceId = process.argv[2];
const newState = process.argv[3];

/*
 * Retrieving the iot hub connection string defined in the iot config
 * file in the CreateDeviceIdentity folder.
 */
const hubConfig = require(`${__dirname}\\..\\CreateDeviceIdentity\\IoTHubConfig`)
const hostname = hubConfig.hostname;
const sharedkey = hubConfig.sharedkey;
const sharedkeyname = hubConfig.sharedkeyname;
const connectionString = `HostName=${hostname};SharedAccessKeyName=${sharedkeyname};SharedAccessKey=${sharedkey}`;

/*
 * Importing the client and message modules which acts as the simulated 
 * to connect and send the message.
 */
const sender = require('./CloudToDeviceSender');
if (newState === "true" || newState === "false")
{
	var boolVal = newState === "true" ? true : false;
	sender.sendMessage(connectionString, deviceId, boolVal);
}
