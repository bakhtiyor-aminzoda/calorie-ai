import { v2 as cloudinary } from 'cloudinary';

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

export async function uploadImage(buffer: Buffer): Promise<string> {
  return new Promise((resolve, reject) => {
    cloudinary.uploader.upload_stream(
      { 
        folder: 'calorie-ai',
        transformation: [
          { width: 800, height: 800, crop: 'limit', quality: 'auto:good', fetch_format: 'auto' }
        ],
        // Compress aggressively while maintaining visual quality
        quality: 85
      },
      (error, result) => {
        if (error) reject(error);
        else if (result) resolve(result.secure_url);
        else reject(new Error('Upload failed'));
      }
    ).end(buffer);
  });
}

export async function deleteImage(url: string): Promise<void> {
  try {
    const parts = url.split('/');
    const publicId = `calorie-ai/${parts[parts.length - 1].split('.')[0]}`;
    console.log(`[Cloudinary] Attempting to delete. URL: ${url}, Extracted Public ID: ${publicId}`);

    const result = await cloudinary.uploader.destroy(publicId);
    console.log('[Cloudinary] Delete result:', result);
  } catch (error) {
    console.error('[Cloudinary] Delete error:', error);
    // Don't throw, allow DB delete to proceed
  }
}
