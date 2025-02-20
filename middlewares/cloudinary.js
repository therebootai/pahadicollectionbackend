const cloudinary = require("cloudinary").v2;
require("dotenv").config();

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

exports.uploadFile = async (tempFilePath, fileType) => {
  try {
    let folderName = "images";
    let resourceType = "image";

    const result = await cloudinary.uploader.upload(tempFilePath, {
      folder: "pahadicollection/" + folderName,
      resource_type: resourceType,
    });

    return result;
  } catch (error) {
    console.error("Error uploading file:", error);
    return error;
  }
};

exports.deleteFile = async (publicId) => {
  try {
    const fileType = publicId.endsWith(".pdf") ? "application/pdf" : "";

    if (fileType === "application/pdf") {
      resourceType = "raw";
    } else {
      resourceType = "image";
    }
    const result = await cloudinary.uploader.destroy(publicId, {
      resource_type: resourceType,
    });
    return result;
  } catch (error) {
    console.error("Error uploading file:", error);
    return error;
  }
};
