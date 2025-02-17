const mongoose = require("mongoose");

const couponSchema = new mongoose.Schema(
  {
    couponId: {
      type: String,
      unique: true,
      required: true,
    },
    couponName: {
      type: String,
      required: true,
    },
    discount: {
      type: Number,
      required: true,
    },
    isActive: {
      type: Boolean,
      required: true,
      default: true,
    },
    minimumAmount: {
      type: Number,
      required: true,
    },
    upToAmount: {
      type: String,
      required: true,
    },
    startDate: {
      type: Date,
      required: true,
    },
    endDate: {
      type: Date,
      required: true,
    },
    products: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Products",
        default: [],
      },
    ],
    usedBy: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Customers",
        default: [],
      },
    ],
  },
  { timestamps: true }
);

couponSchema.index({ createdAt: -1, isActive: 1 });

couponSchema.path("usedBy").validate(function (value) {
  return value.length === new Set(value.map(String)).size;
}, "Duplicate customer IDs are not allowed in usedBy.");

module.exports =
  mongoose.models.Coupons || mongoose.model("Coupons", couponSchema);
