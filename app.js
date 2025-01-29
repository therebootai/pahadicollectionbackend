const express = require("express");
const app = express();
const bodyParser = require("body-parser");
const cors = require("cors");
const MongoDbConnect = require("./connection");
require("dotenv").config();
const fileUpload = require("express-fileupload");
const fs = require("fs");
const path = require("path");
const port = process.env.PORT;
const tempFilePath = path.join(__dirname, "temp");

if (!fs.existsSync(tempFilePath)) {
  fs.mkdirSync(tempFilePath, { recursive: true });
}
MongoDbConnect();

const categoryRoutes = require("./router/categoryRoute");

app.use(cors());

app.use(express.json());
app.use(fileUpload({ useTempFiles: true, tempFileDir: tempFilePath }));
app.use(express.urlencoded({ extended: true }));

app.use(bodyParser.json());

app.use("/api/category", categoryRoutes);

app.listen(port, () => {
  console.log(`Port starts on  ${port}`);
});
