"use client"

import { useEffect, useRef, useState } from "react"
import { Loader2, Save, ShieldCheck, UserRound } from "lucide-react"
import { useRouter } from "next/navigation"
import { useSession } from "next-auth/react"
import { Button } from "@/components/ui/button"

interface ProfileResponse {
  id: string
  name: string
  email: string
  phone: string | null
  cpf: string | null
  authProvider: string
  avatarUrl: string | null
}

export default function MinhaContaPage() {
  const router = useRouter()
  const { update } = useSession()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null)
  const [uploadingAvatar, setUploadingAvatar] = useState(false)
  const fileInputRef = useRef<HTMLInputElement | null>(null)
  const [form, setForm] = useState({
    name: "",
    email: "",
    phone: "",
    cpf: "",
    password: "",
    confirmPassword: "",
  })

  useEffect(() => {
    fetch("/api/member/profile", { cache: "no-store" })
      .then(async (res) => {
        if (!res.ok) throw new Error("Não foi possível carregar seus dados.")
        return res.json() as Promise<ProfileResponse>
      })
      .then((data) => {
        setAvatarUrl(data.avatarUrl ?? null)
        setForm({
          name: data.name ?? "",
          email: data.email ?? "",
          phone: data.phone ?? "",
          cpf: data.cpf ?? "",
          password: "",
          confirmPassword: "",
        })
      })
      .catch((err: unknown) => {
        setError(err instanceof Error ? err.message : "Erro ao carregar a conta.")
      })
      .finally(() => setLoading(false))
  }, [])

  function patch(field: keyof typeof form, value: string) {
    setForm((current) => ({ ...current, [field]: value }))
  }

  async function handleAvatarChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return

    setError(null)
    setSuccess(null)
    setUploadingAvatar(true)

    try {
      const formData = new FormData()
      formData.append("file", file)

      const res = await fetch("/api/member/profile/avatar", {
        method: "POST",
        body: formData,
      })

      const data = await res.json().catch(() => null)
      if (!res.ok || !data?.avatarUrl) {
        throw new Error(data?.error ?? "N?o foi poss?vel enviar a foto.")
      }

      setAvatarUrl(data.avatarUrl)
      await update?.({ image: data.avatarUrl, user: { image: data.avatarUrl } })
      setSuccess("Foto atualizada com sucesso.")
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : "N?o foi poss?vel enviar a foto.")
    } finally {
      setUploadingAvatar(false)
      if (fileInputRef.current) fileInputRef.current.value = ""
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setSuccess(null)
    setSaving(true)

    const res = await fetch("/api/member/profile", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    })

    const data = await res.json().catch(() => null)
    setSaving(false)

    if (!res.ok) {
      setError(data?.error ?? "Não foi possível salvar sua conta.")
      return
    }

    await update?.({ name: form.name, email: form.email, image: avatarUrl, user: { name: form.name, email: form.email, image: avatarUrl } })
    setForm((current) => ({ ...current, password: "", confirmPassword: "" }))
    setSuccess("Dados atualizados com sucesso.")
    router.refresh()
  }

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="max-w-4xl p-6 md:p-8 space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Minha conta</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Altere seus dados básicos e, se quiser, defina uma nova senha.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <section className="rounded-2xl border border-border bg-card/60 p-5">
          <div className="flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
            <div className="flex items-center gap-4">
              <div className="flex h-20 w-20 items-center justify-center overflow-hidden rounded-full border border-border bg-background text-lg font-semibold">
                {avatarUrl ? (
                  <img src={avatarUrl} alt={form.name || "Avatar"} className="h-full w-full object-cover" />
                ) : (
                  <span>{(form.name || "U").split(" ").map((part) => part[0]).slice(0, 2).join("").toUpperCase()}</span>
                )}
              </div>
              <div>
                <h2 className="font-semibold">Foto de perfil</h2>
                <p className="mt-1 text-sm text-muted-foreground">PNG, JPG, WEBP ou AVIF com at? 5 MB.</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleAvatarChange}
                disabled={uploadingAvatar}
              />
              <Button type="button" variant="outline" disabled={uploadingAvatar} onClick={() => fileInputRef.current?.click()}>
                {uploadingAvatar ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                {uploadingAvatar ? "Enviando..." : "Alterar foto"}
              </Button>
            </div>
          </div>
        </section>

        <section className="rounded-2xl border border-border bg-card/60 p-5">
          <div className="mb-4 flex items-center gap-2">
            <UserRound className="h-4 w-4 text-primary" />
            <h2 className="font-semibold">Dados básicos</h2>
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <Field label="Nome">
              <input
                className="h-11 w-full rounded-lg border border-border bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
                value={form.name}
                onChange={(e) => patch("name", e.target.value)}
                required
              />
            </Field>
            <Field label="E-mail">
              <input
                type="email"
                className="h-11 w-full rounded-lg border border-border bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
                value={form.email}
                onChange={(e) => patch("email", e.target.value)}
                required
              />
            </Field>
            <Field label="Telefone">
              <input
                className="h-11 w-full rounded-lg border border-border bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
                value={form.phone}
                onChange={(e) => patch("phone", e.target.value)}
                placeholder="(11) 99999-9999"
              />
            </Field>
            <Field label="CPF">
              <input
                className="h-11 w-full rounded-lg border border-border bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
                value={form.cpf}
                onChange={(e) => patch("cpf", e.target.value)}
                placeholder="000.000.000-00"
              />
            </Field>
          </div>
        </section>

        <section className="rounded-2xl border border-border bg-card/60 p-5">
          <div className="mb-4 flex items-center gap-2">
            <ShieldCheck className="h-4 w-4 text-primary" />
            <h2 className="font-semibold">Segurança</h2>
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <Field label="Nova senha">
              <input
                type="password"
                className="h-11 w-full rounded-lg border border-border bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
                value={form.password}
                onChange={(e) => patch("password", e.target.value)}
                placeholder="Deixe em branco para não alterar"
              />
            </Field>
            <Field label="Confirmar nova senha">
              <input
                type="password"
                className="h-11 w-full rounded-lg border border-border bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
                value={form.confirmPassword}
                onChange={(e) => patch("confirmPassword", e.target.value)}
                placeholder="Repita a nova senha"
              />
            </Field>
          </div>
        </section>

        {error && (
          <div className="rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
            {error}
          </div>
        )}

        {success && (
          <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-400">
            {success}
          </div>
        )}

        <div className="flex justify-end">
          <Button type="submit" disabled={saving}>
            {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
            Salvar alterações
          </Button>
        </div>
      </form>
    </div>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="mb-1.5 block text-sm font-medium">{label}</label>
      {children}
    </div>
  )
}
