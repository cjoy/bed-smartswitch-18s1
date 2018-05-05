'use strict';

var Client = require('azure-iothub').Client;
var Message = require('azure-iot-common').Message;

var connectionString = 'HostName=TestIoT6324.azure-devices.net;SharedAccessKeyName=iothubowner;SharedAccessKey=s5JVWGQOQRcK+WHLMyrJ5BvM3CMMcs7nRX8XmhkNaD8=';
var targetDevice = 'TestIoT';
var messageCount = 0;

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
        console.log(msg.getData().toString('utf-8'));
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
        message.messageId = `${messageCount}`;

        console.log('Sending message: ' + message.getData());
        serviceClient.send(targetDevice, message, printResultFor('send'));

        messageCount++;
    }
});