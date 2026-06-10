export default function MainContent({ children }) {
  return (
    <main className="flex-1 overflow-y-auto bg-slate-950">
      <div className="drag-region h-8 w-full" />
      <div className="px-8 pb-8">
        {children}
      </div>
    </main>
  )
}
