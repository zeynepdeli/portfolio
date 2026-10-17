/* Sayfa geçişinde (menüden /projects, /roadmap, /documents…) yeni sayfa
   hazırlanırken ANINDA görünen ekran: boş beklemek yerine sitenin
   zemininde yanıp sönen kısa bir yükleme yazısı. */
export default function Loading() {
  return (
    <main
      className="fixed inset-0 grid place-items-center"
      style={{
        background:
          "linear-gradient(180deg, rgb(var(--bg-1,2,4,15)) 0%, rgb(var(--bg-2,4,10,34)) 45%, rgb(var(--bg-3,3,8,32)) 70%, rgb(var(--bg-4,1,3,11)) 100%)",
      }}
    >
      <style>{`
        @keyframes ldPulse { 0%,100% { opacity: .35; } 50% { opacity: 1; } }
        @keyframes ldBar { from { transform: translateX(-100%); } to { transform: translateX(250%); } }
      `}</style>
      <div className="flex flex-col items-center gap-3">
        <span
          className="font-mono text-[11px] tracking-[.4em]"
          style={{
            color: "rgb(var(--c-a8eef6,168,238,246))",
            animation: "ldPulse 1.2s ease-in-out infinite",
          }}
        >
          LOADING
        </span>
        <span className="relative block h-px w-32 overflow-hidden bg-[rgba(168,238,246,.15)]">
          <span
            className="absolute inset-y-0 left-0 w-1/3"
            style={{
              background: "rgb(var(--c-a8eef6,168,238,246))",
              boxShadow: "0 0 8px rgba(var(--c-a8eef6,168,238,246),.9)",
              animation: "ldBar 1s ease-in-out infinite",
            }}
          />
        </span>
      </div>
    </main>
  );
}
