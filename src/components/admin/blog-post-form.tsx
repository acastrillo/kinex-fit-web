"use client";

import { useState, FormEvent } from "react";
import { useRouter } from "next/navigation";
import type { BlogPost } from "@/lib/dynamodb-blog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Eye, EyeOff, Loader2 } from "lucide-react";

interface BlogPostFormProps {
  post?: BlogPost;
}

export function BlogPostForm({ post }: BlogPostFormProps) {
  const router = useRouter();

  const [title, setTitle] = useState(post?.title || "");
  const [slug, setSlug] = useState(post?.slug || "");
  const [slugManuallyEdited, setSlugManuallyEdited] = useState(!!post);
  const [excerpt, setExcerpt] = useState(post?.excerpt || "");
  const [content, setContent] = useState(post?.content || "");
  const [category, setCategory] = useState(post?.category || "FITNESS");
  const [author, setAuthor] = useState(post?.author || "Kinex Fit");
  const [status, setStatus] = useState<string>(post?.status || "draft");
  const [readTime, setReadTime] = useState(post?.readTime || "5 min read");
  const [metaDescription, setMetaDescription] = useState(
    post?.metaDescription || ""
  );
  const [image, setImage] = useState(post?.image || "");
  const [isPreview, setIsPreview] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function handleTitleChange(value: string) {
    setTitle(value);
    if (!slugManuallyEdited) {
      const autoSlug = value
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/(^-|-$)/g, "");
      setSlug(autoSlug);
    }
  }

  async function handleImageUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("slug", slug || "temp");

      const res = await fetch("/api/blog/upload-image", {
        method: "POST",
        body: formData,
        credentials: "include",
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Upload failed");
      }

      const data = await res.json();
      setImage(data.url);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Image upload failed");
    } finally {
      setIsUploading(false);
    }
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();

    if (!title.trim()) {
      setError("Title is required");
      return;
    }
    if (!slug.trim()) {
      setError("Slug is required");
      return;
    }
    if (!content.trim()) {
      setError("Content is required");
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const body = {
        title,
        slug,
        excerpt,
        content,
        category,
        author,
        status,
        readTime,
        metaDescription,
        image,
      };

      const url = post ? `/api/blog/${post.slug}` : "/api/blog";
      const method = post ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
        credentials: "include",
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to save post");
      }

      router.push("/admin/blog");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save post");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {error && (
        <div className="bg-red-500/10 border border-red-500/20 text-red-400 px-4 py-3 rounded-lg">
          {error}
        </div>
      )}

      {/* Title */}
      <div className="space-y-2">
        <label className="text-sm font-medium text-text-primary">Title</label>
        <Input
          value={title}
          onChange={(e) => handleTitleChange(e.target.value)}
          placeholder="Post title"
        />
      </div>

      {/* Slug */}
      <div className="space-y-2">
        <label className="text-sm font-medium text-text-primary">Slug</label>
        <Input
          value={slug}
          onChange={(e) => {
            setSlug(e.target.value);
            setSlugManuallyEdited(true);
          }}
          placeholder="url-friendly-slug"
        />
        <p className="text-xs text-text-tertiary">URL: /blog/{slug}</p>
      </div>

      {/* Category + Status row */}
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <label className="text-sm font-medium text-text-primary">
            Category
          </label>
          <Select value={category} onValueChange={setCategory}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="FITNESS">Fitness</SelectItem>
              <SelectItem value="NUTRITION">Nutrition</SelectItem>
              <SelectItem value="RECOVERY">Recovery</SelectItem>
              <SelectItem value="WELLNESS">Wellness</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <label className="text-sm font-medium text-text-primary">
            Status
          </label>
          <Select value={status} onValueChange={setStatus}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="draft">Draft</SelectItem>
              <SelectItem value="published">Published</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Excerpt */}
      <div className="space-y-2">
        <label className="text-sm font-medium text-text-primary">
          Excerpt
        </label>
        <Textarea
          value={excerpt}
          onChange={(e) => setExcerpt(e.target.value)}
          placeholder="Short description for listing cards"
          rows={2}
        />
      </div>

      {/* Content with preview toggle */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <label className="text-sm font-medium text-text-primary">
            Content (HTML)
          </label>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => setIsPreview(!isPreview)}
          >
            {isPreview ? (
              <>
                <EyeOff className="h-4 w-4 mr-1" /> Edit
              </>
            ) : (
              <>
                <Eye className="h-4 w-4 mr-1" /> Preview
              </>
            )}
          </Button>
        </div>
        {isPreview ? (
          <div
            className="blog-prose bg-surface rounded-lg p-6 min-h-[200px] border border-border"
            dangerouslySetInnerHTML={{ __html: content }}
          />
        ) : (
          <Textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="<p>Your HTML content here...</p>"
            rows={12}
            className="font-mono text-sm"
          />
        )}
      </div>

      {/* Featured Image */}
      <div className="space-y-2">
        <label className="text-sm font-medium text-text-primary">
          Featured Image
        </label>
        <div className="flex items-center gap-4">
          <Input
            type="file"
            accept="image/jpeg,image/png,image/webp"
            onChange={handleImageUpload}
            disabled={isUploading}
          />
          {isUploading && (
            <Loader2 className="h-4 w-4 animate-spin text-text-secondary" />
          )}
        </div>
        {image && (
          <div className="mt-2">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={image}
              alt="Featured"
              className="max-h-48 rounded-lg object-cover"
            />
            <Input
              value={image}
              onChange={(e) => setImage(e.target.value)}
              placeholder="Or paste image URL"
              className="mt-2"
            />
          </div>
        )}
        {!image && (
          <Input
            value={image}
            onChange={(e) => setImage(e.target.value)}
            placeholder="Or paste image URL directly"
          />
        )}
      </div>

      {/* Author + Read Time row */}
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <label className="text-sm font-medium text-text-primary">
            Author
          </label>
          <Input
            value={author}
            onChange={(e) => setAuthor(e.target.value)}
          />
        </div>
        <div className="space-y-2">
          <label className="text-sm font-medium text-text-primary">
            Read Time
          </label>
          <Input
            value={readTime}
            onChange={(e) => setReadTime(e.target.value)}
            placeholder="5 min read"
          />
        </div>
      </div>

      {/* Meta Description */}
      <div className="space-y-2">
        <label className="text-sm font-medium text-text-primary">
          Meta Description
        </label>
        <Textarea
          value={metaDescription}
          onChange={(e) => setMetaDescription(e.target.value)}
          placeholder="SEO meta description"
          rows={2}
        />
      </div>

      {/* Submit */}
      <div className="flex gap-4">
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin mr-2" /> Saving...
            </>
          ) : post ? (
            "Update Post"
          ) : (
            "Create Post"
          )}
        </Button>
        <Button
          type="button"
          variant="outline"
          onClick={() => router.push("/admin/blog")}
        >
          Cancel
        </Button>
      </div>
    </form>
  );
}
