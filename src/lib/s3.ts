import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";

// Initialize S3 client
const s3Client = new S3Client({
  region: process.env.AWS_REGION || "us-east-1",
  credentials: process.env.AWS_ACCESS_KEY_ID
    ? {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
        sessionToken: process.env.AWS_SESSION_TOKEN,
      }
    : undefined, // Falls back to AWS CLI credentials
});

const BUCKET_NAME = process.env.S3_WORKOUT_IMAGES_BUCKET || "spotter-workout-images";

/**
 * Upload workout image to S3
 * @param file - The file buffer to upload
 * @param userId - User ID for organizing files
 * @param workoutId - Workout ID for unique naming
 * @param filename - Original filename
 * @returns S3 object key
 */
export async function uploadWorkoutImage(
  file: Buffer,
  userId: string,
  workoutId: string,
  filename: string
): Promise<string> {
  // Generate unique key with timestamp
  const timestamp = Date.now();
  const sanitizedFilename = filename.replace(/[^a-zA-Z0-9.-]/g, "_");
  const key = `workouts/${userId}/${workoutId}/${timestamp}-${sanitizedFilename}`;

  const command = new PutObjectCommand({
    Bucket: BUCKET_NAME,
    Key: key,
    Body: file,
    ContentType: getContentType(filename),
  });

  await s3Client.send(command);

  return key;
}

/**
 * Get the public URL for a workout image
 * @param key - S3 object key
 * @returns Public URL
 */
export function getWorkoutImageUrl(key: string): string {
  // Use CloudFront URL if configured, otherwise direct S3 URL
  const cloudFrontDomain = process.env.CLOUDFRONT_DOMAIN;
  if (cloudFrontDomain) {
    return `https://${cloudFrontDomain}/${key}`;
  }

  return `https://${BUCKET_NAME}.s3.${process.env.AWS_REGION || "us-east-1"}.amazonaws.com/${key}`;
}

/**
 * Determine content type from filename
 */
function getContentType(filename: string): string {
  const ext = filename.toLowerCase().split(".").pop();
  const contentTypes: Record<string, string> = {
    jpg: "image/jpeg",
    jpeg: "image/jpeg",
    png: "image/png",
    gif: "image/gif",
    webp: "image/webp",
  };
  return contentTypes[ext || ""] || "application/octet-stream";
}

/**
 * Upload multiple images for a workout
 */
export async function uploadWorkoutImages(
  files: Array<{ buffer: Buffer; filename: string }>,
  userId: string,
  workoutId: string
): Promise<string[]> {
  const uploadPromises = files.map(({ buffer, filename }) =>
    uploadWorkoutImage(buffer, userId, workoutId, filename)
  );
  return Promise.all(uploadPromises);
}

/**
 * Upload a blog featured image to S3
 * @param file - The file buffer to upload
 * @param slug - Blog post slug for organizing files
 * @param filename - Original filename
 * @returns S3 object key
 */
export async function uploadBlogImage(
  file: Buffer,
  slug: string,
  filename: string
): Promise<string> {
  const timestamp = Date.now();
  const sanitizedFilename = filename.replace(/[^a-zA-Z0-9.-]/g, "_");
  const key = `blog/${slug}/${timestamp}-${sanitizedFilename}`;

  const command = new PutObjectCommand({
    Bucket: BUCKET_NAME,
    Key: key,
    Body: file,
    ContentType: getContentType(filename),
  });

  await s3Client.send(command);
  return key;
}

/**
 * Get the public URL for a blog image
 * @param key - S3 object key
 * @returns Public URL (CloudFront if configured, otherwise direct S3)
 */
export function getBlogImageUrl(key: string): string {
  const cloudFrontDomain = process.env.CLOUDFRONT_DOMAIN;
  if (cloudFrontDomain) {
    return `https://${cloudFrontDomain}/${key}`;
  }
  return `https://${BUCKET_NAME}.s3.${process.env.AWS_REGION || "us-east-1"}.amazonaws.com/${key}`;
}
