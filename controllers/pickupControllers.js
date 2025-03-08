const generateCustomId = require("../middlewares/ganerateCustomId");
const PickUps = require("../models/pickupModel");

exports.createPickups = async (req, res) => {
  try {
    const pickupId = await generateCustomId(PickUps, "pickupId", "pickupId");
    const pickupData = { ...req.body, pickupId };
    const newPickupData = await PickUps(pickupData);
    await newPickupData.save();

    res.status(201).json({
      message: "Pick Up Data Created Successfully",
      data: newPickupData,
    });
  } catch (error) {
    if (error.code === 11000) {
      const field = Object.keys(error.keyValue)[0];
      const message =
        field === "pickupPointMobileno"
          ? "Mobile number already exists."
          : `${field} must be unique. The value '${error.keyValue[field]}' already exists.`;
      return res.status(400).json({
        message,
      });
    }
    console.error("Error creating Pickups details:", error);
    res.status(500).json({
      message: "Error creating Pick Up details",
      error: error.message,
    });
  }
};

exports.getPickups = async (req, res) => {
  try {
    const { isActive, pickupId, startDate, endDate } = req.query;

    const filter = {};

    if (isActive !== undefined) {
      filter.isActive = isActive === "true";
    }

    if (pickupId) {
      filter.pickupId = pickupId;
    }

    if (startDate || endDate) {
      const dateFilter = {};
      if (startDate) {
        dateFilter.$gte = new Date(startDate).setUTCHours(0, 0, 0, 0);
      }
      if (endDate) {
        dateFilter.$lte = new Date(endDate).setUTCHours(23, 59, 59, 999);
      }
      filter.createdAt = dateFilter;
    }

    const totalCount = await PickUps.countDocuments(filter);
    const pickupData = await PickUps.find(filter);

    res.status(200).json({
      message: "Pickups fetched successfully.",
      totalCount,
      pickupdata: pickupData,
    });
  } catch (error) {
    console.error("Error fetching Pickups:", error);
    res.status(500).json({
      message: "Error fetching Pick Up details",
      error: error.message,
    });
  }
};
exports.checkMobile = async (req, res) => {
  try {
    const { mobileNo } = req.params;

    const existingPickup = await PickUps.findOne({
      pickupPointMobileno: mobileNo,
    });
    if (existingPickup) {
      return res.json({ exists: true });
    }
    res.json({ exists: false });
  } catch (error) {
    console.error("Error checking mobile number", error);
    res.status(500).json({ message: "Error checking mobile number" });
  }
};

exports.updatePickup = async (req, res) => {
  try {
    const { pickupId } = req.params;
    const updateData = req.body;

    const updatedPickup = await PickUps.findOneAndUpdate(
      { pickupId },
      { $set: updateData },
      { new: true, runValidators: true }
    );

    if (!updatedPickup) {
      return res.status(404).json({ message: "Pickup not found" });
    }

    res.status(200).json({
      message: "Pickup updated successfully.",
      data: updatedPickup,
    });
  } catch (error) {
    console.error("Error updating Pickup:", error);
    res.status(500).json({
      message: "Error updating Pickup details",
      error: error.message,
    });
  }
};

// Check if mobile number exists

exports.deletePickup = async (req, res) => {
  try {
    const { pickupId } = req.params;

    const pickupDataDelete = await PickUps.findOne({ pickupId });
    if (!pickupDataDelete) {
      return res.status(404).json({ message: "Pickup Data not Found" });
    }
    await PickUps.findOneAndDelete({ pickupId });
    res.status(200).json({ message: "Pickup Data Delete Successfully" });
  } catch (error) {
    res.status(500).json({ message: "Error Deleteing Pickup Data", error });
  }
};
