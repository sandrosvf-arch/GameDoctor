import { unstable_cache } from "next/cache"
import { db } from "@/lib/db"

export const getCachedLessonCount = unstable_cache(
  () => db.lesson.count(),
  ["home-lesson-count"],
  { revalidate: 60 }
)
