const express = require('express')
const app = express()
const cors = require('cors')
// Requiring Dot Env
require('dotenv').config()

const port = process.env.PORT || 5000
// middleware
app.use(cors())
app.use(express.json())


const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const uri = `mongodb+srv://${process.env.DB_USERNAME}:${process.env.DB_PASSWORD}@cluster0.3igul5k.mongodb.net/?retryWrites=true&w=majority`;

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

    const menuCollection = client.db("resturantDB").collection("menu")
    const usersCollection = client.db("resturantDB").collection("users")
    const reviewCollection = client.db("resturantDB").collection("reviews")
    const cartCollection = client.db("resturantDB").collection("carts")

    //User Related apis
    app.get('/users', async (req, res) => {
      const result = await usersCollection.find().toArray()
      res.send(result)
    })
    app.post('/users', async (req, res) => {
      const user = req.body;
      console.log(user)
      const query = { email: user.email }
      const existingUser = await usersCollection.findOne(query)
      if (existingUser) {
        return res.send({ message: 'user exist' })
      }
      const result = await usersCollection.insertOne(user);

      res.send(result);
    })

    app.patch("users/admin/:id", async (req, res) => {
      const id = req.params.id;
      const filter = { _id: new ObjectId(id) }
      const updateDoc = {
        $set: {
          role: 'admin'
        }
      }
      const result = await usersCollection.updateOne(filter, updateDoc)
      res.send(result)
    })


    //Menu related apis
    app.get("/menu", async (req, res) => {
      const result = await menuCollection.find().toArray()
      res.send(result);
    })
    // Reviews related apis
    app.get("/reviews", async (req, res) => {
      const result = await reviewCollection.find().toArray()
      res.send(result);
    })

    //Cart Collection
    app.get('/carts', async (req, res) => {
      const email = req.query.email
      console.log(email)
      if (!email) {
        res.send([])
      }
      const query = { email: email }
      const result = await cartCollection.find(query).toArray()
      res.send(result)
    })
    app.post('/carts', async (req, res) => {
      const item = req.body;
      console.log(item)
      const result = await cartCollection.insertOne(item)
      res.send(result);
    })

    app.delete('/carts/:id', async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) }
      const result = await cartCollection.deleteOne(query)
      res.send(result)

    })
    // Send a ping to confirm a successful connection
    await client.db("admin").command({ ping: 1 });
    console.log("Pinged your deployment. You successfully connected to MongoDB!");
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);


app.get('/', (req, res) => {
  res.send('Resturant Server Is Onnn...')
})

app.listen(port, () => {
  console.log('This is from the other side')
})
