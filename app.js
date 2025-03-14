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
const tempFilePath = process.env.VERCEL ? "/tmp" : path.join(__dirname, "temp");

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
const paymentRouter = require("./router/paymentRoute");
const attributeRouter = require("./router/attributeRoute");
const reviewRouter = require("./router/reviewRoute");

app.use(
  cors({
    origin: [
      "http://localhost:5173",
      "http://localhost:3000",
      "https://pahadi-collection-admin-panel.netlify.app",
      "https://pahadicollectionwebsite.vercel.app",
      "http://192.168.29.162:3000",
    ],
    credentials: true,
  })
);
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

app.use("/api/payments", paymentRouter);

app.use("/api/attributes", attributeRouter);

app.use("/api/reviews", reviewRouter);

app.get("/", (req, res) => {
  res.send(
    "Hello World! From Pahadi Collection developer by Reboot AI PVT. LTD"
  );
});

app.listen(port, () => {
  console.log(`Port starts on  ${port}`);
});
