import { motion, useScroll, useTransform, useSpring, type Variants } from 'framer-motion'
import { useRef } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'

const fadeUp: Variants = {
  hidden: { opacity: 0, y: 40 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.15, duration: 0.7 },
  }),
}

const PRODUCT_STORY = [
  {
    id: 1,
    side: 'left' as const,
    label: '01 — Materiali',
    title: 'Acciaio al carbonio.\nForgiato per durare.',
    text: 'Ogni barra Pull-Up Static nasce da acciaio al carbonio trattato a caldo con rivestimento in polvere anti-corrosione a 180°C. Una superficie che resiste al sudore, all\'umidità e all\'usura quotidiana per anni.',
    detail: 'Spessore 32 mm · Peso 4,2 kg · Portata certificata 300 kg',
  },
  {
    id: 2,
    side: 'right' as const,
    label: '02 — Installazione',
    title: 'Montaggio in\n4 minuti netti.',
    text: 'La struttura modulare si adatta a qualsiasi telaio porta da 60 a 100 cm, senza forare il muro. Sistema di tensione a vite con piastre antiscivolo in gomma vulcanizzata che proteggono il rivestimento della porta.',
    detail: 'Kit incluso: 4 bulloni M10 · Livella · Guida illustrata',
  },
  {
    id: 3,
    side: 'left' as const,
    label: '03 — Grip System',
    title: 'Il grip che\ncercavi.',
    text: 'Knurling a doppio diamante nella zona centrale per massima aderenza anche a mani sudate. Le estremità in alluminio anodizzato silver permettono di scorrere fluidamente durante kipping e movimenti dinamici avanzati.',
    detail: 'Zona knurling 28 cm · Estremità lisce 12 cm per lato',
  },
  {
    id: 4,
    side: 'right' as const,
    label: '04 — Versatilità',
    title: 'Oltre 40 esercizi\npossibili.',
    text: 'Pull-up, chin-up, muscle-up, L-sit, skin the cat: una sola barra per tutto il tuo allenamento. Compatibile con elastici di assistenza, parallette e anelli grazie ai ganci laterali integrati in acciaio inox.',
    detail: 'Larghezza presa: standard 81 cm · wide 91 cm',
  },
  {
    id: 5,
    side: 'left' as const,
    label: '05 — Certificazioni',
    title: 'Certificata CE.\nGaranzia 5 anni.',
    text: 'Produzione interamente europea con controllo qualità su ogni singolo pezzo. Testata secondo la norma EN 957 per attrezzature fitness domestiche. Spedizione tracciata in 24/48h con imballo rinforzato inclusa in tutta Italia.',
    detail: 'EN 957-1 · ISO 9001 · Made in EU',
  },
  {
    id: 6,
    side: 'right' as const,
    label: '06 — Estetica',
    title: 'Design che si\nvede e si sente.',
    text: 'Finitura matte black con dettagli giallo Static. La barra non è solo un attrezzo, è un oggetto di design che valorizza il tuo spazio. Disponibile anche in versione all-black per chi preferisce un look total dark.',
    detail: 'Colori: Matte Black / All Black · Packaging premium riciclabile',
  },
]

// Slide 0 = intro, slide 1-6 = story, slide 7 = CTA finale
const TOTAL_SLIDES = PRODUCT_STORY.length + 2 // intro + stories + cta

