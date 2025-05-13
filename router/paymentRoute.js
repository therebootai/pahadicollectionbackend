const express = require("express");
const {
  getAllPayments,
  createRazorpayOrder,
  handlePaymentSuccess,
} = require("../controllers/paymentController");

const paymentRouter = express.Router();

paymentRouter.get("/", getAllPayments);
paymentRouter.post("/order", createRazorpayOrder);
paymentRouter.post("/payment-success", handlePaymentSuccess);

module.exports = paymentRouter;
