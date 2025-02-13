const mongoose = require("mongoose");

const orderModel = require("../models/orderModel");
const paymentModel = require("../models/paymentModel");

exports.createNewOrder = async (req, res) => {
  try {
    const {
      customerId,
      products,
      totalAmount,
      delivery_location,
      couponId,
      paymentStatus,
      paymentMode,
    } = req.body;

    const orderId = await generateCustomId(orderModel, "orderId", "orderId");

    const paymentId = await generateCustomId(
      paymentModel,
      "paymentId",
      "paymentId"
    );

    const newOrder = new orderModel({
      orderId,
      customerId,
      products,
      totalAmount,
      delivery_location,
      couponId,
    });

    const savedOrder = await newOrder.save();

    const newPayment = new paymentModel({
      paymentId,
      orderId: newOrder._id,
      customerId,
      amount: totalAmount,
      paymentStatus,
      paymentMode,
    });

    const savedPayment = await newPayment.save();

    const updatedOrder = await orderModel.findByIdAndUpdate(
      savedOrder._id,
      { paymentId: savedPayment._id },
      { new: true }
    );

    res.status(200).json({
      message: "Order created successfully",
      data: { order: updatedOrder, payment: savedPayment },
    });
  } catch (error) {
    console.log("Error creating order:", error);
    res.status(500).json({ message: "Internal Server Error", error: error });
  }
};

exports.getAllOrders = async (req, res) => {
  try {
    let {
      page = 1,
      limit = 10,
      sortBy = "createdAt",
      order = "desc",
      status,
      customerId,
    } = req.query;

    page = parseInt(page);
    limit = parseInt(limit);

    const filter = {};
    if (status) filter.status = status;
    if (customerId) filter.customerId = customerId;

    const orders = await orderModel
      .find(filter)
      .sort({ [sortBy]: order === "desc" ? -1 : 1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .populate("customerId") // Populate customer details
      .populate("products.productId") // Populate product details
      .populate("couponId") // Populate coupon details
      .populate("paymentId"); // Populate payment details

    const totalOrders = await orderModel.countDocuments(filter);

    res.status(200).json({
      orders,
      pagination: {
        totalCount: totalOrders,
        totalPages: Math.ceil(totalOrders / limit),
        currentPage: page,
      },
    });
  } catch (error) {
    console.log("Error fetching orders:", error);
    res.status(500).json({ message: "Internal Server Error", error: error });
  }
};

exports.searchOrders = async (req, res) => {
  try {
    let { query, page = 1, limit = 10 } = req.query;
    page = parseInt(page);
    limit = parseInt(limit);

    if (!query) {
      return res
        .status(400)
        .json({ success: false, message: "Search query is required." });
    }

    const searchFilter = {
      $or: [{ orderId: { $regex: query, $options: "i" } }],
    };

    const orders = await orderModel
      .find(searchFilter)
      .skip((page - 1) * limit)
      .limit(limit)
      .populate("customerId")
      .populate("products.productId");

    const totalOrders = await orderModel.countDocuments(searchFilter);

    res.status(200).json({
      orders,
      pagination: {
        totalCount: totalOrders,
        totalPages: Math.ceil(totalOrders / limit),
        currentPage: page,
      },
    });
  } catch (error) {
    console.log("Error searching orders:", error);
    res.status(500).json({ message: "Internal Server Error", error: error });
  }
};

exports.getOrderDetailsById = async (req, res) => {
  try {
    const { id } = req.params;
    const order = await orderModel
      .findOne({
        $or: [
          { orderId: id },
          { _id: mongoose.Types.ObjectId.isValid(id) ? id : null },
        ],
      })
      .populate("customerId")
      .populate("products.productId")
      .populate("couponId")
      .populate("paymentId");

    if (!order) {
      return res.status(404).json({ message: "Order not found" });
    }
    res.status(200).json({ order });
  } catch (error) {
    console.log("Error fetching order details:", error);
    res.status(500).json({ message: "Internal Server Error", error: error });
  }
};

exports.deleteOrder = async (req, res) => {
  try {
    const { id } = req.params;
    const deletedOrder = await orderModel.findOne({
      $or: [
        { orderId: id },
        { _id: mongoose.Types.ObjectId.isValid(id) ? id : null },
      ],
    });
    if (!deletedOrder) {
      return res.status(404).json({ message: "Order not found" });
    }

    await paymentModel.findByIdAndDelete(deletedOrder.paymentId);
    await orderModel.findByIdAndDelete(deletedOrder._id);
    res
      .status(200)
      .json({ success: true, message: "Order Data Delete Successfully" });
  } catch (error) {
    console.log("Error deleting order:", error);
    res.status(500).json({ message: "Internal Server Error", error: error });
  }
};