function ProductStorySection() {
  const containerRef = useRef<HTMLDivElement>(null)
  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ['start start', 'end end'],
  })

  const smoothProgress = useSpring(scrollYProgress, { stiffness: 50, damping: 18 })

  // Zoom lento
  const imgScale  = useTransform(smoothProgress, [0, 1], [1.05, 1.25])
  // Parallax verticale
  const imgY      = useTransform(smoothProgress, [0, 1], ['0%', '18%'])
  // Skew obliquo: l'immagine si inclina mentre scorri
  const imgSkewX  = useTransform(smoothProgress, [0, 0.5, 1], ['-8deg', '0deg', '6deg'])
  // Clip-path parallelogramma animato
  const clipLeft  = useTransform(smoothProgress, [0, 1], [8, 0])   // % da sinistra
  const clipRight = useTransform(smoothProgress, [0, 1], [0, 8])   // % da destra
  const clipPath  = useTransform(
    [clipLeft, clipRight] as const,
    ([l, r]: number[]) =>
      `polygon(${l}% 0%, ${100 - r}% 0%, ${100 - l}% 100%, ${r}% 100%)`
  )

  // Overlay
  const overlayOpacity = useTransform(
    smoothProgress,
    [0, 0.08, 0.88, 1],
    [0.35, 0.75, 0.75, 0.45]
  )
  const glowOpacity = useTransform(smoothProgress, [0, 0.5, 1], [0.0, 0.15, 0.05])
  const progressScaleY = smoothProgress

  return (
    <section
      ref={containerRef}
      style={{ height: `${TOTAL_SLIDES * 100}vh` }}
    >
      <div className="sticky top-0 h-screen overflow-hidden">

        {/* ── BG IMMAGINE FULLSCREEN con effetto obliquo ── */}
        {/* Wrapper esterno: clip-path parallelogramma animato */}
        <motion.div
          className="absolute inset-0 z-0"
          style={{ clipPath }}
        >
          {/* Immagine con zoom + parallax + skew */}
          <motion.div
            className="absolute inset-[-10%] w-[120%] h-[120%]"
            style={{ scale: imgScale, y: imgY, skewX: imgSkewX }}
          >
            <img
              src="/parallette.png"
              alt="Parallette Static"
              className="w-full h-full object-cover"
            />
          </motion.div>
        </motion.div>

        {/* ── OVERLAY ── */}
        <motion.div className="absolute inset-0 z-10 bg-black" style={{ opacity: overlayOpacity }} />

        {/* ── GLOW ── */}
        <motion.div className="absolute inset-0 z-10 pointer-events-none" style={{ opacity: glowOpacity }}>
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-[#e8ff00] rounded-full blur-[140px]" />
        </motion.div>

        {/* ── SLIDE 0: INTRO ── */}
        <IntroSlide progress={smoothProgress} total={TOTAL_SLIDES} />

        {/* ── SLIDE 1-6: STORY BLOCKS ── */}
        <div className="relative z-20 h-full flex items-center">
          <div className="w-full">
            {PRODUCT_STORY.map((item, i) => {
              const slideIndex = i + 1
              const start = slideIndex / TOTAL_SLIDES
              const end   = (slideIndex + 1) / TOTAL_SLIDES
              const mid   = (start + end) / 2
              const range: [number, number, number, number] = [start, mid - 0.04, mid + 0.04, end]
              return (
                <StoryBlock key={item.id} item={item} progress={smoothProgress} range={range} />
              )
            })}
          </div>
        </div>

        {/* ── SLIDE FINALE: CTA ── */}
        <CtaSlide progress={smoothProgress} total={TOTAL_SLIDES} />

        {/* ── PROGRESS BAR ── */}
        <div className="absolute right-8 top-1/2 -translate-y-1/2 h-48 w-[2px] bg-white/15 rounded-full z-30 hidden lg:block">
          <motion.div className="w-full bg-[#e8ff00] rounded-full origin-top" style={{ scaleY: progressScaleY }} />
          <motion.div
            className="absolute -left-[3px] w-2 h-2 bg-[#e8ff00] rounded-full shadow-[0_0_8px_#e8ff00]"
            style={{ top: useTransform(progressScaleY, [0, 1], ['0%', '100%']) }}
          />
        </div>

        {/* ── DOT STEPS ── */}
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 z-30 flex gap-3 items-center">
          {Array.from({ length: TOTAL_SLIDES }).map((_, i) => {
            const start = i / TOTAL_SLIDES
            const end   = (i + 1) / TOTAL_SLIDES
            return <StepDot key={i} progress={smoothProgress} start={start} end={end} />
          })}
        </div>
      </div>
    </section>
  )
}

