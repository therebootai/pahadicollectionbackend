const mongoose = require("mongoose");
const { uploadFile, deleteFile } = require("../middlewares/cloudinary");
const generateCustomId = require("../middlewares/ganerateCustomId");
const { generateToken } = require("../middlewares/jsonToken");
const customerModel = require("../models/customerModel");

exports.registerNewCustomer = async (req, res) => {
  try {
    const { name, email, mobile, password } = req.body;

    let profileImage = null;

    if (req.files && req.files?.profileImage) {
      profileImage = req.files?.profileImage[0];
    }

    if (!name || !email || !mobile || !password) {
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
      address: [],
      password,
      profileImage: profileImageResult
        ? {
            secure_url: profileImageResult.secure_url,
            public_id: profileImageResult.public_id,
          }
        : null,
    });

    const savedCustomer = await newCustomer.save();

    const token = generateToken({ user: savedCustomer._doc._id });

    res.cookie("token", token, {
      httpOnly: true, // Prevent JavaScript access
      sameSite: "none", // CSRF protection,
      secure: true,
      maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
    });

    return res.status(201).json({
      message: "Customer registered successfully.",
      customer: savedCustomer._doc,
    });
  } catch (error) {
    console.error("Error creating new Customer details:", error);
    if (error.code === 11000) {
      return res.status(400).json({
        message: "Customer already exists.",
      });
    }
    return res.status(500).json({ message: error.message });
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
      customerId,
    } = req.query;

    let query = {};

    if (isLogin !== undefined) {
      query.isLogin = isLogin === "true" ? true : false;
    }

    if (customerId) {
      query.customerId = customerId;
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
      .populate("cart.productId")
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
    return res.status(500).json({ message: error.message });
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
        { customerId: { $regex: search, $options: "i" } },
        { address: { $elemMatch: { $regex: search, $options: "i" } } },
      ],
    };

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const customers = await customerModel
      .find(query)
      .skip(skip)
      .limit(parseInt(limit))
      .populate("cart.productId")
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
    return res.status(500).json({ message: error.message });
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
      .populate("cart.productId")
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
    res.status(500).json({ message: error.message });
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
    res.status(500).json({ message: error.message });
  }
};

exports.updateCustomerById = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      name,
      email,
      mobile,
      address,
      password,
      cart,
      wishlist,
      used_coupon,
      isLogin,
      is_disabled,
    } = req.body;

    const customer = await customerModel.findOne({
      $or: [
        { _id: mongoose.Types.ObjectId.isValid(id) ? id : null },
        { customerId: id },
      ],
    });

    if (!customer) {
      return res.status(404).json({ message: "Customer not found." });
    }

    if (email && email !== customer.email) {
      const emailExists = await customerModel.findOne({ email });
      if (emailExists) {
        return res.status(400).json({ message: "Email is already in use." });
      }
      customer.email = email;
    }

    if (mobile && mobile !== customer.mobile) {
      const mobileExists = await customerModel.findOne({ mobile });
      if (mobileExists) {
        return res
          .status(400)
          .json({ message: "Mobile number is already in use." });
      }
      customer.mobile = mobile;
    }

    // Update other fields if provided
    if (name) customer.name = name;
    if (address) customer.address = address;
    if (typeof isLogin === "boolean") customer.isLogin = isLogin;
    if (typeof is_disabled === "boolean") customer.is_disabled = is_disabled;

    // Update password (Triggers pre-save hook for hashing)
    if (password) {
      customer.password = password; // Will be hashed by pre("save") middleware
    }

    // Update arrays while avoiding duplicates
    if (cart) {
      customer.cart = [...new Set([...customer.cart, ...cart])];
    }
    if (wishlist) {
      customer.wishlist = [...new Set([...customer.wishlist, ...wishlist])];
    }

    if (used_coupon) {
      customer.used_coupon = [
        ...new Set([...customer.used_coupon, ...used_coupon]),
      ];
    }

    // Handle profile image update
    if (req.files && req.files.profileImage) {
      const profileImage = req.files.profileImage[0];

      // Upload new image to Cloudinary
      const profileImageResult = await uploadFile(
        profileImage.tempFilePath,
        profileImage.mimeType
      );

      if (profileImageResult.error) {
        return res
          .status(500)
          .json({ message: "Error uploading profile image." });
      }

      // If the customer has an existing profile image, remove the old one from Cloudinary
      if (customer.profileImage?.public_id) {
        await deleteFile(customer.profileImage.public_id);
      }

      customer.profileImage = {
        secure_url: profileImageResult.secure_url,
        public_id: profileImageResult.public_id,
      };
    }

    // Save customer to trigger pre-save hook for password hashing
    const savedCustomer = await customer.save();

    return res.status(200).json({
      message: "Customer updated successfully.",
      customer: savedCustomer,
    });
  } catch (error) {
    console.log("Error updateing customer:", error);
    res.status(500).json({ message: error.message });
  }
};

