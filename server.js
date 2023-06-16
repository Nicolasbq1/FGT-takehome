import config from './config.json' assert { type: 'json' };
import express from 'express';
import mysql from 'mysql';

const app = express();
const port = 3000;

var con = mysql.createConnection(config);

app.get('/', (req, res) => {
  res.send('Hello World!');
});

app.listen(port, () => {
  con.connect(function(err) {
    if (err) throw err;
    console.log("Connected!");
  });
  console.log(`Example app listening at http://localhost:${port}`);
});