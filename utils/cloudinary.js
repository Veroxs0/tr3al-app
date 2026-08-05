const cloudinary = require('cloudinary').v2;

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

const uploadImage = (fileBuffer) => {
  return new Promise((resolve, reject) => {
    if (!process.env.CLOUDINARY_CLOUD_NAME) {
         console.warn("Cloudinary credentials missing. Returning dummy URL.");
         return resolve({ secure_url: "https://dummyimage.com/600x400/000/fff&text=Dummy+Receipt" });
    }
      
    const uploadStream = cloudinary.uploader.upload_stream(
      { folder: 'tr3al_receipts' },
      (error, result) => {
        if (error) reject(error);
        else resolve(result);
      }
    );
    uploadStream.end(fileBuffer);
  });
};

module.exports = {
  uploadImage
};
