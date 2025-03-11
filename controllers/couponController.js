const generateCustomId = require("../middlewares/ganerateCustomId");
const couponModel = require("../models/couponModel");
const mongoose = require("mongoose");
const customerModel = require("../models/customerModel");

exports.createNewCoupon = async (req, res) => {
  try {
    const {
      couponName,
      discount,
      minimumAmount,
      startDate,
      endDate,
      products,
      upToAmount,
    } = req.body;

    if (
      !couponName ||
      !discount ||
      !minimumAmount ||
      !startDate ||
      !endDate ||
      !upToAmount
    ) {
      return res.status(400).json({ message: "All fields are required." });
    }

    const couponId = await generateCustomId(
      couponModel,
      "couponId",
      "couponId"
    );

    const newCoupon = new couponModel({
      couponId,
      couponName,
      discount,
      minimumAmount,
      startDate,
      endDate,
      products: Array.isArray(products) ? products : [],
      upToAmount,
    });
    const savedCoupon = await newCoupon.save();

    res.status(201).json({
      message: "Coupon created successfully",
      coupon: savedCoupon,
    });
  } catch (error) {
    console.log("Error creating new coupon:", error);
    res.status(500).json({ message: error.message });
  }
};

exports.getAllCoupons = async (req, res) => {
  try {
    const {
      page = 1, // default page 1
      limit = 10, // default limit to 10
      sortBy = "createdAt", // default sorting by createdAt
      order = "desc",
      isActive,
      startDate,
      endDate,
      products,
      usedBy,
    } = req.query;
    const pageNumber = parseInt(page);
    const limitNumber = parseInt(limit);
    const sortOrder = order === "asc" ? 1 : -1;

    // Build the query object
    const query = {};

    // Filter by isActive
    if (isActive !== undefined) {
      query.isActive = isActive === "true";
    }

    // Filter by date range
    if (startDate && endDate) {
      query.startDate = { $gte: new Date(startDate) };
      query.endDate = { $lte: new Date(endDate) };
    } else if (startDate) {
      query.startDate = { $gte: new Date(startDate) };
    } else if (endDate) {
      query.endDate = { $lte: new Date(endDate) };
    }

    // Filter by specific product
    if (products) {
      query.products = { $in: products.split(",") };
    }

    // Filter by users who used the coupon
    if (usedBy) {
      query.usedBy = { $in: usedBy.split(",") };
    }

    // Fetch coupons with pagination, sorting, and filtering
    const [coupons, totalCount] = await Promise.all([
      couponModel
        .find(query)
        .sort({ [sortBy]: sortOrder })
        .skip((pageNumber - 1) * limitNumber)
        .limit(limitNumber)
        .populate("products")
        .populate("usedBy"),
      couponModel.countDocuments(query),
    ]);

    res.status(200).json({
      message: "Coupons fetched successfully",
      coupons,
      pagination: {
        currentPage: pageNumber,
        totalPages: Math.ceil(totalCount / limitNumber),
        totalCount,
      },
    });
  } catch (error) {
    console.log("Error fetching coupons:", error);
    res.status(500).json({ message: error.message });
  }
};

