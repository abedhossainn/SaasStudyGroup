// Cloudinary configuration for file uploads
import { Cloudinary } from "@cloudinary/url-gen";

// Initialize Cloudinary instance
export const cld = new Cloudinary({
  cloud: {
    cloudName: 'dvuardntf'
  },
  url: {
    secure: true // Force HTTPS, even for development
  }
});

// Configuration for direct uploads
export const CLOUDINARY_CONFIG = {
  cloudName: 'dvuardntf',
  uploadPreset: 'SaasFiles',
  apiKey: '981417274371449'
  // API secret is only used server-side and should not be included in client-side code
};