const express = require("express");
const {
  createNewOrder,
  getAllOrders,
  getOrderDetailsById,
  deleteOrder,
  updateOrderDetails,
  searchOrders,
} = require("../controllers/orderController");
const orderRouter = express.Router();

orderRouter.post("/", createNewOrder);

orderRouter.get("/", getAllOrders);

orderRouter.get("/find", searchOrders);

orderRouter
  .route("/:id")
  .get(getOrderDetailsById)
  .delete(deleteOrder)
  .put(updateOrderDetails);

module.exports = orderRouter;
