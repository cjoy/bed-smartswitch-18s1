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
const Client = require('azure-iothub').Client;
const Message = require('azure-iot-common').Message;
const serviceClient = Client.fromConnectionString(connectionString);

/*
 * Print the resulting status of the send action.
 */
function printResultFor(op) 
{
    return function printResult(err, res) 
    {
        if (err) console.log(op + ' error: ' + err.toString());
        if (res) console.log(op + ' status: ' + res.constructor.name);
    };
}

/*
 * Wait for the feedback of sending the message and print it
 * when it comes through showing the success state of sending
 * the message to the device.
 */
function receiveFeedback(err, receiver)
{
    receiver.on('message', function (message) 
    {
        console.log('Feedback message:')
        console.log(message.getData().toString('ascii'));
        process.exit(0);
    });
}

/*
 * Initiates the sending process by opening the connection,
 * determining the new state and then sending the message.
 */
serviceClient.open(function (err) 
{
    if (err) 
    {
        console.error('Could not connect: ' + err.message);
    } 
    else 
    {
        console.log('Service client connected');
        serviceClient.getFeedbackReceiver(receiveFeedback);

        if (newState === "true" || newState === "false")
        {
            var boolVal = newState === "true" ? true : false;
            var data = JSON.stringify({ status: boolVal });
            var message = new Message(data);
            message.ack = 'full';
    
            console.log('Sending message: ' + message.getData());
            serviceClient.send(deviceId, message, printResultFor('send'));
        }
    }
});