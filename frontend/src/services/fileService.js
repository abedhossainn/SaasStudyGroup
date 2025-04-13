import { REACT_APP_CLOUDINARY_CLOUD_NAME, REACT_APP_CLOUDINARY_PRESET } from "../cloudinary";

export const uploadFileToCloudinary = async (file) => {
    const cloudName = REACT_APP_CLOUDINARY_CLOUD_NAME;
    const uploadPreset = REACT_APP_CLOUDINARY_PRESET;
  
    const formData = new FormData();
    formData.append('file', file);
    formData.append('upload_preset', uploadPreset);
  
    const response = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/auto/upload`, {
      method: 'POST',
      body: formData,
    });
  
    const data = await response.json();
  
    if (!data.secure_url) {
      throw new Error('Upload failed');
    }
  
    return data.secure_url; 
  };