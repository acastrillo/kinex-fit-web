export const runtime = 'nodejs';

import { NextRequest, NextResponse } from 'next/server';
import { timingSafeEqual } from 'crypto';
import { dynamoDBBlogPosts } from '@/lib/dynamodb-blog';
import { z } from 'zod';

const webhookPostSchema = z.object({
  title: z.string().min(1),
  slug: z.string().optional(),
  excerpt: z.string(),
  content: z.string(),
  category: z.enum(['FITNESS', 'NUTRITION', 'RECOVERY', 'WELLNESS']),
  image: z.string(),
  author: z.string(),
});

export async function POST(request: NextRequest) {
  try {
    // 1. Authenticate via API key
    const apiKey = request.headers.get('x-api-key');
    const expectedKey = process.env.BLOG_WEBHOOK_API_KEY;

    if (
      !apiKey ||
      !expectedKey ||
      apiKey.length !== expectedKey.length ||
      !timingSafeEqual(Buffer.from(apiKey), Buffer.from(expectedKey))
    ) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // 2. Validate request body
    const body = await request.json();
    const parsed = webhookPostSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid request body', details: parsed.error.errors },
        { status: 400 }
      );
    }

    const validatedData = parsed.data;

    // 3. Auto-generate slug from title if not provided
    const slug =
      validatedData.slug ||
      validatedData.title
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)/g, '');

    // 4. Create the post as published
    await dynamoDBBlogPosts.createPost({
      ...validatedData,
      slug,
      status: 'published',
      readTime: '5 min read',
      metaDescription: '',
    });

    return NextResponse.json({ success: true, slug });
  } catch (error) {
    console.error('Error processing blog webhook:', error);
    return NextResponse.json(
      { error: 'Failed to process webhook' },
      { status: 500 }
    );
  }
}
