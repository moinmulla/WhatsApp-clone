//importing
import dotenv from "dotenv";
import express from "express";
import mongoose from "mongoose";
import Messages from "./dbMessages.js";
import Pusher from "Pusher";
import cors from "cors";

//app config
dotenv.config();
const app = express();
const port = process.env.PORT || 9000;

//middleware
app.use(express.json());

app.use(cors());

const connection_url =
  "mongodb+srv://admin-moinuddin:" +
  process.env.PWD +
  "@cluster0.xziyn.mongodb.net/whatsappDB?retryWrites=true&w=majority";

mongoose.connect(connection_url, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

const pusher = new Pusher({
  appId: process.env.APPID,
  key: process.env.KEY,
  secret: process.env.SECRET,
  cluster: "ap2",
  useTLS: true,
});

const db = mongoose.connection;

db.once("open", () => {
  console.log("DB connected");

  const msgCollection = db.collection("messagecontents");
  const changeStream = msgCollection.watch();

  changeStream.on("change", (change) => {
    if (change.operationType === "insert") {
      const messageDetails = change.fullDocument;
      pusher.trigger("messages", "inserted", {
        name: messageDetails.name,
        message: messageDetails.message,
        timestamp: messageDetails.timestamp,
        received: messageDetails.received,
      });
    } else {
      console.log("Error trigeering the pusher");
    }
  });
});

//api routes
app.get("/", (req, res) => res.status(200).send("Hello world"));

app.get("/messages/sync", (req, res) => {
  Messages.find((err, data) => {
    if (err) {
      res.status(500).send(err);
    } else {
      res.status(200).send(data);
    }
  });
});

app.post("/messages/new", (req, res) => {
  const dbMessage = req.body;

  Messages.create(dbMessage, (err, data) => {
    if (err) {
      res.status(500).send(err);
    } else {
      res.status(201).send(data);
    }
  });
});

//listen
app.listen(port, () => console.log(`Server running at localhost:${port}`));
