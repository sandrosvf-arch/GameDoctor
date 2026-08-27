import { db } from "@/lib/db"

export async function deleteCourseLesson(courseId: string, lessonId: string) {
  return db.$transaction(async (transaction) => {
    const lesson = await transaction.lesson.findFirst({
      where: { id: lessonId, courseId },
      select: { id: true },
    })

    if (!lesson) return false

    await transaction.lessonProgress.deleteMany({ where: { lessonId } })
    await transaction.material.deleteMany({ where: { lessonId } })
    await transaction.lesson.delete({ where: { id: lessonId } })

    return true
  })
}
