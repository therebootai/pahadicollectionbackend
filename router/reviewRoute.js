const express = require("express");
const {
  addNewReview,
  getAllReviews,
  getReviewById,
  updateReviewById,
  deleteReviewById,
} = require("../controllers/reviewControler");

const reviewRouter = express.Router();

reviewRouter.post("/", addNewReview);

reviewRouter.get("/", getAllReviews);

reviewRouter
  .route("/:id")
  .get(getReviewById)
  .put(updateReviewById)
  .delete(deleteReviewById);

module.exports = reviewRouter;
