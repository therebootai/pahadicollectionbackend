const paymentModel = require("../models/paymentModel");

const Razorpay = require("razorpay");
const crypto = require("crypto");
const orderModel = require("../models/orderModel");

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET,
});

exports.getAllPayments = async (req, res) => {
  try {
    let {
      page = 1,
      limit = 10,
      sortBy = "createdAt",
      order = "desc",
      status,
      paymentMode,
    } = req.query;

    page = parseInt(page);
    limit = parseInt(limit);

    const filter = {};
    if (status) filter.paymentStatus = status;
    if (paymentMode) filter.paymentMode = paymentMode;

    const [payments, totalPayments] = await Promise.all([
      paymentModel
        .find(filter)
        .sort({ [sortBy]: order === "desc" ? -1 : 1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .populate("customerId")
        .populate("orderId"),
      paymentModel.countDocuments(filter),
    ]);

    res.status(200).json({
      payments,
      pagination: {
        totalCount: totalPayments,
        totalPages: Math.ceil(totalPayments / limit),
        currentPage: page,
      },
    });
  } catch (error) {
    console.log("Error getting payment details:", error);
    res.status(500).json({ message: error.message });
  }
};

exports.createRazorpayOrder = async (req, res) => {
  try {
    const { amount, customerId, orderId, paymentMode } = req.body;


    const options = {
      amount: amount,
      currency: "INR",
      receipt: `order_rcptid_${Math.floor(Math.random() * 1000000)}`,
      payment_capture: 1,
    };

    const razorpayOrder = await razorpay.orders.create(options);

    const payment = new paymentModel({
      paymentId: razorpayOrder.id,
      customerId: customerId,
      razorpayPaymentId: "",
      razorpayOrderId: razorpayOrder.id,
      amount: amount,
      paymentStatus: "pending",
      orderId: orderId,
      paymentMode: paymentMode,
      is_refunded: false,
      currency: razorpayOrder.currency,
      method: razorpayOrder.method,
      signature: "",
      captured: false,
    });

    await payment.save();

    res.status(200).json({
      success: true,
      order: razorpayOrder,
      paymentId: payment._id,
    });
  } catch (error) {
    console.error("Razorpay order error:", error);
    res.status(500).json({ success: false, message: "Razorpay order failed" });
  }
};

exports.handlePaymentSuccess = async (req, res) => {
  try {
    const {
      razorpay_payment_id,
      razorpay_order_id,
      razorpay_signature,
      paymentId,
    } = req.body;

    const payment = await paymentModel.findOne({ paymentId });
    if (!payment) {
      return res.status(400).json({ message: "Payment not found." });
    }

    if (!razorpay_payment_id || !razorpay_order_id || !razorpay_signature) {
      return res
        .status(400)
        .json({ message: "Missing required payment data." });
    }

    const body = razorpay_order_id + "|" + razorpay_payment_id;
    const secret = process.env.RAZORPAY_KEY_SECRET;

    const expectedSignature = crypto
      .createHmac("sha256", secret)
      .update(body)
      .digest("hex");

    if (expectedSignature !== razorpay_signature) {
      return res.status(400).json({ message: "Signature verification failed" });
    }
    const razorpayPaymentDetails = await razorpay.payments.fetch(
      razorpay_payment_id
    );
    const paymentMethod = razorpayPaymentDetails.method;
    const updatedPayment = await paymentModel.findOneAndUpdate(
      { paymentId },
      {
        razorpayPaymentId: razorpay_payment_id,
        razorpayOrderId: razorpay_order_id,
        paymentStatus: "completed",
        signature: razorpay_signature,
        method: paymentMethod,
        captured: true,
      },
      { new: true }
    );

    if (!updatedPayment) {
      return res.status(400).json({ message: "Payment not found." });
    }

    res.status(200).json({
      message: "Payment successful",
      data: updatedPayment,
    });
  } catch (error) {
    console.error("Error handling payment success:", error);
    res.status(500).json({ message: "Payment processing failed" });
  }
};
