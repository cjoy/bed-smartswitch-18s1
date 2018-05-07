'use strict';

const deviceId = 'Device1';
const connectionString = 'HostName=SmartSwitch.azure-devices.net;SharedAccessKeyName=iothubowner;SharedAccessKey=8Wrt9USCDDOQg/r4pK/IpZH6iRibnNHpv0wZ+GkL22M=';

var Client = require('azure-iothub').Client;
var Message = require('azure-iot-common').Message;
var serviceClient = Client.fromConnectionString(connectionString);



function printResultFor(op) 
{
    return function printResult(err, res) 
    {
        if (err) console.log(op + ' error: ' + err.toString());
        if (res) console.log(op + ' status: ' + res.constructor.name);
    };
}

function receiveFeedback(err, receiver)
{
    receiver.on('message', function (msg) 
    {
        console.log('Feedback message:')
        console.log(msg.getData().toString('ascii'));
        process.exit(0);
    });
}

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

        var data = JSON.stringify({ status: true });
        var message = new Message(data);
        message.ack = 'full';

        console.log('Sending message: ' + message.getData());
        serviceClient.send(deviceId, message, printResultFor('send'));
    }
});