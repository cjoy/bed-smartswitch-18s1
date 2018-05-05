const EventHubClient = require('azure-event-hubs');

var connectionString = 'HostName=TestIoT6324.azure-devices.net;SharedAccessKeyName=iothubowner;SharedAccessKey=s5JVWGQOQRcK+WHLMyrJ5BvM3CMMcs7nRX8XmhkNaD8=';

var printError = function (err) 
{
    console.log(err.message);
};
  
var printMessage = function (message) 
{
    console.log('Message received: ');
    console.log(JSON.stringify(message.body));
    console.log('');
};

var client = EventHubClient.createFromConnectionString(connectionString);
client.open()
    .then(client.getPartitionIds.bind(client))
    .then(function (partitionIds) 
    {
        return partitionIds.map(function (partitionId) 
        {
            return client.createReceiver('$Default', partitionId, { 'startAfterTime' : Date.now()}).then(function(receiver) 
            {
                console.log('Created partition receiver: ' + partitionId)
                receiver.on('errorReceived', printError);
                receiver.on('message', printMessage);
            });
        });
    })
    .catch(printError);