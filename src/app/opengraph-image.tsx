import { ImageResponse } from "next/og"
import { readFile } from "node:fs/promises"
import { join } from "node:path"

export const runtime = "nodejs"
export const alt = "GameDoctor — Formação completa em manutenção de videogames"
export const size = { width: 1200, height: 630 }
export const contentType = "image/png"

export default async function Image() {
  const logoData = await readFile(join(process.cwd(), "public", "doctor-oficial.png"))
  const logoSrc = `data:image/png;base64,${logoData.toString("base64")}`

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          background: "linear-gradient(160deg, #101823 0%, #1e2734 55%, #16202c 100%)",
          position: "relative",
        }}
      >
        <div
          style={{
            position: "absolute",
            top: -260,
            left: 300,
            width: 600,
            height: 600,
            borderRadius: "50%",
            background: "radial-gradient(circle, rgba(34,211,238,0.35) 0%, transparent 65%)",
          }}
        />
        <div
          style={{
            position: "absolute",
            bottom: -320,
            right: 80,
            width: 560,
            height: 560,
            borderRadius: "50%",
            background: "radial-gradient(circle, rgba(52,211,153,0.22) 0%, transparent 65%)",
          }}
        />
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={logoSrc} width={430} height={86} style={{ objectFit: "contain" }} alt="" />
        <div
          style={{
            marginTop: 44,
            fontSize: 54,
            fontWeight: 800,
            color: "#ffffff",
            textAlign: "center",
            lineHeight: 1.15,
            maxWidth: 900,
          }}
        >
          A maior plataforma de manutenção de videogames do Brasil
        </div>
        <div
          style={{
            marginTop: 26,
            fontSize: 27,
            color: "#94a3b8",
            textAlign: "center",
            maxWidth: 860,
          }}
        >
          Aulas práticas · Diagramas · Softwares · Comunidade · Acesso ao professor
        </div>
        <div
          style={{
            marginTop: 40,
            display: "flex",
            alignItems: "center",
            backgroundColor: "#34d399",
            color: "#0f172a",
            fontSize: 26,
            fontWeight: 800,
            padding: "14px 42px",
            borderRadius: 999,
          }}
        >
          Comece agora em gamedoctor.com.br
        </div>
      </div>
    ),
    { ...size }
  )
}
