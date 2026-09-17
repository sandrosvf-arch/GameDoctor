import nodemailer from "nodemailer"

function requiredEnvironment(name: string) {
  const value = process.env[name]?.trim()
  if (!value) throw new Error(`Variável de e-mail não configurada: ${name}`)
  return value
}

function createTransporter() {
  const port = Number(requiredEnvironment("EMAIL_SERVER_PORT"))
  if (!Number.isInteger(port) || port <= 0) {
    throw new Error("EMAIL_SERVER_PORT deve ser uma porta válida.")
  }

  return nodemailer.createTransport({
    host: requiredEnvironment("EMAIL_SERVER_HOST"),
    port,
    secure: port === 465,
    auth: {
      user: requiredEnvironment("EMAIL_SERVER_USER"),
      pass: requiredEnvironment("EMAIL_SERVER_PASSWORD"),
    },
  })
}

function escapeHtml(value: string) {
  return value.replace(/[&<>"']/g, (character) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#039;",
  })[character] ?? character)
}

export async function sendNotificationEmail(input: {
  email: string
  name: string
  title: string
  body: string
  href?: string | null
  lessonTitle?: string
  isTest?: boolean
}) {
  const transporter = createTransporter()
  const firstName = input.name.trim().split(/\s+/)[0] || "aluno"
  const safeFirstName = escapeHtml(firstName)
  const lessonTitle = input.lessonTitle?.trim() || ""
  const isLesson = Boolean(lessonTitle)
  const safeTitle = escapeHtml(input.title.replace(/^\[TESTE\]\s*/i, ""))
  const safeBody = escapeHtml(input.body).replace(/\n/g, "<br />")
  const safeHref = input.href ? escapeHtml(input.href) : null
  const safeLessonTitle = escapeHtml(lessonTitle)
  const appUrl = (process.env.NEXT_PUBLIC_APP_URL?.trim() || process.env.NEXTAUTH_URL?.trim() || "").replace(/\/$/, "")
  const logoUrl = appUrl ? `${appUrl}/doctor-oficial.png` : ""
  const logo = logoUrl
    ? `<img src="${escapeHtml(logoUrl)}" alt="GameDoctor" width="190" style="display:block;width:190px;height:auto;border:0" />`
    : `<div style="font-size:19px;font-weight:800;letter-spacing:-.04em"><span style="color:#f8fafc">Game</span><span style="color:#00cfff">Doctor</span></div>`
  const testBadge = input.isTest ? '<span style="display:inline-block;margin-bottom:18px;border:1px solid #f59e0b66;background:#f59e0b1a;color:#fbbf24;border-radius:999px;padding:6px 10px;font-size:11px;font-weight:700;letter-spacing:.08em;text-transform:uppercase">E-mail de teste</span>' : ""
  const subject = isLesson
    ? `${input.isTest ? "[TESTE] " : ""}Nova aula disponível: ${lessonTitle} | GameDoctor`
    : `${input.title} | GameDoctor`
  const text = isLesson
    ? `Olá, ${firstName}.\n\nNova aula disponível: ${lessonTitle}\n\n${input.body}\n\nAproveite para assistir enquanto o conteúdo está fresco e avance mais um passo na sua jornada.\n\nAcessar aula: ${input.href ?? ""}`
    : `Olá, ${firstName}.\n\n${input.title}\n\n${input.body}${input.href ? `\n\nAcessar: ${input.href}` : ""}`
  const html = isLesson
    ? `<div style="margin:0;background:#090b10;padding:24px 12px;font-family:Arial,Helvetica,sans-serif;color:#f8fafc"><div style="max-width:620px;margin:0 auto;overflow:hidden;border:1px solid #242b35;border-radius:18px;background:#0e1117;box-shadow:0 18px 60px rgba(0,0,0,.4)"><div style="height:4px;background:#00cfff"></div><div style="padding:30px 28px 32px">${logo}<p style="margin:32px 0 12px;color:#00cfff;font-size:11px;font-weight:800;letter-spacing:.16em;text-transform:uppercase">Conteúdo novo no ar</p>${testBadge}<h1 style="margin:0;color:#f8fafc;font-size:34px;line-height:1.12;letter-spacing:-.04em">Nova aula disponível</h1><p style="margin:10px 0 0;color:#00cfff;font-size:18px;font-weight:700;line-height:1.35">${safeLessonTitle}</p><p style="margin:22px 0 0;color:#d5d9e0;font-size:16px;line-height:1.75">Olá, ${safeFirstName}.</p><p style="margin:10px 0 0;color:#a9afb9;font-size:15px;line-height:1.7">Uma nova aula acaba de entrar na GameDoctor. Aproveite enquanto o conteúdo está fresco e avance mais um passo na sua jornada profissional.</p><div style="margin:24px 0;padding:18px;border-left:3px solid #00cfff;border-radius:0 10px 10px 0;background:#15191f"><p style="margin:0;color:#e6e9ed;font-size:15px;line-height:1.7">${safeBody}</p></div>${safeHref ? `<a href="${safeHref}" style="display:inline-block;background:#00cfff;color:#071016;text-decoration:none;font-size:15px;font-weight:800;padding:15px 22px;border-radius:10px;box-shadow:0 8px 24px rgba(0,207,255,.2)">Assistir aula agora &rarr;</a>` : ""}<p style="margin:26px 0 0;color:#737b87;font-size:12px;line-height:1.6">Entre na plataforma, assista à aula e mantenha seu ritmo de evolução. Nos vemos lá.</p></div><div style="border-top:1px solid #202630;padding:18px 28px;color:#737b87;font-size:11px;line-height:1.6">GameDoctor · Conhecimento técnico para quem leva manutenção a sério.<br />Você recebeu este aviso porque faz parte da comunidade GameDoctor.</div></div></div>`
    : `<div style="background:#090b10;padding:32px 16px;font-family:Arial,sans-serif;color:#f8fafc"><div style="max-width:560px;margin:0 auto;background:#0e1117;border:1px solid #242b35;border-radius:16px;padding:32px">${logo}<p style="margin:28px 0 12px;color:#d5d9e0">Olá, ${safeFirstName}.</p><h1 style="margin:0 0 16px;font-size:24px">${safeTitle}</h1><p style="margin:0;color:#a9afb9;line-height:1.6">${safeBody}</p>${safeHref ? `<a href="${safeHref}" style="display:inline-block;margin-top:24px;background:#00cfff;color:#071016;text-decoration:none;font-weight:700;padding:13px 22px;border-radius:10px">Acessar aviso</a>` : ""}</div></div>`

  return transporter.sendMail({
    from: requiredEnvironment("EMAIL_FROM"),
    to: input.email,
    subject,
    text,
    html,
  })
}

