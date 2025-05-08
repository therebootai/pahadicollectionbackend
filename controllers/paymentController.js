const paymentModel = require("../models/paymentModel");

const Razorpay = require("razorpay");

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
        .populate("customerId") // Populate customer details
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
    const { amount } = req.body;

    const options = {
      amount: amount,
      currency: "INR",
      receipt: `order_rcptid_${Math.floor(Math.random() * 1000000)}`,
    };

    const order = await razorpay.orders.create(options);

    res.status(200).json({
      success: true,
      order,
    });
  } catch (error) {
    console.error("Razorpay order error:", error);
    res.status(500).json({ success: false, message: "Razorpay order failed" });
  }
};
