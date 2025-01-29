const { uploadFile, deleteFile } = require("../middlewares/cloudinary");
const generateCustomId = require("../middlewares/ganerateCustomId");
const Categories = require("../models/catgoryModel");

exports.createCategory = async (req, res) => {
  try {
    const { mainCategory } = req.body;
    const categoryImage = req.files?.categoryImage;

    if (!mainCategory || !req.files) {
      return res
        .status(400)
        .json({ message: "Main category and image are required." });
    }

    const categoryId = await generateCustomId(
      Categories,
      "categoryId",
      "categoryId"
    );

    let uploadedFile = categoryImage;

    const fileUploadResult = await uploadFile(
      uploadedFile.tempFilePath,
      uploadedFile.mimetype
    );

    if (!fileUploadResult.secure_url || !fileUploadResult.public_id) {
      return res
        .status(500)
        .json({ message: "Failed to upload image to Cloudinary." });
    }

    const newCategory = new Categories({
      categoryId,
      mainCategory,
      categoryImage: {
        secure_url: fileUploadResult.secure_url,
        public_id: fileUploadResult.public_id,
      },
    });

    await newCategory.save();

    res.status(201).json({
      message: "Category created successfully.",
      category: newCategory,
    });
  } catch (error) {
    console.error("Error creating category:", error);
    res
      .status(500)
      .json({ message: "Internal server error.", error: error.message });
  }
};

exports.getCategories = async (req, res) => {
  try {
    const { isActive, startDate, endDate } = req.query;

    const filter = {};

    if (isActive !== undefined) {
      filter.isActive = isActive === "true";
    }

    if (startDate || endDate) {
      const dateFilter = {};
      if (startDate) {
        dateFilter.$gte = new Date(new Date(startDate).toISOString());
      }
      if (endDate) {
        dateFilter.$lte = new Date(new Date(endDate).toISOString());
      }
      filter.createdAt = dateFilter;
    }

    const categories = await Categories.find(filter);

    // Transform the categories
    const filteredCategories = categories.map((category) => {
      // Filter subcategories based on isActive flag
      const filteredSubcategories = category.subcategories.filter(
        (sub) => sub.isActive
      );

      // Now filter subsubcategories based on isActive
      const filteredSubcategoriesWithSubsubcategories =
        filteredSubcategories.map((sub) => {
          const filteredSubsubcategories = sub.subsubcategories.filter(
            (ssc) => ssc.isActive
          );

          // Return the subcategory with the filtered subsubcategories
          return {
            ...sub.toObject(), // Convert the subcategory to plain JavaScript object
            subsubcategories: filteredSubsubcategories, // Include filtered subsubcategories
          };
        });

      // Return the category with the filtered subcategories
      return {
        _id: category._id,
        categoryId: category.categoryId,
        mainCategory: category.mainCategory,
        categoryImage: category.categoryImage,
        isActive: category.isActive,
        subcategories: filteredSubcategoriesWithSubsubcategories, // Include filtered subcategories
      };
    });

    res.status(200).json({
      message: "Categories fetched successfully.",
      categories: filteredCategories,
    });
  } catch (error) {
    console.error("Error fetching categories:", error);
    res.status(500).json({
      message: "Internal server error.",
      error: error.message,
    });
  }
};

exports.updateCategory = async (req, res) => {
  try {
    const { categoryId, mainCategory, subcategories, isActive } = req.body;
    const categoryImage = req.files ? req.files.categoryImage : null;

    if (!categoryId) {
      return res.status(400).json({ message: "Category ID is required." });
    }

    // Find category by categoryId
    const category = await Categories.findOne({ categoryId });
    if (!category) {
      return res.status(404).json({ message: "Category not found." });
    }

    // Update main category name
    if (mainCategory) {
      category.mainCategory = mainCategory;
    }

    // Update main category isActive status
    if (typeof isActive !== "undefined") {
      category.isActive = isActive;
    }

    // Handle category image update
    if (categoryImage) {
      if (category.categoryImage && category.categoryImage.public_id) {
        await deleteFile(category.categoryImage.public_id);
      }

      const fileUploadResult = await uploadFile(
        categoryImage.tempFilePath,
        categoryImage.mimetype
      );

      if (!fileUploadResult.secure_url || !fileUploadResult.public_id) {
        return res
          .status(500)
          .json({ message: "Failed to upload image to Cloudinary." });
      }

      category.categoryImage = {
        secure_url: fileUploadResult.secure_url,
        public_id: fileUploadResult.public_id,
      };
    }

    // Update subcategories & subsubcategories while keeping names intact
    if (subcategories && Array.isArray(subcategories)) {
      category.subcategories = category.subcategories.map((existingSub) => {
        const updatedSub = subcategories.find(
          (sub) =>
            sub.subcategoriesname === existingSub.subcategoriesname &&
            sub._id.toString() === existingSub._id.toString()
        );

        if (updatedSub) {
          // Update subcategory isActive
          if (typeof updatedSub.isActive !== "undefined") {
            existingSub.isActive = updatedSub.isActive;
          }

          // Update subsubcategories while keeping names
          if (
            updatedSub.subsubcategories &&
            Array.isArray(updatedSub.subsubcategories)
          ) {
            existingSub.subsubcategories = existingSub.subsubcategories.map(
              (existingSubSub) => {
                const updatedSubSub = updatedSub.subsubcategories.find(
                  (subsub) =>
                    subsub.subsubcategoriesname ===
                      existingSubSub.subsubcategoriesname &&
                    subsub._id.toString() === existingSubSub._id.toString()
                );

                if (updatedSubSub) {
                  // Update subsubcategory isActive
                  if (typeof updatedSubSub.isActive !== "undefined") {
                    existingSubSub.isActive = updatedSubSub.isActive;
                  }
                }
                return existingSubSub;
              }
            );
          }
        }
        return existingSub;
      });
    }

    await category.save();

    res
      .status(200)
      .json({ message: "Category updated successfully.", category });
  } catch (error) {
    console.error("Error updating category:", error);
    res
      .status(500)
      .json({ message: "Internal server error.", error: error.message });
  }
};

exports.deleteCategory = async (req, res) => {
  try {
    const { categoryId } = req.params;

    const categoryDelete = await Categories.findOne({ categoryId });
    if (!categoryDelete) {
      return res.status(404).json({ message: "Category not found" });
    }

    if (
      categoryDelete.categoryImage &&
      categoryDelete.categoryImage.public_id
    ) {
      await deleteFile(categoryDelete.categoryImage.public_id);
    }

    await Categories.findOneAndDelete({ categoryId });
    res.status(200).json({ message: "Category deleted successfully" });
  } catch (error) {
    res.status(500).json({ message: "Error deleting Category", error });
  }
};
