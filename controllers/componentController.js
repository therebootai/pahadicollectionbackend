const { uploadFile } = require("../middlewares/cloudinary");
const generateCustomId = require("../middlewares/ganerateCustomId");
const components = require("../models/components");

exports.createComponent = async (req, res) => {
  try {
    const { name, type } = req.body;
    const component_image = req.files?.component_image;

    if (!name || !type || !component_image) {
      return res.status(400).json({
        message: "All fields are required.",
      });
    }

    const componentId = await generateCustomId(
      components,
      "componentId",
      "componentId"
    );

    let uploadedFile = component_image;

    const fileUploadResult = await uploadFile(
      uploadedFile.tempFilePath,
      uploadedFile.mimetype
    );

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
      name,
      type,
      componentId,
      page = 1,
      limit = 10,
      sort = "createdAt",
      order = "desc",
    } = req.query;

    // Create filter object
    let filter = {};
    if (name) filter.name = new RegExp(name, "i"); // Case-insensitive search
    if (type) filter.type = type;
    if (componentId) filter.componentId = componentId;

    // Pagination
    const pageNumber = parseInt(page, 10);
    const pageSize = parseInt(limit, 10);
    const skip = (pageNumber - 1) * pageSize;

    // Sorting
    const sortOrder = order === "asc" ? 1 : -1;
    const sortQuery = { [sort]: sortOrder };

    // Fetch components with filters, pagination, and sorting
    const components = await components.find(filter)
      .sort(sortQuery)
      .skip(skip)
      .limit(pageSize);

    // Get total count for pagination metadata
    const totalComponents = await components.countDocuments(filter);

    res.status(200).json({
      success: true,
      data: components,
      pagination: {
        total: totalComponents,
        page: pageNumber,
        limit: pageSize,
        totalPages: Math.ceil(totalComponents / pageSize),
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.getComponentDropdown = async (req, res) => {
 try {
    
 } catch (error) {
    
 }   
}