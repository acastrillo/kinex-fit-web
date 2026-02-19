import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import { dynamoDBUsers } from '@/lib/dynamodb';
import { hasPermission } from '@/lib/rbac';
import { dynamoDBBlogPosts } from '@/lib/dynamodb-blog';
import { z } from 'zod';

const updatePostSchema = z.object({
  title: z.string().min(1).optional(),
  slug: z.string().min(1).regex(/^[a-z0-9-]+$/).optional(),
  excerpt: z.string().optional(),
  content: z.string().optional(),
  category: z.enum(['FITNESS', 'NUTRITION', 'RECOVERY', 'WELLNESS']).optional(),
  author: z.string().optional(),
  status: z.enum(['draft', 'published']).optional(),
  readTime: z.string().optional(),
  metaDescription: z.string().optional(),
  image: z.string().optional(),
});

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params;
    const post = await dynamoDBBlogPosts.getPostBySlug(slug);

    if (!post) {
      return NextResponse.json(
        { error: 'Post not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ post });
  } catch (error) {
    console.error('Error fetching blog post:', error);
    return NextResponse.json(
      { error: 'Failed to fetch blog post' },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params;

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

    // 3. Validate request body
    const body = await request.json();
    const parsed = updatePostSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid request body', details: parsed.error.errors },
        { status: 400 }
      );
    }

    const validatedUpdates = parsed.data;

    // 4. Fetch existing post to get current status
    const existingPost = await dynamoDBBlogPosts.getPostBySlug(slug);
    if (!existingPost) {
      return NextResponse.json(
        { error: 'Post not found' },
        { status: 404 }
      );
    }

    // 5. Update the post
    await dynamoDBBlogPosts.updatePost(slug, existingPost.status, validatedUpdates);

    // 6. Return the merged post
    const updatedPost = {
      ...existingPost,
      ...validatedUpdates,
      updatedAt: new Date().toISOString(),
    };

    return NextResponse.json({ success: true, data: { post: updatedPost } });
  } catch (error) {
    console.error('Error updating blog post:', error);
    return NextResponse.json(
      { error: 'Failed to update blog post' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params;

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

    // 3. Delete the post
    await dynamoDBBlogPosts.deletePost(slug);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting blog post:', error);
    return NextResponse.json(
      { error: 'Failed to delete blog post' },
      { status: 500 }
    );
  }
}
