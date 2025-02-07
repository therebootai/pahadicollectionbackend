const mongoose = require("mongoose");
const { uploadFile, deleteFile } = require("../middlewares/cloudinary");
const generateCustomId = require("../middlewares/ganerateCustomId");
const productModel = require("../models/productModel");

exports.createProduct = async (req, res) => {
  try {
    const {
      title,
      category,
      subCategory,
      subSubCategory,
      pickup,
      productType,
      price,
      mrp,
      in_stock,
      attribute,
      discount,
      description,
      variant,
      specification,
    } = req.body;

    let { productImage, hoverImage } = req.files;

    // Validate required fields
    if (!title || !price || !mrp || !productType || !category || !pickup) {
      return res.status(400).json({ message: "Required fields missing." });
    }

    if (!productImage) {
      return res.status(400).json({ message: "Product image is required." });
    }

    if (!hoverImage) {
      return res.status(400).json({ message: "Hover image is required." });
    }

    // Ensure `hoverImage` is always an object (single file)
    if (Array.isArray(hoverImage)) {
      hoverImage = hoverImage[0]; // Take the first file if multiple are sent
    }

    const hoverImageResult = await uploadFile(
      hoverImage.tempFilePath,
      hoverImage.mimetype
    );

    if (hoverImageResult.error) {
      return res.status(500).json({ message: "Error uploading hover image." });
    }

    let productImages = [];

    // Ensure `productImage` is an array (multiple files)
    if (!Array.isArray(productImage)) {
      productImage = [productImage]; // Convert single file into an array
    }

    for (let i = 0; i < productImage.length; i++) {
      const productImageResult = await uploadFile(
        productImage[i].tempFilePath,
        productImage[i].mimetype
      );
      if (productImageResult.error) {
        return res
          .status(500)
          .json({ message: `Error uploading image ${i + 1}.` });
      }

      productImages.push({
        secure_url: productImageResult.secure_url,
        public_id: productImageResult.public_id,
      });
    }

    const productId = await generateCustomId(
      productModel,
      "productId",
      "productId"
    );

    const newProduct = new productModel({
      productId,
      title,
      category,
      subCategory,
      subSubCategory,
      pickup,
      productType,
      price,
      mrp,
      in_stock,
      attribute,
      discount,
      description,
      variant: variant ? JSON.parse(variant) : [],
      specification: specification ? JSON.parse(specification) : [], // Convert JSON string to object
      productImage: productImages, // Store multiple product images
      hoverImage: {
        secure_url: hoverImageResult.secure_url,
        public_id: hoverImageResult.public_id,
      },
      isActive: true, // Default to active
    });

    const savedProduct = await newProduct.save();

    // Respond with the created product
    return res.status(201).json({
      message: "Product created successfully.",
      product: savedProduct,
    });
  } catch (error) {
    console.error("Error creating Product details:", error);
    return res.status(500).json({
      message: "Internal Server Error",
      error: error.message,
    });
  }
};

exports.getAllProducts = async (req, res) => {
  try {
    const {
      page = 1, // default page 1
      limit = 10, // default limit to 10
      sortBy = "createdAt", // default sorting by createdAt
      order = "desc", // default descending order
      productType, // filter by productType
      priceMin, // filter by min price
      priceMax, // filter by max price
      category, // filter by category
      in_stock, // filter by stock
    } = req.query;

    let query = {};

    if (productType) {
      query.productType = productType;
    }

    if (priceMin || priceMax) {
      query.price = {};
      if (priceMin) query.price.$gte = priceMin;
      if (priceMax) query.price.$lte = priceMax;
    }

    if (in_stock) {
      query.in_stock = { $gte: in_stock }; // Ensure in-stock is at least the value provided
    }

    if (category) {
      query.category = { $in: category.split(",") }; // Allow multiple categories, comma-separated
    }

    // Pagination setup
    const skip = (page - 1) * limit;

    // Sorting setup
    const sortOrder = order === "asc" ? 1 : -1;

    const products = await productModel
      .find(query)
      .skip(skip)
      .limit(parseInt(limit))
      .sort({ [sortBy]: sortOrder })
      .populate("category")
      .populate("pickup")
      .populate("variant.variable");

    const totalProducts = await productModel.countDocuments(query);

    // Send the response with pagination details
    res.status(200).json({
      products,
      pagination: {
        totalCount: totalProducts,
        currentPage: parseInt(page),
        totalPages: Math.ceil(totalProducts / limit),
      },
    });
  } catch (error) {
    console.error("Error getting Product details:", error);
    return res.status(500).json({
      message: "Internal Server Error",
      error: error.message,
    });
  }
};

