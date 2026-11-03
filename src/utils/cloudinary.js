import { v2 as cloudinary } from "cloudinary";
import fs from "fs"
 // Configuration
cloudinary.config({ 
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME, 
    api_key: process.env.CLOUDINARY_API_KEY, 
    api_secret: process.env.CLOUDINARY_API_SECRET
});


const uploadOnCloudinary = async (localFilePath) => {
    try{
         if(!localFilePath)return null
         // upload file on cloudinay
         const response = await cloudinary.uploader.upload(localFilePath, {resource_type: "auto"})
         //file has been uploaded succesfully 
        //  console.log("file is uploaded on cloudinary", response.url)
        fs.unlinkSync(localFilePath)
         return response;

       }catch(error){
            fs.unlinkSync(localFilePath) // remove the locally saved tamporary file as the upload got failed
            return null
       }
}

const deleteFromCloudinary = async (cloudinaryUrl) => {
    try {
        if (!cloudinaryUrl) return null;

        // Extract the public_id from the Cloudinary URL
        const startIndex = cloudinaryUrl.lastIndexOf("/");
        const dotIndex = cloudinaryUrl.lastIndexOf(".");

        const publicId = cloudinaryUrl.substring(startIndex + 1, dotIndex);

        const response = await cloudinary.uploader.destroy(publicId, {
            resource_type: "image"
        });

        return response;
    } catch (error) {
        console.error("Error deleting image from Cloudinary:", error);
        return null;
    }
};

export { uploadOnCloudinary, deleteFromCloudinary };
       
    