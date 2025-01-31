const mongoose = require("mongoose");

const componentSchema = new mongoose.Schema(
  {
    componentId: {
      type: String,
      unique: true,
      required: true,
    },
    name: {
      type: String,
      required: true,
    },
    type: {
      type: String,
      required: true,
      enum: ["slider", "banner", "logo", "popup"],
    },
    component_image: {
      type: Object,
      required: true,
    },
  },
  { timestamps: true }
);

module.exports =
  mongoose.models.components || mongoose.model("components", componentSchema);