exports.deleteProductById = async (req, res) => {
  try {
    const { id } = req.params;
    const deletedProduct = await productModel.findOne({
      $or: [
        { _id: mongoose.Types.ObjectId.isValid(id) ? id : undefined },
        { productId: id },
      ],
    });
    if (!deletedProduct) {
      return res.status(404).json({ message: "Product not found" });
    }
    await deleteFile(deletedProduct.hoverImage.public_id);
    deletedProduct.productImage.map(async (item) => {
      await deleteFile(item.public_id);
    });

    await productModel.findByIdAndDelete(deletedProduct._id);
    res.status(200).json({ message: "Product Data Delete Successfully" });
  } catch (error) {
    console.error("Error deleting Product details:", error);
    return res.status(500).json({
      message: "Internal Server Error",
      error: error.message,
    });
  }
};

exports.updateProductById = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      title,
      category,
      subCategory,
      subSubCategory,
      pickup,
      productType,
      price,
      mrp,
      in_stock,
      attribute,
      discount,
      description,
      variant,
      specification,
      isActive,
    } = req.body;

    let productImage = null;

    if (req.files) {
      productImage = req.files.productImage;
    }

    const updatedProduct = await productModel.findOne({
      $or: [
        { _id: mongoose.Types.ObjectId.isValid(id) ? id : undefined },
        { productId: id },
      ],
    });

    if (!updatedProduct) {
      return res.status(404).json({ message: "Product not found" });
    }

    if (req.files && req.files.hoverImage) {
      const hoverImage = req.files.hoverImage[0];
      // Delete old hover image
      if (updatedProduct.hoverImage.public_id) {
        await deleteFile(updatedProduct.hoverImage.public_id);
      }

      // Upload new hover image
      const hoverResult = await uploadFile(
        hoverImage.tempFilePath,
        hoverImage.mimetype
      );
      updateData.hoverImage = {
        secure_url: hoverResult.secure_url,
        public_id: hoverResult.public_id,
      };
    }

    if (req.files && req.files.productImage) {
      const productImageFiles = Array.isArray(req.files.productImage)
        ? req.files.productImage
        : [req.files.productImage];

      const uploadedImages = await Promise.all(
        productImageFiles.map(async (file) => {
          try {
            const result = await uploadFile(file.tempFilePath, file.mimetype);
            return {
              secure_url: result.secure_url,
              public_id: result.public_id,
            };
          } catch (uploadError) {
            console.error("Error uploading image:", uploadError);
            throw uploadError;
          }
        })
      );

      // No need to delete all images here. The logic below handles deletions.

      if (req.body.productImage) {
        // If existing images were sent
        try {
          const existingImagesFromBody = JSON.parse(req.body.productImage);
          if (Array.isArray(existingImagesFromBody)) {
            if (existingImagesFromBody.length > 0) {
              const imagesToDelete = updatedProduct.productImage.filter(
                (img) =>
                  !existingImagesFromBody.some(
                    (existing) => existing.public_id === img.public_id
                  )
              );
              for (const img of imagesToDelete) {
                await deleteFile(img.public_id);
              }
              updatedProduct.productImage =
                existingImagesFromBody.concat(uploadedImages); // Add new images to existing
            } else if (
              existingImagesFromBody.length === 0 ||
              existingImagesFromBody === "[]"
            ) {
              if (
                updatedProduct.productImage &&
                updatedProduct.productImage.length > 0
              ) {
                for (const img of updatedProduct.productImage) {
                  await deleteFile(img.public_id);
                }
              }
              updatedProduct.productImage = uploadedImages;
            }
          }
        } catch (jsonError) {
          console.error("Error parsing productImage JSON:", jsonError);
          return res
            .status(400)
            .json({ message: "Invalid productImage JSON." });
        }
      } else {
        updatedProduct.productImage = uploadedImages; // Only new images, replace all
      }
    } else if (req.body.productImage) {
      // No new files, handle existing images
      try {
        const existingImagesFromBody = JSON.parse(req.body.productImage);
        if (Array.isArray(existingImagesFromBody)) {
          if (existingImagesFromBody.length > 0) {
            const imagesToDelete = updatedProduct.productImage.filter(
              (img) =>
                !existingImagesFromBody.some(
                  (existing) => existing.public_id === img.public_id
                )
            );
            for (const img of imagesToDelete) {
              await deleteFile(img.public_id);
            }
            updatedProduct.productImage = existingImagesFromBody;
          } else if (
            existingImagesFromBody.length === 0 ||
            existingImagesFromBody === "[]"
          ) {
            if (
              updatedProduct.productImage &&
              updatedProduct.productImage.length > 0
            ) {
              for (const img of updatedProduct.productImage) {
                await deleteFile(img.public_id);
              }
            }
            updatedProduct.productImage = [];
          }
        } else {
          console.warn(
            "Invalid productImage data in request body:",
            req.body.productImage
          );
          return res
            .status(400)
            .json({ message: "Invalid productImage data." });
        }
      } catch (jsonError) {
        console.error("Error parsing productImage JSON:", jsonError);
        return res.status(400).json({ message: "Invalid productImage JSON." });
      }
    }

    updatedProduct.title = title || updatedProduct.title;
    updatedProduct.category = category || updatedProduct.category;
    updatedProduct.subCategory = subCategory || updatedProduct.subCategory;
    updatedProduct.subSubCategory =
      subSubCategory || updatedProduct.subSubCategory;
    updatedProduct.pickup = pickup || updatedProduct.pickup;
    updatedProduct.productType = productType || updatedProduct.productType;
    updatedProduct.price = price || updatedProduct.price;
    updatedProduct.mrp = mrp || updatedProduct.mrp;
    updatedProduct.in_stock = in_stock || updatedProduct.in_stock;
    updatedProduct.attribute = attribute || updatedProduct.attribute;
    updatedProduct.discount = discount || updatedProduct.discount;
    updatedProduct.description = description || updatedProduct.description;
    updatedProduct.variant = variant
      ? JSON.parse(variant)
      : updatedProduct.variant;
    updatedProduct.specification = specification
      ? JSON.parse(specification)
      : updatedProduct.specification;
    updatedProduct.isActive =
      isActive !== undefined ? isActive : updatedProduct.isActive;

    const product = await updatedProduct.save();

    res
      .status(200)
      .json({ message: "Product updated Successfully", data: product });
  } catch (error) {
    console.error("Error updateing Product details:", error);
    return res.status(500).json({
      message: "Internal Server Error",
      error: error.message,
    });
  }
};

