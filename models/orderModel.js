const mongoose = require("mongoose");

const orderSchema = new mongoose.Schema(
  {
    orderId: {
      type: String,
      unique: true,
      required: true,
    },
    customerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Customers",
      required: true,
    },
    products: {
      productId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Products",
        required: true,
      },
      quantity: {
        type: Number,
        required: true,
      },
    },
    paymentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Payments",
      default: null,
    },
    totalAmount: {
      type: Number,
      required: true,
    },
    status: {
      type: String,
      required: true,
      enum: [
        "ordered",
        "shipped",
        "out_for_delivery",
        "delivered",
        "cancel_initiated",
        "canceled",
        "cancel_initiated_and_refund_generated",
        "canceled_and_refunded",
        "return_and_refunded",
      ],
      default: "ordered",
    },
    delivery_location: {
      type: Object,
      required: true,
    },
    couponId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Coupons",
      default: null,
    },
    cancel_message: {
      type: Object,
      default: {
        order_message: "",
        cancel_reason: "",
      },
    },
  },
  { timestamps: true }
);

module.exports =
  mongoose.models.Orders || mongoose.model("Orders", orderSchema);
