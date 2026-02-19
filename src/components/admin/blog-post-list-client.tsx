"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import type { BlogPost } from "@/lib/dynamodb-blog";
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Pencil, Trash2, Loader2, Plus } from "lucide-react";
import { BlogCategoryBadge } from "@/components/blog/BlogCategoryBadge";

export function BlogPostListClient() {
  const router = useRouter();

  const [posts, setPosts] = useState<BlogPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deleteSlug, setDeleteSlug] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const fetchPosts = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/blog?all=true", {
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to fetch posts");
      const data = await res.json();
      setPosts(data.posts || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load posts");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPosts();
  }, [fetchPosts]);

  async function handleDelete() {
    if (!deleteSlug) return;
    setIsDeleting(true);
    try {
      const res = await fetch(`/api/blog/${deleteSlug}`, {
        method: "DELETE",
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to delete");
      setDeleteSlug(null);
      fetchPosts();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to delete post"
      );
    } finally {
      setIsDeleting(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-text-secondary" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-500/10 border border-red-500/20 text-red-400 px-4 py-3 rounded-lg">
        {error}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-text-primary">
          Blog Posts ({posts.length})
        </h2>
        <Button onClick={() => router.push("/admin/blog/new")}>
          <Plus className="h-4 w-4 mr-2" /> New Post
        </Button>
      </div>

      {posts.length === 0 ? (
        <div className="text-center py-12 text-text-secondary">
          No blog posts yet. Create your first post to get started.
        </div>
      ) : (
        <div className="border border-border rounded-lg overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="text-text-secondary">Title</TableHead>
                <TableHead className="text-text-secondary">Category</TableHead>
                <TableHead className="text-text-secondary">Status</TableHead>
                <TableHead className="text-text-secondary">Author</TableHead>
                <TableHead className="text-text-secondary">Date</TableHead>
                <TableHead className="text-text-secondary text-right">
                  Actions
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {posts.map((post) => (
                <TableRow key={post.slug}>
                  <TableCell className="font-medium text-text-primary">
                    {post.title}
                  </TableCell>
                  <TableCell>
                    <BlogCategoryBadge category={post.category} />
                  </TableCell>
                  <TableCell>
                    {post.status === "published" ? (
                      <Badge
                        variant="outline"
                        className="bg-green-500/10 text-green-400 border-green-500/20"
                      >
                        Published
                      </Badge>
                    ) : (
                      <Badge
                        variant="outline"
                        className="bg-zinc-500/10 text-zinc-400 border-zinc-500/20"
                      >
                        Draft
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-text-secondary">
                    {post.author}
                  </TableCell>
                  <TableCell className="text-text-secondary">
                    {new Date(post.publishedAt).toLocaleDateString()}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() =>
                          router.push(`/admin/blog/edit/${post.slug}`)
                        }
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setDeleteSlug(post.slug)}
                        className="text-red-400 hover:text-red-300"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Delete confirmation dialog */}
      <Dialog
        open={!!deleteSlug}
        onOpenChange={(open) => !open && setDeleteSlug(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Post</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this post? This action cannot be
              undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDeleteSlug(null)}
              disabled={isDeleting}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={isDeleting}
            >
              {isDeleting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" /> Deleting...
                </>
              ) : (
                "Delete"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
