const express = require("express");
const app = express();
const bodyParser = require("body-parser");
const cors = require("cors");
const cookieParser = require("cookie-parser");
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
const productRouter = require("./router/productRoute");
const customerRouter = require("./router/customerRoute");
const couponRouter = require("./router/couponRoute");
const orderRouter = require("./router/orderRoute");
const userRoute = require("./router/userRoute");

app.use(cors({ origin: process.env.ORIGIN_URL, credentials: true }));
app.use(cookieParser());
app.use(express.json());
app.use(fileUpload({ useTempFiles: true, tempFileDir: tempFilePath }));
app.use(express.urlencoded({ extended: true }));

app.use(bodyParser.json());

app.use("/api/category", categoryRoutes);
app.use("/api/pickups", pickupRoutes);

app.use("/api/component", componentRouter);

app.use("/api/variables", variableRoutes);

app.use("/api/products", productRouter);

app.use("/api/customers", customerRouter);

app.use("/api/coupons", couponRouter);

app.use("/api/orders", orderRouter);
app.use("/api/users", userRoute);

app.listen(port, () => {
  console.log(`Port starts on  ${port}`);
});
