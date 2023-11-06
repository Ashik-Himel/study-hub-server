const express = require('express');
const cors = require('cors');
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const jwt = require('jsonwebtoken');
const cookieParser = require('cookie-parser');
require('dotenv').config();

const app = express();
const port = process.env.PORT || 5001;

app.use(express.json());
app.use(cors({
  origin: [
    // 'http://localhost:5173',
    'https://study-hub-1.web.app'
  ],
  credentials: true
}));
app.use(cookieParser());

const verify = (req, res, next) => {
  const token = req.cookies?.token;
  if (!token) return res.sendStatus(401).send("Unauthorized access");

  jwt.verify(token, process.env.JWT_SECRET, (err, decode) => {
    if (err || req.headers?.authorization !== decode?.email) return res.sendStatus(403).send("Forbidden");

    next();
  })
}


const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASSWORD}@cluster0.xeaidsx.mongodb.net/?retryWrites=true&w=majority`;

const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  }
});
async function run() {
  try {
    const database = client.db('study-hub');
    const assignmentCollection = database.collection("assignments");
    const submittedAssignmentCollection = database.collection("submitted-assignments");

    app.post('/login', (req, res) => {
      const token = jwt.sign(req.body, process.env.JWT_SECRET, {expiresIn: "3d"});
      res.cookie("token", token, {
        httpOnly: true,
        secure: true,
        sameSite: "none",
        maxAge: 3 * 24 * 60 * 60 * 1000
      }).sendStatus(200).send("Ok");
    })
    app.get('/logout', verify, (req, res) => {
      res.clearCookie('token').sendStatus(200).send("Ok")
    })

    app.get('/assignments', async(req, res) => {
      let filter = {}
      if (req.query.level !== "All") {
        filter = {difficultyLevel: req.query.level};
      }
      const result = await assignmentCollection.find(filter).project({_id: 1, thumbnail: 1, title: 1, marks: 1, difficultyLevel: 1, author: 1}).toArray();
      res.send(result);
    })
    app.get('/assignments/:id', verify, async(req, res) => {
      const filter = {_id: new ObjectId(req.params.id)}
      const result = await assignmentCollection.findOne(filter);
      res.send(result);
    })
    app.post('/assignments', verify, async(req, res) => {
      const result = await assignmentCollection.insertOne(req.body);
      res.send(result);
    })
    app.put('/assignments/:id', verify, async(req, res) => {
      const id = req.params.id;
      const filter = {_id: new ObjectId(id)};
      const body = {
        $set: req.body
      }
      const result = await assignmentCollection.updateOne(filter, body);
      res.send(result);
    })
    app.delete('/assignments/:id', verify, async(req, res) => {
      const id = req.params.id;
      const filter = {_id: new ObjectId(id)};
      const result = await assignmentCollection.deleteOne(filter);
      res.send(result);
    })

    app.get('/submitted-assignments', verify, async(req, res) => {
      const filter = {status: "pending"};
      const result = await submittedAssignmentCollection.find(filter).toArray();
      res.send(result);
    })
    app.post('/submitted-assignments', verify, async(req,res) => {
      const result = await submittedAssignmentCollection.insertOne(req.body);
      res.send(result);
    })
    app.put('/submitted-assignments', verify, async(req, res) => {
      const id = req.query.id;
      const filter = {_id: new ObjectId(id)}
      const body = {
        $set: req.body
      }
      const result = await submittedAssignmentCollection.updateOne(filter, body)
      res.send(result);
    })

    app.get('/my-assignments', verify, async(req, res) => {
      const email = req.headers.authorization;
      const filter = {authorEmail: email}
      const result = await submittedAssignmentCollection.find(filter).toArray();
      res.send(result);
    })

    await client.db("admin").command({ ping: 1 });
    console.log("MongoDB Connected !!!");
  } finally {
    // await client.close();
  }
}
run().catch(console.dir);


app.get('/', (req, res) => {
  res.send("Welcome to StudyHub's server !!!");
})
app.listen(port, () => {
  console.log(`Server is running in http://localhost:${port} !!!`);
})

module.exports = app;