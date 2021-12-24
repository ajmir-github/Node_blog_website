// Import Main Modules
const express = require('express');
const mongoose = require('mongoose');
const cookieParser = require("cookie-parser");
const fileUpload = require("express-fileupload")

// Import Environmant varaibles
require("dotenv").config();
const { PORT, DATABASE_URL } = process.env;

// Create Database Connection
mongoose.connect(
  DATABASE_URL || "mongodb://localhost:27017",
  { useNewUrlParser: true, useUnifiedTopology: true }
);
// Check Database Connection
const db = mongoose.connection;
db.on('error', ()=> console.error("+++ Could not connet to database"));
db.once('open', ()=> console.log("--- Database Connected"));

// setup express server
const app = express();
app.set("view engine", "ejs");
// Express Meddlewares
app.use(express.json());
app.use(express.static("public"));
// urlencoded with from make a post request to server
app.use(express.urlencoded({extended: false}))
// cookie parser let get clients' cookie
app.use(cookieParser());
// activate express file-uploader
app.use(fileUpload());

// Routers' Variables
const controllers = require("./controllers.js");
// Routers' Injections
app.use("/", controllers);


// Activate server listener
app.listen(
  PORT || 3000,
  console.log(`--- Server Listening On Port ${PORT}`)
);