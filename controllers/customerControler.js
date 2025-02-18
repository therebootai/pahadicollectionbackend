const mongoose = require("mongoose");
const { uploadFile, deleteFile } = require("../middlewares/cloudinary");
const generateCustomId = require("../middlewares/ganerateCustomId");
const { generateToken } = require("../middlewares/jsonToken");
const customerModel = require("../models/customerModel");

exports.registerNewCustomer = async (req, res) => {
  try {
    const { name, email, mobile, address, password } = req.body;

    let profileImage = null;

    if (req.files && req.files?.profileImage) {
      profileImage = req.files?.profileImage[0];
    }

    if (!name || !email || !mobile || !address || !password) {
      return res.status(400).json({ message: "All fields are required." });
    }

    let profileImageResult = null;

    if (profileImage) {
      profileImageResult = await uploadFile(
        profileImage.tempFilePath,
        profileImage.mimeType
      );
      if (profileImageResult.error) {
        return res
          .status(500)
          .json({ message: "Error uploading customer profile image" });
      }
    }

    const customerId = await generateCustomId(
      customerModel,
      "customerId",
      "customerId"
    );

    const newCustomer = new customerModel({
      customerId,
      name,
      email,
      mobile,
      address,
      password,
      profileImage: profileImageResult
        ? {
            secure_url: profileImageResult.secure_url,
            public_id: profileImageResult.public_id,
          }
        : null,
    });

    const savedCustomer = await newCustomer.save();

    const token = generateToken({ ...savedCustomer._doc });

    res.cookie("token", token, {
      httpOnly: true, // Prevent JavaScript access
      sameSite: "strict", // CSRF protection
      maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
    });

    return res.status(201).json({
      message: "Customer registered successfully.",
      customer: savedCustomer._doc,
      token,
    });
  } catch (error) {
    console.error("Error creating new Customer details:", error);
    if (error.code === 11000) {
      return res.status(400).json({
        error: "Customer already exists.",
      });
    }
    return res.status(500).json({
      message: "Internal Server Error",
      error: error.message,
    });
  }
};

exports.getAllCustomers = async (req, res) => {
  try {
    const {
      page = 1, // default page 1
      limit = 10, // default limit to 10
      sortBy = "createdAt", // default sorting by createdAt
      order = "desc", // default descending order
      isLogin,
    } = req.query;

    let query = {};

    if (isLogin !== undefined) {
      query.isLogin = isLogin === "true" ? true : false;
    }

    // Pagination setup
    const skip = (page - 1) * limit;

    // Sorting setup
    const sortOrder = order === "asc" ? 1 : -1;

    const customers = await customerModel
      .find(query)
      .skip(skip)
      .limit(parseInt(limit))
      .sort({ [sortBy]: sortOrder })
      .populate("cart")
      .populate("orders")
      .populate("wishlist")
      .populate("payments")
      .populate("used_coupon");

    const totalCustomers = await customerModel.countDocuments(query);

    return res.status(200).json({
      customers,
      pagination: {
        totalCount: totalCustomers,
        currentPage: parseInt(page),
        totalPages: Math.ceil(totalCustomers / limit),
      },
    });
  } catch (error) {
    console.error("Error getting customers:", error);
    return res
      .status(500)
      .json({ message: "Internal Server Error", error: error.message });
  }
};

exports.searchCustomers = async (req, res) => {
  try {
    const {
      search,
      page = 1, // default page 1
      limit = 10,
    } = req.query;

    if (!search) {
      return res.status(400).json({ message: "Search query is required" });
    }

    let query = {
      $or: [
        { name: { $regex: search, $options: "i" } },
        { email: { $regex: search, $options: "i" } },
        { mobile: { $regex: search, $options: "i" } },
        { address: { $elemMatch: { $regex: search, $options: "i" } } },
      ],
    };

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const customers = await customerModel
      .find(query)
      .skip(skip)
      .limit(parseInt(limit))
      .populate("cart")
      .populate("orders")
      .populate("wishlist")
      .populate("payments")
      .populate("used_coupon");

    const totalCustomers = await customerModel.countDocuments(query);

    res.status(200).json({
      customers,
      pagination: {
        totalCount: totalCustomers,
        currentPage: parseInt(page),
        totalPages: Math.ceil(totalCustomers / limit),
      },
    });
  } catch (error) {
    console.error("Error searching customers:", error);
    return res.status(500).json({
      message: "Internal Server Error",
      error: error.message,
    });
  }
};

