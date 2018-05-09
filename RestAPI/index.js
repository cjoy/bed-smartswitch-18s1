const express = require('express');
const sql = require('mssql');
const Client = require('azure-iothub').Client;
const Message = require('azure-iot-common').Message;

const dbConfig = {
    user: 'comp6324admin',
    password: 'COMP6324password',
    server: 'smartswitch.database.windows.net',
    database: 'smartswitch',
    options: {
        encrypt: true
    }
};

const iotHubConfig = {
    hostname: 'SmartSwitch.azure-devices.net',
    sharedkey: '8Wrt9USCDDOQg/r4pK/IpZH6iRibnNHpv0wZ+GkL22M=',
    sharedkeyname: 'iothubowner',
}

const iotHubConnectionString = `HostName=${iotHubConfig.hostname};SharedAccessKeyName=${iotHubConfig.sharedkeyname};SharedAccessKey=${iotHubConfig.sharedkey}`;
const serviceClient = Client.fromConnectionString(iotHubConnectionString);

const app = express();
app.use(express.json());


/**
 * HELPER FUNCTIONS
 */

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
    });
}

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

/**
 * API ROUTES
 */

/** GET /
 * Get list of devices
 */
app.get('/', (req, res) => {
    sql.connect(dbConfig).then(pool => {
        return pool.request()
            .query('select * from devices');
    }).then(result => {
        res.send(result.recordset);
        sql.close();
    }).catch(err => {
        res.send('Unable to retreive devices');
        sql.close();
    });
});

/** GET /:deviceid  (eg. GET /Device1)
 * Get a single device's states 
 */
app.get('/:deviceid', (req, res) => {
    sql.connect(dbConfig).then(pool => {
        return pool.request()
            .input('deviceId', sql.VarChar, req.params.deviceid)
            .query(`select * from sensor_data where deviceId = @deviceId`);
    }).then(result => {
        res.send(result.recordset);
        sql.close();
    }).catch(err => {
        res.send(err);
        sql.close();
    });
});

/** POST /:deviceid
 * Send a device message to the iot hub
 */
app.post('/:deviceid', (req, res) => {
    serviceClient.open((err) => {
        if (err) {
            res.send(`Could not connect: ${err.message}`);
        } 
        else {
            console.log('Service client connected');
            serviceClient.getFeedbackReceiver(receiveFeedback);
            let message = new Message(JSON.stringify(req.body));
            message.ack = 'full';
            console.log('Sending message: ' + message.getData());
            serviceClient.send(req.params.deviceid, message, printResultFor('send'));
            res.send({ message: req.body, status: 'OK'});
        }
    });
});

app.listen(3000, () => console.log('Smartswitch REST API listening on port 3000!'));
