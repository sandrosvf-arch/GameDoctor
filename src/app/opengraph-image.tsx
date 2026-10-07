import { ImageResponse } from "next/og"
import { readFile } from "node:fs/promises"
import { join } from "node:path"

export const runtime = "nodejs"
export const alt = "GameDoctor — A maior plataforma de manutenção de videogames do Brasil"
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
          alignItems: "center",
          justifyContent: "center",
          background: "linear-gradient(160deg, #0c1420 0%, #1a2331 50%, #0f1a26 100%)",
          position: "relative",
        }}
      >
        <div
          style={{
            position: "absolute",
            top: -240,
            left: 320,
            width: 560,
            height: 560,
            borderRadius: "50%",
            background: "radial-gradient(circle, rgba(34,211,238,0.28) 0%, transparent 65%)",
          }}
        />
        <div
          style={{
            position: "absolute",
            bottom: -300,
            right: 140,
            width: 520,
            height: 520,
            borderRadius: "50%",
            background: "radial-gradient(circle, rgba(52,211,153,0.18) 0%, transparent 65%)",
          }}
        />

        {/* Zona segura central: sobrevive ao corte quadrado do WhatsApp */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            width: 600,
            textAlign: "center",
          }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={logoSrc} width={520} height={104} style={{ objectFit: "contain" }} alt="" />
          <div
            style={{
              marginTop: 38,
              fontSize: 34,
              fontWeight: 800,
              color: "#ffffff",
              lineHeight: 1.25,
            }}
          >
            A maior plataforma de manutenção de videogames do Brasil
          </div>
          <div
            style={{
              marginTop: 22,
              fontSize: 22,
              color: "#7dd3fc",
              fontWeight: 600,
            }}
          >
            Aulas práticas · Diagramas · Softwares · Comunidade
          </div>
        </div>
      </div>
    ),
    { ...size }
  )
}
