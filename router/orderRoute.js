const express = require("express");
const {
  createNewOrder,
  getAllOrders,
  getOrderDetailsById,
  deleteOrder,
} = require("../controllers/orderController");
const orderRouter = express.Router();

orderRouter.post("/", createNewOrder);

orderRouter.get("/", getAllOrders);

orderRouter.route("/:id").get(getOrderDetailsById).delete(deleteOrder);

module.exports = orderRouter;
