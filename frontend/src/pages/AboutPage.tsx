import { motion } from 'framer-motion'
import { useTranslation } from 'react-i18next'

export default function AboutPage() {
  const { t } = useTranslation()

  const title = t('about.title')
  const subtitle = t('about.subtitle')

  const blocks = [
    { heading: t('about.blocks.vision.heading'), text: t('about.blocks.vision.text') },
    { heading: t('about.blocks.quality.heading'), text: t('about.blocks.quality.text') },
    { heading: t('about.blocks.community.heading'), text: t('about.blocks.community.text') },
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
