const mongoose = require("mongoose");
const slugify = require("slugify");

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
    main_product: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Products",
      required: function () {
        return this.productType === "variant";
      },
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
    attribute: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Attributes",
        default: [],
      },
    ],
    discount: {
      type: Number,
    },
    description: {
      type: String,
    },
    variable: {
      variableId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Variables",
        required: function () {
          return this.productType === "variant";
        },
      },
      variableValue: {
        type: String,
        required: function () {
          return this.productType === "variant";
        },
      },
    },
    variant: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Products",
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
    product_viewed: {
      type: Number,
      default: 0,
    },
    product_added: {
      type: Number,
      default: 0,
    },
    product_ordered: {
      type: Number,
      default: 0,
    },
    tags: {
      type: [String],
      default: [],
      enum: ["best_selling", "mostly_viewed", "mostly_added", "editor_choice"],
    },
    reviews: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Reviews",
        default: [],
      },
    ],
    slug: {
      type: String,
      required: true,
      unique: true,
    },
  },
  {
    timestamps: true,
  }
);

productSchema.pre("validate", async function (next) {
  if (this.isModified("title") || this.isNew) {
    this.slug = slugify(this.title, { lower: true, strict: true });
  }
  next();
});

productSchema.index({ createdAt: -1, isActive: 1 });

module.exports =
  mongoose.models.products || mongoose.model("Products", productSchema);
