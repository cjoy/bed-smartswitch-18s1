const IoTHubConfig = 
{
	hostname: "SmartSwitch.azure-devices.net",
	sharedkey: "8Wrt9USCDDOQg/r4pK/IpZH6iRibnNHpv0wZ+GkL22M=",
	sharedkeyname: "iothubowner",
};

const IoTHubConnectionString = `HostName=${IoTHubConfig.hostname};SharedAccessKeyName=${IoTHubConfig.sharedkeyname};SharedAccessKey=${IoTHubConfig.sharedkey}`

const dbConfig = 
{
	user: "comp6324admin",
	password: "COMP6324password",
	server: "smartswitch.database.windows.net",
	database: "smartswitch",
	options: {
		encrypt: true
	}
};

module.exports = {
	dbConfig,
	IoTHubConfig,
	IoTHubConnectionString
}