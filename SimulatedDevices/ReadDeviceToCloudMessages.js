// Copyright (c) Microsoft. All rights reserved.
// Licensed under the MIT license. See LICENSE file in the project root for full license information.

/*
 * Using the Node.js SDK for Azure Event hubs: https://github.com/Azure/azure-event-hubs-node
 * The sample connects to an IoT hub's Event Hubs-compatible endpoint
 * to read messages sent from a device.
 */
var EventHubClient = require('azure-event-hubs').Client;

var printError = function (err) 
{
  	console.log(err.message);
};

/*
 * Checks the message for the special application property where the switch
 * status was just updated in the device.
 */
var checkSwitchUpdate = function (message, callback)
{
	var data = message.body;
	var properties = message.applicationProperties.switched;
	if (data && properties && properties === "true")
	{
		deviceId = data.deviceId;
		newStatus = data.status;
		console.log("Device " + deviceId + " switched to " + newStatus);
	}
};

/*
 * Connect to the partitions on the IoT Hub's Event Hubs-compatible endpoint.
 * This example only reads messages sent after this application started.
 */
function monitorCloud(connectionString, callback)
{
	console.log("Starting IoT Hub status update monitor ...")
	var client = EventHubClient.fromConnectionString(connectionString);
	client.open()
		.then(client.getPartitionIds.bind(client))
		.then(function (partitionIds) 
		{
			return partitionIds.map(function (partitionId) 
			{
				return client.createReceiver('$Default', partitionId, { 'startAfterTime' : Date.now()}).then(function(receiver)
				{
					receiver.on('errorReceived', printError);
					receiver.on('message', callback);
				});
			});
		})
		.catch(printError);
}

/*
 * Exports the function as a module to be used by other js files.
 */
module.exports = {
	monitorCloud: monitorCloud
};