exports.getCustomerById = async (req, res) => {
  try {
    const { id } = req.params;

    const customer = await customerModel
      .findOne({
        $or: [
          { customerId: id },
          { _id: mongoose.Types.ObjectId.isValid(id) ? id : undefined },
        ],
      })
      .populate("cart")
      .populate("orders")
      .populate("wishlist")
      .populate("payments")
      .populate("used_coupon");

    if (!customer) {
      return res.status(404).json({ message: "Customer not found" });
    }

    res
      .status(200)
      .json({ message: "Customer fetched successfully", customer });
  } catch (error) {
    console.log("Error getting customer details:", error);
    res
      .status(500)
      .json({ message: "Internal Server Error", error: error.message });
  }
};

exports.deleteCustomerById = async (req, res) => {
  try {
    const { id } = req.params;
    const deletedCustomer = await customerModel.findOne({
      $or: [
        { customerId: id },
        { _id: mongoose.Types.ObjectId.isValid(id) ? id : null },
      ],
    });
    if (deletedCustomer) {
      return res
        .status(404)
        .json({ message: "No Customer found", success: false });
    }
    await deleteFile(deletedCustomer.profileImage.public_id);

    await customerModel.findByIdAndDelete(deletedCustomer._id);
    res
      .status(200)
      .json({ message: "Customer Data Delete Successfully", success: true });
  } catch (error) {
    console.log("Error deleting customer:", error);
    res.status(500).json({ message: "Internal Server Error", error: error });
  }
};

exports.getAllWishlist = async (req, res) => {
  try {
    const { minPrice, maxPrice, category, name } = req.query;

    // Find all customers and populate the wishlist
    const customers = await customerModel
      .find()
      .populate({
        path: "wishlist",
        match: {
          ...(minPrice && { price: { $gte: minPrice } }),
          ...(maxPrice && { price: { $lte: maxPrice } }),
          ...(category && { category: category }),
          ...(name && { name: { $regex: name, $options: "i" } }),
        },
      })
      .exec();

    // Extract wishlist items from all customers
    const allWishlistItems = customers
      .flatMap((customer) => customer.wishlist)
      .filter(Boolean);

    res.status(200).json({ wishlist: allWishlistItems });
  } catch (error) {
    console.error("Error getting wishlist details:", error);
    return res.status(500).json({
      message: "Internal Server Error",
      error: error.message,
    });
  }
};

