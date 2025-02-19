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
    products: [
      {
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
    ],
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
        "canceled",
        "refund_generated",
        "refunded",
        "canceled",
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
  },
  { timestamps: true }
);

module.exports =
  mongoose.models.Orders || mongoose.model("Orders", orderSchema);
