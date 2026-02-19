import Link from "next/link";
import Image from "next/image";
import { Card, CardContent } from "@/components/ui/card";
import { BlogCategoryBadge } from "@/components/blog/BlogCategoryBadge";
import { Dumbbell, Calendar, Clock, User } from "lucide-react";
import type { BlogPost } from "@/lib/dynamodb-blog";

export function BlogCard({ post }: { post: BlogPost }) {
  const formattedDate = new Date(post.publishedAt).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });

  return (
    <Link href={`/blog/${post.slug}`}>
      <Card className="bg-zinc-900/50 border-zinc-800 hover:border-[#FF6B35]/50 transition-all duration-300 overflow-hidden group">
        {/* Image */}
        <div className="relative aspect-video overflow-hidden rounded-t-lg bg-zinc-800">
          {post.image ? (
            <Image
              src={post.image}
              alt={post.title}
              fill
              className="object-cover group-hover:scale-105 transition-transform duration-300"
              sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
            />
          ) : (
            <div className="absolute inset-0 bg-gradient-to-br from-zinc-800 to-zinc-900 flex items-center justify-center">
              <Dumbbell className="w-12 h-12 text-zinc-600" />
            </div>
          )}
        </div>

        {/* Content */}
        <CardContent className="p-5">
          <div className="flex items-center gap-3 mb-3">
            <BlogCategoryBadge category={post.category} />
            <span className="text-xs text-zinc-500 flex items-center gap-1">
              <Calendar className="w-3 h-3" />
              {formattedDate}
            </span>
          </div>

          <h3 className="text-lg font-semibold text-white line-clamp-2 mb-2">
            {post.title}
          </h3>

          <p className="text-sm text-text-secondary line-clamp-3 mb-4">
            {post.excerpt}
          </p>

          <div className="flex items-center justify-between text-xs text-zinc-500">
            <span className="flex items-center gap-1">
              <User className="w-3 h-3" />
              {post.author}
            </span>
            <span className="flex items-center gap-1">
              <Clock className="w-3 h-3" />
              {post.readTime}
            </span>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
