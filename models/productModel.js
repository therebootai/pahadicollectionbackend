const mongoose = require("mongoose");

const productSchema = new mongoose.Schema(
  {
    productId: {
      type: String,
      unique: true,
      required: true,
    },
    title: {
      type: String,
      required: true,
    },
    category: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Categories",
      required: true,
    },

    subCategory: {
      type: String,
    },

    subSubCategory: {
      type: String,
    },
    pickup: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "PickUps",
      required: true,
    },
    productType: {
      type: String,
      required: true,
      enum: ["single", "variant"],
    },
    price: {
      type: Number,
      required: true,
    },
    mrp: {
      type: Number,
      required: true,
    },
    in_stock: {
      type: Number,
      required: true,
    },
    attribute: {
      type: String,
    },
    discount: {
      type: Number,
    },
    description: {
      type: String,
    },
    variant: [
      {
        variable: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "Variables",
        },
        additional: {
          type: Object,
        },
        default: [],
      },
    ],
    specification: [
      {
        key: { type: String, required: true }, // Specification Key
        value: { type: String, required: true }, // Specification Value
      },
    ],
    isActive: { type: Boolean, required: true, default: true },
    productImage: [
      {
        secure_url: { type: String, required: true },
        public_id: { type: String, required: true },
      },
    ],
    hoverImage: {
      secure_url: { type: String, required: true },
      public_id: { type: String, required: true },
    },
    thumbnail_image: {
      secure_url: { type: String, required: true },
      public_id: { type: String, required: true },
    },
  },
  {
    timestamps: true,
  }
);

productSchema.index({ createdAt: -1, isActive: 1 });

module.exports =
  mongoose.models.products || mongoose.model("Products", productSchema);