export async function sendPasswordResetEmail(input: {
  email: string
  name: string
  resetUrl: string
}) {
  const transporter = createTransporter()
  const firstName = input.name.trim().split(/\s+/)[0] || "aluno"
  const safeFirstName = escapeHtml(firstName)
  const safeResetUrl = escapeHtml(input.resetUrl)

  return transporter.sendMail({
    from: requiredEnvironment("EMAIL_FROM"),
    to: input.email,
    subject: "Redefinição de senha | GameDoctor",
    text: `Olá, ${firstName}. Use o link abaixo para redefinir sua senha da GameDoctor. O link expira em 1 hora.\n\n${input.resetUrl}\n\nSe você não solicitou essa alteração, ignore este e-mail.`,
    html: `
      <div style="background:#080b10;padding:32px 16px;font-family:Arial,sans-serif;color:#f8fafc">
        <div style="max-width:560px;margin:0 auto;background:#11161d;border:1px solid #26313d;border-radius:16px;padding:32px">
          <p style="margin:0 0 12px;color:#22d3ee;font-size:13px;font-weight:700;letter-spacing:.12em;text-transform:uppercase">GameDoctor</p>
          <h1 style="margin:0 0 16px;font-size:26px">Redefina sua senha</h1>
          <p style="margin:0 0 12px;color:#cbd5e1;line-height:1.6">Olá, ${safeFirstName}.</p>
          <p style="margin:0 0 24px;color:#cbd5e1;line-height:1.6">Recebemos uma solicitação para redefinir sua senha. Este link é válido por 1 hora.</p>
          <a href="${safeResetUrl}" style="display:inline-block;background:#22d3ee;color:#061018;text-decoration:none;font-weight:700;padding:13px 22px;border-radius:10px">Criar nova senha</a>
          <p style="margin:24px 0 0;color:#64748b;font-size:13px;line-height:1.5">Se você não solicitou essa alteração, ignore este e-mail. Sua senha continuará a mesma.</p>
        </div>
      </div>
    `,
  })
}

export async function sendLiveCheckoutAccessEmail(input: {
  email: string
  name: string
  planName: string
  accessUrl: string
  needsPassword: boolean
}) {
  const transporter = createTransporter()
  const firstName = input.name.trim().split(/\s+/)[0] || "aluno"
  const safeFirstName = escapeHtml(firstName)
  const safePlanName = escapeHtml(input.planName)
  const safeAccessUrl = escapeHtml(input.accessUrl)
  const action = input.needsPassword ? "Criar minha senha" : "Entrar na plataforma"

  return transporter.sendMail({
    from: requiredEnvironment("EMAIL_FROM"),
    to: input.email,
    subject: "Seu acesso ao GameDoctor está liberado",
    text: `Olá, ${firstName}. Seu pagamento foi aprovado e o acesso ao ${input.planName} já está liberado. ${action}: ${input.accessUrl}`,
    html: `
      <div style="background:#080b10;padding:32px 16px;font-family:Arial,sans-serif;color:#f8fafc">
        <div style="max-width:560px;margin:0 auto;background:#11161d;border:1px solid #26313d;border-radius:16px;padding:32px">
          <p style="margin:0 0 12px;color:#22d3ee;font-size:13px;font-weight:700;letter-spacing:.12em;text-transform:uppercase">GameDoctor</p>
          <h1 style="margin:0 0 16px;font-size:26px">Seu acesso está liberado</h1>
          <p style="margin:0 0 12px;color:#cbd5e1;line-height:1.6">Olá, ${safeFirstName}.</p>
          <p style="margin:0 0 24px;color:#cbd5e1;line-height:1.6">Seu pagamento foi aprovado e os 12 meses do <strong>${safePlanName}</strong> já estão disponíveis.</p>
          <a href="${safeAccessUrl}" style="display:inline-block;background:#22d3ee;color:#061018;text-decoration:none;font-weight:700;padding:13px 22px;border-radius:10px">${action}</a>
          ${input.needsPassword ? '<p style="margin:20px 0 0;color:#64748b;font-size:13px;line-height:1.5">O link para criar sua senha é válido por 24 horas. Depois disso, você poderá solicitar uma nova senha pela tela de login.</p>' : ""}
        </div>
      </div>
    `,
  })
}
