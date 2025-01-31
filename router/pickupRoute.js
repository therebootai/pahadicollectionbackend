const express = require("express");
const router = express.Router();

const pickupController = require("../controllers/pickupControllers");

router.post("/create", pickupController.createPickups);
router.get("/get", pickupController.getPickups);
router.get("/check-mobile/:mobileNo", pickupController.checkMobile);

router.put("/update/:pickupId", pickupController.updatePickup);

router.delete("/delete/:pickupId", pickupController.deletePickup);

module.exports = router;
