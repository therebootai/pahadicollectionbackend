const mongoose = require("mongoose");
const { uploadFile, deleteFile } = require("../middlewares/cloudinary");
const generateCustomId = require("../middlewares/ganerateCustomId");
const components = require("../models/components");

exports.createComponent = async (req, res) => {
  try {
    const { name, type } = req.body;

    const component_image = req.files.component_image;

    if (!name || !type || !component_image) {
      return res.status(400).json({
        message: "All fields are required.",
      });
    }

    let uploadedFile = component_image;

    const [fileUploadResult, componentId] = await Promise.all([
      uploadFile(uploadedFile.tempFilePath, uploadedFile.mimetype),
      generateCustomId(components, "componentId", "componentId"),
    ]);

    if (!fileUploadResult.secure_url || !fileUploadResult.public_id) {
      return res
        .status(500)
        .json({ message: "Failed to upload image to Cloudinary." });
    }

    const newComponent = new components({
      componentId,
      name,
      type,
      component_image: {
        secure_url: fileUploadResult.secure_url,
        public_id: fileUploadResult.public_id,
      },
    });

    const savedComponent = await newComponent.save();

    res.status(201).json({
      message: "Component created successfully.",
      component: savedComponent,
    });
  } catch (error) {
    console.error("Error creating Component details:", error);
    res.status(500).json({
      message: "Error creating Component details",
      error: error.message,
    });
  }
};

exports.getAllComponents = async (req, res) => {
  try {
    // Destructure query parameters
    const {
      type,
      page = 1,
      limit = 10,
      sort = "createdAt",
      order = "desc",
      status,
    } = req.query;

    // Create filter object
    let filter = {};

    if (type) filter.type = type;

    if (status !== undefined) filter.status = status;

    // Pagination
    const pageNumber = parseInt(page, 10);
    const pageSize = parseInt(limit, 10);
    const skip = (pageNumber - 1) * pageSize;

    // Sorting
    const sortOrder = order === "asc" ? 1 : -1;
    const sortQuery = { [sort]: sortOrder };

    // Fetch components with filters, pagination, and sorting
    const allComponents = await components
      .find(filter)
      .sort(sortQuery)
      .skip(skip)
      .limit(pageSize);

    // Get total count for pagination metadata
    const totalComponents = await components.countDocuments(filter);

    res.status(200).json({
      success: true,
      data: allComponents,
      pagination: {
        totalCount: totalComponents,
        currentPage: pageNumber,
        limit: pageSize,
        totalPages: Math.ceil(totalComponents / pageSize),
      },
    });
  } catch (error) {
    console.error("Error getting Component details:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.getComponentDropdown = async (req, res) => {
  try {
    const { name } = req.query;

    const fuzzyRegex = new RegExp(name.split("").join(".*"), "i");

    const items = await components.aggregate([
      {
        $match: {
          name: fuzzyRegex,
        },
      },
      {
        $limit: 30,
      },
    ]);
    res.status(200).json(items);
  } catch (error) {
    console.error("Error getting Component dropdown:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.getSingleComponent = async (req, res) => {
  try {
    const { id } = req.params;
    const component = await components.findOne({
      $or: [
        { _id: mongoose.Types.ObjectId.isValid(id) ? id : null },
        { componentId: id },
      ],
    });
    if (!component) {
      return res
        .status(404)
        .json({ success: false, message: "Component not found." });
    }
    res.status(200).json(component);
  } catch (error) {
    console.error("Error getting Component details:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.updateComponent = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, status } = req.body;
    const component_image = req.files?.component_image;

    const component = await components.findOne({
      $or: [
        { _id: mongoose.Types.ObjectId.isValid(id) ? id : null },
        { componentId: id },
      ],
    });

    if (!component) {
      return res
        .status(404)
        .json({ success: false, message: "Component not found." });
    }

    let fileUploadResult = null;

    if (component_image) {
      await deleteFile(component.component_image.public_id);
      fileUploadResult = await uploadFile(
        component_image.tempFilePath,
        component_image.mimetype
      );
    }

    component.name = name || component.name;
    component.component_image = fileUploadResult
      ? {
          secure_url: fileUploadResult.secure_url,
          public_id: fileUploadResult.public_id,
        }
      : component.component_image;
    component.status = status !== undefined ? status : component.status;

    const updatedComponent = await component.save();
    return res.status(200).json({
      ...updatedComponent._doc,
    });
  } catch (error) {
    console.error("Error updating Component dropdown:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.deleteComponent = async (req, res) => {
  try {
    const { id } = req.params;
    const component = await components.findOne({
      $or: [
        { _id: mongoose.Types.ObjectId.isValid(id) ? id : null },
        { componentId: id },
      ],
    });

    if (!component) {
      return res
        .status(404)
        .json({ success: false, message: "Component not found." });
    }

    await deleteFile(component.component_image.public_id);
    await components.deleteOne({ _id: component._id });

    res
      .status(200)
      .json({ success: true, message: "Component deleted successfully" });
  } catch (error) {
    console.error("Error deleting Component:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};
