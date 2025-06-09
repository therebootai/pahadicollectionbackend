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
    is_drafted: {
      type: Boolean,
      required: true,
      default: false,
    },
    category: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Categories",
      required: function () {
        return !this.get("is_drafted");
      },
      default: null,
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
      required: function () {
        return !this.get("is_drafted");
      },
      default: null,
    },
    productType: {
      type: String,
      required: function () {
        return !this.get("is_drafted");
      },
      enum: ["single", "variant"],
    },
    main_product: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Products",
      required: function () {
        return this.productType === "variant";
      },
      default: null,
    },
    price: {
      type: Number,
      required: function () {
        return !this.get("is_drafted");
      },
    },
    mrp: {
      type: Number,
      required: function () {
        return !this.get("is_drafted");
      },
    },
    in_stock: {
      type: Number,
      required: function () {
        return !this.get("is_drafted");
      },
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
        key: {
          type: String,
          required: function () {
            return !this.$parent().is_drafted;
          },
        }, // Specification Key
        value: {
          type: String,
          required: function () {
            return !this.$parent().is_drafted;
          },
        }, // Specification Value
      },
    ],
    isActive: {
      type: Boolean,
      required: true,
      required: function () {
        return !this.get("is_drafted");
      },
    },
    productImage: [
      {
        secure_url: {
          type: String,
          required: function () {
            return !this.$parent().is_drafted;
          },
        },
        public_id: {
          type: String,
          required: function () {
            return !this.$parent().is_drafted;
          },
        },
      },
    ],
    hoverImage: {
      secure_url: {
        type: String,
        required: function () {
          return !this.$parent().is_drafted;
        },
      },
      public_id: {
        type: String,
        required: function () {
          return !this.$parent().is_drafted;
        },
      },
    },
    thumbnail_image: {
      secure_url: {
        type: String,
        required: function () {
          return !this.$parent().is_drafted;
        },
      },
      public_id: {
        type: String,
        required: function () {
          return !this.$parent().is_drafted;
        },
      },
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

productSchema.pre("findOneAndUpdate", async function (next) {
  const update = this.getUpdate();

  if (update.$inc && typeof update.$inc.in_stock === "number") {
    const currentDoc = await this.model.findOne(this.getQuery());
    const newStock = currentDoc.in_stock + update.$inc.in_stock;

    if (newStock <= 0) {
      update.isActive = false;
    }
  }

  next();
});

productSchema.index({ createdAt: -1, isActive: 1 });

module.exports =
  mongoose.models.products || mongoose.model("Products", productSchema);
