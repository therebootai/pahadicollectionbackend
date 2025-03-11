const express = require("express");
const {
  createProduct,
  getAllProducts,
  deleteProductById,
  updateProductById,
  getProductById,
  searchProduct,
  getProductBySlug,
} = require("../controllers/productController");

const productRouter = express.Router();

productRouter.post("/create", createProduct);

productRouter.get("/", getAllProducts);

productRouter.get("/find", searchProduct);
productRouter.get("/slug/:slug", getProductBySlug);

productRouter
  .route("/:id")
  .delete(deleteProductById)
  .put(updateProductById)
  .get(getProductById);

module.exports = productRouter;
