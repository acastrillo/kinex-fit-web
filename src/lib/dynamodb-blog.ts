import {
  GetCommand,
  PutCommand,
  UpdateCommand,
  QueryCommand,
  DeleteCommand,
} from "@aws-sdk/lib-dynamodb";
import { getDynamoDb } from "@/lib/dynamodb";

const BLOG_POSTS_TABLE =
  process.env.DYNAMODB_BLOG_POSTS_TABLE || "spotter-blog-posts";

export interface BlogPost {
  pk: string; // "BLOG#published" or "BLOG#draft"
  sk: string; // slug (sort key)
  slug: string;
  title: string;
  excerpt: string;
  content: string; // Full HTML content
  category: string; // FITNESS, NUTRITION, RECOVERY, WELLNESS
  image: string; // S3 URL for featured image
  author: string;
  publishedAt: string; // ISO 8601
  updatedAt: string; // ISO 8601
  status: "draft" | "published";
  readTime: string; // e.g., "5 min read"
  metaDescription: string;
}

export const dynamoDBBlogPosts = {
  /**
   * Get all published blog posts, newest first
   */
  async getAllPublishedPosts(): Promise<BlogPost[]> {
    try {
      const dynamoDb = getDynamoDb();
      const result = await dynamoDb.send(
        new QueryCommand({
          TableName: BLOG_POSTS_TABLE,
          KeyConditionExpression: "pk = :pk",
          ExpressionAttributeValues: {
            ":pk": "BLOG#published",
          },
          ScanIndexForward: false,
        })
      );
      return (result.Items as BlogPost[]) || [];
    } catch (error) {
      console.error("Error getting all published posts:", error);
      return [];
    }
  },

  /**
   * Get all blog posts (published and draft)
   */
  async getAllPosts(): Promise<BlogPost[]> {
    try {
      const dynamoDb = getDynamoDb();
      const [publishedResult, draftResult] = await Promise.all([
        dynamoDb.send(
          new QueryCommand({
            TableName: BLOG_POSTS_TABLE,
            KeyConditionExpression: "pk = :pk",
            ExpressionAttributeValues: {
              ":pk": "BLOG#published",
            },
            ScanIndexForward: false,
          })
        ),
        dynamoDb.send(
          new QueryCommand({
            TableName: BLOG_POSTS_TABLE,
            KeyConditionExpression: "pk = :pk",
            ExpressionAttributeValues: {
              ":pk": "BLOG#draft",
            },
            ScanIndexForward: false,
          })
        ),
      ]);
      const published = (publishedResult.Items as BlogPost[]) || [];
      const drafts = (draftResult.Items as BlogPost[]) || [];
      return [...published, ...drafts];
    } catch (error) {
      console.error("Error getting all posts:", error);
      return [];
    }
  },

  /**
   * Get a single post by slug (checks published first, then draft)
   */
  async getPostBySlug(slug: string): Promise<BlogPost | null> {
    try {
      const dynamoDb = getDynamoDb();

      // Try published first
      const publishedResult = await dynamoDb.send(
        new GetCommand({
          TableName: BLOG_POSTS_TABLE,
          Key: { pk: "BLOG#published", sk: slug },
        })
      );
      if (publishedResult.Item) {
        return publishedResult.Item as BlogPost;
      }

      // Try draft
      const draftResult = await dynamoDb.send(
        new GetCommand({
          TableName: BLOG_POSTS_TABLE,
          Key: { pk: "BLOG#draft", sk: slug },
        })
      );
      if (draftResult.Item) {
        return draftResult.Item as BlogPost;
      }

      return null;
    } catch (error) {
      console.error("Error getting post by slug:", error);
      return null;
    }
  },

  /**
   * Create a new blog post
   */
  async createPost(
    data: Omit<BlogPost, "pk" | "sk" | "publishedAt" | "updatedAt">
  ): Promise<BlogPost> {
    try {
      const dynamoDb = getDynamoDb();
      const now = new Date().toISOString();
      const pk =
        data.status === "published" ? "BLOG#published" : "BLOG#draft";

      const item: BlogPost = {
        ...data,
        pk,
        sk: data.slug,
        publishedAt: now,
        updatedAt: now,
      };

      await dynamoDb.send(
        new PutCommand({
          TableName: BLOG_POSTS_TABLE,
          Item: item,
        })
      );

      return item;
    } catch (error) {
      console.error("Error creating blog post:", error);
      throw error;
    }
  },

  /**
   * Update an existing blog post
   * If status changes, deletes old item and creates new one (pk changes)
   */
  async updatePost(
    slug: string,
    currentStatus: "draft" | "published",
    updates: Partial<Omit<BlogPost, "pk" | "sk">>
  ): Promise<void> {
    try {
      const dynamoDb = getDynamoDb();
      const currentPk =
        currentStatus === "published" ? "BLOG#published" : "BLOG#draft";

      // If status is changing, we need to delete + put (pk changes)
      if (updates.status && updates.status !== currentStatus) {
        // Fetch the existing item first
        const existing = await dynamoDb.send(
          new GetCommand({
            TableName: BLOG_POSTS_TABLE,
            Key: { pk: currentPk, sk: slug },
          })
        );

        const existingItem = (existing.Item as BlogPost) || {};
        const newPk =
          updates.status === "published" ? "BLOG#published" : "BLOG#draft";
        const newSlug = updates.slug || slug;

        // Merge existing data with updates
        const mergedItem = {
          ...existingItem,
          ...updates,
          pk: newPk,
          sk: newSlug,
          updatedAt: new Date().toISOString(),
        } as BlogPost;

        // Delete old item and put new item
        await dynamoDb.send(
          new DeleteCommand({
            TableName: BLOG_POSTS_TABLE,
            Key: { pk: currentPk, sk: slug },
          })
        );

        await dynamoDb.send(
          new PutCommand({
            TableName: BLOG_POSTS_TABLE,
            Item: mergedItem,
          })
        );
      } else {
        // Status not changing — use UpdateCommand
        const expressionParts: string[] = [];
        const expressionAttributeValues: Record<string, unknown> = {};
        const expressionAttributeNames: Record<string, string> = {};

        // Always update updatedAt
        expressionParts.push("updatedAt = :updatedAt");
        expressionAttributeValues[":updatedAt"] = new Date().toISOString();

        for (const [key, value] of Object.entries(updates)) {
          if (value === undefined) continue;

          // Handle DynamoDB reserved words
          if (key === "content") {
            expressionParts.push("#content = :content");
            expressionAttributeNames["#content"] = "content";
            expressionAttributeValues[":content"] = value;
          } else if (key === "status") {
            expressionParts.push("#status = :status");
            expressionAttributeNames["#status"] = "status";
            expressionAttributeValues[":status"] = value;
          } else {
            expressionParts.push(`${key} = :${key}`);
            expressionAttributeValues[`:${key}`] = value;
          }
        }

        const updateExpression = "SET " + expressionParts.join(", ");

        await dynamoDb.send(
          new UpdateCommand({
            TableName: BLOG_POSTS_TABLE,
            Key: { pk: currentPk, sk: slug },
            UpdateExpression: updateExpression,
            ExpressionAttributeValues: expressionAttributeValues,
            ...(Object.keys(expressionAttributeNames).length > 0 && {
              ExpressionAttributeNames: expressionAttributeNames,
            }),
          })
        );
      }
    } catch (error) {
      console.error("Error updating blog post:", error);
      throw error;
    }
  },

  /**
   * Delete a blog post by slug (tries both published and draft)
   */
  async deletePost(slug: string): Promise<void> {
    try {
      const dynamoDb = getDynamoDb();

      await dynamoDb.send(
        new DeleteCommand({
          TableName: BLOG_POSTS_TABLE,
          Key: { pk: "BLOG#published", sk: slug },
        })
      );

      await dynamoDb.send(
        new DeleteCommand({
          TableName: BLOG_POSTS_TABLE,
          Key: { pk: "BLOG#draft", sk: slug },
        })
      );
    } catch (error) {
      console.error("Error deleting blog post:", error);
    }
  },
};
