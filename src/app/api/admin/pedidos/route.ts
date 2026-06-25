import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { db } from "@/lib/db"

async function requireAdmin() {
  const session = await auth()
  if (!session || (session.user.role !== "ADMIN" && session.user.role !== "EDITOR")) {
    return null
  }
  return session
}

const PAGE_SIZE_DEFAULT = 15

export async function GET(request: NextRequest) {
  const session = await requireAdmin()
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const searchParams = request.nextUrl.searchParams
  const pageParam = Number(searchParams.get("page") ?? "1")
  const pageSizeParam = Number(searchParams.get("pageSize") ?? String(PAGE_SIZE_DEFAULT))
  const q = searchParams.get("q")?.trim() ?? ""
  const status = searchParams.get("status")?.trim() ?? "all"

  const page = Number.isFinite(pageParam) && pageParam > 0 ? Math.floor(pageParam) : 1
  const pageSize =
    Number.isFinite(pageSizeParam) && pageSizeParam > 0
      ? Math.min(50, Math.floor(pageSizeParam))
      : PAGE_SIZE_DEFAULT
  const paymentStatus = status !== "all" ? status : null

  const searchWhere = {
    ...(q
      ? {
          OR: [
            { id: { contains: q, mode: "insensitive" as const } },
            { gatewayReference: { contains: q, mode: "insensitive" as const } },
            { user: { name: { contains: q, mode: "insensitive" as const } } },
            { user: { email: { contains: q, mode: "insensitive" as const } } },
            {
              orderItems: {
                some: {
                  plan: { name: { contains: q, mode: "insensitive" as const } },
                },
              },
            },
            {
              orderItems: {
                some: {
                  course: { title: { contains: q, mode: "insensitive" as const } },
                },
              },
            },
          ],
        }
      : {}),
  }

  const where = {
    ...searchWhere,
    ...(paymentStatus ? { paymentStatus: paymentStatus as never } : {}),
  }

  const [totalItems, approvedRevenue, approvedOrders, pendingOrders, cancelledOrders, orders] =
    await Promise.all([
      db.order.count({ where }),
      db.order.aggregate({
        _sum: { finalTotal: true },
        where: {
          ...searchWhere,
          paymentStatus: "APPROVED",
        },
      }),
      db.order.count({ where: { ...searchWhere, paymentStatus: "APPROVED" } }),
      db.order.count({ where: { ...searchWhere, paymentStatus: "PENDING" } }),
      db.order.count({
        where: {
          ...searchWhere,
          paymentStatus: { in: ["CANCELLED", "REFUNDED", "CHARGEBACK", "FAILED", "REFUSED", "EXPIRED"] },
        },
      }),
      db.order.findMany({
        where,
        orderBy: [{ createdAt: "desc" }],
        skip: (page - 1) * pageSize,
        take: pageSize,
        select: {
          id: true,
          total: true,
          discountTotal: true,
          finalTotal: true,
          paymentMethod: true,
          paymentStatus: true,
          gateway: true,
          gatewayReference: true,
          createdAt: true,
          updatedAt: true,
          user: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
          coupon: {
            select: {
              code: true,
            },
          },
          orderItems: {
            select: {
              id: true,
              price: true,
              plan: {
                select: {
                  id: true,
                  name: true,
                },
              },
              course: {
                select: {
                  id: true,
                  title: true,
                },
              },
            },
          },
          payments: {
            orderBy: [{ createdAt: "desc" }],
            take: 1,
            select: {
              id: true,
              gateway: true,
              paymentMethod: true,
              paymentStatus: true,
              amount: true,
              installments: true,
              paidAt: true,
              expiresAt: true,
              createdAt: true,
            },
          },
        },
      }),
    ])

  return NextResponse.json({
    summary: {
      totalOrders: totalItems,
      approvedOrders,
      pendingOrders,
      cancelledOrders,
      approvedRevenue: Number(approvedRevenue._sum.finalTotal ?? 0),
    },
    orders: orders.map((order) => ({
      id: order.id,
      total: Number(order.total),
      discountTotal: Number(order.discountTotal),
      finalTotal: Number(order.finalTotal),
      paymentMethod: order.paymentMethod,
      paymentStatus: order.paymentStatus,
      gateway: order.gateway,
      gatewayReference: order.gatewayReference,
      createdAt: order.createdAt.toISOString(),
      updatedAt: order.updatedAt.toISOString(),
      user: order.user,
      coupon: order.coupon,
      items: order.orderItems.map((item) => ({
        id: item.id,
        label: item.plan?.name ?? item.course?.title ?? "Item",
        type: item.plan ? "plan" : "course",
        price: Number(item.price),
      })),
      latestPayment: order.payments[0]
        ? {
            id: order.payments[0].id,
            gateway: order.payments[0].gateway,
            paymentMethod: order.payments[0].paymentMethod,
            paymentStatus: order.payments[0].paymentStatus,
            amount: Number(order.payments[0].amount),
            installments: order.payments[0].installments,
            paidAt: order.payments[0].paidAt?.toISOString() ?? null,
            expiresAt: order.payments[0].expiresAt?.toISOString() ?? null,
            createdAt: order.payments[0].createdAt.toISOString(),
          }
        : null,
    })),
    pagination: {
      page,
      pageSize,
      totalItems,
      totalPages: Math.max(1, Math.ceil(totalItems / pageSize)),
      hasPreviousPage: page > 1,
      hasNextPage: page * pageSize < totalItems,
    },
  })
}
