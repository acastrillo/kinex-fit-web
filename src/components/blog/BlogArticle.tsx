import Link from "next/link";
import Image from "next/image";
import { BlogCategoryBadge } from "@/components/blog/BlogCategoryBadge";
import { ArrowLeft, Calendar, Clock, User } from "lucide-react";
import type { BlogPost } from "@/lib/dynamodb-blog";

export function BlogArticle({ post }: { post: BlogPost }) {
  const formattedDate = new Date(post.publishedAt).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });

  return (
    <article className="max-w-3xl mx-auto">
      {/* Back link */}
      <Link
        href="/blog"
        className="inline-flex items-center gap-2 text-[#FF6B35] hover:text-[#FF9F2E] mb-8 text-sm font-medium"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to Blog
      </Link>

      {/* Hero image */}
      {post.image && (
        <div className="relative w-full max-h-96 aspect-video overflow-hidden rounded-xl mb-8">
          <Image
            src={post.image}
            alt={post.title}
            fill
            className="object-cover"
            sizes="(max-width: 768px) 100vw, 800px"
            priority
          />
        </div>
      )}

      {/* Meta row */}
      <div className="flex flex-wrap items-center gap-3 mb-4 text-sm text-zinc-400">
        <BlogCategoryBadge category={post.category} />
        <span className="flex items-center gap-1">
          <Calendar className="w-3.5 h-3.5" />
          {formattedDate}
        </span>
        <span className="text-zinc-600">&bull;</span>
        <span className="flex items-center gap-1">
          <Clock className="w-3.5 h-3.5" />
          {post.readTime}
        </span>
      </div>

      {/* Title */}
      <h1 className="text-3xl md:text-4xl font-bold text-white mb-4">
        {post.title}
      </h1>

      {/* Author */}
      <p className="flex items-center gap-2 text-sm text-zinc-400 mb-10">
        <User className="w-4 h-4" />
        By {post.author}
      </p>

      {/* Content */}
      <div
        className="blog-prose"
        dangerouslySetInnerHTML={{ __html: post.content }}
      />
    </article>
  );
}
