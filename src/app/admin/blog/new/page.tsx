import { Metadata } from 'next';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import { dynamoDBUsers } from '@/lib/dynamodb';
import { hasPermission } from '@/lib/rbac';
import { redirect } from 'next/navigation';
import { BlogPostForm } from '@/components/admin/blog-post-form';

export const metadata: Metadata = {
  title: 'New Blog Post | Admin',
  description: 'Create a new blog post',
};

export default async function AdminBlogNewPage() {
  const session = await getServerSession(authOptions);
  const userId = (session?.user as { id?: string } | undefined)?.id;
  if (!userId) {
    redirect('/auth/login?callbackUrl=/admin/blog/new');
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

  return (
    <div className="container mx-auto p-6 max-w-7xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-text-primary mb-2">New Blog Post</h1>
        <p className="text-text-secondary">Create a new blog post.</p>
      </div>
      <BlogPostForm />
    </div>
  );
}