exports.searchCoupons = async (req, res) => {
  try {
    const {
      query = "", // Search keyword
      page = 1,
      limit = 10,
      sortBy = "createdAt",
      order = "desc",
    } = req.query;

    // Convert query parameters
    const pageNumber = parseInt(page);
    const limitNumber = parseInt(limit);
    const sortOrder = order === "asc" ? 1 : -1;

    // Build search criteria
    const searchQuery = {
      $or: [
        { couponId: { $regex: query, $options: "i" } }, // Search in couponId
        { couponName: { $regex: query, $options: "i" } }, // Search in couponName
        { discount: isNaN(query) ? undefined : Number(query) }, // Search by discount if numeric
        { products: query.match(/^[0-9a-fA-F]{24}$/) ? query : undefined }, // Search by product ID
        { usedBy: query.match(/^[0-9a-fA-F]{24}$/) ? query : undefined }, // Search by user ID
      ].filter(Boolean), // Filter out invalid conditions
    };

    // Use Promise.all for performance
    const [coupons, totalCount] = await Promise.all([
      couponModel
        .find(searchQuery)
        .sort({ [sortBy]: sortOrder })
        .skip((pageNumber - 1) * limitNumber)
        .limit(limitNumber)
        .populate("products")
        .populate("usedBy"),
      couponModel.countDocuments(searchQuery),
    ]);

    res.status(200).json({
      message: "Coupons fetched successfully",
      coupons,
      pagination: {
        currentPage: pageNumber,
        totalPages: Math.ceil(totalCount / limitNumber),
        totalCount,
      },
    });
  } catch (error) {
    console.error("Error searching coupons:", error);
    res.status(500).json({ message: error.message });
  }
};

exports.getCouponById = async (req, res) => {
  try {
    const { id } = req.params;
    const coupon = await couponModel
      .findOne({
        $or: [
          { _id: mongoose.Types.ObjectId.isValid(id) ? id : null },
          { couponId: id },
        ],
      })
      .populate("products")
      .populate("usedBy");

    if (!coupon) {
      return res.status(404).json({ message: "Coupon not found" });
    }

    res.status(200).json({ message: "Coupon fetched successfully", coupon });
  } catch (error) {
    console.error("Error getting coupon by ID:", error);
    res.status(500).json({ message: error.message });
  }
};

exports.updateCouponById = async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body; // Get update data from request body

    // Ensure 'usedBy' remains unique by converting to a Set
    if (updateData.usedBy && Array.isArray(updateData.usedBy)) {
      updateData.usedBy = [...new Set(updateData.usedBy)];
    }

    const updatedCoupon = await couponModel
      .findOneAndUpdate(
        {
          $or: [
            { _id: mongoose.Types.ObjectId.isValid(id) ? id : null },
            { couponId: id },
          ],
        },
        { $set: updateData },
        { new: true, runValidators: true }
      )
      .populate("products")
      .populate("usedBy");

    if (!updatedCoupon) {
      return res
        .status(404)
        .json({ success: false, message: "Coupon not found" });
    }

    res.status(200).json({
      success: true,
      message: "Coupon updated successfully",
      coupon: updatedCoupon,
    });
  } catch (error) {
    console.error("Error updating coupon by ID:", error);
    res.status(500).json({ message: error.message });
  }
};

exports.deleteCouponById = async (req, res) => {
  try {
    const { id } = req.params;
    const deletedCoupon = await couponModel.findOne({
      $or: [
        { _id: mongoose.Types.ObjectId.isValid(id) ? id : null },
        { couponId: id },
      ],
    });

    if (!deletedCoupon) {
      return res.status(404).json({ message: "Coupon not found" });
    }

    await couponModel.findByIdAndDelete(deletedCoupon._id);

    res
      .status(200)
      .json({ message: "Coupon deleted successfully", success: true });
  } catch (error) {
    console.error("Error deleting coupon by ID:", error);
    res.status(500).json({ message: error.message });
  }
};

exports.getCouponByName = async (req, res) => {
  try {
    const { coupon_code } = req.params;
    const coupon = await couponModel.findOne({ couponName: coupon_code });

    if (!coupon) {
      return res.status(404).json({ message: "Coupon not found" });
    }

    if (coupon.endDate < Date.now()) {
      return res.status(400).json({ message: "Coupon has expired" });
    }

    if (coupon.usedBy.includes(req.user._id)) {
      return res.status(400).json({ message: "Coupon already used" });
    }

    res.status(200).json({ message: "Coupon fetched successfully", coupon });
  } catch (error) {
    console.error("Error using a coupon:", error);
    res.status(500).json({ message: error.message });
  }
};
