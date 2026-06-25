import bcrypt from "bcryptjs"
import { NextResponse } from "next/server"
import { differenceInCalendarDays } from "date-fns"
import { auth } from "@/lib/auth"
import { db } from "@/lib/db"

async function requireAdminOrEditor() {
  const session = await auth()
  if (!session || (session.user.role !== "ADMIN" && session.user.role !== "EDITOR")) {
    return null
  }
  return session
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await requireAdminOrEditor()
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { id } = await params
  const now = new Date()

  const student = await db.user.findUnique({
    where: { id },
    select: {
      id: true,
      role: true,
      name: true,
      email: true,
      status: true,
      createdAt: true,
      lastLoginAt: true,
      accessPermissions: {
        orderBy: [{ createdAt: "desc" }],
        select: {
          id: true,
          accessType: true,
          status: true,
          startsAt: true,
          expiresAt: true,
          course: { select: { title: true } },
          plan: { select: { name: true } },
        },
      },
      orders: {
        orderBy: [{ createdAt: "desc" }],
        take: 10,
        select: {
          id: true,
          paymentStatus: true,
          finalTotal: true,
          createdAt: true,
          orderItems: {
            select: {
              plan: { select: { name: true } },
              course: { select: { title: true } },
            },
          },
        },
      },
      certificates: {
        orderBy: [{ issuedAt: "desc" }],
        take: 10,
        select: {
          id: true,
          certificateCode: true,
          issuedAt: true,
          status: true,
          course: { select: { title: true } },
        },
      },
      lessonProgress: {
        select: {
          completed: true,
          watchedSeconds: true,
          courseId: true,
        },
      },
    },
  })

  if (!student || student.role !== "STUDENT") {
    return NextResponse.json({ error: "Aluno não encontrado." }, { status: 404 })
  }

  const courseIds = Array.from(new Set(student.lessonProgress.map((item) => item.courseId)))
  const courses = courseIds.length
    ? await db.course.findMany({
        where: { id: { in: courseIds } },
        select: {
          id: true,
          title: true,
          lessons: {
            where: { status: "PUBLISHED" },
            select: { id: true },
          },
        },
      })
    : []

  const progressByCourse = courses.map((course) => {
    const totalLessons = course.lessons.length
    const completedLessons = student.lessonProgress.filter(
      (item) => item.courseId === course.id && item.completed
    ).length

    return {
      courseId: course.id,
      title: course.title,
      totalLessons,
      completedLessons,
      progress: totalLessons > 0 ? Math.round((completedLessons / totalLessons) * 100) : 0,
    }
  })

  const totalCompletedLessons = student.lessonProgress.filter((item) => item.completed).length
  const totalStudySeconds = student.lessonProgress.reduce((sum, item) => sum + item.watchedSeconds, 0)

  return NextResponse.json({
    student: {
      id: student.id,
      name: student.name,
      email: student.email,
      status: student.status,
      createdAt: student.createdAt.toISOString(),
      lastLoginAt: student.lastLoginAt?.toISOString() ?? null,
    },
    purchases: student.orders.map((order) => ({
      id: order.id,
      paymentStatus: order.paymentStatus,
      amount: Number(order.finalTotal),
      createdAt: order.createdAt.toISOString(),
      items: order.orderItems.map((item) => item.plan?.name ?? item.course?.title ?? "Item"),
    })),
    activeAccesses: student.accessPermissions
      .filter((access) => {
        if (access.status !== "ACTIVE") return false
        if (access.startsAt > now) return false
        if (!access.expiresAt) return true
        return access.expiresAt > now
      })
      .map((access) => ({
        id: access.id,
        label: access.plan?.name ?? access.course?.title ?? "Acesso",
        accessType: access.accessType,
        startsAt: access.startsAt.toISOString(),
        expiresAt: access.expiresAt?.toISOString() ?? null,
        daysRemaining: access.expiresAt ? Math.max(0, differenceInCalendarDays(access.expiresAt, now)) : null,
      })),
    progress: {
      totalCompletedLessons,
      totalStudySeconds,
      courses: progressByCourse,
    },
    certificates: student.certificates.map((certificate) => ({
      id: certificate.id,
      code: certificate.certificateCode,
      courseTitle: certificate.course.title,
      issuedAt: certificate.issuedAt.toISOString(),
      status: certificate.status,
    })),
  })
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await requireAdminOrEditor()
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { id } = await params
  const body = await request.json().catch(() => null)
  const action = String(body?.action ?? "")

  const target = await db.user.findUnique({
    where: { id },
    select: { id: true, role: true, email: true, status: true },
  })

  if (!target || target.role !== "STUDENT") {
    return NextResponse.json({ error: "Aluno não encontrado." }, { status: 404 })
  }

  if (action === "toggle-status") {
    const status = target.status === "BLOCKED" ? "ACTIVE" : "BLOCKED"

    const updated = await db.user.update({
      where: { id },
      data: { status },
      select: { status: true },
    })

    await db.adminLog.create({
      data: {
        adminUserId: session.user.id,
        action: "STUDENT_STATUS_UPDATE",
        entityType: "USER",
        entityId: id,
        description: `Status do aluno ${target.email} alterado para ${updated.status}`,
      },
    })

    return NextResponse.json({ ok: true, status: updated.status })
  }

  if (action === "set-password") {
    const password = String(body?.password ?? "")
    const confirmPassword = String(body?.confirmPassword ?? "")

    if (password.length < 8) {
      return NextResponse.json({ error: "A senha precisa ter pelo menos 8 caracteres." }, { status: 400 })
    }

    if (password !== confirmPassword) {
      return NextResponse.json({ error: "A confirmação de senha não confere." }, { status: 400 })
    }

    const passwordHash = await bcrypt.hash(password, 12)

    await db.user.update({
      where: { id },
      data: {
        passwordHash,
        authProvider: "EMAIL",
      },
    })

    await db.adminLog.create({
      data: {
        adminUserId: session.user.id,
        action: "STUDENT_PASSWORD_UPDATE",
        entityType: "USER",
        entityId: id,
        description: `Senha redefinida para o aluno ${target.email}`,
      },
    })

    return NextResponse.json({ ok: true })
  }

  return NextResponse.json({ error: "Ação inválida." }, { status: 400 })
}
