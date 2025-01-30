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

    const category = await Categories.findOne({ categoryId });
    if (!category) {
      return res.status(404).json({ message: "Category not found." });
    }

    if (mainCategory) {
      category.mainCategory = mainCategory;
    }

    if (typeof isActive !== "undefined") {
      category.isActive = isActive;
    }

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

    if (subcategories && Array.isArray(subcategories)) {
      subcategories.forEach((updatedSub) => {
        // Find the existing subcategory or create a new one if it doesn't exist
        const existingSub = category.subcategories.find(
          (sub) => sub._id.toString() === updatedSub._id.toString()
        );

        if (existingSub) {
          // Update subcategory fields
          if (updatedSub.subcategoriesname) {
            existingSub.subcategoriesname = updatedSub.subcategoriesname;
          }
          if (typeof updatedSub.isActive !== "undefined") {
            existingSub.isActive = updatedSub.isActive;
          }

          // Update or create subsubcategories if they exist
          if (
            updatedSub.subsubcategories &&
            Array.isArray(updatedSub.subsubcategories)
          ) {
            updatedSub.subsubcategories.forEach((updatedSubSub) => {
              const existingSubSub = existingSub.subsubcategories.find(
                (subsub) =>
                  subsub._id.toString() === updatedSubSub._id.toString()
              );

              if (existingSubSub) {
                // Update existing subsubcategory
                if (updatedSubSub.subsubcategoriesname) {
                  existingSubSub.subsubcategoriesname =
                    updatedSubSub.subsubcategoriesname;
                }
                if (typeof updatedSubSub.isActive !== "undefined") {
                  existingSubSub.isActive = updatedSubSub.isActive;
                }
              } else {
                // Add new subsubcategory if it doesn't exist
                existingSub.subsubcategories.push({
                  subsubcategoriesname: updatedSubSub.subsubcategoriesname,
                  isActive: updatedSubSub.isActive,
                });
              }
            });
          }
        } else {
          // Add new subcategory if it doesn't exist
          const newSubcategory = {
            _id: updatedSub._id, // Ensure we are passing _id if it's a new one
            subcategoriesname: updatedSub.subcategoriesname,
            isActive: updatedSub.isActive,
            subsubcategories: updatedSub.subsubcategories
              ? updatedSub.subsubcategories.map((subsub) => ({
                  subsubcategoriesname: subsub.subsubcategoriesname,
                  isActive: subsub.isActive,
                }))
              : [], // Empty array if no subsubcategories provided
          };

          category.subcategories.push(newSubcategory);
        }
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

exports.updateImage = async (req, res) => {
  try {
    const { categoryId } = req.body;
    const categoryImage = req.files?.categoryImage;

    if (!categoryId || !categoryImage) {
      return res.status(400).json({
        message: "Category ID and image are required to update the image.",
      });
    }

    const category = await Categories.findOne({ categoryId });
    if (!category) {
      return res.status(404).json({ message: "Category not found." });
    }

    if (category.categoryImage && category.categoryImage.public_id) {
      await deleteFile(category.categoryImage.public_id);
    }

    const fileUploadResult = await uploadFile(
      categoryImage.tempFilePath,
      categoryImage.mimetype
    );

    if (!fileUploadResult.secure_url || !fileUploadResult.public_id) {
      return res.status(500).json({
        message: "Failed to upload image to Cloudinary.",
      });
    }

    category.categoryImage = {
      secure_url: fileUploadResult.secure_url,
      public_id: fileUploadResult.public_id,
    };

    await category.save();

    res.status(200).json({
      message: "Category image updated successfully.",
      categoryImage: category.categoryImage,
    });
  } catch (error) {
    console.error("Error uploading category image:", error);
    res.status(500).json({
      message: "Internal server error.",
      error: error.message,
    });
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
