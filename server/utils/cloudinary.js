const cloudinary = require('cloudinary').v2;

const configureCloudinary = () => {
  if (process.env.CLOUDINARY_CLOUD_NAME) {
    cloudinary.config({
      cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
      api_key: process.env.CLOUDINARY_API_KEY,
      api_secret: process.env.CLOUDINARY_API_SECRET,
    });
    return true;
  }
  return false;
};

const uploadToCloudinary = async (filePath, folder) => {
  if (!configureCloudinary()) return null;
  try {
    const result = await cloudinary.uploader.upload(filePath, {
      folder: `school-erp/${folder}`,
      resource_type: 'auto',
    });
    return result;
  } catch (error) {
    console.error('Cloudinary upload error:', error);
    return null;
  }
};

const deleteFromCloudinary = async (publicId) => {
  if (!configureCloudinary()) return null;
  try {
    return await cloudinary.uploader.destroy(publicId);
  } catch (error) {
    console.error('Cloudinary delete error:', error);
    return null;
  }
};

module.exports = { uploadToCloudinary, deleteFromCloudinary, configureCloudinary };
