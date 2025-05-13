const mongoose = require("mongoose");

const paymentSchema = new mongoose.Schema(
  {
    paymentId: {
      type: String,
      unique: true,
      required: true,
    },
    customerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Customers",
      required: true,
    },
    razorpayPaymentId: {
      type: String,
    },
    razorpayOrderId: {
      type: String,
    },
    amount: {
      type: Number,
      required: true,
    },
    paymentStatus: {
      type: String,
      enum: ["completed", "pending"],
    },
    orderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Orders",
    },
    paymentMode: {
      type: String,
      enum: ["COD", "ONLINE"],
    },
    is_refunded: {
      type: Boolean,
      default: false,
    },
    currency: {
      type: String,
    },
    method: {
      type: String,
    },
    signature: {
      type: String,
    },
    captured: {
      type: Boolean,
    },
  },
  { timestamps: true }
);

module.exports =
  mongoose.models.Payments || mongoose.model("Payments", paymentSchema);
