export const runtime = 'nodejs';

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import { dynamoDBUsers } from '@/lib/dynamodb';
import { hasPermission } from '@/lib/rbac';
import { uploadBlogImage, getBlogImageUrl } from '@/lib/s3';

// File validation constants
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

function validateImageSignature(header: Uint8Array): boolean {
  // Check JPEG
  if (header[0] === 0xFF && header[1] === 0xD8 && header[2] === 0xFF) return true;
  // Check PNG
  if (header[0] === 0x89 && header[1] === 0x50 && header[2] === 0x4E && header[3] === 0x47) return true;
  // Check WebP (RIFF)
  if (header[0] === 0x52 && header[1] === 0x49 && header[2] === 0x46 && header[3] === 0x46) return true;
  return false;
}

export async function POST(request: NextRequest) {
  try {
    // 1. Authentication check
    const session = await getServerSession(authOptions);
    const userId = (session?.user as { id?: string } | undefined)?.id;
    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized', success: false },
        { status: 401 }
      );
    }

    // 2. Authorization check - verify admin permission
    const adminUser = await dynamoDBUsers.get(userId);
    if (!adminUser || !hasPermission(adminUser, 'admin:view-analytics')) {
      return NextResponse.json(
        { error: 'Forbidden: Admin role required', success: false },
        { status: 403 }
      );
    }

    // 3. Parse form data
    const form = await request.formData();
    const file = form.get('file');
    const slug = form.get('slug') as string;

    if (!(file instanceof Blob)) {
      return NextResponse.json(
        { error: 'file is required' },
        { status: 400 }
      );
    }

    if (!slug) {
      return NextResponse.json(
        { error: 'slug is required' },
        { status: 400 }
      );
    }

    // 4. Validate file size
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        {
          error: 'File too large',
          message: `Maximum file size is ${MAX_FILE_SIZE / 1024 / 1024}MB`,
        },
        { status: 400 }
      );
    }

    // 5. Validate MIME type
    if (file instanceof File && !ALLOWED_MIME_TYPES.includes(file.type)) {
      return NextResponse.json(
        {
          error: 'Invalid file type',
          message: 'Only JPEG, PNG, and WebP images are allowed',
        },
        { status: 400 }
      );
    }

    // 6. Validate magic bytes (actual file content)
    const arrayBuffer = await file.arrayBuffer();
    const header = new Uint8Array(arrayBuffer.slice(0, 4));
    if (!validateImageSignature(header)) {
      return NextResponse.json(
        {
          error: 'Invalid image file',
          message: 'File does not appear to be a valid image',
        },
        { status: 400 }
      );
    }

    // 7. Upload to S3
    const bytes = Buffer.from(arrayBuffer);
    const filename = file instanceof File ? file.name : 'upload.jpg';
    const key = await uploadBlogImage(bytes, slug, filename);
    const url = getBlogImageUrl(key);

    return NextResponse.json({
      key,
      url,
      message: 'Image uploaded successfully',
    });
  } catch (error) {
    console.error('Blog image upload error:', error);
    return NextResponse.json(
      { error: String((error as Error)?.message || error) },
      { status: 500 }
    );
  }
}