exports.getAllWishlist = async (req, res) => {
  try {
    const {
      minPrice,
      maxPrice,
      category,
      name,
      page = 1,
      limit = 10,
      customerId,
    } = req.query;

    const pageNumber = parseInt(page, 10);
    const limitNumber = parseInt(limit, 10);

    const query = {};

    if (customerId) {
      query.$or = [
        { customerId: customerId },
        {
          _id: mongoose.Types.ObjectId.isValid(customerId) ? customerId : null,
        },
      ];
    }

    // Find customers and populate wishlist with filtering conditions
    const customers = await customerModel
      .find(query)
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

    // Map wishlist items with their respective customer details
    const allWishlistItems = customers.flatMap((customer) =>
      customer.wishlist.map((wishlistItem) => ({
        ...wishlistItem.toObject(), // Convert Mongoose document to plain object
        customer: {
          _id: customer._id,
          name: customer.name,
          email: customer.email,
          mobile: customer.mobile,
        },
      }))
    );

    const totalCount = allWishlistItems.length;
    const totalPages = Math.ceil(totalCount / limitNumber);
    const paginatedWishlist = allWishlistItems.slice(
      (pageNumber - 1) * limitNumber,
      pageNumber * limitNumber
    );

    res.status(200).json({
      wishlist: paginatedWishlist,
      pagination: {
        totalCount,
        currentPage: pageNumber,
        totalPages: totalPages === 0 ? 1 : totalPages,
      },
    });
  } catch (error) {
    console.error("Error getting wishlist details:", error);
    return res.status(500).json({ message: error.message });
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
        path: "cart.productId",
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
    return res.status(500).json({ message: error.message });
  }
};

exports.addToCart = async (req, res) => {
  try {
    const { customerId, productId, quantity = 1 } = req.body; // Default quantity to 1 if not provided

    // Find the customer using either customerId or _id
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

    // Check if the product already exists in the cart
    const existingCartItem = customer.cart.find(
      (item) => item.productId.toString() === productId
    );

    if (existingCartItem) {
      // If the product already exists, update its quantity
      existingCartItem.quantity += quantity;
    } else {
      // If the product doesn't exist, add a new item to the cart
      customer.cart.push({ productId, quantity });
    }

    await customer.save();

    // Populate cart with product details
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
      .populate("cart.productId");

    res.status(200).json({
      message: "Product added to cart",
      cart: updatedCustomer.cart,
    });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

exports.removeFromCart = async (req, res) => {
  try {
    const { customerId, productId, quantity = 1 } = req.body;

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

    const cartItemIndex = customer.cart.findIndex(
      (item) => item.productId.toString() === productId
    );

    if (cartItemIndex === -1) {
      return res.status(404).json({ message: "Product not found in cart" });
    }

    // If quantity > 1, decrease the quantity
    if (customer.cart[cartItemIndex].quantity > quantity) {
      customer.cart[cartItemIndex].quantity -= quantity;
    } else {
      // If quantity <= requested removal quantity, remove the product
      customer.cart.splice(cartItemIndex, 1);
    }

    await customer.save();

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
      .populate("cart.productId");

    res.status(200).json({
      message: "Product removed from cart",
      cart: updatedCustomer.cart,
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
    const customer = await customerModel
      .findOneAndUpdate(
        {
          $or: [{ email: email_or_phone }, { mobile: email_or_phone }],
        },
        { $set: { isLogin: true } },
        { new: true, runValidators: true }
      )
      .populate("cart.productId")
      .populate("orders")
      .populate("wishlist")
      .populate("payments")
      .populate("used_coupon")
      .populate("reviewed");

    if (!customer) {
      return res.status(404).json({ message: "Customer not found" });
    }

    if (!(await customer.matchPassword(password))) {
      return res.status(401).json({ message: "Incorrect password" });
    }
    if (customer.is_disabled) {
      return res
        .status(401)
        .json({ message: "No Permission to Log In. Contact With Admin" });
    }
    const token = generateToken({ user: customer._id });
    res.cookie("token", token, {
      httpOnly: true,
      sameSite: "none",
      secure: true,
      maxAge: 30 * 24 * 60 * 60 * 1000,
    });
    res.status(200).json({ message: "Login successful", customer });
  } catch (error) {
    console.log("Error logging in customer:", error);
    res.status(500).json({ message: error.message });
  }
};

exports.logoutCustomer = async (req, res) => {
  try {
    const { user } = req;

    await customerModel.findByIdAndUpdate(
      user._id,
      { $set: { isLogin: false } },
      { new: true, runValidators: true }
    );
    res.clearCookie("token", {
      httpOnly: true,
      sameSite: "none",
      secure: true,
    });
    res.status(200).json({ message: "Logout successful" });
  } catch (error) {
    console.error("Error logging out customer:", error);
    res.status(500).json({ message: error.message });
  }
};

exports.checkAuthorization = async (req, res) => {
  try {
    const { user } = req;

    if (!user) {
      return res.status(401).json({ message: "invailid" });
    }
    const loggedUser = await customerModel
      .findById(user)
      .populate("cart.productId")
      .populate("orders")
      .populate("wishlist")
      .populate("payments")
      .populate("used_coupon")
      .populate("reviewed");

    if (!loggedUser) {
      return res.status(404).json({ message: "User not found" });
    }

    res.status(200).json({ message: "Authorized", user: loggedUser });
  } catch (error) {
    console.error("Error checking Authorization user:", error);
    res.status(500).json({ message: error.message });
  }
};
