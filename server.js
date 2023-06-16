import express from 'express';
import bodyParser from 'body-parser';
import Database from './db.js';

const app = express();
const port = 3000;

app.use(bodyParser.json());

app.get('/', (req, res) => {
  res.send('Hello World!');
});

/**
 * Creates a purchase agreement that needs to be filled by purchase orders
 * Expected body:
 *    quantity: number of trees promised over course of pa
 *    tree: what tree is being ordered
 */
app.post('/create-pa', async (req,res) => {
  if(!req.body.tree || req.body.quantity == null){
    res.status(400).send({
      error:"ERROR: Did not recieve expected parameters"
    });
  }
  const errors = await Database.createPurchaseAgreementRow(req.body.quantity,req.body.tree);
  if(!errors){
    res.send(`Successfully created purchase agreement`);
  }
  if(errors === "ER_NO_REFERENCED_ROW_2"){
    console.log("err detected")
    res.status(400).send({
      error:"ERROR: Invalid tree entered"
    });
  }
  res.status(400).send({
    error:"ERROR: Unknown server error"
  });
});

/**
 * Creates a standalone purchase order
 * Expected body:
 *    quantity: number of trees promised over course of pa
 *    tree: what tree is being ordered
 */
app.post('/create-po',(req,res)=>{

});

/**
 * Creates a purchase order that is fullfilling a referenced purchase agreement
 * Expected body:
 *    quantity: number of trees promised over course of pa
 *    tree: what tree is being ordered
 *    pa: uuid of pa this po is being referenced to
 */
app.post('/create-po-under-pa',(req,res)=>{

});

/**
 * Recieves a standalone purchase order
 * Expected body:
 *   po: uuid of po that is being recieved
 */
app.put('/recieve-po',(req,res)=>{

});

/**
 * Recieves a purchase order that should be under a referenced purchase agreement
 * Expected body:
 *   po: uuid of po that is being recieved (this po will need to be linked to a pa)
 */
app.put('/recieve-po-under-pa',(req,res)=>{

});

app.listen(port, () => {
  console.log(`Example app listening at http://localhost:${port}`);
  Database.tearDownDatabase();
  Database.createAllTables();
});