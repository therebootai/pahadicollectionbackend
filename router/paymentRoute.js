const express = require("express");
const {
  getAllPayments,
  createRazorpayOrder,
} = require("../controllers/paymentController");

const paymentRouter = express.Router();

paymentRouter.get("/", getAllPayments);
paymentRouter.post("/order", createRazorpayOrder);

module.exports = paymentRouter;
