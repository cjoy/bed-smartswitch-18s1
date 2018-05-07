'use strict';

const hostname = 'SmartSwitch.azure-devices.net';
const sharedkey = '8Wrt9USCDDOQg/r4pK/IpZH6iRibnNHpv0wZ+GkL22M=';
const sharedkeyname = 'iothubowner';
const connectionString = `HostName=${hostname};SharedAccessKeyName=${sharedkeyname};SharedAccessKey=${sharedkey}`;

const fs = require('fs');
const iothub = require('azure-iothub');
const registry = iothub.Registry.fromConnectionString(connectionString);

if (process.argv.length <= 3)
{
    console.log('Usage: node CreateDeviceIdentity.js <device_name> <usage_rating>');
    process.exit(1);
}
var deviceId = process.argv[2];
var usageRating = process.argv[3];

function printDeviceInfo(err, deviceInfo, res) 
{
    if (deviceInfo) 
    {
        deviceId = deviceInfo.deviceId;
        var devicekey = deviceInfo.authentication.symmetricKey.primaryKey;
        var deviceConnString = `HostName=${hostname};DeviceId=${deviceId};SharedAccessKey=${devicekey}`;

        var result = 
        {
            hostname: hostname,
            deviceId: deviceId,
            deviceKey: devicekey,
            connectionString: deviceConnString,
            usageRating: usageRating
        }

        var monitor = `iothub-explorer monitor-events ${deviceId} --login "${connectionString}"`;

        var dir = `${__dirname}\\..\\SimulatedDevices\\${result.deviceId}`;
        if (!fs.existsSync(dir)){
            fs.mkdirSync(dir);
        }
        
        fs.writeFile (`${dir}\\${result.deviceId}.json`, JSON.stringify(result), function(err) 
        {
            if (err) throw err;
            console.log(`Wrote to file: ${result.deviceId}.json`);
        });

        fs.writeFile (`${dir}\\monitor_${result.deviceId}.sh`, monitor, function(err) 
        {
            if (err) throw err;
            console.log(`Wrote to file: monitor_${result.deviceId}.sh`);
        });

        console.log(JSON.stringify(result));
    }
}

function getDeviceInfo(err, deviceInfo, res)
{
    if (err) 
    {
        registry.get(deviceId, printDeviceInfo);
    }
    else if (deviceInfo) 
    {
        printDeviceInfo(err, deviceInfo, res)
    }
}
 
registry.create({ deviceId: deviceId }, getDeviceInfo);