import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useCartStore } from '../store/cartStore'
import type { Product } from '../types'

const MOCK_PRODUCTS: Product[] = [
  {
    id: 1,
    name: 'Parallette S',
    slug: 'parallette-s',
    description: 'La versione compatta, pensata per chi si allena in spazi ridotti. Altezza 30 cm, larghezza 42 cm. Ideale per L-sit, planche progression e dips da pavimento. Struttura in acciaio al carbonio con piedini antiscivolo in gomma vulcanizzata.',
    price: 89.99,
    images: ['/standard.png'],
    category: { id: 1, name: 'Parallette', slug: 'parallette' },
    stock: 15,
    featured: false,
    createdAt: '',
    specs: { height: '30 cm', width: '42 cm', weight: '1.8 kg', load: '200 kg', material: 'Acciaio C45' },
    tag: 'COMPACT',
  },
  {
    id: 2,
    name: 'Parallette M',
    slug: 'parallette-m',
    description: 'La misura intermedia, la più versatile della linea Static. Altezza 40 cm, larghezza 50 cm. Perfetta per handstand push-up, pike push-up e pseudo planche. Le impugnature in alluminio anodizzato garantiscono una presa sicura anche a lungo.',
    price: 129.99,
    images: ['/medium.png'],
    category: { id: 1, name: 'Parallette', slug: 'parallette' },
    stock: 10,
    featured: true,
    createdAt: '',
    specs: { height: '40 cm', width: '50 cm', weight: '2.6 kg', load: '250 kg', material: 'Acciaio C45 + Alluminio' },
    tag: 'BEST SELLER',
  },
  {
    id: 3,
    name: 'Parallette L',
    slug: 'parallette-l',
    description: 'La versione professionale, per chi non scende a compromessi. Altezza 50 cm, larghezza 58 cm. La maggiore altezza permette esercizi con piena escursione del movimento: dip profondi, bulgarian ring push-up e transizioni muscle-up. Costruzione full-steel, bulloneria M10 inclusa.',
    price: 199.99,
    images: ['/large.png'],
    category: { id: 1, name: 'Parallette', slug: 'parallette' },
    stock: 8,
    featured: true,
    createdAt: '',
    specs: { height: '50 cm', width: '58 cm', weight: '4.2 kg', load: '300 kg', material: 'Full Steel C45' },
    tag: 'PRO',
  },
]

const PRODUCTS = MOCK_PRODUCTS

