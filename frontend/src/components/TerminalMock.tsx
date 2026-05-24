import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

const snippets: Record<string,string> = {
  curl: `curl -X POST "http://localhost:8000/api/traffic/signal" -H "Content-Type: application/json" -d '{"junctionId":"T-12","mode":"green-wave"}'`,
  js: `const response = await fetch('http://localhost:8000/api/traffic/signal', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ junctionId: 'T-12', mode: 'green-wave' }),
})
const data = await response.json()
console.log(data)`
}

export default function TerminalMock(){
  const [tab, setTab] = useState('curl')

  return (
    <div className="w-full max-w-md rounded-3xl border border-white/10 bg-slate-950/70 p-4 text-slate-100 shadow-[0_24px_50px_rgba(2,6,23,0.28)] backdrop-blur-xl">
      <div className="flex items-center gap-3 mb-3">
        <div className="flex-1">
          <div className="flex gap-2 rounded-2xl border border-white/10 bg-white/5 p-2">
            <button onClick={()=>setTab('curl')} className={`rounded-xl px-3 py-1.5 text-sm transition ${tab==='curl'?'bg-sky-500 text-white shadow-lg shadow-sky-500/25':'text-slate-300 hover:bg-white/10'}`}>cURL</button>
            <button onClick={()=>setTab('js')} className={`rounded-xl px-3 py-1.5 text-sm transition ${tab==='js'?'bg-sky-500 text-white shadow-lg shadow-sky-500/25':'text-slate-300 hover:bg-white/10'}`}>JavaScript</button>
          </div>
        </div>
        <div className="text-sm text-slate-400">Пример</div>
      </div>

      <AnimatePresence mode="wait">
        <motion.pre key={tab}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.28 }}
          className="whitespace-pre-wrap rounded-2xl border border-white/10 bg-[#020817] p-4 text-sky-100">
          {snippets[tab]}
        </motion.pre>
      </AnimatePresence>
    </div>
  )
}
