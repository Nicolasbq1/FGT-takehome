# FGT-takehome

## Set up
This project was developed on a windows environment so for demoing purposes this will be the preferred enviornment although most of the tools set up can also be set up in unix based environments (Unix, macOS).

We will be using Windows CMD

1) set up node on whatever environment you will be running the server on. The version used for this project was v18.16.0.
For windows the download for the installer can be found here: https://nodejs.org/en/download
For unix systems you may use the above installer or just use whatever package manager you prefer.

NOTE: you can probably use the LTS fine, but if something isn't working you may need to ensure you are using the correct version this project was developed on

2) Once you have node installed make sure to install the appropriate packages for this project.

`"body-parser": "^1.20.2",
"express": "^4.18.2",
"mysql": "^2.18.1"`

this project used the above packages and version.

These can be installed using

`npm install <pacakge_name>`

3) We are now ready to run the server but it will be attempting to connect to a database where the connection is configured in a config file. We wil be hosting this database locally

Download mysql community:
https://dev.mysql.com/downloads/

Run the full install and set up a local database so that the server can connect to it. (do not use a sensitive password this is just a demo)

Once you have mysql set up, create a file in the root directory of the project called `config.json`

`{
    "host": "yourhostname",
    "user": "yourusername",
    "password": "yourpassword"
}`

Populate the json file with the above schema, replacing your own details into the configuration.

4) Great! now everything is ready to run, we can run the server with

`node server.js`

5) now that the server is running we can check our database with some queries and we see that the demo is set up with some prepopulated data into our tables

some example queries so you can see what is going on in the mysql workbecnh

`SELECT * FROM fgt_db.purchase_agreements`
`SELECT * FROM fgt_db.purchase_orders`
`SELECT * FROM fgt_db.tree_inventory`

6) The final set up step is to set up postman I have a collection of premade endpoint hits that will hit the local server. This collection can be found here:

https://speeding-resonance-671438.postman.co/workspace/New-Team-Workspace~a1b70d3f-fe20-4741-bf55-6339e9fe67d0/collection/12158489-88610cce-7739-4058-9712-a1d9a5539243?action=share&creator=12158489

You can download postman to your computer from here (you will need to if you want to actually use the endpoint)
https://www.postman.com/downloads/

I will be emailing direct access to this collection to reviewers from FGT as well

## Solution

Now that you have everything set up you can use the postman endpoint to test the solution as you please. Please leave the original Test calls I set up as is since they are the testing set up for this project. Feel free to duplicate the base calls I set up in the root of the postman collection to test as you please.

NOTE: Whenever the server restarts the full database is torn down and reset, this made it easier to develop in a short time frame

The following is the functionality I created:

`POST /create-pa`

Which expects a body:

`
{
    quantity: number of trees promised over course of pa
    tree: what tree is being ordered
}
`

If a tree that is not in the tree inventory table is not entered then the call will fail. Otherwise a PA will be created for quantity for tree.

NOTE: by default only one tree is in our database. there is not endpoint to add trees so there are two ways to do so:
1) use your mysql workbench instance to manually insert one while the db is running
2) add another insertion into the createTables query in db.js. this way the db will always start up with the entry you want.

`POST /create-po`

Which expects a body:

`
{
    quantity: number of trees promised over course of pa
    tree: what tree is being ordered
}
`

this endpoint is used to create a standalone Po.
If tree is not in the tree inventory the call will fail

`POST /create-po-under-pa`

Which expects a body:

`
{
    quantity: number of trees promised over course of pa
    tree: what tree is being ordered
    pa: uuid of pa this is being attached to
}
`

this endpoint will fail if the pa listed does not exist on our table as there is a foreign key relationship between pos and pas
It will also fail if the tree species we are setting does not match the purchase agreement tree species


`PUT /recieve-po`

Which expects a body:

`
{
    po: uuid of po being recieved
}
`

this endpoint will mark that po as recieved and update our tree inventory. It does so regardless of whether or not the po is attached to a pa or not. If the po does not exists it will return an error. If we attempt to recieve an already recieved order there is an error

`PUT /recieve-po-under-pa`

Which expects a body:

`
{
    po: uuid of po being recieved (this po will need to have a parent pa)
}
`

this endpoint will mark po as recieved and update our tree inventory. It will only accept pos that have a parent pa. It will finally return the updated po history for the given pa


Schema:
the following is the schema for the three tables i set up:

`
    CREATE TABLE tree_inventory (
        name VARCHAR(255) NOT NULL PRIMARY KEY, 
        current_inventory INTEGER DEFAULT 0 NOT NULL
    );
    
    CREATE TABLE purchase_agreements (
        uuid VARCHAR(255) NOT NULL PRIMARY KEY, 
        quantity INTEGER NOT NULL, 
        created_datetime DATETIME NOT NULL, 
        tree VARCHAR(255) NOT NULL, 
        FOREIGN KEY (tree) REFERENCES tree_inventory(name)
    );

    CREATE TABLE purchase_orders (
        uuid VARCHAR(255) NOT NULL PRIMARY KEY, 
        quantity INTEGER NOT NULL, 
        created_datetime DATETIME NOT NULL, 
        recieved_datetime DATETIME DEFAULT NULL,
        parent_pa VARCHAR(255) DEFAULT NULL, 
        tree VARCHAR(255) NOT NULL, 
        FOREIGN KEY (tree) REFERENCES tree_inventory(name), 
        FOREIGN KEY (parent_pa) REFERENCES purchase_agreements(uuid))
`
Some design decisions that were made:
1) kept the tables as minimal as possible
2) Decided to use Varchar for uuids and not include a uuid in tree_inventory to make life a little easier in this demo. In a production database these should be of type uuid()
3) purchase orders also have a tree field to track tree type of standalone orders
4) recieved_datetime acts as a flag of order completion. If it is null the order has not yet been recieved
5) foreign key constraint from purchase orders to purchase agreements that is nullable for standalone orders
6) foreign key constraint from both purchase tables to tree_inventory to ensure purchases are for trees that we support

## Testing
To test our implementation we have a simple testing suite in our postman collection under the test folder. running these will test around 80% of all code lines and will make sure very endpoint is behaving appropriately from a contract perspective. Database insertions and updates are detected as valid by our own code (if they failed a 400 would be returned) but there is no true checking if evrything done correctly unfortunately. Use the mysql workbench and you can verify insertions and updates are happening appropriately

## Improvements

Unfortunately the time constarints of the project limited the scope of what could be done. There are a few key items I would improve on the project if I had more time:

1) database migrations for setting up db schemas. This is overall a good thing to have on production code but also it cleans up how we are currently standing up the database which is very much a demo friendly set up. This way we could have schematized files abstracetd out of the code that we can update and then run an up migration anytime we want to stand up a test database
2) database testing. Right now our CRUD operations are not being directly tested. I would set up some sort of jest testing suite that would instiate local db instances (above db migrations would make this a lot easier). Once these are set up I would directly test all our database helpers to make sure that they are each doing the appropriate thing

## ASSUMPTIONS

The following are assumptions I made in the implementation that could not be disambiguated from the prompt:

1) Purchase ordres and agreements are refereing to one specific tree species that we take inventory of
2) purchase orders that are under agreements must have the same tree
3) the recieve-po action allows us to recieve any po whether standalone or not
4) the recieve-po-under-pa is identical to recieve-po except that only pos under pas can be recieved and a history of all pos will be returned