const express = require("express");
const { createComponent } = require("../controllers/componentController");

const componentRouter = express.Router();

componentRouter.post("/create", createComponent);

module.exports = componentRouter;