function IntroSlide({ progress, total }: { progress: ReturnType<typeof useSpring>; total: number }) {
  const end   = 1 / total
  const mid   = end / 2
  const range: [number, number, number, number] = [0, mid - 0.03, mid + 0.03, end]
  const opacity = useTransform(progress, range, [1, 1, 1, 0])
  const y       = useTransform(progress, range, [0, 0, 0, -60])
  const blur    = useTransform(progress, range, [0, 0, 0, 8])
  const filter  = useTransform(blur, (v) => `blur(${v}px)`)

  return (
    <motion.div
      style={{ opacity, y, filter }}
      className="absolute inset-0 z-20 flex items-center justify-center text-center px-6"
    >
      <div>
        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3, duration: 0.8 }}
          className="text-[#e8ff00] text-sm font-bold uppercase tracking-[0.3em] mb-5"
        >
          Il Prodotto
        </motion.p>
        <motion.h2
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5, duration: 0.9 }}
          className="text-5xl md:text-7xl font-black text-white leading-[1.05] mb-6"
        >
          Ogni dettaglio<br /><span className="text-[#e8ff00]">conta.</span>
        </motion.h2>
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.9, duration: 0.8 }}
          className="text-gray-400 text-lg max-w-md mx-auto"
        >
          Scorri per scoprire cosa rende Static unico.
        </motion.p>
        <motion.div
          animate={{ y: [0, 10, 0] }}
          transition={{ repeat: Infinity, duration: 2, delay: 1.5 }}
          className="mt-10 text-gray-500 flex justify-center"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 9l-7 7-7-7" />
          </svg>
        </motion.div>
      </div>
    </motion.div>
  )
}

function CtaSlide({ progress, total }: { progress: ReturnType<typeof useSpring>; total: number }) {
  const start = (total - 1) / total
  const mid   = (start + 1) / 2
  const range: [number, number, number, number] = [start, mid - 0.03, mid + 0.03, 1]
  const opacity = useTransform(progress, range, [0, 1, 1, 1])
  const y       = useTransform(progress, range, [60, 0, 0, 0])
  const blur    = useTransform(progress, range, [8, 0, 0, 0])
  const filter  = useTransform(blur, (v) => `blur(${v}px)`)

  return (
    <motion.div
      style={{ opacity, y, filter }}
      className="absolute inset-0 z-20 flex items-center justify-center text-center px-6"
    >
      <div>
        <p className="text-[#e8ff00] text-sm font-bold uppercase tracking-[0.3em] mb-5">Static Store</p>
        <h2 className="text-5xl md:text-7xl font-black text-white leading-[1.05] mb-6">
          Pronto a<br /><span className="text-[#e8ff00]">spingerti oltre?</span>
        </h2>
        <p className="text-gray-300 text-lg max-w-md mx-auto mb-10">
          Scopri tutta la linea Static. Attrezzatura pensata per chi non si accontenta.
        </p>
        <Link to="/shop">
          <motion.span
            whileHover={{ scale: 1.06 }}
            whileTap={{ scale: 0.96 }}
            className="inline-block bg-[#e8ff00] text-black font-black px-10 py-5 rounded-full text-xl cursor-pointer"
          >
            Shop ora →
          </motion.span>
        </Link>
      </div>
    </motion.div>
  )
}

function StoryBlock({
  item,
  progress,
  range,
}: {
  item: (typeof PRODUCT_STORY)[0]
  progress: ReturnType<typeof useSpring>
  range: [number, number, number, number]
}) {
  const opacity = useTransform(progress, range, [0, 1, 1, 0])
  const x = useTransform(
    progress,
    range,
    item.side === 'left' ? [-80, 0, 0, 80] : [80, 0, 0, -80]
  )
  const y = useTransform(progress, range, [40, 0, 0, -40])
  const blur = useTransform(progress, range, [8, 0, 0, 8])
  const filterValue = useTransform(blur, (v) => `blur(${v}px)`)

  const isLeft = item.side === 'left'

  return (
    <motion.div
      style={{ opacity, x, y, filter: filterValue }}
      className="absolute inset-0 flex items-center px-10 md:px-20 lg:px-32"
    >
      <div className={`max-w-xl ${isLeft ? 'mr-auto' : 'ml-auto'}`}>
        {/* Label */}
        <p className="text-[#e8ff00] text-xs font-bold uppercase tracking-[0.25em] mb-4">
          {item.label}
        </p>

        {/* Titolo con newline */}
        <h3 className="text-4xl md:text-5xl font-black text-white leading-[1.1] mb-5 whitespace-pre-line">
          {item.title}
        </h3>

        {/* Separatore */}
        <div className={`h-0.5 w-12 bg-[#e8ff00] mb-5 ${isLeft ? '' : 'ml-auto'}`} />

        {/* Testo corpo */}
        <p className="text-gray-300 text-base md:text-lg leading-relaxed mb-4">
          {item.text}
        </p>

        {/* Dettaglio tecnico */}
        <div className="inline-flex items-center gap-2 bg-white/5 backdrop-blur-sm border border-white/10 rounded-full px-4 py-2">
          <span className="w-1.5 h-1.5 bg-[#e8ff00] rounded-full" />
          <span className="text-gray-400 text-xs font-medium">{item.detail}</span>
        </div>
      </div>
    </motion.div>
  )
}

