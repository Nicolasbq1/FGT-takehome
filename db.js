import config from './config.json' assert { type: 'json' };
import util from 'util';
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
                    + "CREATE TABLE purchase_agreements (uuid VARCHAR(255) NOT NULL PRIMARY KEY, quantity_ordered INTEGER NOT NULL, created_datetime DATETIME NOT NULL, tree VARCHAR(255) NOT NULL, FOREIGN KEY (tree) REFERENCES tree_inventory(name));"
                    + "CREATE TABLE purchase_orders (uuid VARCHAR(255) NOT NULL PRIMARY KEY, quantity INTEGER NOT NULL, created_datetime DATETIME NOT NULL, recieved_datetime DATETIME,parent_pa VARCHAR(255), tree VARCHAR(255) NOT NULL, FOREIGN KEY (tree) REFERENCES tree_inventory(name), FOREIGN KEY (parent_pa) REFERENCES purchase_agreements(uuid));"
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

    getCurrentDatetime(){
        const date = new Date();
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        const hours = String(date.getHours()).padStart(2, '0');
        const minutes = String(date.getMinutes()).padStart(2, '0');
        const seconds = String(date.getSeconds()).padStart(2, '0');

        return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
    }

    async awaitedQuery(sql,args){
        return util.promisify(this.connection.query).call(this.connection,sql,args);
    }

    async createPurchaseAgreementRow(quantity, tree){
        let insertionQuery = `INSERT INTO purchase_agreements (uuid , quantity_ordered, created_datetime, tree) values (UUID(), ${quantity}, '${this.getCurrentDatetime()}', '${tree}');`;
        // const res = await this.connection.query(insertionQuery,(err,res)=>{
        //     if(err){
        //         console.log("Error occured");
        //         throw err.code;
        //     }
        //     console.log("Created purchase agreement succesfully!");
        //     return null;
        // })
        try{
            await this.awaitedQuery(insertionQuery);
            return null;
        }
        catch(error){  
            console.log("Error!: " + error.code);
            return error.code;
        }
    }

}

export default new Database()