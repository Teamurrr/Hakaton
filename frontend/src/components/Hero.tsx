import { motion } from 'framer-motion'
import logoK from '../assets/logo-kyrgyztech.svg'
import logoC from '../assets/logo-citygis.svg'
import logoV from '../assets/logo-vite.svg'
import MapBg from '../assets/map-bg.svg'

type HeroProps = {
  onOpenGreenWave: () => void
  onOpenScenarios: () => void
}

export default function Hero({ onOpenGreenWave, onOpenScenarios }: HeroProps) {
  return (
    <section className="big-hero" role="banner" aria-label="Главная презентация">
      <div className="big-hero-inner container">
        <motion.div
          className="hero-copy"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
        >
          <div className="logo-lockup" aria-hidden>
            <div className="logo-mark" />
            <div className="logo-text">Smart Traffic</div>
          </div>

          <h1 className="hero-headline">Управляем городским потоком — бережно, быстро, умно</h1>

          <p className="hero-subtitle">
            Платформа для оптимизации светофорных циклов, мониторинга и моделирования зелёных волн.
            Готово для презентации — покажите это инвесторам и мэру прямо сейчас.
          </p>

          <div className="hero-ctas">
            <button className="nav-button nav-button-primary" onClick={onOpenGreenWave} type="button">
              Открыть карту
            </button>
            <button className="nav-button nav-button-ghost" onClick={onOpenScenarios} type="button">
              Умный светофор
            </button>
          </div>

          <div className="logo-strip" aria-hidden>
            <img src={logoK} alt="KyrgyzTech" className="logo-img" />
            <img src={logoC} alt="CityGIS" className="logo-img" />
            <img src={logoV} alt="Vite" className="logo-img" />
          </div>
        </motion.div>

        <motion.div
          className="hero-visual"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 1, delay: 0.2 }}
        >
          <div className="visual-card">
            <div className="visual-spot visual-spot-a" />
            <div className="visual-spot visual-spot-b" />
            <div className="visual-spot visual-spot-c" />
            <div className="visual-map">
              <img src={MapBg} alt="Карта" className="map-bg" />

              {/* moving vehicles simulated with framer-motion */}
              <motion.div
                className="vehicle v1"
                animate={{ x: [ -180, -60, 40, 140 ], y: [ 80, 72, 90, 60 ] }}
                transition={{ duration: 6, repeat: Infinity, ease: 'linear' }}
              />
              <motion.div
                className="vehicle v2"
                animate={{ x: [ -160, -40, 60, 200 ], y: [ 140, 132, 110, 120 ] }}
                transition={{ duration: 5, repeat: Infinity, ease: 'linear', delay: 0.6 }}
              />
              <motion.div
                className="vehicle v3"
                animate={{ x: [ -200, -90, 10, 120 ], y: [ 40, 60, 40, 30 ] }}
                transition={{ duration: 7, repeat: Infinity, ease: 'linear', delay: 0.9 }}
              />

                {/* traffic lights placed on the map */}
                <div className="tl-wrapper tl-1">
                  <TrafficLight />
                </div>
                <div className="tl-wrapper tl-2">
                  <TrafficLight offset={0.8} />
                </div>
                <div className="tl-wrapper tl-3">
                  <TrafficLight offset={1.6} />
                </div>

              </div>
          </div>
        </motion.div>
      </div>
    </section>
  )
}

  function TrafficLight({ offset = 0 }: { offset?: number }) {
    const cycle = 6
    return (
      <svg className="traffic-light" viewBox="0 0 36 88" width="36" height="88" aria-hidden>
        <rect x="0" y="0" width="36" height="88" rx="6" fill="#081826" opacity="0.9" />
        <motion.circle cx="18" cy="20" r="6" fill="#ef4444"
          animate={{ opacity: [1, 0, 0, 1] }}
          transition={{ duration: cycle, repeat: Infinity, ease: 'linear', delay: offset }}
        />
        <motion.circle cx="18" cy="44" r="6" fill="#f59e0b"
          animate={{ opacity: [0, 1, 0, 0] }}
          transition={{ duration: cycle, repeat: Infinity, ease: 'linear', delay: offset }}
        />
        <motion.circle cx="18" cy="68" r="6" fill="#10b981"
          animate={{ opacity: [0, 0, 1, 0] }}
          transition={{ duration: cycle, repeat: Infinity, ease: 'linear', delay: offset }}
        />
      </svg>
    )
  }
