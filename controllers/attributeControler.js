const mongoose = require("mongoose");
const generateCustomId = require("../middlewares/ganerateCustomId");
const attributeModel = require("../models/attributeModel");

exports.createAttribute = async (req, res) => {
  try {
    const { attribute_title, products } = req.body;

    if (!attribute_title) {
      return res.status(400).json({ message: "All fields are required." });
    }

    const attributeId = await generateCustomId(
      attributeModel,
      "attributeId",
      "attributeId"
    );

    const newAttribute = new attributeModel({
      attributeId,
      attribute_title,
      products: products ? JSON.parse(products) : [],
    });

    await newAttribute.save();
    res
      .status(201)
      .json({ message: "Attribute created successfully.", newAttribute });
  } catch (error) {
    console.error("Error creating attribute:", error);
    res
      .status(500)
      .json({ message: "Internal Server Error", error: error.message });
  }
};

exports.getAllAttributes = async (req, res) => {
  try {
    let {
      page = 1,
      limit = 10,
      sortBy = "createdAt",
      order = "desc",
      is_active,
    } = req.query;
    page = parseInt(page);
    limit = parseInt(limit);

    const sortOrder = order === "asc" ? 1 : -1;

    let query = {};

    if (is_active !== undefined) {
      query.is_active = is_active === "true" ? true : false;
    }

    const [totalCount, attributes] = await Promise.all([
      attributeModel.countDocuments(query),
      attributeModel
        .find(query)
        .populate("products")
        .sort({ [sortBy]: sortOrder })
        .skip((page - 1) * limit)
        .limit(limit),
    ]);

    const totalPages = Math.ceil(totalCount / limit);

    res.status(200).json({
      attributes,
      pagination: {
        totalCount,
        currentPage: page,
        totalPages,
      },
    });
  } catch (error) {
    console.error("Error fetching attributes:", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
};

exports.searchAllAttributes = async (req, res) => {
  try {
    let { search = "", page = 1, limit = 10 } = req.query;
    page = parseInt(page);
    limit = parseInt(limit);

    if (!search) {
      return res.status(400).json({ message: "Search query is required" });
    }

    const [totalCount, attributes] = await Promise.all([
      attributeModel.countDocuments({
        attribute_title: { $regex: search, $options: "i" },
      }),
      attributeModel
        .find({ attribute_title: { $regex: search, $options: "i" } })
        .populate("products")
        .skip((page - 1) * limit)
        .limit(limit),
    ]);

    const totalPages = Math.ceil(totalCount / limit);

    res.status(200).json({
      data: attributes,
      pagination: {
        totalCount,
        currentPage: page,
        totalPages,
      },
    });
  } catch (error) {
    console.error("Error searching attributes:", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
};

exports.updateAttributeById = async (req, res) => {
  try {
    const { id } = req.params;
    const { attribute_title, products, is_active } = req.body;

    let uniqueProducts = [];

    if (products) {
      uniqueProducts = [...new Set(JSON.parse(products))];
    }

    const updatedAttribute = await attributeModel
      .findOneAndUpdate(
        {
          $or: [
            { _id: mongoose.Types.ObjectId.isValid(id) ? id : null },
            { attributeId: id },
          ],
        },
        { attribute_title, products: uniqueProducts, is_active },
        { new: true, runValidators: true }
      )
      .populate("products");

    if (!updatedAttribute) {
      return res.status(404).json({ message: "Attribute not found." });
    }

    res.status(200).json({
      message: "Attribute updated successfully.",
      attribute: updatedAttribute,
    });
  } catch (error) {
    console.error("Error updating attribute:", error);
    res
      .status(500)
      .json({ message: "Internal Server Error", error: error.message });
  }
};

exports.deleteAttributeById = async (req, res) => {
  try {
    const { id } = req.params;
    const deletedAttribute = await attributeModel.findOneAndDelete({
      $or: [
        { _id: mongoose.Types.ObjectId.isValid(id) ? id : null },
        { attributeId: id },
      ],
    });
    if (!deletedAttribute) {
      return res.status(404).json({ message: "Attribute not found." });
    }
    res.status(200).json({ message: "Attribute deleted successfully." });
  } catch (error) {
    console.error("Error deleting attribute:", error);
    res
      .status(500)
      .json({ message: "Internal Server Error", error: error.message });
  }
};

exports.getAttributeById = async (req, res) => {
  try {
    const { id } = req.params;
    const attribute = await attributeModel
      .findOne({
        $or: [
          { _id: mongoose.Types.ObjectId.isValid(id) ? id : null },
          { attributeId: id },
        ],
      })
      .populate("products");
    if (!attribute) {
      return res.status(404).json({ message: "Attribute not found." });
    }
    res
      .status(200)
      .json({ message: "Attribute fetched successfully.", attribute });
  } catch (error) {
    console.error("Error getting attribute by ID:", error);
    res.status(500).json({ message: "Internal Server Error", error: error });
  }
};
