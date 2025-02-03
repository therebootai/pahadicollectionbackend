const express = require("express");
const {
  createComponent,
  getAllComponents,
  getComponentDropdown,
  getSingleComponent,
  updateComponent,
  deleteComponent,
} = require("../controllers/componentController");

const componentRouter = express.Router();

componentRouter.post("/create", createComponent);

componentRouter.get("/get", getAllComponents);

componentRouter.get("/drop-down", getComponentDropdown);

componentRouter
  .route("/:id")
  .get(getSingleComponent)
  .put(updateComponent)
  .delete(deleteComponent);

module.exports = componentRouter;
