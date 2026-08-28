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
