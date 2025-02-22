const express = require("express");
const { addNewReview } = require("../controllers/reviewControler");

const reviewRouter = express.Router();

reviewRouter.post("/", addNewReview);

module.exports = reviewRouter;
