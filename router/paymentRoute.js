const express = require("express");
const {
  getAllPayments,
  createRazorpayOrder,
  handlePaymentSuccess,
  handleDeletePayment,
} = require("../controllers/paymentController");

const paymentRouter = express.Router();

paymentRouter.get("/", getAllPayments);
paymentRouter.post("/order", createRazorpayOrder);
paymentRouter.post("/payment-success", handlePaymentSuccess);
paymentRouter.delete("/:id", handleDeletePayment);

module.exports = paymentRouter;
