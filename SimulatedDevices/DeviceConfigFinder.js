/*
 * Using the device identity to locate the folder containing
 * the configuration
 */
function getdeviceConfig(deviceId)
{
	const fs = require('fs');

    /*
     * Checks that the device's folder containing its config
     * is in the same directory as this module.
     */
	const deviceDir = `${__dirname}\\${deviceId}`;
	if (!fs.existsSync(deviceDir)){
		console.log(`Folder with connection information for ${deviceId} doesn't exist`);
		process.exit(1);
	}

    /*
     * If it exists, it checks in the folder to see if the
     * json config file for the device is in it.
     */
	const deviceConfig = `${deviceDir}\\${deviceId}.json`;
	if (!fs.existsSync(deviceConfig)){
		console.log(`File with connection information for ${deviceId} doesn't exist in ${deviceDir}`);
		process.exit(1);
	}

    /*
     * Then imports it as a module and returns it
     */
	return require(deviceConfig);
}

/*
 * Exports the function as a module to be used by other js files.
 */
module.exports = {
	getdeviceConfig: getdeviceConfig
};