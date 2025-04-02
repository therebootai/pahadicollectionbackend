const mongoose = require("mongoose");

const orderModel = require("../models/orderModel");
const paymentModel = require("../models/paymentModel");
const generateCustomId = require("../middlewares/ganerateCustomId");
const customerModel = require("../models/customerModel");
const couponModel = require("../models/couponModel");

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

    if (!customerId || !products || !totalAmount) {
      return res.status(400).json({ message: "All fields are required." });
    }

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

    let allPromises = [
      await customerModel.findByIdAndUpdate(
        customerId,
        {
          $push: {
            orders: savedOrder._id,
            payments: savedPayment._id,
            used_coupon: couponId,
          },
        },
        { new: true }
      ),
      await orderModel.findByIdAndUpdate(
        savedOrder._id,
        { paymentId: savedPayment._id },
        { new: true }
      ),
    ];

    if (couponId && couponId !== "") {
      allPromises.push(
        await couponModel.findByIdAndUpdate(
          couponId,
          {
            $push: { usedBy: customerId },
          },
          { new: true }
        )
      );
    }

    const [customerUpdate, updatedOrder] = await Promise.all(allPromises);

    res.status(200).json({
      message: "Order created successfully",
      data: { order: updatedOrder, payment: savedPayment },
    });
  } catch (error) {
    console.log("Error creating order:", error);
    res.status(500).json({ message: error.message });
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
    res.status(500).json({ message: error.message });
  }
};

exports.searchOrders = async (req, res) => {
  try {
    let { search, page = 1, limit = 10 } = req.query;
    page = parseInt(page);
    limit = parseInt(limit);

    if (!search) {
      return res
        .status(400)
        .json({ success: false, message: "Search query is required." });
    }

    const searchFilter = {
      $or: [{ orderId: { $regex: search, $options: "i" } }],
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
    res.status(500).json({ message: error.message });
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
    res.status(500).json({ message: error.message });
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
    res.status(500).json({ message: error.message });
  }
};

exports.updateOrderDetails = async (req, res) => {
  try {
    const { id } = req.params;
    const { products, status, delivery_location } = req.body;
    const updatedOrder = await orderModel.findOneAndUpdate(
      {
        $or: [
          { _id: mongoose.Types.ObjectId.isValid(id) ? id : null },
          { couponId: id },
        ],
      },
      {
        $set: {
          ...(products && { products }),
          ...(status && { status }),
          ...(delivery_location && { delivery_location }),
        },
      },
      { new: true, runValidators: true }
    );

    if (!updatedOrder) {
      return res.status(404).json({ message: "Order not found" });
    }
    res.status(200).json({
      message: "Order details updated successfully",
      order: updatedOrder,
    });
  } catch (error) {
    console.log("Error updating order details:", error);
    res.status(500).json({ message: error.message });
  }
};
