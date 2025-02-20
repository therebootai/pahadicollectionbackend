const express = require("express");
const router = express.Router();
const userController = require("../controllers/userController");
const { authenticateUser } = require("../middlewares/jsonToken");

// // Get all users
router.get("/users", userController.getAllUsers);

// Create a new user
router.post("/users", userController.createUser);

router.post("/login", userController.loginUser);

router.get("/logout", userController.logoutUser);

router.get("/check-auth", authenticateUser, userController.checkAuthorization);

router.put("/update/:userId", userController.updateUser);

router.delete("/delete/:userId", userController.deleteUser);

module.exports = router;
