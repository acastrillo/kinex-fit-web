import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { dynamoDBBlogPosts } from '@/lib/dynamodb-blog';
import { BlogArticle } from '@/components/blog/BlogArticle';
import { BlogCTA } from '@/components/blog/BlogCTA';

interface PageProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const post = await dynamoDBBlogPosts.getPostBySlug(slug);

  if (!post) {
    return { title: 'Post Not Found | Kinex Fit' };
  }

  return {
    title: `${post.title} | Kinex Fit Blog`,
    description: post.metaDescription || post.excerpt,
    openGraph: {
      title: post.title,
      description: post.metaDescription || post.excerpt,
      type: 'article',
      publishedTime: post.publishedAt,
      images: post.image ? [{ url: post.image }] : [],
    },
  };
}

export default async function BlogPostPage({ params }: PageProps) {
  const { slug } = await params;
  const post = await dynamoDBBlogPosts.getPostBySlug(slug);

  if (!post) {
    notFound();
  }

  // JSON-LD structured data for SEO
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: post.title,
    description: post.metaDescription || post.excerpt,
    image: post.image,
    author: {
      '@type': 'Person',
      name: post.author,
    },
    datePublished: post.publishedAt,
    dateModified: post.updatedAt,
    publisher: {
      '@type': 'Organization',
      name: 'Kinex Fit',
    },
  };

  return (
    <div className="min-h-screen bg-background">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <div className="container mx-auto px-6 py-8 max-w-4xl">
        <BlogArticle post={post} />
        <BlogCTA />
      </div>
    </div>
  );
}
