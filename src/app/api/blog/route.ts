import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import { dynamoDBUsers } from '@/lib/dynamodb';
import { hasPermission } from '@/lib/rbac';
import { dynamoDBBlogPosts, type BlogPost } from '@/lib/dynamodb-blog';
import { z } from 'zod';

const createPostSchema = z.object({
  title: z.string().min(1),
  slug: z.string().min(1).regex(/^[a-z0-9-]+$/),
  excerpt: z.string(),
  content: z.string(),
  category: z.enum(['FITNESS', 'NUTRITION', 'RECOVERY', 'WELLNESS']),
  author: z.string().default('Kinex Fit'),
  status: z.enum(['draft', 'published']).default('draft'),
  readTime: z.string().default('5 min read'),
  metaDescription: z.string().default(''),
  image: z.string().default(''),
});

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const category = searchParams.get('category');
    const all = searchParams.get('all');

    let isAdminRequest = false;

    // Determine which posts to fetch
    let posts: BlogPost[];
    if (all === 'true') {
      const session = await getServerSession(authOptions);
      const userId = (session?.user as { id?: string } | undefined)?.id;

      if (userId) {
        const user = await dynamoDBUsers.get(userId);
        if (user && hasPermission(user, 'admin:view-analytics')) {
          isAdminRequest = true;
        }
      }

      posts = isAdminRequest
        ? await dynamoDBBlogPosts.getAllPosts()
        : await dynamoDBBlogPosts.getAllPublishedPosts();
    } else {
      posts = await dynamoDBBlogPosts.getAllPublishedPosts();
    }

    // Apply category filter in-memory
    if (category) {
      posts = posts.filter((post) => post.category === category);
    }

    const response = NextResponse.json({ posts });

    // Only add cache headers for public (non-admin) requests
    if (!isAdminRequest) {
      response.headers.set(
        'Cache-Control',
        'public, s-maxage=60, stale-while-revalidate=300'
      );
    }

    return response;
  } catch (error) {
    console.error('Error fetching blog posts:', error);
    return NextResponse.json(
      { error: 'Failed to fetch blog posts' },
      { status: 500 }
    );
  }
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

    // 3. Validate request body
    const body = await request.json();
    const parsed = createPostSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid request body', details: parsed.error.errors },
        { status: 400 }
      );
    }

    const validatedData = parsed.data;

    // 4. Check slug uniqueness
    const existingPost = await dynamoDBBlogPosts.getPostBySlug(validatedData.slug);
    if (existingPost) {
      return NextResponse.json(
        { error: 'A post with this slug already exists' },
        { status: 409 }
      );
    }

    // 5. Create the post
    const post = await dynamoDBBlogPosts.createPost(validatedData);

    return NextResponse.json(
      { success: true, data: { post } },
      { status: 201 }
    );
  } catch (error) {
    console.error('Error creating blog post:', error);
    return NextResponse.json(
      { error: 'Failed to create blog post' },
      { status: 500 }
    );
  }
}
