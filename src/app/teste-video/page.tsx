"use client"

import { useState } from "react"

/**
 * Página de teste para Bunny Stream
 * Acesse: http://localhost:3000/teste-video
 *
 * Preencha Library ID + Video IDs e clique em Testar para ver o player.
 */
export default function TesteVideoPage() {
  const [libraryId, setLibraryId] = useState(process.env.NEXT_PUBLIC_BUNNY_LIBRARY_ID ?? "")
  const [videoId1, setVideoId1] = useState("")
  const [videoId2, setVideoId2] = useState("")
  const [show, setShow] = useState(false)

  const embedUrl = (vid: string) =>
    `https://iframe.mediadelivery.net/embed/${libraryId}/${vid}?autoplay=false&responsive=true&preload=true`

  return (
    <div className="min-h-screen bg-zinc-950 text-white p-8 space-y-8">
      <div>
        <h1 className="text-2xl font-bold mb-1">🎬 Teste Bunny Stream</h1>
        <p className="text-zinc-500 text-sm">Preencha os dados abaixo para testar seus vídeos.</p>
      </div>

      <div className="grid gap-4 max-w-xl">
        <div>
          <label className="text-xs text-zinc-400 uppercase tracking-wider block mb-1">Library ID</label>
          <input
            className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500"
            placeholder="ex: 123456"
            value={libraryId}
            onChange={(e) => setLibraryId(e.target.value)}
          />
        </div>
        <div>
          <label className="text-xs text-zinc-400 uppercase tracking-wider block mb-1">Video ID 1</label>
          <input
            className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500"
            placeholder="ex: a1b2c3d4-e5f6-..."
            value={videoId1}
            onChange={(e) => setVideoId1(e.target.value)}
          />
        </div>
        <div>
          <label className="text-xs text-zinc-400 uppercase tracking-wider block mb-1">Video ID 2</label>
          <input
            className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500"
            placeholder="ex: b2c3d4e5-f6a7-..."
            value={videoId2}
            onChange={(e) => setVideoId2(e.target.value)}
          />
        </div>
        <button
          onClick={() => setShow(true)}
          className="bg-cyan-500 hover:bg-cyan-400 text-zinc-950 font-bold rounded-lg px-4 py-2 text-sm transition w-fit"
        >
          Testar players
        </button>
      </div>

      {show && (
        <div className="space-y-8 max-w-3xl">
          {[{ label: "Vídeo 1", id: videoId1 }, { label: "Vídeo 2", id: videoId2 }].map(({ label, id }) =>
            id ? (
              <div key={id}>
                <p className="text-sm text-zinc-400 mb-2 font-medium">{label} — <code className="text-cyan-400 text-xs">{id}</code></p>
                <div className="relative w-full rounded-xl overflow-hidden bg-black" style={{ aspectRatio: "16/9" }}>
                  <iframe
                    src={embedUrl(id)}
                    className="absolute inset-0 w-full h-full"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                    title={label}
                  />
                </div>
              </div>
            ) : null
          )}
        </div>
      )}
    </div>
  )
}
