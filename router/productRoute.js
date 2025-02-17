const express = require("express");
const {
  createProduct,
  getAllProducts,
  deleteProductById,
  updateProductById,
  getProductById,
  searchProduct,
} = require("../controllers/productController");

const productRouter = express.Router();

productRouter.post("/create", createProduct);

productRouter.get("/", getAllProducts);

productRouter.get("/find", searchProduct);

productRouter
  .route("/:id")
  .delete(deleteProductById)
  .put(updateProductById)
  .get(getProductById);

module.exports = productRouter;
