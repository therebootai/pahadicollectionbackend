const mongoose = require("mongoose");

const pickupSchema = new mongoose.Schema(
  {
    pickupId: { type: String, unique: true, required: true },
    pickupPointName: {
      type: String,
      required: true,
    },
    pickupPointLocation: {
      type: String,
      required: true,
    },
    pickupPointPinCode: {
      type: String,
      required: true,
    },

    pickupPointMobileno: {
      type: String,
      required: true,
      unique: true,
    },
    isActive: { type: Boolean, required: true, default: true },
  },
  {
    timestamps: true,
  }
);

pickupSchema.index({ createdAt: -1, pickupId: 1, isActive: 1 });

module.exports = mongoose.model("PickUps", pickupSchema);
