const express = require("express");
const {
  createNewCoupon,
  getAllCoupons,
  searchCoupons,
  deleteCouponById,
  getCouponById,
  updateCouponById,
} = require("../controllers/couponController");

const couponRouter = express.Router();

couponRouter.post("/", createNewCoupon);

couponRouter.get("/", getAllCoupons);

couponRouter.get("/search", searchCoupons);

couponRouter
  .route("/:id")
  .delete(deleteCouponById)
  .get(getCouponById)
  .put(updateCouponById);

module.exports = couponRouter;
