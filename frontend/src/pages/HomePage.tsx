import { motion } from 'framer-motion'
import FeatureCard from '../components/FeatureCard'

type HomePageProps = {
  onHome: () => void
  onOpenGreenWave: () => void
  onOpenScenarios: () => void
}

const metrics = [
  { label: 'Светофоров под контролем', value: '48' },
  { label: 'Экономия времени', value: '8 мин' },
  { label: 'Поток обновления', value: '24/7' },
]

const features = [
  {
    eyebrow: 'Данные',
    title: 'Аналитика движения',
    description: 'Собирайте данные по светофорам, фазам и трафику в одном понятном React-интерфейсе.',
  },
  {
    eyebrow: 'Алгоритм',
    title: 'Синхронизация волны',
    description: 'Управляйте маршрутами и запускайте зелёную волну с минимальной задержкой на перекрёстках.',
  },
  {
    eyebrow: 'Интеграции',
    title: 'Камеры и наблюдение',
    description: 'Подключайте видеопотоки, считывайте поток машин и принимайте решения по состоянию улицы.',
  },
]

function HomePage({ onHome, onOpenGreenWave, onOpenScenarios }: HomePageProps) {
  return (
    <main className="app-shell">
      <header className="topbar">
        <button className="brand" onClick={onHome} type="button">
          <span className="brand-mark" aria-hidden="true" />
          <span>Smart Traffic</span>
        </button>

        <nav className="nav-actions" aria-label="Основная навигация">
          <button className="nav-button" onClick={onOpenScenarios} type="button">
            Сценарии
          </button>
          <button className="nav-button nav-button-primary" onClick={onOpenGreenWave} type="button">
            Зеленая волна
          </button>
        </nav>
      </header>

      <section className="workspace" aria-label="Главная страница">
        <div className="container">
          <section className="hero">
            <motion.div
              animate={{ opacity: 1, y: 0 }}
              initial={{ opacity: 0, y: 24 }}
              transition={{ duration: 0.55, ease: 'easeOut' }}
              className="hero-content"
            >
              <p className="section-kicker">Управление светофорами</p>
              <h1>Система для зеленой волны и контроля перекрестков города</h1>
              <p className="lead">
                Оперативная панель для диспетчера: видно загрузку дорог, можно запустить зелёную волну и быстро понять,
                где поток движется хуже всего.
              </p>

              <div className="hero-actions">
                <button className="nav-button nav-button-primary" onClick={onOpenGreenWave} type="button">
                  Открыть карту перекрестков
                </button>
                <button className="nav-button nav-button-ghost" onClick={onOpenScenarios} type="button">
                  Посмотреть сценарии
                </button>
              </div>

              <div className="hero-metrics" aria-label="Ключевые показатели">
                {metrics.map((metric) => (
                  <article className="metric-chip" key={metric.label}>
                    <strong>{metric.value}</strong>
                    <span>{metric.label}</span>
                  </article>
                ))}
              </div>
            </motion.div>

            <motion.div
              animate={{ opacity: 1, y: 0, rotate: 0 }}
              initial={{ opacity: 0, y: 28, rotate: 2 }}
              transition={{ duration: 0.6, ease: 'easeOut', delay: 0.08 }}
              className="hero-visual"
              aria-hidden="true"
            >
              <div className="visual-glow visual-glow-one" />
              <div className="visual-glow visual-glow-two" />
              <div className="visual-panel">
                <div className="visual-panel-top">
                  <span className="visual-tag">Live traffic</span>
                  <span className="visual-status">Online</span>
                </div>

                <div className="visual-radar">
                  <div className="visual-radar-ring visual-radar-ring-a" />
                  <div className="visual-radar-ring visual-radar-ring-b" />
                  <div className="visual-radar-ring visual-radar-ring-c" />
                  <div className="visual-radar-center" />
                </div>

                <div className="visual-bars">
                  <span style={{ height: '32%' }} />
                  <span style={{ height: '58%' }} />
                  <span style={{ height: '42%' }} />
                  <span style={{ height: '72%' }} />
                  <span style={{ height: '50%' }} />
                </div>

                  <div className="traffic-summary">
                    <div className="traffic-summary-head">
                      <span className="traffic-summary-title">Сводка по движению</span>
                      <span className="traffic-summary-subtitle">Сегодня</span>
                    </div>

                    <div className="traffic-summary-grid">
                      <article>
                        <strong>12</strong>
                        <span>перекрестков в зелёной волне</span>
                      </article>
                      <article>
                        <strong>7 мин</strong>
                        <span>средняя задержка в час пик</span>
                      </article>
                      <article>
                        <strong>91%</strong>
                        <span>участков в стабильном потоке</span>
                      </article>
                    </div>
                </div>
              </div>
            </motion.div>
          </section>

          <section className="features-section" aria-labelledby="features-title">
            <div className="section-heading">
              <p className="section-kicker">Что умеет система</p>
              <h2 id="features-title">Понятный экран для работы с потоком, светофорами и отчетами</h2>
            </div>

            <div className="feature-grid">
              {features.map((feature) => (
                <FeatureCard key={feature.title} eyebrow={feature.eyebrow} title={feature.title}>
                  {feature.description}
                </FeatureCard>
              ))}
            </div>
          </section>

          <section className="banner-card">
            <div>
              <p className="section-kicker">Рабочий экран</p>
              <h2>Показываем состояние улиц, запуск волны и общую картину по движению.</h2>
            </div>
            <p>
              В проекте собраны главная панель, карта перекрестков и экран зеленой волны, чтобы быстро проверять,
              как ведёт себя городская сеть светофоров.
            </p>
          </section>

          <footer className="site-footer">
            <div>© {new Date().getFullYear()} Smart Traffic</div>
            <div className="footer-links">
              <button className="nav-button" onClick={onOpenScenarios} type="button">
                Сценарии
              </button>
            </div>
          </footer>
        </div>
      </section>
    </main>
  )
}

export default HomePage