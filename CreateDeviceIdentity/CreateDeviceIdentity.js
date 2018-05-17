'use strict';

/*
 * Checking that the user has specified the deviceid to create and its usage rate
 */
if (process.argv.length <= 3)
{
    console.log('Usage: node CreateDeviceIdentity.js <device_name> <usage_rating>');
    process.exit(1);
}
var deviceId = process.argv[2];
var usageRating = process.argv[3];

/*
 * Retrieving the iot hub connection string defined in the iot jsonConfig
 * file in the CreateDeviceIdentity folder.
 */
const hubConfig = require(`../RestAPI/AzureConfig`);
const connectionString = hubConfig.IoTHubConnectionString;

/*
 * Importing the iothub and registry modules for connecting to the azure
 * iot hub with the connection string.
 */
const fs = require('fs');
const iothub = require('azure-iothub');
const registry = iothub.Registry.fromConnectionString(connectionString);

/*
 * This function creates a new folder in the SimulatedDevices directory
 * where the folder created is named according to the deviceid. It then
 * stores the json configuration of the device's id and connection string
 * and its energy usage so that it can be run by the SimulateDevice.js file.
 */
function saveToDeviceFolder(deviceId, configString)
{
    /*
     * First check that the directory exists, and if it doesn't then
     * create it named with the device id
     */
    var dir = `${__dirname}\\..\\SimulatedDevices\\${deviceId}`;
    if (!fs.existsSync(dir)){
        fs.mkdirSync(dir);
    }
    
    /*
     * Now write the config string to a json file named according to
     * the device id
     */
    fs.writeFile (`${dir}\\${deviceId}.json`, configString, function(err) 
    {
        if (err) throw err;
        console.log(`Wrote to file: ${deviceId}.json`);
    });
    
    /*
     * Writing out the command for monitoring the device's events from iothub-explorer
     */
    var monitor = `iothub-explorer monitor-events ${deviceId} --login "${connectionString}"`;
    
    /*
     * Writing that command to a shell script to make it easier to call for monitoring
     * the device's messages
     */
    fs.writeFile (`${dir}\\monitor_${deviceId}.sh`, monitor, function(err) 
    {
        if (err) throw err;
        console.log(`Wrote to file: monitor_${deviceId}.sh`);
    });
}

/*
 * Takes the device info for the device returned from azure and 
 * creates a config list for the device specifying the connection
 * string and the usage rate and then saves it into its designated
 * folder.
 */
function saveDeviceInfo(err, deviceInfo, res) 
{
    if (deviceInfo) 
    {
        deviceId = deviceInfo.deviceId;
        var devicekey = deviceInfo.authentication.symmetricKey.primaryKey;
        var deviceConnString = `HostName=${hostname};DeviceId=${deviceId};SharedAccessKey=${devicekey}`;

        var jsonConfig = 
        {
            hostname: hostname,
            deviceId: deviceId,
            deviceKey: devicekey,
            connectionString: deviceConnString,
            usageRating: usageRating
        }
        var configString = JSON.stringify(jsonConfig, null, 4);
        
        saveToDeviceFolder(deviceId, configString);

        console.log(configString);
    }
}

/*
 * Tries to create the device in azure if it doesn't yet exist. 
 * It will then retrieve the info for that device and pass it
 * to the function that saves it as a config file
 */
function getDeviceInfo(err, deviceInfo, res)
{
    if (err) 
    {
        registry.get(deviceId, saveDeviceInfo);
    }
    else if (deviceInfo) 
    {
        saveDeviceInfo(err, deviceInfo, res)
    }
}
 
registry.create({ deviceId: deviceId }, getDeviceInfo);