const express = require("express");
const {
  createAttribute,
  getAllAttributes,
  searchAllAttributes,
  getAttributeById,
  updateAttributeById,
  deleteAttributeById,
} = require("../controllers/attributeControler");

const attributeRouter = express.Router();

attributeRouter.post("/", createAttribute);

attributeRouter.get("/", getAllAttributes);

attributeRouter.get("/search", searchAllAttributes);

attributeRouter
  .route("/:id")
  .get(getAttributeById)
  .put(updateAttributeById)
  .delete(deleteAttributeById);

module.exports = attributeRouter;
