const deviceId = 'Device1';
const interval = 60000;
var usage = 1; // W/s
var status = false; // Off

var connectCallback = function () 
{
    // Create a message and send it to the IoT Hub every second
    setInterval(function()
    {
        var timeNow = new Date();
        var year = timeNow.getFullYear();
        var month = timeNow.getMonth() + 1;
		var day = timeNow.getDate();
		var hour = timeNow.getHours();
		var minute = timeNow.getMinutes();

		var data = 
		{
			year: year,
			month: month,
			day: day,
			hour: hour,
			minute: minute,
			deviceId: deviceId,
			status: status,
			usage: usage,
		}

        var dataString = JSON.stringify(data);
        console.log("Sending message: " + data);
    }, 5000);
};

connectCallback();