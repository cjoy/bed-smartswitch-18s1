'use strict';

var clientFromConnectionString = require('azure-iot-device-mqtt').clientFromConnectionString;
var fetcha = require('fetcha');

var Message = require('azure-iot-device').Message;
var connectionString = 'HostName=TestIoT6324.azure-devices.net;DeviceId=TestIoT;SharedAccessKey=QlTeXamZ/nApomv+f02ntuon4gwFQCkizJV6ctBJS+E=';

var client = clientFromConnectionString(connectionString);

const deviceId = 'Device1'
const usageRate = 1 // W/s
var status = false // Off

function printResultFor(op) 
{
    return function printResult(err, res) 
    {
        if (err) console.log(op + ' error: ' + err.toString());
        if (res) console.log(op + ' status: ' + res.constructor.name);
    };
}

var connectCallback = function (err) 
{
    if (err) 
    {
        console.log('Could not connect: ' + err);
    } 
    else 
    {
        console.log('Client connected');
  
        client.on('message', function (msg) 
        {
            var data = JSON.parse(msg.data);
            status = data.status;
            client.complete(msg, printResultFor('completed'));
        });

        // Create a message and send it to the IoT Hub every second
        setInterval(function()
        {
            var timeNow = new Date(); ///YYYYMMDDHHMMSS
            //var year = timeNow.getFullUTCYear();
            //var month = timeNow.getUTCMonth() + 1;
            //var day = timeNow.getUTCDate();
            //console.log(`${year} ${month} ${day}`);
            var statusString = status === true ? "On" : "Off";

            var data = JSON.stringify({ deviceId: 'TestIoT', usage: usageRate, time: timeNow, status: statusString });
            var message = new Message(data);
            console.log("Sending message: " + message.getData());
            client.sendEvent(message, printResultFor('send'));
        }, 5000);
    }
};

client.open(connectCallback);