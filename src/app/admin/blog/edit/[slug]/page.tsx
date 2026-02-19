import { Metadata } from 'next';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import { dynamoDBUsers } from '@/lib/dynamodb';
import { hasPermission } from '@/lib/rbac';
import { redirect, notFound } from 'next/navigation';
import { dynamoDBBlogPosts } from '@/lib/dynamodb-blog';
import { BlogPostForm } from '@/components/admin/blog-post-form';

export const metadata: Metadata = {
  title: 'Edit Blog Post | Admin',
  description: 'Edit an existing blog post',
};

export default async function AdminBlogEditPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  const session = await getServerSession(authOptions);
  const userId = (session?.user as { id?: string } | undefined)?.id;
  if (!userId) {
    redirect(`/auth/login?callbackUrl=/admin/blog/edit/${slug}`);
  }

  const user = await dynamoDBUsers.get(userId);
  if (!user || !hasPermission(user, 'admin:view-analytics')) {
    return (
      <div className="container mx-auto p-6 max-w-7xl">
        <h1 className="text-2xl font-bold text-destructive">Access Denied</h1>
        <p className="text-text-secondary mt-2">You do not have permission to access this page.</p>
      </div>
    );
  }

  const post = await dynamoDBBlogPosts.getPostBySlug(slug);
  if (!post) {
    notFound();
  }

  return (
    <div className="container mx-auto p-6 max-w-7xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-text-primary mb-2">Edit Blog Post</h1>
        <p className="text-text-secondary">Editing: {post.title}</p>
      </div>
      <BlogPostForm post={post} />
    </div>
  );
}