exports.getProductById = async (req, res) => {
  try {
    const { id } = req.params;
    const product = await productModel
      .findOne({
        $or: [
          { _id: mongoose.Types.ObjectId.isValid(id) ? id : undefined },
          { productId: id },
        ],
      })
      .populate("category")
      .populate("pickup")
      .populate("variant.variable");
    if (!product) {
      return res.status(404).json({ message: "Product not found" });
    }
    res
      .status(200)
      .json({ message: "Product fetched successfully", data: product });
  } catch (error) {
    console.error("Error getting Product details:", error);
    return res.status(500).json({
      message: "Internal Server Error",
      error: error.message,
    });
  }
};

exports.searchProduct = async (req, res) => {
  try {
    const { search = "", page = 1, limit = 10 } = req.query;
    currentPage = parseInt(page);
    currentLimit = parseInt(limit);

    const query = {
      $or: [
        { title: { $regex: search, $options: "i" } },
        { productId: { $regex: search, $options: "i" } },
      ],
    };

    const totalProducts = await productModel.countDocuments(query);
    const totalPages = Math.ceil(totalProducts / currentLimit);

    const products = await productModel
      .find(query)
      .sort({ createdAt: -1 })
      .skip((currentPage - 1) * currentLimit)
      .limit(currentLimit)
      .populate("category")
      .populate("pickup")
      .populate("variant");

    res.status(200).json({
      message: "Products fetched successfully",
      data: products,
      meta: {
        totalCount: totalProducts,
        totalPages,
        currentPage: parseInt(page),
      },
    });
  } catch (error) {
    console.error("Error searching products:", error);
    return res.status(500).json({
      message: "Internal Server Error",
      error: error.message,
    });
  }
};
