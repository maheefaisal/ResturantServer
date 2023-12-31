const express = require('express')
const app = express()
const cors = require('cors')
const jwt = require('jsonwebtoken');
const stripe = require('stripe')(process.env.PAYMENT_SECRET_KEY)
// Requiring Dot Env
require('dotenv').config()

const port = process.env.PORT || 5000
// middleware
app.use(cors())
app.use(express.json())

const verifyJWT = (req, res, next) => {
  const authorization = req.headers.authorization
  if (!authorization) {
    return res.status(401).send({ error: true, message: 'Unauthorized Access ' });
  }
  // Bearer Token
  const token = authorization.split(' ')[1]

  jwt.verify(token, process.env.ACCESSS_TOKEN, (err, decoded) => {
    if (err) {
      return res.status(401).send({ error: true, message: 'Unauthorized Access' })
    }
    req.decoded = decoded;
    next();
  })

}

const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const { default: Stripe } = require('stripe');
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
    const paymentCollection = client.db("resturantDB").collection("payments")

    app.post("/jwt", (req, res) => {
      const user = req.body;
      const token = jwt.sign(user, process.env.ACCESSS_TOKEN, { expiresIn: "1h" })
      res.send({ token })
    })

    const verifyAdmin = async (req, res, next) => {
      const email = req.decoded.email
      const query = { email: email }
      const user = await usersCollection.findOne(query)
      if (user?.email !== 'admin') {
        return res.status(403).send({ error: true, message: 'Forbidden Message' })
      }
      next();
    }


    //User Related apis
    app.get('/users', verifyJWT, verifyAdmin, async (req, res) => {
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

    app.get('/users/admin/:email', verifyJWT, async (req, res) => {
      const email = req.params.email
      if (req.decoded.email !== email) {
        res.send({ admin: false })
      }
      const query = { email: email }
      const user = await usersCollection.findOne(query);
      const result = { admin: user?.role === 'admin' }
      res.send(result)
    })

    app.patch("/users/admin/:id", async (req, res) => {
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
    app.post('/menu', verifyJWT, verifyAdmin, async (req, res) => {
      const newItem = req.body
      const result = await menuCollection.insertOne(newItem)
      res.send(result)
    })
    app.delete('/menu/:id', verifyJWT, verifyAdmin, async (req, res) => {
      const id = req.params.id
      const query = { _id: new ObjectId(id) }
      const result = await menuCollection.deleteOne(query)
      res.send(result)
    })
    // Reviews related apis
    app.get("/reviews", async (req, res) => {
      const result = await reviewCollection.find().toArray()
      res.send(result);
    })

    //Cart Collection
    app.get('/carts', verifyJWT, async (req, res) => {
      const email = req.query.email
      console.log(email)
      if (!email) {
        res.send([])
      }
      const decodedEmail = req.decoded.email;
      if (email !== decodedEmail) {
        return res.status(403).send({ error: true, message: 'Prohibited Access' })
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


    //Create Payment
    app.post('/create-payment-intent', verifyJWT, async (req, res) => {
      const { body } = req.body
      const amount = price * 100
      const paymentIntent = await stripe.paymentIntents.create({
        amount: amount,
        currency: 'usd',
        payment_method_types: ['card']
      })
      res.send({
        clientSecret: paymentIntent.client_secret
      })
    })

    //payment related api
    app.post('/payments', verifyJWT, async (req, res) => {
      const payment = req.body
      const result = await paymentCollection.insertOne(payment)
      res.send(result)
    })

    app.get('/admin-stats', verifyJWT, verifyAdmin, async (res, req) => {
      const users = await usersCollection.estimatedDocumentCount()
      const products = await menuCollection.estimatedDocumentCount()
      const orders = await paymentCollection.estimatedDocumentCount()

      //Using sum and group operator for obtaining sum of a field

      const payments = await paymentsCollection.find().toArray()
      const revenue = payments.reduce((sum, payment) => sum + payment.price, 0)

      res.send({
        revenue,
        users,
        products,
        orders
      })
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
