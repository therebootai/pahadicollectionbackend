const express = require("express");
const app = express();
const bodyParser = require("body-parser");
const cors = require("cors");
const MongoDbConnect = require("./connection");
require("dotenv").config();
const fileUpload = require("express-fileupload");
const port = process.env.PORT;

MongoDbConnect();

app.use(cors());

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(fileUpload());
app.use(bodyParser.json());

app.listen(port, () => {
  console.log(`Port starts on  ${port}`);
});
