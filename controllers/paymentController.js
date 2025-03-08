const paymentModel = require("../models/paymentModel");

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
