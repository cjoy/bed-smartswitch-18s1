const sql = require("mssql");
var readline = require('readline');

const dbConfig = {
  user: "comp6324admin",
  password: "COMP6324password",
  server: "smartswitch.database.windows.net",
  database: "smartswitch",
  options: {
    encrypt: true
  }
};

var rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
  terminal: false
});

if (process.argv.length > 3)
{
  	console.log(process.argv[2]);
 	deviceId = process.argv[2];
	newStatus = process.argv[3];
	console.log("Device " + deviceId + " switched to " + newStatus);
	var query = "update room_devices set status='Off' where deviceId='Device7'";
	updateSQL(dbConfig, query);
}

function updateSQL(dbConfig, query)
{
	sql.connect(dbConfig, function (err) {
        if (err) console.log(err);
        var request = new sql.Request();
		request.query(query, function (err, recordset) 
		{
            if (err) console.log(err)
            console.log(recordset);
        });
    });
}

function querySQL(query)
{
  sql
    .connect(dbConfig)
    .then(pool => {
      return pool.request().query(query);
    })
    .then(result => {
      console.log(result.recordset);
      sql.close();
    })
    .catch(err => {
      console.log("Error occurred")
      sql.close();
	});
}

/*
 * Exports the function as a module to be used by other js files.
 */
module.exports = {
	updateSQL: updateSQL,
	querySQL: querySQL
};