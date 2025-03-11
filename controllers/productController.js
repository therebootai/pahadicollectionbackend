const mongoose = require("mongoose");
const { uploadFile, deleteFile } = require("../middlewares/cloudinary");
const generateCustomId = require("../middlewares/ganerateCustomId");
const productModel = require("../models/productModel");
const attributeModel = require("../models/attributeModel");
const Categories = require("../models/catgoryModel");

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
      main_product,
      variable,
      mrp,
      in_stock,
      attribute,
      discount,
      description,
      specification,
      thumbnailIndex,
      tags,
      is_drafted = false,
    } = req.body;

    // Validate required fields
    if (!title) {
      return res.status(400).json({ message: "title is required" });
    }

    if (!Boolean(is_drafted)) {
      if (!price || !mrp || !productType || !category || !pickup) {
        return res.status(400).json({ message: "Required fields missing." });
      }
      if (!req.files.productImage) {
        return res.status(400).json({ message: "Product image is required." });
      }

      if (!req.files.hoverImage) {
        return res.status(400).json({ message: "Hover image is required." });
      }
    }

    let hoverImage = null;
    // Ensure `hoverImage` is always an object (single file)

    if (req.files && req.files.hoverImage) {
      if (Array.isArray(req.files.hoverImage)) {
        hoverImage = req.files.hoverImage[0]; // Take the first file if multiple are sent
      } else {
        hoverImage = req.files.hoverImage;
      }
    }

    let productImages = [];
    let productImage = [];

    // Ensure `productImage` is an array (multiple files)
    if (req.files && req.files.productImage) {
      if (!Array.isArray(req.files.productImage)) {
        productImage = [req.files.productImage]; // Convert single file into an array
      } else {
        productImage = req.files.productImage;
      }
    }

    async function savedProductImages() {
      if (!productImage || productImage.length === 0) return;
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
    }

    async function savedHoverImage() {
      let hoverImageResult = {};
      if (hoverImage && hoverImage.tempFilePath) {
        hoverImageResult = await uploadFile(
          hoverImage.tempFilePath,
          hoverImage.mimetype
        );
        if (hoverImageResult.error) {
          return (hoverImageResult = { secure_url: "", public_id: "" });
        }
      }

      return hoverImageResult;
    }

    const [hoverImageResult, productId] = await Promise.all([
      savedHoverImage(),
      generateCustomId(productModel, "productId", "productId"),
      savedProductImages(),
    ]);

    if (hoverImageResult.error) {
      return res.status(500).json({ message: "Error uploading hover image." });
    }

    const index = parseInt(thumbnailIndex, 10) || 0;

    const thumbnail_image =
      productImages.length > 0 ? productImages[index] : null;

    const newProduct = new productModel({
      is_drafted: is_drafted === "true" ? true : false,
      productId,
      title,
      category: category ? category : null,
      subCategory,
      subSubCategory,
      pickup: pickup ? pickup : null,
      productType,
      main_product: productType === "variant" ? main_product : null,
      variable: productType === "variant" ? JSON.parse(variable) : null,
      price,
      mrp,
      in_stock,
      attribute: attribute ? JSON.parse(attribute) : [],
      discount,
      description,
      variant: [],
      specification: specification
        ? JSON.parse(specification)
        : [{ key: "", value: "" }], // Convert JSON string to object
      productImage: productImages, // Store multiple product images
      hoverImage: hoverImageResult.secure_url
        ? {
            secure_url: hoverImageResult.secure_url,
            public_id: hoverImageResult.public_id,
          }
        : {},
      isActive: is_drafted === "true" ? false : true, // Default to active
      thumbnail_image,
      tags: tags ? JSON.parse(tags) : [],
    });

    const savedProduct = await newProduct.save();

    await productModel.findByIdAndUpdate(main_product, {
      $push: { variant: savedProduct._id },
    });

    if (attribute) {
      const attributeIds = JSON.parse(attribute);
      await attributeModel.updateMany(
        { _id: { $in: attributeIds } },
        { $push: { products: savedProduct._id } }
      );
    }

    // Respond with the created product
    return res.status(201).json({
      message: "Product created successfully.",
      product: savedProduct,
    });
  } catch (error) {
    console.error("Error creating Product details:", error);
    return res.status(500).json({ message: error.message });
  }
};

