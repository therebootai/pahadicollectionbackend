const express = require("express");
const {
  registerNewCustomer,
  getAllCustomers,
  searchCustomers,
} = require("../controllers/customerControler");
const customerRouter = express.Router();

customerRouter.post("/", registerNewCustomer);

customerRouter.get("/", getAllCustomers);

customerRouter.get("/search", searchCustomers);

module.exports = customerRouter;
