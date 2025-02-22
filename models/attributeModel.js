const mongoose = require("mongoose");

const attributeSchema = new mongoose.Schema(
  {
    attributeId: {
      type: String,
      unique: true,
      required: true,
    },
    attribute_title: {
      type: String,
      required: true,
    },
    products: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Products",
        default: [],
      },
    ],
    is_active: {
      type: Boolean,
      required: true,
      default: true,
    },
  },
  { timestamps: true }
);

module.exports =
  mongoose.models.Attributes || mongoose.model("Attributes", attributeSchema);
