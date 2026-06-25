export type {
  User,
  Course,
  Module,
  Lesson,
  VideoAsset,
  Material,
  Plan,
  PlanCourse,
  Order,
  OrderItem,
  Payment,
  PaymentWebhook,
  AccessPermission,
  LessonProgress,
  Coupon,
  Certificate,
  AdminLog,
  Category,
  Platform,
  CatalogCategory,
  CourseCategory,
  // Enums
  UserRole,
  UserStatus,
  AuthProvider,
  CourseStatus,
  LessonStatus,
  VideoProvider,
  VideoPrivacyStatus,
  ProcessingStatus,
  MaterialType,
  BillingType,
  PlanStatus,
  PaymentMethod,
  PaymentStatus,
  PaymentGateway,
  AccessType,
  AccessOrigin,
  AccessStatus,
  DiscountType,
  CouponStatus,
  CertificateStatus,
} from "@prisma/client"

import type { Course, Module, Lesson, LessonProgress } from "@prisma/client"

// ─── Composite / extended types ───────────────────────────────

export type LessonWithProgress = Lesson & {
  progress: LessonProgress | null
}

export type ModuleWithLessons = Module & {
  lessons: Lesson[]
}

export type ModuleWithLessonsAndProgress = Module & {
  lessons: LessonWithProgress[]
}

export type CourseWithModules = Course & {
  modules: ModuleWithLessons[]
}

export type CourseWithProgress = Course & {
  modules: ModuleWithLessonsAndProgress[]
  totalLessons: number
  completedLessons: number
  progressPercentage: number
  lastWatchedLesson: Lesson | null
}

// ─── API response types ───────────────────────────────────────

export interface LessonAccessResponse {
  lessonId: string
  embedUrl: string | null
  playbackUrl: string | null
  thumbnailUrl: string | null
  durationSeconds: number | null
  isPreview: boolean
  previewDurationSeconds: number | null
}

export interface ApiError {
  error: string
  message: string
}
