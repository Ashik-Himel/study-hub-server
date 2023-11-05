const express = require('express');
const cors = require('cors');
const { MongoClient, ServerApiVersion } = require('mongodb');
const jwt = require('jsonwebtoken');
const cookieParser = require('cookie-parser');
require('dotenv').config();

const app = express();
const port = process.env.PORT || 5001;

app.use(express.json());
app.use(cors({
  origin: ['http://localhost:5173', 'https://study-hub-1.web.app'],
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

    app.post('/login', (req, res) => {
      const token = jwt.sign(req.body, process.env.JWT_SECRET, {expiresIn: "3d"});
      res.cookie("token", token, {
        httpOnly: true,
        secure: false,
        // sameSite: "none",
        maxAge: 3 * 24 * 60 * 60 * 1000
      }).sendStatus(200).send("Ok");
    })
    app.get('/logout', (req, res) => {
      res.clearCookie('token').sendStatus(200).send("Ok")
    })

    app.post('/assignments', verify, async(req, res) => {
      const result = await assignmentCollection.insertOne(req.body);
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