exports.addToWishlist = async (req, res) => {
  try {
    const { customerId, productId } = req.body;
    const customer = await customerModel.findOne({
      $or: [
        { customerId: customerId },
        {
          _id: mongoose.Types.ObjectId.isValid(customerId)
            ? customerId
            : undefined,
        },
      ],
    });
    if (!customer) {
      return res.status(404).json({ message: "Customer not found" });
    }
    if (!customer.wishlist.includes(productId)) {
      customer.wishlist.push(productId);
      await customer.save();
    }
    const updatedCustomer = await customerModel
      .findOne({
        $or: [
          { customerId: customerId },
          {
            _id: mongoose.Types.ObjectId.isValid(customerId)
              ? customerId
              : undefined,
          },
        ],
      })
      .populate("wishlist");
    res.status(200).json({
      message: "Product added to wishlist",
      wishlist: updatedCustomer.wishlist,
    });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

exports.removeFromWishlist = async (req, res) => {
  try {
    const { customerId, productId } = req.body;
    const customer = await customerModel
      .findOne({ customerId })
      .populate("wishlist");
    if (!customer) {
      return res.status(404).json({ message: "Customer not found" });
    }
    customer.wishlist = customer.wishlist.filter(
      (product) => product._id.toString() !== productId
    );
    await customer.save();
    res.status(200).json({
      message: "Product removed from wishlist",
      wishlist: customer.wishlist,
    });
  } catch (error) {
    console.error("Error removing product from wishlist:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};
exports.getAllCart = async (req, res) => {
  try {
    const { minPrice, maxPrice, category, name } = req.query;

    // Find all customers and populate the wishlist
    const customers = await customerModel
      .find()
      .populate({
        path: "cart",
        match: {
          ...(minPrice && { price: { $gte: minPrice } }),
          ...(maxPrice && { price: { $lte: maxPrice } }),
          ...(category && { category: category }),
          ...(name && { name: { $regex: name, $options: "i" } }),
        },
      })
      .exec();

    // Extract wishlist items from all customers
    const allCartsItems = customers
      .flatMap((customer) => customer.cart)
      .filter(Boolean);

    res.status(200).json({ cart: allCartsItems });
  } catch (error) {
    console.error("Error getting carts details:", error);
    return res.status(500).json({
      message: "Internal Server Error",
      error: error.message,
    });
  }
};

exports.addToCart = async (req, res) => {
  try {
    const { customerId, productId } = req.body;
    const customer = await customerModel.findOne({
      $or: [
        { customerId: customerId },
        {
          _id: mongoose.Types.ObjectId.isValid(customerId)
            ? customerId
            : undefined,
        },
      ],
    });
    if (!customer) {
      return res.status(404).json({ message: "Customer not found" });
    }
    if (!customer.cart.includes(productId)) {
      customer.cart.push(productId);
      await customer.save();
    }
    const updatedCustomer = await customerModel
      .findOne({
        $or: [
          { customerId: customerId },
          {
            _id: mongoose.Types.ObjectId.isValid(customerId)
              ? customerId
              : undefined,
          },
        ],
      })
      .populate("cart");
    res.status(200).json({
      message: "Product added to wishlist",
      wishlist: updatedCustomer.cart,
    });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

exports.removeFromCart = async (req, res) => {
  try {
    const { customerId, productId } = req.body;
    const customer = await customerModel
      .findOne({ customerId })
      .populate("cart");
    if (!customer) {
      return res.status(404).json({ message: "Customer not found" });
    }
    customer.cart = customer.cart.filter(
      (product) => product._id.toString() !== productId
    );
    await customer.save();
    res.status(200).json({
      message: "Product removed from cart",
      cart: customer.cart,
    });
  } catch (error) {
    console.error("Error removing product from cart:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

exports.loginCustomer = async (req, res) => {
  try {
    const { email_or_phone, password } = req.body;
    if (!email_or_phone || !password) {
      return res.status(400).json({ message: "All fields are required." });
    }
    const customer = await customerModel.findOne({
      $or: [{ email: email_or_phone }, { mobile: email_or_phone }],
    });
    if (!customer) {
      return res.status(404).json({ message: "Customer not found" });
    }

    if (!(await customer.matchPassword(password))) {
      return res.status(401).json({ message: "Incorrect password" });
    }
    const token = generateToken(...customer);
    res.cookie("token", token, {
      httpOnly: true, // Prevent JavaScript access
      sameSite: "strict", // CSRF protection
      maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
    });
    res.status(200).json({ message: "Login successful", customer });
  } catch (error) {
    console.log("Error logging in customer:", error);
    res.status(500).json({ message: "Internal Server Error", error: error });
  }
};

exports.logoutCustomer = async (req, res) => {
  try {
    res.clearCookie("token", {
      httpOnly: true,
      sameSite: "strict",
    });
    res.status(200).json({ message: "Logout successful" });
  } catch (error) {
    console.error("Error logging out customer:", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
};


