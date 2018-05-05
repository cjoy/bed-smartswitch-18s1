'use strict';

var iothub = require('azure-iothub');
var connectionString = 'HostName=TestIoT6324.azure-devices.net;DeviceId=TestIoTEdge;SharedAccessKey=UomAwcESKcNRRWwsH+6GKDrXXup9mNDz3GFeWyMx3T4=';
var registry = iothub.Registry.fromConnectionString(connectionString);

var device = 
{
    deviceId: 'myFirstNodeDevice'
}
 
registry.create(device, function(err, deviceInfo, res) 
{
    if (err) 
    {
      registry.get(device.deviceId, printDeviceInfo);
    }
    if (deviceInfo) 
    {
      printDeviceInfo(err, deviceInfo, res)
    }
});
  
function printDeviceInfo(err, deviceInfo, res) 
{
    if (deviceInfo) 
    {
        console.log('Device ID: ' + deviceInfo.deviceId);
        console.log('Device key: ' + deviceInfo.authentication.symmetricKey.primaryKey);
    }
}