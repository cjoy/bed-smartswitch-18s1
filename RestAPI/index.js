const express = require('express');
const sql = require('mssql');

const dbConfig = {
    user: 'comp6324admin',
    password: 'COMP6324password',
    server: 'smartswitch.database.windows.net',
    database: 'smartswitch',
    options: {
        encrypt: true
    }
};

const app = express();

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

app.listen(3000, () => console.log('Smartswitch REST API listening on port 3000!'));
