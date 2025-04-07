const express = require("express");
const {
  registerNewCustomer,
  getAllCustomers,
  searchCustomers,
  getCustomerById,
  deleteCustomerById,
  getAllWishlist,
  addToWishlist,
  removeFromWishlist,
  getAllCart,
  addToCart,
  removeFromCart,
  loginCustomer,
  logoutCustomer,
  updateCustomerById,
  checkAuthorization,
} = require("../controllers/customerControler");
const { authenticateUser } = require("../middlewares/jsonToken");
const customerRouter = express.Router();

customerRouter.post("/", registerNewCustomer);

customerRouter.get("/", getAllCustomers);

customerRouter.get("/find", searchCustomers);

customerRouter.get("/wishlist", getAllWishlist);

customerRouter.put("/wishlist/add", addToWishlist);

customerRouter.put("/wishlist/remove", removeFromWishlist);

customerRouter.get("/cart", getAllCart);

customerRouter.put("/cart/add", addToCart);

customerRouter.put("/cart/remove", removeFromCart);

customerRouter.post("/login", loginCustomer);

customerRouter.get("/logout", authenticateUser, logoutCustomer);

customerRouter.get("/check-auth", authenticateUser, checkAuthorization);

customerRouter
  .route("/:id")
  .get(getCustomerById)
  .delete(deleteCustomerById)
  .put(updateCustomerById);

module.exports = customerRouter;
