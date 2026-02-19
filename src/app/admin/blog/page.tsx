import { Metadata } from 'next';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import { dynamoDBUsers } from '@/lib/dynamodb';
import { hasPermission } from '@/lib/rbac';
import { redirect } from 'next/navigation';
import { BlogPostListClient } from '@/components/admin/blog-post-list-client';

export const metadata: Metadata = {
  title: 'Blog Management | Admin',
  description: 'Manage blog posts',
};

export default async function AdminBlogPage() {
  const session = await getServerSession(authOptions);
  const userId = (session?.user as { id?: string } | undefined)?.id;
  if (!userId) {
    redirect('/auth/login?callbackUrl=/admin/blog');
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
        <h1 className="text-3xl font-bold text-text-primary mb-2">Blog Management</h1>
        <p className="text-text-secondary">Create, edit, and manage blog posts.</p>
      </div>
      <BlogPostListClient />
    </div>
  );
}
