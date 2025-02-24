const generateCustomId = require("../middlewares/ganerateCustomId");
const { generateToken } = require("../middlewares/jsonToken");
const Users = require("../models/userModel");
const bcrypt = require("bcryptjs");

exports.createUser = async (req, res) => {
  const { name, email, phone, password, role } = req.body;

  // Validate required fields
  if (!name || !email || !phone || !password || !role) {
    return res.status(400).json({ message: "All fields are required" });
  }
  const userId = await generateCustomId(Users, "userId", "userId");

  try {
    // Create new user
    const newUser = new Users({
      userId,
      name,
      email,
      phone,
      password,
      role,
    });
    const savedUser = await newUser.save();

    // Generate JWT token
    const token = generateToken({
      userId: savedUser.userId,
      email: savedUser.email,
      role: savedUser.role,
    });

    // Respond with the created user and token
    res.status(201).json({ user: savedUser, token });
  } catch (error) {
    if (error.code === 11000) {
      const field = Object.keys(error.keyValue)[0];
      const message =
        field === "phone"
          ? "Mobile number already exists."
          : field === "email"
          ? "Email already exists."
          : `${field} must be unique. The value '${error.keyValue[field]}' already exists.`;
      return res.status(400).json({
        message: "Validation Error",
        error: message,
      });
    }
    res.status(500).json({ message: error.message });
  }
};

exports.getAllUsers = async (req, res) => {
  try {
    const { activeState } = req.query;

    const query = {};
    if (activeState) query.activeState = activeState;

    const users = await Users.find(query);

    res.json(users);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.deleteUser = async (req, res) => {
  const { userId } = req.params;

  try {
    const deletedUser = await Users.findOneAndDelete({ userId });

    if (!deletedUser) {
      return res.status(404).json({ message: "User not found" });
    }

    res
      .status(200)
      .json({ message: "User deleted successfully", user: deletedUser });
  } catch (error) {
    res.status(500).json({
      message: "An error occurred while deleting the user",
      error: error.message,
    });
  }
};

exports.updateUser = async (req, res) => {
  const { userId } = req.params;
  const { name, email, phone, password, role, activeState } = req.body;

  try {
    const user = await Users.findOne({ userId });
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    if (name) user.name = name;
    if (email) user.email = email;
    if (phone) user.phone = phone;
    if (password) {
      const salt = await bcrypt.genSalt(10);
      user.password = await bcrypt.hash(password, salt);
    }
    if (role) user.role = role;
    if (activeState !== undefined) user.activeState = activeState;

    const updatedUser = await user.save();

    res
      .status(200)
      .json({ message: "User updated successfully", user: updatedUser });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.loginUser = async (req, res) => {
  try {
    const { email_or_phone, password } = req.body;
    if (!email_or_phone || !password) {
      return res.status(400).json({ message: "All fields are required." });
    }
    const user = await Users.findOne({
      $or: [{ email: email_or_phone }, { mobile: email_or_phone }],
    });

    if (!user || !(await user.matchPassword(password))) {
      return res
        .status(404)
        .json({ message: "No user found or Invalid credential" });
    }

    const token = generateToken({ ...user });
    res.cookie("token", token, {
      httpOnly: true,
      sameSite: "none",
      secure: process.env.VERCEL ? true : false,
      maxAge: 30 * 24 * 60 * 60 * 1000,
    });
    res.status(200).json({ message: "Login successful", user });
  } catch (error) {
    console.log("Error logging for user:", error);
    res.status(500).json({ message: "Internal Server Error", error: error });
  }
};

exports.logoutUser = async (req, res) => {
  try {
    res.clearCookie("token", {
      httpOnly: true,
      sameSite: "none",
      secure: process.env.VERCEL ? true : false,
    });
    res.status(200).json({ message: "Logout successful" });
  } catch (error) {
    console.error("Error logging out user:", error);
    res
      .status(500)
      .json({ message: "Internal Server Error", error: error.message });
  }
};

exports.checkAuthorization = async (req, res) => {
  try {
    const { user } = req;
    if (!user) {
      return res.status(401).json({ message: "Unauthorized" });
    }
    const loggedUser = await Users.findById(user._id);
    if (!loggedUser) {
      return res.status(401).json({ message: "User not found" });
    }

    res.status(200).json({ message: "Authorized", user: loggedUser });
  } catch (error) {
    console.error("Error checking Authorization user:", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
};
