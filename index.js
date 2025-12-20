const express = require('express');
const cors = require('cors');
require('dotenv').config();

const port = process.env.PORT || 3000;
const app = express();

app.use(cors());
app.use(express.json());


const { MongoClient, ServerApiVersion } = require('mongodb');
const admin = require("firebase-admin");

const decoded = Buffer.from(process.env.FB_SERVICE_KEY, 'base64').toString('utf8')
const serviceAccount = JSON.parse(decoded);

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});
 

// const serviceAccount = require("./firebase-admin-key.json");


const uri = `mongodb+srv://clubsphere:123456clubsphere@cluster0.by0ybnd.mongodb.net/?appName=Cluster0`;


const verifyFBToken = async (req, res, next) => {
    const authHeader = req.headers.authorization;
    if (!authHeader) {
        return res.status(401).send({ message: 'Unauthorized access' });
    }

    try {
        const token = authHeader.split(' ')[1];
        const decodedUser = await admin.auth().verifyIdToken(token);
        console.log('Decoded User:', decodedUser);
        req.decodedEmail = decodedUser.email;
        next();
    } catch (error) {
        return res.status(401).send({ message: 'Unauthorized access' });    
    }
}

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  }
});

async function run() {
  try {
    // Connect the client to the server	(optional starting in v4.7)
    await client.connect();

    const database = client.db("clubSphereDB");
    const userCollection = database.collection("users");
    const requestCollection = database.collection("request");
  
    app.post('/users', async (req, res) => {
        const userInfo = req.body;
        userInfo.role = 'donor';
        userInfo.status = 'active'; 
        userInfo.createdAt = new Date();
        try {
            const result = await userCollection.insertOne(userInfo);
            console.log('User data inserted:', result);
            res.send(result);
        } catch (error) {
            console.error('Error inserting user data:', error);
            res.status(500).send({ message: 'Error inserting user data', error });
        }
    });

    app.get('/users', verifyFBToken, async (req, res) => {
        const result = await userCollection.find({}).toArray();
        res.status(200).send(result);  
    });

    app.get('/users/role/:email', async (req, res) => {
        const {email} = req.params

        const query = { email: email };
        const user = await userCollection.findOne(query);
        
        res.send(user);
    });

    app.get('/users/:email', async (req, res) => {
        const {email} = req.params.email;
        const query = { email: email };
        const result = await userCollection.findOne(query);
        res.send(result);  
    });

    // add requests API
    app.post('/requests', verifyFBToken, async (req, res) => {
        const requestData = req.body;
        requestData.createdAt = new Date();
        const result = await requestCollection.insertOne(requestData);
        res.send(result);
    });

    app.get('/manager/clubs/:email', async (req, res) => {
        const {email} = req.params.email;
        const query = { email: email };
        const result = await clubCollection.find(query).toArray();
        res.send(result);
        console.log(result);
    });




    // Send a ping to confirm a successful connection
    await client.db("admin").command({ ping: 1 });
    console.log("Pinged your deployment. You successfully connected to MongoDB!");
  } finally {
    // Ensures that the client will close when you finish/error
    //await client.close();
  }
}
run().catch(console.dir);


app.get('/', (req, res) => {
    res.send('ClubSphere Backend is running');
});

app.listen(port, () => {
    console.log(`Server is running on port: ${port}`);
});