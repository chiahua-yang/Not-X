import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";

/**
 * Get the root (top-level) post id for a given post.
 * If the post is a reply, walks up the parent chain until the root.
 */
export async function getRootPostId(postId: string): Promise<string> {
  let currentId: string | null = postId;
  while (currentId) {
    const post: { id: string; parentId: string | null } | null =
      await prisma.post.findUnique({
        where: { id: currentId },
        select: { id: true, parentId: true },
      });
    if (!post) return postId;
    if (!post.parentId) return post.id;
    currentId = post.parentId;
  }
  return postId;
}

/**
 * Get total comment count for a single post (all descendants, any depth).
 * Uses a recursive CTE in PostgreSQL.
 */
export async function getTotalCommentCount(postId: string): Promise<number> {
  const result = await prisma.$queryRaw<[{ count: bigint }]>(
    Prisma.sql`
      WITH RECURSIVE descendants AS (
        SELECT id FROM "Post" WHERE "parentId" = ${postId}
        UNION ALL
        SELECT p.id FROM "Post" p
        INNER JOIN descendants d ON p."parentId" = d.id
      )
      SELECT COUNT(*)::bigint AS count FROM descendants
    `
  );
  return Number(result[0]?.count ?? 0);
}

/**
 * Get total comment counts for multiple posts in one query.
 * Returns a Map<postId, number>. Posts with zero comments are not in the map (use 0).
 */
export async function getTotalCommentCounts(
  postIds: string[]
): Promise<Map<string, number>> {
  if (postIds.length === 0) return new Map();

  const rows = await prisma.$queryRaw<[{ root_id: string; count: bigint }]>(
    Prisma.sql`
      WITH RECURSIVE descendants AS (
        SELECT "parentId" AS root_id, id FROM "Post"
        WHERE "parentId" IN (${Prisma.join(postIds)})
        UNION ALL
        SELECT d.root_id, p.id FROM "Post" p
        INNER JOIN descendants d ON p."parentId" = d.id
      )
      SELECT root_id, COUNT(*)::bigint AS count FROM descendants
      GROUP BY root_id
    `
  );

  const map = new Map<string, number>();
  for (const row of rows) {
    map.set(row.root_id, Number(row.count));
  }
  return map;
}
