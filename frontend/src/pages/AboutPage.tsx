import { motion } from 'framer-motion'
import { useTranslation } from 'react-i18next'

export default function AboutPage() {
  const { i18n } = useTranslation()
  const isItalian = i18n.language.startsWith('it')

  const title = isItalian ? 'Chi siamo' : 'About us'
  const subtitle = isItalian
    ? 'Static nasce per chi vuole allenarsi seriamente, con attrezzatura essenziale, solida e senza compromessi.'
    : 'Static is built for people who train seriously, with essential and durable gear, no compromises.'

  const blocks = isItalian
    ? [
        {
          heading: 'Visione',
          text: 'Creiamo prodotti per il calisthenics pensati per durare nel tempo: design minimale, materiali affidabili e performance reali in ogni sessione.',
        },
        {
          heading: 'Qualità',
          text: 'Ogni linea viene sviluppata con test pratici e attenzione ai dettagli, per offrire stabilità, grip e sicurezza in allenamento.',
        },
        {
          heading: 'Community',
          text: 'Static è anche una community: atleti, coach e appassionati che condividono la stessa mentalità, superare i propri limiti ogni giorno.',
        },
      ]
    : [
        {
          heading: 'Vision',
          text: 'We build calisthenics products designed to last: minimal design, reliable materials, and real-world performance in every session.',
        },
        {
          heading: 'Quality',
          text: 'Each line is developed with practical testing and attention to detail, delivering stability, grip, and safety during training.',
        },
        {
          heading: 'Community',
          text: 'Static is also a community: athletes, coaches, and enthusiasts sharing the same mindset, pushing limits every day.',
        },
      ]

  return (
    <div className="min-h-screen pt-28 pb-24">
      <section className="max-w-7xl mx-auto px-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="mb-14"
        >
          <p className="text-[#e8ff00] text-sm font-bold uppercase tracking-[0.25em] mb-3">Static</p>
          <h1 className="text-5xl md:text-7xl font-black text-white leading-none mb-5">{title}</h1>
          <p className="text-gray-400 text-lg max-w-3xl">{subtitle}</p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {blocks.map((block, index) => (
            <motion.div
              key={block.heading}
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.08, duration: 0.45 }}
              className="bg-[#111] border border-white/10 rounded-2xl p-6"
            >
              <h2 className="text-white text-xl font-black mb-3">{block.heading}</h2>
              <p className="text-gray-400 leading-relaxed">{block.text}</p>
            </motion.div>
          ))}
        </div>
      </section>
    </div>
  )
}
