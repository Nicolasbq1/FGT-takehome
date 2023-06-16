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
                    + "CREATE TABLE purchase_agreements (uuid VARCHAR(255) NOT NULL PRIMARY KEY, quantity INTEGER NOT NULL, created_datetime DATETIME NOT NULL, tree VARCHAR(255) NOT NULL, FOREIGN KEY (tree) REFERENCES tree_inventory(name));"
                    + "CREATE TABLE purchase_orders (uuid VARCHAR(255) NOT NULL PRIMARY KEY, quantity INTEGER NOT NULL, created_datetime DATETIME NOT NULL, recieved_datetime DATETIME DEFAULT NULL,parent_pa VARCHAR(255) DEFAULT NULL, tree VARCHAR(255) NOT NULL, FOREIGN KEY (tree) REFERENCES tree_inventory(name), FOREIGN KEY (parent_pa) REFERENCES purchase_agreements(uuid));"
                    + 'INSERT INTO tree_inventory (name,current_inventory) VALUES ("Fir",1000);'
                    + `INSERT INTO purchase_agreements (uuid , quantity, created_datetime, tree) values ('TEST_UUID', 10000, '${getCurrentDatetime()}', 'Fir');`
                    + `INSERT INTO purchase_orders (uuid , quantity, created_datetime, tree) values ('STANDALONE_UUID', 1000, '${getCurrentDatetime()}', 'Fir');`
                    + `INSERT INTO purchase_orders (uuid , quantity, created_datetime, tree, parent_pa) values ('LINKED_UUID', 1000, '${getCurrentDatetime()}', 'Fir','TEST_UUID');`
                    + `INSERT INTO purchase_orders (uuid , quantity, created_datetime, recieved_datetime, tree) values ('COMPLETED_PO', 1000, '${getCurrentDatetime()}','${getCurrentDatetime()}', 'Fir');`
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

    async awaitedQuery(sql,args){
        return util.promisify(this.connection.query).call(this.connection,sql,args);
    }

    async createPurchaseAgreementRow(quantity, tree){
        let insertionQuery = `INSERT INTO purchase_agreements (uuid , quantity, created_datetime, tree) values (UUID(), ${quantity}, '${getCurrentDatetime()}', '${tree}');`;
        try{
            await this.awaitedQuery(insertionQuery);
            return null;
        }
        catch(error){  
            console.log("Error!: " + error.code);
            return error.code;
        }
    }

    async createPurchaseOrderRow(quantity, tree){
        let insertionQuery = `INSERT INTO purchase_orders (uuid , quantity, created_datetime, tree) values (UUID(), ${quantity}, '${getCurrentDatetime()}', '${tree}');`;
        try{
            await this.awaitedQuery(insertionQuery);
            return null;
        }
        catch(error){  
            console.log("Error!: " + error.code);
            return error.code;
        }
    }

    async createPurchaseOrderRowWithPA(quantity, tree, purchaseAgreementUUID){
        let insertionQuery = `INSERT INTO purchase_orders (uuid , quantity, created_datetime, tree, parent_pa) values (UUID(), ${quantity}, '${getCurrentDatetime()}', '${tree}', '${purchaseAgreementUUID}');`;
        try{
            await this.awaitedQuery(insertionQuery);
            return null;
        }
        catch(error){  
            console.log("Error!: " + error.code);
            console.log(error)
            return error.code;
        }
    }

    async verifyPa(purchaseAgreementUUID,tree){
        let selectionQuery = `SELECT * FROM purchase_agreements where uuid='${purchaseAgreementUUID}';`;
        try{
            const res = await this.awaitedQuery(selectionQuery);
            if(res.length === 0){
                return {
                    valid: false,
                    errorMsg: "Error: Purchase agreement does not exist"
                }
            }
            if(res[0].tree !== tree){
                return {
                    valid: false,
                    errorMsg: "Error: Tree for purchase order does not match parent tree"
                }
            }
            return {
                valid: true
            };
        }
        catch(error){  
            console.log("Error!: " + error.code);
            console.log(error)
            return {
                valid: false,
                errorMsg: "Unknown Error while validating purchase agreement"
            };
        }
    }

    async verifyPo(purchaseOrderUUID){
        let selectionQuery = `SELECT * FROM purchase_orders where uuid='${purchaseOrderUUID}';`;
        try{
            const res = await this.awaitedQuery(selectionQuery);
            if(res.length === 0){
                return {
                    valid: false,
                    errorMsg: "Error: Purchase order does not exist"
                }
            }
            if(res[0].recieved_datetime){
                return {
                    valid: false,
                    errorMsg: "Error: Purchase order has already been recieved"
                }
            }
            return {
                valid: true,
                tree: res[0].tree,
                quantity: res[0].quantity
            };
        }
        catch(error){  
            console.log("Error!: " + error.code);
            console.log(error)
            return {
                valid: false,
                errorMsg: "Unknown Error while validating purchase agreement"
            };
        }
    }

    async verifyPoUnderPa(purchaseOrderUUID){
        let selectionQuery = `SELECT * FROM purchase_orders where uuid='${purchaseOrderUUID}';`;
        try{
            const res = await this.awaitedQuery(selectionQuery);
            if(res.length === 0){
                return {
                    valid: false,
                    errorMsg: "Error: Purchase order does not exist"
                }
            }
            if(!res[0].parent_pa){
                return {
                    valid: false,
                    errorMsg: "Error: Purchase order has no parent pa"
                }
            }
            if(res[0].recieved_datetime){
                return {
                    valid: false,
                    errorMsg: "Error: Purchase order has already been recieved"
                }
            }
            return {
                valid: true,
                tree: res[0].tree,
                quantity: res[0].quantity,
                parentPa: res[0].parent_pa
            };
        }
        catch(error){  
            console.log("Error!: " + error.code);
            console.log(error)
            return {
                valid: false,
                errorMsg: "Unknown Error while validating purchase agreement"
            };
        }
    }

    async grabPaHistory(purchaseAgreementUUID){
        let selectionQuery = `SELECT * FROM purchase_orders where parent_pa='${purchaseAgreementUUID}';`;
        try{
            const res = await this.awaitedQuery(selectionQuery);
            if(res.length === 0){
                return {
                    valid: false,
                    errorMsg: "Error: No purchase orders under PA (should not be possibles since we have validated this PO)"
                }
            }
            return {
                valid: true,
                purchaseHistory: res
            };
        }
        catch(error){  
            console.log("Error!: " + error.code);
            console.log(error)
            return {
                valid: false,
                errorMsg: "Unknown Error while validating purchase agreement"
            };
        }
    }

    async confirmReception(purchaseOrderUUID){
        let updateQuery = `UPDATE purchase_orders SET recieved_datetime='${getCurrentDatetime()}' where uuid='${purchaseOrderUUID}';`;
        try{
            const res = await this.awaitedQuery(updateQuery);
            if(res.length === 0){
                return {
                    success: false,
                    errorMsg: "Error: Failed to update purchase order"
                }
            }
            return {
                success: true
            };
        }
        catch(error){  
            console.log("Error!: " + error.code);
            console.log(error)
            return {
                success: false,
                errorMsg: "Unknown Error while validating purchase agreement"
            };
        }
    }

    async updateTreeInventory(tree,quantity){
        let getTreeInv = `Select current_inventory FROM tree_inventory where name='${tree}'`
        try{
            // TODO: get tree inv and set new inventory in a single db transaction
            const res = await this.awaitedQuery(getTreeInv);
            if(res.length === 0){
                return {
                    success: false,
                    errorMsg: "Error: Could not find tree somehow (should be based of a foreign key field"
                }
            }
            const currInventory = res[0].current_inventory;

            let updateQuery = `UPDATE tree_inventory SET current_inventory=${currInventory+quantity} where name='${tree}';`;
            const treeRes = await this.awaitedQuery(updateQuery);
            if(treeRes.length === 0){
                return {
                    success: false,
                    errorMsg: "Error: Failed to tree inventory"
                }
            }
            return {
                success: true
            };
        }
        catch(error){  
            console.log("Error!: " + error.code);
            console.log(error)
            return {
                success: false,
                errorMsg: "Unknown Error while validating purchase agreement"
            };
        }
    }

}

function getCurrentDatetime(){
    const date = new Date();
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    const seconds = String(date.getSeconds()).padStart(2, '0');

    return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
}

export default new Database()