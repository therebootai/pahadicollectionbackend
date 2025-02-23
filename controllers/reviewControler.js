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
    res
      .status(500)
      .json({ message: "Internal server error", error: error.message });
  }
};
