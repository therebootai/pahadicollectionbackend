const mongoose = require("mongoose");
const bcrypt = require("bcrypt");

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
      secure_url: { type: String },
      public_id: { type: String },
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
        ref: "Products",
        default: [],
      },
    ],
    payments: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Payments",
        default: [],
      },
    ],
    is_disabled: {
      type: Boolean,
      required: true,
      default: false,
    },
    used_coupon: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Coupons",
        default: [],
      },
    ],
  },
  {
    timestamps: true,
  }
);

customerSchema.pre("save", async function (next) {
  if (!this.isModified("password")) {
    return next();
  }
  try {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (err) {
    next(err instanceof Error ? err : new Error("Unknown error occurred"));
  }
});

// Instance method to check if the entered password matches
customerSchema.methods.matchPassword = async function (enteredPassword) {
  return bcrypt.compare(enteredPassword, this.password);
};

module.exports =
  mongoose.models.Customers || mongoose.model("Customers", customerSchema);