function StepDot({
  progress,
  start,
  end,
}: {
  progress: ReturnType<typeof useSpring>
  start: number
  end: number
}) {
  const scale = useTransform(progress, [start, (start + end) / 2, end], [0.6, 1.2, 0.6])
  const opacity = useTransform(progress, [start, (start + end) / 2, end], [0.3, 1, 0.3])

  return (
    <motion.div
      style={{ scale, opacity }}
      className="w-1.5 h-1.5 bg-[#e8ff00] rounded-full"
    />
  )
}

export default function HomePage() {
  const { t } = useTranslation()

  return (
    <div>
      {/* ── HERO ── */}
      <section className="relative min-h-screen flex items-center justify-center px-6">
        {/* Background grid */}
        <div
          className="absolute inset-0 opacity-[0.04]"
          style={{
            backgroundImage: `linear-gradient(#e8ff00 1px, transparent 1px), linear-gradient(90deg, #e8ff00 1px, transparent 1px)`,
            backgroundSize: '60px 60px',
          }}
        />

        {/* Glow */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-[#e8ff00]/5 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 max-w-5xl mx-auto text-center">
          <motion.div
            custom={0}
            variants={fadeUp}
            initial="hidden"
            animate="visible"
            className="inline-flex items-center gap-2 bg-white/5 border border-white/10 rounded-full px-4 py-2 text-sm text-gray-400 mb-8"
          >
            <span className="w-2 h-2 bg-[#e8ff00] rounded-full animate-pulse" />
            Calisthenics Equipment
          </motion.div>

          <motion.h1
            custom={1}
            variants={fadeUp}
            initial="hidden"
            animate="visible"
            className="text-6xl md:text-8xl font-black tracking-tighter leading-none mb-4"
          >
            <span className="text-white">{t('hero.title')}</span>
            <br />
            <span className="text-[#e8ff00]">{t('hero.title2')}</span>
          </motion.h1>

          <motion.p
            custom={2}
            variants={fadeUp}
            initial="hidden"
            animate="visible"
            className="text-gray-400 text-lg md:text-xl max-w-xl mx-auto mt-6 mb-10 leading-relaxed"
          >
            {t('hero.subtitle')}
          </motion.p>

          <motion.div
            custom={3}
            variants={fadeUp}
            initial="hidden"
            animate="visible"
            className="flex flex-col sm:flex-row gap-4 justify-center"
          >
            <Link to="/shop">
              <motion.span
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.97 }}
                className="inline-block bg-[#e8ff00] text-black font-bold px-8 py-4 rounded-full text-lg cursor-pointer"
              >
                {t('hero.cta')} →
              </motion.span>
            </Link>
            <Link to="/about">
              <motion.span
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.97 }}
                className="inline-block border border-white/20 text-white font-medium px-8 py-4 rounded-full text-lg hover:bg-white/5 transition-colors cursor-pointer"
              >
                {t('hero.cta2')}
              </motion.span>
            </Link>
          </motion.div>
        </div>

        {/* Scroll indicator */}
        <motion.div
          animate={{ y: [0, 10, 0] }}
          transition={{ repeat: Infinity, duration: 2 }}
          className="absolute bottom-10 left-1/2 -translate-x-1/2 text-gray-600"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 9l-7 7-7-7" />
          </svg>
        </motion.div>
      </section>

      {/* ── PRODUCT STORY (scroll-driven, fullscreen bg) ── */}
      <ProductStorySection />
    </div>
  )
}
