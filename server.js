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
    return res.status(400).send({
      error:"ERROR: Did not recieve expected parameters"
    });
  }
  const tree = req.body.tree;
  const quantity = req.body.quantity;
  
  const errors = await Database.createPurchaseAgreementRow(quantity,tree);
  if(!errors){
    return res.send(`Successfully created purchase agreement`);
  }
  if(errors === "ER_NO_REFERENCED_ROW_2"){
    return res.status(400).send({
      error:"ERROR: Invalid tree entered"
    });
  }
  return res.status(400).send({
    error:"ERROR: Unknown server error"
  });
});

/**
 * Creates a standalone purchase order
 * Expected body:
 *    quantity: number of trees promised over course of pa
 *    tree: what tree is being ordered
 */
app.post('/create-po',async (req,res)=>{
  if(!req.body.tree || req.body.quantity == null){
    return res.status(400).send({
      error:"ERROR: Did not recieve expected parameters"
    });
  }
  const tree = req.body.tree;
  const quantity = req.body.quantity;

  const errors = await Database.createPurchaseOrderRow(quantity,tree);
  if(!errors){
    return res.send(`Successfully created purchase order`);
  }
  if(errors === "ER_NO_REFERENCED_ROW_2"){
    return res.status(400).send({
      error:"ERROR: Invalid tree entered"
    });
  }
  return res.status(400).send({
    error:"ERROR: Unknown server error"
  });
});

/**
 * Creates a purchase order that is fullfilling a referenced purchase agreement
 * Expected body:
 *    quantity: number of trees promised over course of pa
 *    tree: what tree is being ordered
 *    pa: uuid of pa this po is being referenced to
 */
app.post('/create-po-under-pa',async (req,res)=>{
  if(!req.body.tree || req.body.quantity == null || !req.body.pa){
    return res.status(400).send({
      error:"ERROR: Did not recieve expected parameters"
    });
  }
  const tree = req.body.tree;
  const quantity = req.body.quantity;
  const pa = req.body.pa;

  const verifyPa = await Database.verifyPa(pa,tree);
  if(!verifyPa.valid){
    return res.status(400).send({
      error:verifyPa.errorMsg
    });
  }

  const errors = await Database.createPurchaseOrderRowWithPA(quantity,tree,pa);
  if(!errors){
    return res.send(`Successfully created purchase order under pa ` + pa);
  }
  return res.status(400).send({
    error:"ERROR: Unknown server error"
  });
});

/**
 * Recieves a standalone purchase order
 * Expected body:
 *   po: uuid of po that is being recieved
 */
app.put('/recieve-po', async (req,res) => {
  if(!req.body.po){
    return res.status(400).send({
      error:"ERROR: Did not recieve expected parameters"
    });
  }
  const verifyPo = await Database.verifyPo(req.body.po);
  if(!verifyPo.valid){
    return res.status(400).send({
      error:verifyPo.errorMsg
    });
  }

  const confirm = await Database.confirmReception(req.body.po);
  if(!confirm.success){
    return res.status(400).send({
      error:confirm.errorMsg
    });
  }

  const updated = await Database.updateTreeInventory(verifyPo.tree,verifyPo.quantity);
  if(!updated.success){
    return res.status(400).send({
      error:updated.errorMsg
    });
  }
  return res.send("Sucessfully recieved PO");
});

/**
 * Recieves a purchase order that should be under a referenced purchase agreement
 * Expected body:
 *   po: uuid of po that is being recieved (this po will need to be linked to a pa)
 */
app.put('/recieve-po-under-pa', async (req,res) => {
  if(!req.body.po){
    return res.status(400).send({
      error:"ERROR: Did not recieve expected parameters"
    });
  }
  const verifyPo = await Database.verifyPoUnderPa(req.body.po);
  if(!verifyPo.valid){
    return res.status(400).send({
      error:verifyPo.errorMsg
    });
  }

  const confirm = await Database.confirmReception(req.body.po);
  if(!confirm.success){
    return res.status(400).send({
      error:confirm.errorMsg
    });
  }

  const updated = await Database.updateTreeInventory(verifyPo.tree,verifyPo.quantity);
  if(!updated.success){
    return res.status(400).send({
      error:updated.errorMsg
    });
  }

  const grabPaHistory = await Database.grabPaHistory(verifyPo.parentPa);
  if(!grabPaHistory.valid){
    return res.status(400).send({
      error:grabPaHistory.errorMsg
    });
  }
  return res.send(grabPaHistory.purchaseHistory);
});



app.listen(port, () => {
  console.log(`Example app listening at http://localhost:${port}`);
  Database.tearDownDatabase();
  Database.createAllTables();
});