// const mongoose = require("mongoose");

// const orderSchema = new mongoose.Schema(
//   {
//     orderId: {
//       type: String,
//       unique: true,
//       required: true,
//     },
//     customerId: {
//       type: mongoose.Schema.Types.ObjectId,
//       ref: "Customers",
//       required: true,
//     },
//     products: [
//       {
//         productId: {
//           type: String,
//           required: true,
//         },
//         quantity: {
//           type: Number,
//           required: true,
//         },
//       },
//     ],
//     totalAmount: {
//       type: Number,
//       required: true,
//     },
//     status: {
//       type: String,
//       required: true,
//     },
//   },
//   { timestamps: true }
// );

// module.exports =
//   mongoose.models.Orders || mongoose.model("Orders", orderSchema);
