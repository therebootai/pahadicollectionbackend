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
const pickupRoutes = require("./router/pickupRoute");

const componentRouter = require("./router/componentRoute");

const variableRoutes = require("./router/variableRoute");


app.use(cors());

app.use(express.json());
app.use(fileUpload({ useTempFiles: true, tempFileDir: tempFilePath }));
app.use(express.urlencoded({ extended: true }));

app.use(bodyParser.json());

app.use("/api/category", categoryRoutes);
app.use("/api/pickups", pickupRoutes);

app.use("/api/component", componentRouter);

app.use("/api/variables", variableRoutes);


app.listen(port, () => {
  console.log(`Port starts on  ${port}`);
});
