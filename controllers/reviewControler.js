const mongoose = require("mongoose");
const generateCustomId = require("../middlewares/ganerateCustomId");
const customerModel = require("../models/customerModel");
const productModel = require("../models/productModel");
const reviewModel = require("../models/reviewModel");

exports.addNewReview = async (req, res) => {
  try {
    const { productId, customerId, rating, title, content } = req.body;

    if (!productId || !customerId || !rating) {
      return res.status(400).json({ message: "All fields are required." });
    }

    const [product, customer, reviewId] = await Promise.all([
      productModel.findById(productId),
      customerModel.findById(customerId).populate("orders.products.productId"),
      generateCustomId(reviewModel, "reviewId", "reviewId"),
    ]);

    if (!product || !customer) {
      return res
        .status(404)
        .json({ message: "Product or customer not found." });
    }

    const newReview = new reviewModel({
      reviewId,
      productId,
      customerId,
      rating,
      title,
      content,
    });

    const savedReview = await newReview.save();
    await Promise.all([
      productModel.findByIdAndUpdate(productId, {
        $push: { reviews: savedReview._id },
      }),
      customerModel.findByIdAndUpdate(customerId, {
        $push: { reviewed: savedReview._id },
      }),
    ]);

    res
      .status(201)
      .json({ message: "Review added successfully", review: savedReview });
  } catch (error) {
    console.log(error);
    res.status(500).json({ message: error.message });
  }
};

exports.getAllReviews = async (req, res) => {
  try {
    let {
      page = 1,
      limit = 10,
      sortBy = "createdAt",
      order = "desc",
      rating,
      isActive,
      productId,
      customerId,
    } = req.query;

    page = parseInt(page);
    limit = parseInt(limit);

    const sortOrder = order === "asc" ? 1 : -1;

    let query = {};

    if (isActive !== undefined) {
      query.isActive = isActive === "true" ? true : false;
    }

    if (rating) {
      query.rating = rating;
    }

    if (productId) {
      query.productId = productId;
    }

    if (customerId) {
      query.customerId = customerId;
    }

    const [totalCount, reviews] = await Promise.all([
      reviewModel.countDocuments(query),
      reviewModel
        .find(query)
        .populate("productId")
        .populate("customerId")
        .sort({ [sortBy]: sortOrder })
        .skip((page - 1) * limit)
        .limit(limit),
    ]);

    res.status(200).json({
      reviews,
      pagination: {
        totalCount,
        currentPage: page,
        totalPages: Math.ceil(totalCount / limit),
      },
    });
  } catch (error) {
    console.log(error);
    res.status(500).json({ message: error.message });
  }
};

exports.getReviewById = async (req, res) => {
  try {
    const { id } = req.params;

    const review = await reviewModel
      .findOne({
        $or: [
          { _id: mongoose.Types.ObjectId.isValid(id) ? id : null },
          { reviewId: id },
        ],
      })
      .populate("productId")
      .populate("customerId");

    if (!review) {
      return res.status(404).json({ message: "Review not found." });
    }

    res.status(200).json({ message: "Review fetched successfully.", review });
  } catch (error) {
    console.log(error);
    res.status(500).json({ message: error.message });
  }
};

exports.updateReviewById = async (req, res) => {
  try {
    const { id } = req.params;
    const { rating, title, content, isActive } = req.body;

    const updatedReview = await reviewModel
      .findOneAndUpdate(
        {
          $or: [
            { _id: mongoose.Types.ObjectId.isValid(id) ? id : null },
            { reviewId: id },
          ],
        },
        { rating, title, content, isActive },
        { new: true, runValidators: true }
      )
      .populate("productId")
      .populate("customerId");

    if (!updatedReview) {
      return res.status(404).json({ message: "Review not found." });
    }

    res
      .status(200)
      .json({ message: "Review updated successfully.", review: updatedReview });
  } catch (error) {
    console.log(error);
    res.status(500).json({ message: error.message });
  }
};

exports.deleteReviewById = async (req, res) => {
  try {
    const { id } = req.params;

    const deletedReview = await reviewModel.findOneAndDelete({
      $or: [
        { _id: mongoose.Types.ObjectId.isValid(id) ? id : null },
        { reviewId: id },
      ],
    });

    if (!deletedReview) {
      return res.status(404).json({ message: "Review not found." });
    }

    await Promise.all([
      productModel.findByIdAndUpdate(deletedReview.productId, {
        $pull: { reviews: deletedReview._id },
      }),
      customerModel.findByIdAndUpdate(deletedReview.customerId, {
        $pull: { reviewed: deletedReview._id },
      }),
    ]);

    res
      .status(200)
      .json({ message: "Review deleted successfully.", review: deletedReview });
  } catch (error) {
    console.log(error);
    res.status(500).json({ message: error.message });
  }
};
