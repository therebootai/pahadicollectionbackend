const mongoose = require("mongoose");

const orderModel = require("../models/orderModel");
const paymentModel = require("../models/paymentModel");
const generateCustomId = require("../middlewares/ganerateCustomId");
const customerModel = require("../models/customerModel");
const couponModel = require("../models/couponModel");
const productModel = require("../models/productModel");

exports.createNewOrder = async (req, res) => {
  try {
    const {
      customerId,
      products, // array of { productId, quantity }
      totalAmount,
      delivery_location,
      couponId,
      paymentStatus,
      paymentMode,
      razorpayPaymentId = "",
      razorpayOrderId = "",
      signature = "",
      captured = true,
    } = req.body;

    if (!customerId || !products || !totalAmount) {
      return res.status(400).json({ message: "All fields are required." });
    }

    const now = new Date();
    const pad = (n) => n.toString().padStart(2, "0");
    const formattedPrefix = `PA-${pad(now.getDate())}-${pad(
      now.getMonth() + 1
    )}-${now.getFullYear()}-${pad(now.getHours())}-${pad(
      now.getMinutes()
    )}-${pad(now.getSeconds())}`;

    const insufficientStock = [];

    for (const item of products) {
      const product = await productModel.findById(item.productId);

      if (!product) {
        return res
          .status(404)
          .json({ message: `Product ${item.productId} not found` });
      }

      if (product.in_stock < item.quantity) {
        insufficientStock.push({
          productId: item.productId,
          available: product.in_stock,
          requested: item.quantity,
        });
      }
    }

    if (insufficientStock.length > 0) {
      return res.status(400).json({
        message:
          "Some products are out of stock or have insufficient quantity.",
        insufficientStock,
      });
    }

    // Update in_stock for each product
    await Promise.all(
      products.map(async ({ productId, quantity }) => {
        const product = await productModel.findById(productId);

        const newStock = product.in_stock - quantity;

        await productModel.findByIdAndUpdate(
          productId,
          {
            $inc: { in_stock: -quantity },
            ...(newStock <= 0 ? { isActive: false } : {}),
          },
          { new: true }
        );
      })
    );

    // Step 1: Generate orderIds and create orders
    const orderPromises = products.map(async (product, index) => {
      const orderId = await generateCustomId(
        orderModel,
        "orderId",
        `${formattedPrefix}-${index + 1}`
      );

      const newOrder = new orderModel({
        orderId,
        customerId,
        products: {
          productId: product.productId,
          quantity: product.quantity,
        },
        totalAmount,
        delivery_location,
        couponId,
      });

      return await newOrder.save();
    });

    const createdOrders = await Promise.all(orderPromises);
    const orderIds = createdOrders.map((order) => order._id);

    // Step 2: Create payment
    const paymentId = await generateCustomId(
      paymentModel,
      "paymentId",
      "paymentId"
    );

    const newPayment = new paymentModel({
      paymentId,
      orderId: orderIds, // array of ObjectIds
      customerId,
      amount: totalAmount,
      paymentStatus,
      paymentMode,
      razorpayPaymentId,
      razorpayOrderId,
      signature,
      captured,
      method: paymentMode,
    });

    const savedPayment = await newPayment.save();

    // Step 3: Parallel updates
    const updateCustomerPromise = customerModel.findByIdAndUpdate(
      customerId,
      {
        $push: {
          orders: { $each: orderIds },
          payments: savedPayment._id,
          ...(couponId ? { used_coupon: couponId } : {}),
        },
      },
      { new: true }
    );

    const updateOrdersPromise = orderModel.updateMany(
      { _id: { $in: orderIds } },
      { $set: { paymentId: savedPayment._id } }
    );

    const couponUpdatePromise =
      couponId && couponId !== ""
        ? couponModel.findByIdAndUpdate(
            couponId,
            { $push: { usedBy: customerId } },
            { new: true }
          )
        : Promise.resolve(null); // dummy promise if no coupon

    await Promise.all([
      updateCustomerPromise,
      updateOrdersPromise,
      couponUpdatePromise,
    ]);

    res.status(200).json({
      message: "Orders and payment created successfully",
      data: {
        orders: createdOrders,
        payment: savedPayment,
      },
    });
  } catch (error) {
    console.error("Error creating orders:", error);
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
      orderId,
    } = req.query;

    page = parseInt(page);
    limit = parseInt(limit);

    const filter = {};
    if (status) filter.status = status;
    if (customerId) filter.customerId = customerId;
    if (orderId) filter.orderId = orderId;

    const orders = await orderModel
      .find(filter)
      .sort({ [sortBy]: order === "desc" ? -1 : 1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .populate("customerId")
      .populate("products.productId")
      .populate("couponId")
      .populate("paymentId");

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
    const { products, status, delivery_location, cancel_message } = req.body;
    const updatedFields = {};

    // Validate ID
    const query = mongoose.Types.ObjectId.isValid(id)
      ? { _id: id }
      : { orderId: id };

    // Fetch the existing order to access its current data
    const existingOrder = await orderModel.findOne(query);

    if (!existingOrder) {
      return res.status(404).json({ message: "Order not found" });
    }

    // If products are being updated
    if (products && products.productId && products.quantity != null) {
      updatedFields.products = {
        productId: products.productId,
        quantity: products.quantity,
      };
    }

    if (status) updatedFields.status = status;
    if (delivery_location) updatedFields.delivery_location = delivery_location;
    if (cancel_message) updatedFields.cancel_message = cancel_message;

    // If status indicates refund/cancellation, restore stock
    const refundStatuses = [
      "canceled",
      "canceled_and_refunded",
      "return_and_refunded",
    ];
    const isRefundStatus =
      status && refundStatuses.includes(status.toLowerCase());

    if (isRefundStatus) {
      const productToUpdate = await productModel.findById(
        existingOrder.products.productId
      );
      if (productToUpdate) {
        await productModel.findByIdAndUpdate(
          productToUpdate._id,
          {
            $inc: { in_stock: existingOrder.products.quantity },
            ...(productToUpdate.in_stock + existingOrder.products.quantity > 0
              ? { isActive: true }
              : {}),
          },
          { new: true }
        );
      }
    }

    // Update the order
    const updatedOrder = await orderModel.findOneAndUpdate(
      query,
      { $set: updatedFields },
      { new: true, runValidators: true }
    );

    res.status(200).json({
      message: "Order details updated successfully",
      order: updatedOrder,
    });
  } catch (error) {
    console.log("Error updating order details:", error);
    res.status(500).json({ message: error.message });
  }
};
