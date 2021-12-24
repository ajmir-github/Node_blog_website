// imports
const mongoose = require('mongoose');
const { UserModel } = require("./models");
require("dotenv").config();
// Global vars
const { DATABASE_URL } = process.env;

// Create Database Connection
mongoose.connect(
  DATABASE_URL || "mongodb://localhost:27017",
  { useNewUrlParser: true, useUnifiedTopology: true }
);
// Check Database Connection
const db = mongoose.connection;
db.on('error', ()=> console.error("+++ Could not connet to database"));
db.once('open', async ()=>{
  console.log("--- Database Connected");
  // create root user
  const rootUserObject = new UserModel({
    firstName: "Ajmir",
    lastName: "Raziqi",
    username: "root",
    password: "1234",
    dateOfBirth:"Dec 17, 1994",
    email:"ajmir.ng3@gmail.com",
    date:Date.now,
    phone:"+93771210549",
    address:"Kabul, Afghanistan",
    role:{
      roleName:"root",
      type:3
    }
  })
  const rootUser = await rootUserObject.save();
  console.log(rootUser);
});
