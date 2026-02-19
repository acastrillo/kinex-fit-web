import { Metadata } from 'next';
import { dynamoDBBlogPosts } from '@/lib/dynamodb-blog';
import { BlogCard } from '@/components/blog/BlogCard';
import { BlogCTA } from '@/components/blog/BlogCTA';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Fitness Blog | Kinex Fit',
  description: 'Expert fitness tips, workout guides, nutrition advice, and recovery strategies to help you reach your goals.',
  openGraph: {
    title: 'Fitness Blog | Kinex Fit',
    description: 'Expert fitness tips, workout guides, nutrition advice, and recovery strategies.',
    type: 'website',
  },
};

const CATEGORIES = ['FITNESS', 'NUTRITION', 'RECOVERY', 'WELLNESS'];

export default async function BlogPage({
  searchParams,
}: {
  searchParams: Promise<{ category?: string }>;
}) {
  const { category } = await searchParams;
  let posts = await dynamoDBBlogPosts.getAllPublishedPosts();

  // Filter by category if provided
  if (category && CATEGORIES.includes(category)) {
    posts = posts.filter((post) => post.category === category);
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-6 py-16 max-w-6xl">
        {/* Page Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl md:text-5xl font-bold text-white mb-4">
            Fitness Blog
          </h1>
          <p className="text-text-secondary text-lg max-w-2xl mx-auto">
            Expert tips, workout guides, and strategies to help you train smarter and recover better.
          </p>
        </div>

        {/* Category Filters */}
        <div className="flex flex-wrap justify-center gap-3 mb-10">
          <Link
            href="/blog"
            className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
              !category
                ? 'bg-[#FF6B35] text-white'
                : 'bg-zinc-800 text-zinc-400 hover:text-white'
            }`}
          >
            All
          </Link>
          {CATEGORIES.map((cat) => (
            <Link
              key={cat}
              href={`/blog?category=${cat}`}
              className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                category === cat
                  ? 'bg-[#FF6B35] text-white'
                  : 'bg-zinc-800 text-zinc-400 hover:text-white'
              }`}
            >
              {cat.charAt(0) + cat.slice(1).toLowerCase()}
            </Link>
          ))}
        </div>

        {/* Post Grid */}
        {posts.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {posts.map((post) => (
              <BlogCard key={post.slug} post={post} />
            ))}
          </div>
        ) : (
          <div className="text-center py-20">
            <p className="text-text-secondary text-lg">
              {category ? `No ${category.toLowerCase()} posts yet.` : 'No blog posts yet. Check back soon!'}
            </p>
          </div>
        )}

        {/* CTA */}
        <BlogCTA />
      </div>
    </div>
  );
}
