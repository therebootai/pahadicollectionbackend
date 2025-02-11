const mongoose = require("mongoose");

const customerSchema = new mongoose.Schema(
  {
    customerId: {
      type: String,
      unique: true,
      required: true,
    },
    name: {
      type: String,
      required: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
    },
    mobile: {
      type: String,
      required: true,
      unique: true,
    },
    password: {
      type: String,
      required: true,
    },
    isLogin: {
      type: Boolean,
      required: true,
      default: false,
    },
    profileImage: {
      secure_url: { type: String, required: true },
      public_id: { type: String, required: true },
    },
    address: [{ type: Object, required: true }],
    cart: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Products",
        default: [],
      },
    ],
    orders: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Orders",
        default: [],
      },
    ],
    wishlist: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Wishlists",
        default: [],
      },
    ],
  },
  {
    timestamps: true,
  }
);

module.exports =
  mongoose.models.Customers || mongoose.model("Customers", customerSchema);
