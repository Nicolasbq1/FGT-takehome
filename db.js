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

    createAllTables(){
        this.connection.query("CREATE DATABASE fgt_db", (err,res) => {
            if (err) throw err;
            this.connection = mysql.createConnection({
                ...config,
                multipleStatements: true,
                database: "fgt_db"
            });
            const overridenConnection = this.connection;
            overridenConnection.connect(function(err) {
                if (err) throw err;
                var create_tables = 
                    "CREATE TABLE tree_inventory (name VARCHAR(255) NOT NULL PRIMARY KEY, current_inventory INTEGER DEFAULT 0 NOT NULL);"
                    + "CREATE TABLE purchase_agreements (uuid BINARY(16) NOT NULL PRIMARY KEY, quantity_ordered INTEGER NOT NULL, created_datetime DATETIME NOT NULL, tree VARCHAR(255) NOT NULL REFERENCES tree_inventory (name));"
                    + "CREATE TABLE purchase_orders (uuid BINARY(16) NOT NULL PRIMARY KEY, quantity INTEGER NOT NULL, created_datetime DATETIME NOT NULL, recieved_datetime DATETIME,parent_pa BINARY(16) REFERENCES purchase_agreements (uuid), tree VARCHAR(255) NOT NULL REFERENCES tree_inventory (name));"
                    + 'INSERT INTO tree_inventory (name,current_inventory) VALUES ("Fir",0)'
                    overridenConnection.query(create_tables, (err,res) => {
                    if (err) throw err;
                    console.log("Tables created");
                });
            });
        });
    }

    // PURELY FOR TESTING PURPOSES WOULD NOT EXIST ON ANY PRODUCTION CODE
    tearDownDatabase(){
        this.connection.query("DROP DATABASE IF EXISTS fgt_db",(err,res) => {
            if (err) throw err;
            console.log("Succsefully dropped fgt_db if it existed");
        });
    }

}

export default new Database()