exports.getAllProducts = async (req, res) => {
  try {
    const {
      page = 1, // default page 1
      limit = 12, // default limit to 10
      sortBy = "createdAt", // default sorting by createdAt
      order = "desc", // default descending order
      productType, // filter by productType
      priceMin, // filter by min price
      priceMax, // filter by max price
      category, // filter by category
      in_stock, // filter by stock
      tags,
      is_drafted,
      isActive,
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

    if (tags) {
      query.tags = { $in: tags.split(",") }; // Allow multiple tags, comma-separated
    }

    if (is_drafted !== undefined) {
      query.is_drafted = is_drafted === "true" ? true : false;
    }

    if (isActive !== undefined) {
      query.isActive = isActive === "true" ? true : false;
    }

    if (category) {
      const categoryDoc = await Categories.findOne({
        mainCategory: category.trim(),
      });
      if (categoryDoc) {
        query.category = categoryDoc._id;
      } else {
        query.category = null;
      }
    }

    // Pagination setup
    const skip = (page - 1) * limit;

    // Sorting setup
    const sortOrder = order === "asc" ? 1 : -1;

    const [products, totalProducts] = await Promise.all([
      productModel
        .find(query)
        .skip(skip)
        .limit(parseInt(limit))
        .sort({ [sortBy]: sortOrder })
        .populate("category")
        .populate("pickup")
        .populate("main_product")
        .populate("variant")
        .populate("variable.variableId")
        .populate("attribute")
        .populate("reviews"),
      productModel.countDocuments(query),
    ]);

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
    return res.status(500).json({ message: error.message });
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
    let allPromises = [];

    if (deletedProduct.hoverImage.public_id) {
      allPromises.push(
        deleteFile(deletedProduct.hoverImage.public_id).catch((error) => {
          console.error("Error deleting hover image:", error);
        })
      );
    }

    if (deletedProduct.productImage.length > 0) {
      for (let i = 0; i < deletedProduct.productImage.length; i++) {
        allPromises.push(deleteFile(deletedProduct.productImage[i].public_id));
      }
    }

    if (deletedProduct.attribute.length > 0) {
      for (let i = 0; i < deletedProduct.attribute.length; i++) {
        allPromises.push(
          attributeModel.updateMany(
            { _id: deletedProduct.attribute[i] },
            { $pull: { products: deletedProduct._id } }
          )
        );
      }
    }

    allPromises.push(
      productModel.findOneAndDelete({
        $or: [
          { _id: mongoose.Types.ObjectId.isValid(id) ? id : undefined },
          { productId: id },
        ],
      })
    );

    await Promise.all(allPromises);
    res.status(200).json({ message: "Product Data Delete Successfully" });
  } catch (error) {
    console.error("Error deleting Product details:", error);
    return res.status(500).json({ message: error.message });
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
      main_product,
      variable,
      price,
      mrp,
      in_stock,
      attribute,
      discount,
      description,
      variant,
      specification,
      isActive,
      tags,
      thumbnailIndex,
      is_drafted,
      product_viewed,
      product_added,
      product_ordered,
    } = req.body;

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
      const hoverImage = req.files.hoverImage;

      // Delete old hover image
      if (updatedProduct.hoverImage.public_id) {
        await deleteFile(updatedProduct.hoverImage.public_id);
      }

      // Upload new hover image
      const hoverResult = await uploadFile(
        hoverImage.tempFilePath,
        hoverImage.mimetype
      );
      updatedProduct.hoverImage = {
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

    if (attribute) {
      const newAttributeIds = JSON.parse(attribute);
      const oldAttributeIds = updatedProduct.attribute || [];

      // Remove product from old attributes

      await Promise.all([
        await attributeModel.updateMany(
          { _id: { $in: oldAttributeIds } },
          { $pull: { products: updatedProduct._id } }
        ),

        await attributeModel.updateMany(
          { _id: { $in: newAttributeIds } },
          { $addToSet: { products: updatedProduct._id } } // Ensures no duplicates
        ),
      ]);
      updatedProduct.attribute = attribute
        ? JSON.parse(attribute)
        : updatedProduct.attribute;
    }

    updatedProduct.title = title || updatedProduct.title;
    updatedProduct.category = category || updatedProduct.category;
    updatedProduct.subCategory = subCategory || updatedProduct.subCategory;
    updatedProduct.subSubCategory =
      subSubCategory || updatedProduct.subSubCategory;
    updatedProduct.pickup = pickup || updatedProduct.pickup;
    updatedProduct.productType = productType || updatedProduct.productType;
    updatedProduct.main_product =
      productType === "variant" ? main_product : null;
    updatedProduct.variable =
      productType === "variant" ? JSON.parse(variable) : null;
    updatedProduct.price = price || updatedProduct.price;
    updatedProduct.mrp = mrp || updatedProduct.mrp;
    updatedProduct.in_stock = in_stock || updatedProduct.in_stock;
    updatedProduct.discount = discount || updatedProduct.discount;
    updatedProduct.description = description || updatedProduct.description;
    updatedProduct.variant = variant
      ? JSON.parse(variant)
      : updatedProduct.variant;
    updatedProduct.specification = specification
      ? JSON.parse(specification)
      : updatedProduct.specification;
    updatedProduct.isActive =
      isActive !== undefined ? Boolean(isActive) : updatedProduct.isActive;
    updatedProduct.tags = tags ? JSON.parse(tags) : updatedProduct.tags;
    updatedProduct.thumbnail_image = thumbnailIndex
      ? {
          public_id:
            updatedProduct.productImage[parseInt(thumbnailIndex)].public_id,
          secure_url:
            updatedProduct.productImage[parseInt(thumbnailIndex)].secure_url,
        }
      : updatedProduct.thumbnail_image;

    updatedProduct.is_drafted = is_drafted === "true" ? true : false;
    updatedProduct.product_added =
      product_added || updatedProduct.product_added;
    updatedProduct.product_ordered =
      product_ordered || updatedProduct.product_ordered;
    updatedProduct.product_viewed =
      product_viewed || updatedProduct.product_viewed;

    const product = await updatedProduct.save();

    res
      .status(200)
      .json({ message: "Product updated Successfully", data: product });
  } catch (error) {
    console.error("Error updateing Product details:", error);
    return res.status(500).json({ message: error.message });
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
      .populate("main_product")
      .populate("variant")
      .populate("variable.variableId")
      .populate("attribute")
      .populate("reviews");
      
    console.log(id);
    console.log(product);

    if (!product) {
      return res.status(404).json({ message: "Product not found" });
    }
    res
      .status(200)
      .json({ message: "Product fetched successfully", data: product });
  } catch (error) {
    console.error("Error getting Product details:", error);
    return res.status(500).json({ message: error.message });
  }
};

exports.getProductBySlug = async (req, res) => {
  try {
    const { slug } = req.params;
    const product = await productModel
      .findOne({
        slug,
      })
      .populate("category")
      .populate("pickup")
      .populate("main_product")
      .populate("variant")
      .populate("variable.variableId")
      .populate("attribute")
      .populate("reviews");
    if (!product) {
      return res.status(404).json({ message: "Product not found" });
    }
    res
      .status(200)
      .json({ message: "Product fetched successfully", data: product });
  } catch (error) {
    console.error("Error getting Product details:", error);
    return res.status(500).json({ message: error.message });
  }
};

exports.searchProduct = async (req, res) => {
  try {
    const { search = "", page = 1, limit = 10, productType } = req.query;
    currentPage = parseInt(page);
    currentLimit = parseInt(limit);

    const query = {
      $or: [
        { title: { $regex: search, $options: "i" } },
        { productId: { $regex: search, $options: "i" } },
      ],
    };

    if (productType) {
      query.productType = productType;
    }

    const [products, totalProducts] = await Promise.all([
      productModel
        .find(query)
        .sort({ createdAt: -1 })
        .skip((currentPage - 1) * currentLimit)
        .limit(currentLimit)
        .populate("category")
        .populate("pickup")
        .populate("main_product")
        .populate("variant")
        .populate("variable.variableId")
        .populate("attribute")
        .populate("reviews"),
      productModel.countDocuments(query),
    ]);

    const totalPages = Math.ceil(totalProducts / currentLimit);
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
    return res.status(500).json({ message: error.message });
  }
};
