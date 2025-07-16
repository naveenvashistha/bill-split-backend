import dotenv from "dotenv";
dotenv.config();
import express from "express";
const app = express();
import cors from "cors";
import mongoose from "mongoose";
import User from "./model/user.model.js";
import nodemailer from "nodemailer";
import { nanoid } from "nanoid";
import session from "express-session";
import crypto from "crypto";
import MongoStore from "connect-mongo";

mongoose.set('strictQuery', true);

mongoose.connect("mongodb+srv://" + process.env.MONGO_USERNAME + ":" + process.env.MONGO_PASSWORD + "@cluster0.abupwls.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0", {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

app.use(
  cors({
    credentials: true,
    origin: ["http://localhost:3000"],
  })
);

app.use(express.json());
app.use(express.urlencoded());

const oneDay = 1000 * 60 * 60 * 24;

app.use(
  session({
    secret: process.env.SESSION_SECRET,
    saveUninitialized: true,
    store: MongoStore.create({
      mongoUrl: "mongodb+srv://" + process.env.MONGO_USERNAME + ":" + process.env.MONGO_PASSWORD + "@cluster0.abupwls.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0",
    }),
    cookie: { maxAge: oneDay },
    resave: false,
  })
);

let transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    type: "OAuth2",
    user: process.env.MAIL_USERNAME,
    pass: process.env.MAIL_PASSWORD,
    clientId: process.env.OAUTH_CLIENTID,
    clientSecret: process.env.OAUTH_CLIENT_SECRET,
    refreshToken: process.env.OAUTH_REFRESH_TOKEN,
  },
});

app.post("/api/", async (req, res) => {
  try {
    var found = 0;
    var passwords = "";
    var rawPassword;
    while (true) {
      rawPassword = nanoid(10);
      passwords = crypto.createHash("sha256").update(rawPassword).digest("hex");
      const existingUser = await User.findOne({ code: passwords });

    if (!existingUser) {
        break; // unique password found
    }
    }
    let mailOptions = {
      from: process.env.MAIL_USERNAME,
      to: req.body.userEmail,
      subject: "Bill Split",
      text:
        "Hi your code for login your Bill Split account named " +
        req.body.userTopic +
        " is  =  " +
        rawPassword
    };
    transporter.sendMail(mailOptions, async function (err, data) {
      if (err) {
        console.log(err);
        res.status(500).send();
      } else {
        const user = new User({
          code: passwords,
          topic: req.body.userTopic,
          billsplit: [],
        });
        await user.save();
        req.session.password = passwords;
        res.send({ status: "ok", code: rawPassword });
      }
    });
  } catch {
    console.log("Error in sending mail or saving user");
    res.status(500).send();
  }
});

app.post("/api/login", (req, res) => {
  var passwords = crypto.createHash("sha256").update(req.body.userCode).digest("hex");
  User.findOne({ code: passwords }, (err, result) => {
    if (err) {
      console.log(err);
      res.status(500).send();
    } else {
      if (result) {
        req.session.password = passwords;
        res.send({ status: "ok" });
      } else {
        res.send({ status: "not registered" });
      }
    }
  });
});

app.get("/api/billsplit", (req, res) => {
  if (req.session.password) {
    User.findOne({ code: req.session.password }, (err, result) => {
      if (err) {
        res.status(500).send();
      } else {
        if (result) {
         
          res.send({
            status: "ok",
            result: result.billsplit,
            topic: result.topic,
          });
        }
      }
    });
  } else {
    res.send({ status: "go to login" });
  }
});

app.post("/api/billsplit", (req, res) => {
  if (req.session.password) {
    const updatedDetails = req.body.updatedDetails;
    User.findOneAndUpdate(
      { code: req.session.password },
      { billsplit: updatedDetails },
      { new: true },
      function (err, result) {
        if (err) {
          res.status(500).send();
        } else {
          res.send({ status: "ok" });
        }
      }
    );
  } else {
    res.send({ status: "go to login" });
  }
});

app.get("/api/logout", (req, res) => {
    console.log("Logging out user with session ID: ", req.session.id);
    
  req.session.destroy((err) => {
    if (!err) {
      res.send({ logout: "successfully" }); // will always fire after session is destroyed
    } else {
        console.log(err);
      res.status(500).send();
    }
  });
});

app.listen(process.env.PORT || 5000, () => {
  console.log("app is running on 5000 port");
});
