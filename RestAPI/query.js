const sql = require('mssql')

const dbConfig = {
  user: "comp6324admin",
  password: "COMP6324password",
  server: "smartswitch.database.windows.net",
  database: "smartswitch",
  options: {
    encrypt: true
  }
};

(async function updateStatus() {
    try {
        let pool = await sql.connect(dbConfig)
        let result1 = await pool.request()
			.input('deviceId', sql.VarChar, process.argv[2])
			.input('newStatus', sql.VarChar, process.argv[3])
			.query(`update room_devices set status=@newStatus where deviceId=@deviceId`)
            
        console.dir(result1)
    
        // Stored procedure
        
        // let result2 = await pool.request()
        //     .input('input_parameter', sql.Int, value)
        //     .output('output_parameter', sql.VarChar(50))
        //     .execute('procedure_name')
        
        console.dir(result2)
    } catch (err) {
        // ... error checks
    }
})()
 
sql.on('error', err => {
    // ... error handler
})




// const sql = require("mssql");

// const dbConfig = {
//   user: "comp6324admin",
//   password: "COMP6324password",
//   server: "smartswitch.database.windows.net",
//   database: "smartswitch",
//   options: {
//     encrypt: true
//   }
// };

// if (process.argv.length > 3)
// {
//   	console.log(process.argv[2]);
//  	deviceId = process.argv[2];
// 	newStatus = process.argv[3];
// 	console.log("Device " + deviceId + " switched to " + newStatus);
// 	var query = "update room_devices set status='"+newStatus+"' where deviceId='"+deviceId+"'";
// 	updateSQL(query);
// }

// function updateSQL(query)
// {
// 	sql.connect(dbConfig, function (err) {
//         if (err) console.log(err);
//         var request = new sql.Request();
// 		request.query(query, function (err, recordset) 
// 		{
//             if (err) console.log(err)
// 			console.log(recordset);
// 			sql.close();
// 		});
// 	});
// }

// function querySQL(query)
// {
//   sql
//     .connect(dbConfig)
//     .then(pool => {
//       return pool.request().query(query);
//     })
//     .then(result => {
//       console.log(result.recordset);
//       sql.close();
//     })
//     .catch(err => {
//       console.log("Error occurred")
//       sql.close();
// 	});
// }

/*
 * Exports the function as a module to be used by other js files.
 */
module.exports = {
	updateSQL: updateSQL,
	querySQL: querySQL
};