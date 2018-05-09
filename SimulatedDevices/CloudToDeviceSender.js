
/*
 * Importing the client and message modules which acts as the simulated 
 * to connect and send the message.
 */
const Client = require('azure-iothub').Client;
const Message = require('azure-iot-common').Message;
var serviceClient;

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
		serviceClient.close();
    });
}

/*
 * Initiates the sending process by opening the connection,
 * determining the new state and then sending the message.
 */
function sendMessage(connectionString, deviceId, value)
{
	serviceClient = Client.fromConnectionString(connectionString);
	
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

			var data = JSON.stringify({ status: value });
			var message = new Message(data);
			message.ack = 'full';
		
			console.log('Sending message: ' + message.getData());
			serviceClient.send(deviceId, message, printResultFor('send'));
		}
	});
}

/*
 * Exports the function as a module to be used by other js files.
 */
module.exports = {
	sendMessage: sendMessage
};