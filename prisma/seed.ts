import { PrismaClient } from "@prisma/client"

const db = new PrismaClient()

async function main() {
  console.log("Seeding demo data...")

  const adminUser = await db.user.upsert({
    where: { email: "admin.demo@gamedoctor.local" },
    update: {
      name: "Admin Demo",
      role: "ADMIN",
      status: "ACTIVE",
    },
    create: {
      name: "Admin Demo",
      email: "admin.demo@gamedoctor.local",
      role: "ADMIN",
      status: "ACTIVE",
    },
  })
  console.log("Admin user:", adminUser.email)

  const studentUser = await db.user.upsert({
    where: { email: "aluno.demo@gamedoctor.local" },
    update: {
      name: "Aluno Demo",
      role: "STUDENT",
      status: "ACTIVE",
    },
    create: {
      name: "Aluno Demo",
      email: "aluno.demo@gamedoctor.local",
      role: "STUDENT",
      status: "ACTIVE",
    },
  })
  console.log("Student user:", studentUser.email)

  const platform = await db.platform.upsert({
    where: { slug: "playstation-5" },
    update: {
      name: "PlayStation 5",
      status: "ACTIVE",
      order: 1,
    },
    create: {
      name: "PlayStation 5",
      slug: "playstation-5",
      order: 1,
      status: "ACTIVE",
    },
  })
  console.log("Platform:", platform.name)

  const course = await db.course.upsert({
    where: { slug: "diagnostico-ps5" },
    update: {
      title: "Diagnostico Completo PS5",
      shortDescription: "Curso demo para preview de pedidos e acessos.",
      description: "Curso demo utilizado para popular o ambiente administrativo com pedidos de exemplo.",
      status: "PUBLISHED",
      platformId: platform.id,
    },
    create: {
      title: "Diagnostico Completo PS5",
      slug: "diagnostico-ps5",
      shortDescription: "Curso demo para preview de pedidos e acessos.",
      description: "Curso demo utilizado para popular o ambiente administrativo com pedidos de exemplo.",
      status: "PUBLISHED",
      platformId: platform.id,
    },
  })
  console.log("Course:", course.title)

  const plan = await db.plan.upsert({
    where: { slug: "plano-anual-demo" },
    update: {
      name: "Plano Anual Demo",
      description: "Plano anual para preview administrativo de pedidos.",
      annualPrice: "647.00",
      monthlyEnabled: false,
      annualAccessDurationDays: 365,
      maxInstallments: 12,
      maxInstallmentsNoInterest: 3,
      benefits: ["Acesso ilimitado", "Suporte prioritario", "Certificado incluso"],
      status: "ACTIVE",
      highlighted: true,
      billingType: "YEARLY",
    },
    create: {
      name: "Plano Anual Demo",
      slug: "plano-anual-demo",
      description: "Plano anual para preview administrativo de pedidos.",
      annualPrice: "647.00",
      price: "647.00",
      monthlyEnabled: false,
      annualAccessDurationDays: 365,
      maxInstallments: 12,
      maxInstallmentsNoInterest: 3,
      benefits: ["Acesso ilimitado", "Suporte prioritario", "Certificado incluso"],
      status: "ACTIVE",
      highlighted: true,
      billingType: "YEARLY",
    },
  })

  const studentUserTwo = await db.user.upsert({
    where: { email: "thiago.preview@gamedoctor.local" },
    update: {
      name: "Thiago Preview",
      role: "STUDENT",
      status: "ACTIVE",
    },
    create: {
      name: "Thiago Preview",
      email: "thiago.preview@gamedoctor.local",
      role: "STUDENT",
      status: "ACTIVE",
    },
  })

  const studentUserThree = await db.user.upsert({
    where: { email: "romario.preview@gamedoctor.local" },
    update: {
      name: "Romario Preview",
      role: "STUDENT",
      status: "ACTIVE",
    },
    create: {
      name: "Romario Preview",
      email: "romario.preview@gamedoctor.local",
      role: "STUDENT",
      status: "ACTIVE",
    },
  })

  const coupon = await db.coupon.upsert({
    where: { code: "PREVIEW10" },
    update: {
      discountType: "PERCENTAGE",
      discountValue: "10.00",
      planId: plan.id,
      status: "ACTIVE",
    },
    create: {
      code: "PREVIEW10",
      discountType: "PERCENTAGE",
      discountValue: "10.00",
      planId: plan.id,
      status: "ACTIVE",
    },
  })

  const orderApprovedPlan = await db.order.upsert({
    where: { id: "demo-order-approved-plan-01" },
    update: {
      userId: studentUser.id,
      total: "647.00",
      discountTotal: "0.00",
      finalTotal: "647.00",
      paymentMethod: "CREDIT_CARD",
      paymentStatus: "APPROVED",
      gateway: "MERCADOPAGO",
      gatewayReference: "MP-APPROVED-0001",
    },
    create: {
      id: "demo-order-approved-plan-01",
      userId: studentUser.id,
      total: "647.00",
      discountTotal: "0.00",
      finalTotal: "647.00",
      paymentMethod: "CREDIT_CARD",
      paymentStatus: "APPROVED",
      gateway: "MERCADOPAGO",
      gatewayReference: "MP-APPROVED-0001",
    },
  })

  await db.orderItem.upsert({
    where: { id: "demo-order-item-approved-plan-01" },
    update: {
      orderId: orderApprovedPlan.id,
      planId: plan.id,
      courseId: null,
      price: "647.00",
    },
    create: {
      id: "demo-order-item-approved-plan-01",
      orderId: orderApprovedPlan.id,
      planId: plan.id,
      courseId: null,
      price: "647.00",
    },
  })

  await db.payment.upsert({
    where: { id: "demo-payment-approved-plan-01" },
    update: {
      orderId: orderApprovedPlan.id,
      userId: studentUser.id,
      gateway: "MERCADOPAGO",
      paymentMethod: "CREDIT_CARD",
      paymentStatus: "APPROVED",
      amount: "647.00",
      installments: 12,
      paidAt: new Date("2026-06-20T15:00:00.000Z"),
    },
    create: {
      id: "demo-payment-approved-plan-01",
      orderId: orderApprovedPlan.id,
      userId: studentUser.id,
      gateway: "MERCADOPAGO",
      paymentMethod: "CREDIT_CARD",
      paymentStatus: "APPROVED",
      gatewayPaymentId: "pay_demo_approved_01",
      amount: "647.00",
      installments: 12,
      paidAt: new Date("2026-06-20T15:00:00.000Z"),
    },
  })

  const orderPendingPlan = await db.order.upsert({
    where: { id: "demo-order-pending-plan-01" },
    update: {
      userId: studentUserTwo.id,
      total: "647.00",
      discountTotal: "64.70",
      finalTotal: "582.30",
      paymentMethod: "PIX",
      paymentStatus: "PENDING",
      gateway: "PAGARME",
      gatewayReference: "PGM-PENDING-0001",
      couponId: coupon.id,
    },
    create: {
      id: "demo-order-pending-plan-01",
      userId: studentUserTwo.id,
      total: "647.00",
      discountTotal: "64.70",
      finalTotal: "582.30",
      paymentMethod: "PIX",
      paymentStatus: "PENDING",
      gateway: "PAGARME",
      gatewayReference: "PGM-PENDING-0001",
      couponId: coupon.id,
    },
  })

  await db.orderItem.upsert({
    where: { id: "demo-order-item-pending-plan-01" },
    update: {
      orderId: orderPendingPlan.id,
      planId: plan.id,
      courseId: null,
      price: "647.00",
    },
    create: {
      id: "demo-order-item-pending-plan-01",
      orderId: orderPendingPlan.id,
      planId: plan.id,
      courseId: null,
      price: "647.00",
    },
  })

  await db.payment.upsert({
    where: { id: "demo-payment-pending-plan-01" },
    update: {
      orderId: orderPendingPlan.id,
      userId: studentUserTwo.id,
      gateway: "PAGARME",
      paymentMethod: "PIX",
      paymentStatus: "PENDING",
      amount: "582.30",
      installments: 1,
      expiresAt: new Date("2026-07-01T03:00:00.000Z"),
      pixCopyPaste: "00020101021226850014br.gov.bcb.pix2563preview-pix-gamedoctor5204000053039865406582.305802BR5925GameDoctor Preview6009Sao Paulo62070503***6304ABCD",
    },
    create: {
      id: "demo-payment-pending-plan-01",
      orderId: orderPendingPlan.id,
      userId: studentUserTwo.id,
      gateway: "PAGARME",
      paymentMethod: "PIX",
      paymentStatus: "PENDING",
      gatewayPaymentId: "pay_demo_pending_01",
      amount: "582.30",
      installments: 1,
      expiresAt: new Date("2026-07-01T03:00:00.000Z"),
      pixCopyPaste: "00020101021226850014br.gov.bcb.pix2563preview-pix-gamedoctor5204000053039865406582.305802BR5925GameDoctor Preview6009Sao Paulo62070503***6304ABCD",
    },
  })

  const orderApprovedCourse = await db.order.upsert({
    where: { id: "demo-order-approved-course-01" },
    update: {
      userId: studentUserThree.id,
      total: "297.00",
      discountTotal: "0.00",
      finalTotal: "297.00",
      paymentMethod: "BOLETO",
      paymentStatus: "APPROVED",
      gateway: "ASAAS",
      gatewayReference: "ASAAS-APPROVED-0001",
    },
    create: {
      id: "demo-order-approved-course-01",
      userId: studentUserThree.id,
      total: "297.00",
      discountTotal: "0.00",
      finalTotal: "297.00",
      paymentMethod: "BOLETO",
      paymentStatus: "APPROVED",
      gateway: "ASAAS",
      gatewayReference: "ASAAS-APPROVED-0001",
    },
  })

  await db.orderItem.upsert({
    where: { id: "demo-order-item-approved-course-01" },
    update: {
      orderId: orderApprovedCourse.id,
      planId: null,
      courseId: course.id,
      price: "297.00",
    },
    create: {
      id: "demo-order-item-approved-course-01",
      orderId: orderApprovedCourse.id,
      planId: null,
      courseId: course.id,
      price: "297.00",
    },
  })

  await db.payment.upsert({
    where: { id: "demo-payment-approved-course-01" },
    update: {
      orderId: orderApprovedCourse.id,
      userId: studentUserThree.id,
      gateway: "ASAAS",
      paymentMethod: "BOLETO",
      paymentStatus: "APPROVED",
      amount: "297.00",
      installments: 1,
      paidAt: new Date("2026-06-18T13:30:00.000Z"),
    },
    create: {
      id: "demo-payment-approved-course-01",
      orderId: orderApprovedCourse.id,
      userId: studentUserThree.id,
      gateway: "ASAAS",
      paymentMethod: "BOLETO",
      paymentStatus: "APPROVED",
      gatewayPaymentId: "pay_demo_approved_02",
      amount: "297.00",
      installments: 1,
      paidAt: new Date("2026-06-18T13:30:00.000Z"),
    },
  })

  const orderRefunded = await db.order.upsert({
    where: { id: "demo-order-refunded-01" },
    update: {
      userId: studentUserTwo.id,
      total: "647.00",
      discountTotal: "0.00",
      finalTotal: "647.00",
      paymentMethod: "CREDIT_CARD",
      paymentStatus: "REFUNDED",
      gateway: "STRIPE",
      gatewayReference: "STRIPE-REFUNDED-0001",
    },
    create: {
      id: "demo-order-refunded-01",
      userId: studentUserTwo.id,
      total: "647.00",
      discountTotal: "0.00",
      finalTotal: "647.00",
      paymentMethod: "CREDIT_CARD",
      paymentStatus: "REFUNDED",
      gateway: "STRIPE",
      gatewayReference: "STRIPE-REFUNDED-0001",
    },
  })

  await db.orderItem.upsert({
    where: { id: "demo-order-item-refunded-01" },
    update: {
      orderId: orderRefunded.id,
      planId: plan.id,
      courseId: null,
      price: "647.00",
    },
    create: {
      id: "demo-order-item-refunded-01",
      orderId: orderRefunded.id,
      planId: plan.id,
      courseId: null,
      price: "647.00",
    },
  })

  await db.payment.upsert({
    where: { id: "demo-payment-refunded-01" },
    update: {
      orderId: orderRefunded.id,
      userId: studentUserTwo.id,
      gateway: "STRIPE",
      paymentMethod: "CREDIT_CARD",
      paymentStatus: "REFUNDED",
      amount: "647.00",
      installments: 6,
      paidAt: new Date("2026-06-10T14:00:00.000Z"),
    },
    create: {
      id: "demo-payment-refunded-01",
      orderId: orderRefunded.id,
      userId: studentUserTwo.id,
      gateway: "STRIPE",
      paymentMethod: "CREDIT_CARD",
      paymentStatus: "REFUNDED",
      gatewayPaymentId: "pay_demo_refunded_01",
      amount: "647.00",
      installments: 6,
      paidAt: new Date("2026-06-10T14:00:00.000Z"),
    },
  })
  console.log("Orders seeded")
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(() => db.$disconnect())
