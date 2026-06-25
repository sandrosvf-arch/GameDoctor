/**
 * Access Control — Backend validation layer
 *
 * CRITICAL: All access checks must go through these functions.
 * Never rely on frontend-only checks for paid content.
 */
import { db } from "@/lib/db"
import type { AccessOrigin, AccessType, BillingType } from "@prisma/client"

/**
 * Check if a user has active access to a specific course.
 * Access can come from:
 *   - Direct course access permission
 *   - A plan that includes the course
 */
export async function hasAccessToCourse(
  userId: string,
  courseId: string
): Promise<boolean> {
  const now = new Date()

  const permission = await db.accessPermission.findFirst({
    where: {
      userId,
      status: "ACTIVE",
      startsAt: { lte: now },
      OR: [{ expiresAt: null }, { expiresAt: { gt: now } }],
      AND: [
        {
          OR: [
            { courseId },
            {
              plan: {
                planCourses: {
                  some: { courseId },
                },
              },
            },
          ],
        },
      ],
    },
  })

  return !!permission
}

/**
 * Determine if a user can access a lesson and under what conditions.
 *
 * Returns:
 *   hasAccess: true if user can watch anything
 *   isPreview: true if limited to preview window
 *   previewDurationSeconds: how many seconds of preview are allowed
 */
export async function hasAccessToLesson(
  userId: string | null,
  lessonId: string
): Promise<{
  hasAccess: boolean
  isPreview: boolean
  previewDurationSeconds: number | null
}> {
  const lesson = await db.lesson.findUnique({
    where: { id: lessonId },
    select: {
      courseId: true,
      isFree: true,
      previewEnabled: true,
      previewDurationSeconds: true,
      status: true,
    },
  })

  if (!lesson || lesson.status !== "PUBLISHED") {
    return { hasAccess: false, isPreview: false, previewDurationSeconds: null }
  }

  // Free lesson — always accessible
  if (lesson.isFree) {
    return { hasAccess: true, isPreview: false, previewDurationSeconds: null }
  }

  // User not logged in — only preview
  if (!userId) {
    if (lesson.previewEnabled && lesson.previewDurationSeconds) {
      return {
        hasAccess: true,
        isPreview: true,
        previewDurationSeconds: lesson.previewDurationSeconds,
      }
    }
    return { hasAccess: false, isPreview: false, previewDurationSeconds: null }
  }

  // Logged in — check course access
  const courseAccess = await hasAccessToCourse(userId, lesson.courseId)
  if (courseAccess) {
    return { hasAccess: true, isPreview: false, previewDurationSeconds: null }
  }

  // No course access — preview only
  if (lesson.previewEnabled && lesson.previewDurationSeconds) {
    return {
      hasAccess: true,
      isPreview: true,
      previewDurationSeconds: lesson.previewDurationSeconds,
    }
  }

  return { hasAccess: false, isPreview: false, previewDurationSeconds: null }
}

/**
 * Grant course or plan access to a user.
 * Used after payment approval or by admin (manual grant).
 */
export async function grantAccess(params: {
  userId: string
  courseId?: string
  planId?: string
  accessType: AccessType
  origin: AccessOrigin
  expiresAt?: Date | null
  notes?: string
}) {
  return db.accessPermission.create({
    data: {
      userId: params.userId,
      courseId: params.courseId,
      planId: params.planId,
      accessType: params.accessType,
      origin: params.origin,
      expiresAt: params.expiresAt ?? null,
      notes: params.notes,
    },
  })
}

export function resolvePlanAccessWindow(params: {
  billingType: BillingType
  accessDurationDays?: number | null
  startDate?: Date
}) {
  const startDate = params.startDate ?? new Date()

  if (params.accessDurationDays && params.accessDurationDays > 0) {
    const expiresAt = new Date(startDate)
    expiresAt.setUTCDate(expiresAt.getUTCDate() + params.accessDurationDays)

    return {
      accessType:
        params.billingType === "MONTHLY" || params.billingType === "YEARLY"
          ? "SUBSCRIPTION"
          : "TIMED",
      expiresAt,
    } satisfies { accessType: AccessType; expiresAt: Date | null }
  }

  if (params.billingType === "YEARLY") {
    const expiresAt = new Date(startDate)
    expiresAt.setUTCFullYear(expiresAt.getUTCFullYear() + 1)

    return {
      accessType: "SUBSCRIPTION",
      expiresAt,
    } satisfies { accessType: AccessType; expiresAt: Date | null }
  }

  if (params.billingType === "MONTHLY") {
    const expiresAt = new Date(startDate)
    expiresAt.setUTCMonth(expiresAt.getUTCMonth() + 1)

    return {
      accessType: "SUBSCRIPTION",
      expiresAt,
    } satisfies { accessType: AccessType; expiresAt: Date | null }
  }

  return {
    accessType: "LIFETIME",
    expiresAt: null,
  } satisfies { accessType: AccessType; expiresAt: Date | null }
}

/**
 * Revoke an access permission by ID.
 */
export async function revokeAccess(permissionId: string) {
  return db.accessPermission.update({
    where: { id: permissionId },
    data: { status: "CANCELLED" },
  })
}

/**
 * Suspend all active accesses for a user (e.g. after chargeback).
 */
export async function suspendUserAccess(userId: string, reason: string) {
  return db.accessPermission.updateMany({
    where: { userId, status: "ACTIVE" },
    data: { status: "SUSPENDED", notes: reason },
  })
}

/**
 * Get all active access permissions for a user.
 */
export async function getUserAccess(userId: string) {
  const now = new Date()
  return db.accessPermission.findMany({
    where: {
      userId,
      status: "ACTIVE",
      startsAt: { lte: now },
      OR: [{ expiresAt: null }, { expiresAt: { gt: now } }],
    },
    include: {
      course: { select: { id: true, title: true, slug: true, coverImage: true } },
      plan: { select: { id: true, name: true, slug: true } },
    },
  })
}
