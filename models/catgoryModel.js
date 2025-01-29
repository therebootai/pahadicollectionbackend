const mongoose = require("mongoose");

const subSubCategorySchema = new mongoose.Schema({
  subsubcategoriesname: { type: String },
  isActive: { type: Boolean, default: true },
});

const subCategorySchema = new mongoose.Schema({
  subcategoriesname: { type: String },
  isActive: { type: Boolean, default: true },
  subsubcategories: [subSubCategorySchema],
});

const categorySchema = new mongoose.Schema(
  {
    categoryId: {
      type: String,
      unique: true,
      required: true,
    },
    mainCategory: {
      type: String,
      unique: true,
      required: true,
    },
    categoryImage: {
      secure_url: { type: String, required: true },
      public_id: { type: String, required: true },
    },
    subcategories: [subCategorySchema],
    isActive: { type: Boolean, required: true, default: true },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model("Categories", categorySchema);
