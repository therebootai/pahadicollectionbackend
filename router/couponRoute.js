const express = require("express");
const {
  createNewCoupon,
  getAllCoupons,
  searchCoupons,
  deleteCouponById,
  getCouponById,
  updateCouponById,
  getCouponByName,
} = require("../controllers/couponController");
const { authenticateUser } = require("../middlewares/jsonToken");

const couponRouter = express.Router();

couponRouter.post("/", createNewCoupon);

couponRouter.get("/", getAllCoupons);

couponRouter.get("/find", searchCoupons);

couponRouter.get("/use/:coupon_code", authenticateUser, getCouponByName);

couponRouter
  .route("/:id")
  .delete(deleteCouponById)
  .get(getCouponById)
  .put(updateCouponById);

module.exports = couponRouter;
