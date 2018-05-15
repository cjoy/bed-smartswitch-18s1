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

if (process.argv.length > 2)
{
  console.log(process.argv[2]);
  querySQL(process.argv[2]);
}

rl.on('line', function(line){
  if (line === "q")
  {
    process.exit(0);
  }
  querySQL(line);
})

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