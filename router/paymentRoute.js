const express = require("express");
const { getAllPayments } = require("../controllers/paymentController");

const paymentRouter = express.Router();

paymentRouter.get("/", getAllPayments);

module.exports = paymentRouter;
