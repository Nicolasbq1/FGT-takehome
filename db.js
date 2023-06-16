import config from './config.json' assert { type: 'json' };
import mysql from 'mysql';

class Database{

    constructor(){
        this.connection = mysql.createConnection(config);
        this.connection.connect(function(err) {
            if (err) throw err;
            console.log("Connected!");
          });
    }

}

export default new Database()