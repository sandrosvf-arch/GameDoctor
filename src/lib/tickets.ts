import { randomInt } from "crypto"

import type { TicketAuthorType, TicketDepartmentStatus, TicketStatus, UserRole } from "@prisma/client"

export function slugifyTicketDepartment(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
}

export function isTicketStaffRole(role?: UserRole | string | null) {
  return role === "ADMIN" || role === "EDITOR"
}

export function buildTicketNumber() {
  const now = new Date()
  const y = String(now.getFullYear()).slice(-2)
  const m = String(now.getMonth() + 1).padStart(2, "0")
  const d = String(now.getDate()).padStart(2, "0")
  const random = String(randomInt(1000, 9999))
  return `GD-${y}${m}${d}-${random}`
}

export function ticketStatusLabel(status: TicketStatus | string) {
  if (status === "ABERTO") return "Aberto"
  if (status === "AGUARDANDO_RESPOSTA") return "Aguardando resposta"
  if (status === "RESPONDIDO") return "Respondido"
  return "Finalizado"
}

export function ticketStatusTone(status: TicketStatus | string) {
  if (status === "ABERTO") return "border-cyan-500/30 bg-cyan-500/15 text-cyan-300"
  if (status === "AGUARDANDO_RESPOSTA") return "border-amber-500/30 bg-amber-500/15 text-amber-300"
  if (status === "RESPONDIDO") return "border-emerald-500/30 bg-emerald-500/15 text-emerald-400"
  return "border-zinc-500/30 bg-zinc-500/15 text-zinc-400"
}

export function ticketDepartmentStatusLabel(status: TicketDepartmentStatus | string) {
  return status === "ACTIVE" ? "Ativo" : "Inativo"
}

export function nextTicketStatusOnReply(input: {
  currentStatus: TicketStatus | string
  authorType: TicketAuthorType | "STUDENT" | "STAFF"
}) {
  if (input.currentStatus === "FINALIZADO") {
    return "FINALIZADO" as const
  }

  if (input.authorType === "STAFF") {
    return "RESPONDIDO" as const
  }

  if (input.currentStatus === "RESPONDIDO") {
    return "AGUARDANDO_RESPOSTA" as const
  }

  if (input.currentStatus === "ABERTO") {
    return "ABERTO" as const
  }

  return "AGUARDANDO_RESPOSTA" as const
}

export function formatTicketNumberDisplay(ticketNumber: string) {
  return ticketNumber
}