export default function ShopPage() {
  const { addItem } = useCartStore()
  const [selected, setSelected] = useState<Product | null>(null)

  return (
    <div className="min-h-screen pt-28 pb-24">

      {/* ── HEADER ── */}
      <div className="max-w-7xl mx-auto px-6 mb-16">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <p className="text-[#e8ff00] text-sm font-bold uppercase tracking-[0.25em] mb-3">Linea Parallette</p>
          <h1 className="text-6xl md:text-7xl font-black text-white leading-none">
            Scegli la<br /><span className="text-[#e8ff00]">tua misura.</span>
          </h1>
          <p className="text-gray-400 text-lg mt-5 max-w-lg">
            Tre taglie, un'unica qualità. Ogni paralletta Static è costruita per durare una vita.
          </p>
        </motion.div>
      </div>

      {/* ── SIZE GUIDE BAR ── */}
      <div className="max-w-7xl mx-auto px-6 mb-12">
        <div className="flex flex-col gap-3 border-b border-white/10 pb-6">
          <span className="text-gray-600 text-xs uppercase tracking-widest">Larghezza</span>
          {PRODUCTS.map((p) => (
            <div key={p.id} className="flex items-center gap-3">
              <span className="text-gray-500 text-xs w-24">{p.name}</span>
              <div
                className="h-4 bg-[#e8ff00]/20 border border-[#e8ff00]/30 rounded-sm"
                style={{ width: `${parseInt(p.specs?.width ?? '42') * 5}px` }}
              />
              <span className="text-[#e8ff00] text-xs font-bold">{p.specs?.width}</span>
            </div>
          ))}
        </div>
      </div>

      {/* ── GRIGLIA PRODOTTI ASIMMETRICA ── */}
      <div className="max-w-7xl mx-auto px-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-end">
          {PRODUCTS.map((product, i) => {
            const heights = ['h-[420px]', 'h-[520px]', 'h-[620px]']
            const imgHeights = ['h-44', 'h-56', 'h-72']
            const imageClass = 'w-full h-full object-cover object-center group-hover:scale-105 transition-transform duration-700 opacity-70'
            return (
              <motion.div
                key={product.id}
                initial={{ opacity: 0, y: 50 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.15, duration: 0.6 }}
                whileHover={{ y: -10, transition: { duration: 0.25 } }}
                className={`group relative bg-[#111] border border-white/10 rounded-3xl overflow-hidden flex flex-col cursor-pointer ${heights[i]}`}
                onClick={() => setSelected(product)}
              >
                {/* Tag */}
                {product.tag && (
                  <div className="absolute top-4 left-4 z-10">
                    <span className="bg-[#e8ff00] text-black text-[10px] font-black uppercase tracking-wider px-3 py-1 rounded-full">
                      {product.tag}
                    </span>
                  </div>
                )}

                {/* Immagine */}
                <div className={`relative ${imgHeights[i]} overflow-hidden bg-[#1a1a1a] shrink-0`}>
                  <img
                    src={product.images[0]}
                    alt={product.name}
                    className={imageClass}
                  />
                  {/* Overlay gradient */}
                  <div className="absolute inset-0 bg-gradient-to-t from-[#111] via-transparent to-transparent" />
                </div>

                {/* Info */}
                <div className="p-6 flex flex-col flex-1 justify-between">
                  <div>
                    {/* Dimensioni badge */}
                    <div className="flex gap-2 mb-3 flex-wrap">
                      {product.specs && Object.entries(product.specs).slice(0, 2).map(([k, v]) => (
                        <span key={k} className="text-[10px] font-medium text-gray-500 bg-white/5 border border-white/10 rounded-full px-2.5 py-1">
                          {v}
                        </span>
                      ))}
                    </div>
                    <h2 className="text-white font-black text-2xl mb-2">{product.name}</h2>
                    <p className="text-gray-500 text-sm leading-relaxed line-clamp-2">{product.description}</p>
                  </div>

                  <div className="mt-5 flex items-center justify-between">
                    <div>
                      <p className="text-gray-600 text-xs mb-0.5">da</p>
                      <span className="text-[#e8ff00] font-black text-2xl">€{product.price}</span>
                    </div>
                    <motion.button
                      whileTap={{ scale: 0.9 }}
                      onClick={(e) => { e.stopPropagation(); addItem(product) }}
                      className="bg-[#e8ff00] text-black text-sm font-black px-5 py-2.5 rounded-full hover:scale-105 transition-transform cursor-pointer"
                    >
                      + Carrello
                    </motion.button>
                  </div>
                </div>
              </motion.div>
            )
          })}
        </div>

        {/* ── CONFRONTO TECNICO ── */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="mt-20 border border-white/10 rounded-3xl overflow-hidden"
        >
          <div className="bg-[#111] px-8 py-5 border-b border-white/10">
            <p className="text-white font-bold text-lg">Confronto tecnico</p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-white/10">
                  <th className="text-left px-8 py-4 text-gray-600 text-xs uppercase tracking-widest font-medium">Specifica</th>
                  {PRODUCTS.map((p) => (
                    <th key={p.id} className="text-left px-6 py-4">
                      <span className="text-white font-black">{p.name}</span>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {[
                  { key: 'height', label: 'Altezza' },
                  { key: 'width', label: 'Larghezza' },
                  { key: 'weight', label: 'Peso' },
                  { key: 'load', label: 'Portata' },
                  { key: 'material', label: 'Materiale' },
                ].map((row, ri) => (
                  <tr key={row.key} className={`border-b border-white/5 ${ri % 2 === 0 ? 'bg-white/[0.02]' : ''}`}>
                    <td className="px-8 py-4 text-gray-500 text-sm">{row.label}</td>
                    {PRODUCTS.map((p) => (
                      <td key={p.id} className="px-6 py-4 text-white text-sm font-medium">
                        {p.specs?.[row.key as keyof typeof p.specs] ?? '—'}
                      </td>
                    ))}
                  </tr>
                ))}
                <tr>
                  <td className="px-8 py-4 text-gray-500 text-sm">Prezzo</td>
                  {PRODUCTS.map((p) => (
                    <td key={p.id} className="px-6 py-5">
                      <div className="flex items-center gap-3">
                        <span className="text-[#e8ff00] font-black text-lg">€{p.price}</span>
                        <motion.button
                          whileTap={{ scale: 0.9 }}
                          onClick={() => addItem(p)}
                          className="bg-white/10 hover:bg-[#e8ff00] hover:text-black text-white text-xs font-bold px-4 py-2 rounded-full transition-all cursor-pointer"
                        >
                          Aggiungi
                        </motion.button>
                      </div>
                    </td>
                  ))}
                </tr>
              </tbody>
            </table>
          </div>
        </motion.div>
      </div>

      {/* ── MODAL DETTAGLIO ── */}
      <AnimatePresence>
        {selected && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center px-6"
            onClick={() => setSelected(null)}
          >
            <motion.div
              initial={{ scale: 1, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 1, y: 20 }}
              transition={{ type: 'spring', stiffness: 300, damping: 30 }}
              className="bg-[#111] border border-white/10 rounded-3xl overflow-hidden max-w-2xl w-full max-h-[90vh] overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="relative h-64 bg-[#1a1a1a]">
                <img
                  src={selected.images[0]}
                  alt={selected.name}
                  className="w-full h-full object-cover object-center opacity-70"
                />
                <button
                  onClick={() => setSelected(null)}
                  className="absolute top-4 right-4 w-9 h-9 bg-black/60 rounded-full flex items-center justify-center text-white hover:bg-white/20 transition-colors cursor-pointer"
                >
                  ✕
                </button>
                {selected.tag && (
                  <span className="absolute top-4 left-4 bg-[#e8ff00] text-black text-[10px] font-black uppercase tracking-wider px-3 py-1 rounded-full">
                    {selected.tag}
                  </span>
                )}
              </div>
              <div className="p-8">
                <h2 className="text-white font-black text-3xl mb-2">{selected.name}</h2>
                <p className="text-gray-400 leading-relaxed mb-6">{selected.description}</p>
                {selected.specs && (
                  <div className="grid grid-cols-2 gap-3 mb-8">
                    {Object.entries(selected.specs).map(([k, v]) => (
                      <div key={k} className="bg-white/5 border border-white/10 rounded-xl px-4 py-3">
                        <p className="text-gray-600 text-xs uppercase tracking-wider mb-1">{k}</p>
                        <p className="text-white font-semibold text-sm">{String(v)}</p>
                      </div>
                    ))}
                  </div>
                )}
                <div className="flex items-center justify-between">
                  <span className="text-[#e8ff00] font-black text-3xl">€{selected.price}</span>
                  <motion.button
                    whileTap={{ scale: 0.95 }}
                    onClick={() => { addItem(selected); setSelected(null) }}
                    className="bg-[#e8ff00] text-black font-black px-8 py-3 rounded-full text-lg cursor-pointer"
                  >
                    Aggiungi al carrello
                  </motion.button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
