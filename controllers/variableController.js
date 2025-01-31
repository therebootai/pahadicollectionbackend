const generateCustomId = require("../middlewares/ganerateCustomId");
const Variables = require("../models/variableModel");

exports.createVariables = async (req, res) => {
  try {
    const variableId = await generateCustomId(
      Variables,
      "variableId",
      "variableId"
    );
    const variableData = {
      ...req.body,
      variableId,
      variableType: Array.isArray(req.body.variableType)
        ? req.body.variableType.map((item) => {
            return { varType: item.varType };
          })
        : [],
    };
    const newVariableData = await Variables(variableData);

    await newVariableData.save();
    res
      .status(200)
      .json({ message: "Variables saved successfully", data: newVariableData });
  } catch (error) {
    if (error.code === 11000) {
      const field = Object.keys(error.keyValue)[0];
      const message =
        field === "variableName"
          ? "This  Variable Name already exists."
          : `${field} must be unique. The value '${error.keyValue[field]}' already exists.`;
      return res.status(400).json({
        message: "Validation Error",
        error: message,
      });
    }
    console.error("Error creating Variable details:", error);
    res.status(500).json({
      message: "Error creating Variable details",
      error: error.message,
    });
  }
};

exports.getVariables = async (req, res) => {
  try {
    const {
      isActive,
      variableId,
      startDate,
      endDate,
      page = 1,
      limit = 20,
    } = req.query;
    const filter = {};

    if (variableId) {
      filter.variableId = variableId;
    }
    if (isActive !== undefined) {
      filter.isActive = isActive === "true";
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

    const pageNumber = parseInt(page, 10);
    const pageLimit = parseInt(limit, 10);

    const skip = (pageNumber - 1) * pageLimit;

    const totalCount = await Variables.countDocuments(filter);
    const variableData = await Variables.find(filter)
      .skip(skip)
      .limit(pageLimit);

    res.status(200).json({
      message: "Variable Fetch Successfully",
      totalCount,
      totalPages: Math.ceil(totalCount / pageLimit),
      currentPage: pageNumber,
      variabledata: variableData,
    });
  } catch (error) {
    console.error("Error fetching Variables:", error);
    res.status(500).json({
      message: "Error fetching Variables data",
      error: error.message,
    });
  }
};
