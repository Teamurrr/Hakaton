import FeatureCard from '../components/FeatureCard'
import Hero from '../components/Hero'
import SiteFooter from '../components/SiteFooter'

type HomePageProps = {
  onHome: () => void
  onOpenGreenWave: () => void
  onOpenScenarios: () => void
}

const features = [
  {
    eyebrow: 'Данные',
    title: 'Аналитика движения',
    description:
      'Собирайте данные по светофорам, фазам и трафику в одном понятном React-интерфейсе.',
  },
  {
    eyebrow: 'Алгоритм',
    title: 'Синхронизация волны',
    description:
      'Управляйте маршрутами и запускайте зелёную волну с минимальной задержкой на перекрёстках.',
  },
  {
    eyebrow: 'Интеграции',
    title: 'Камеры и наблюдение',
    description:
      'Подключайте видеопотоки, считывайте поток машин и принимайте решения по состоянию улицы.',
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
            Умный светофор
          </button>
          <button className="nav-button nav-button-primary" onClick={onOpenGreenWave} type="button">
            Зеленая волна
          </button>
        </nav>
      </header>

      <Hero onOpenGreenWave={onOpenGreenWave} onOpenScenarios={onOpenScenarios} />

      <section className="workspace container" aria-label="Главная страница - детали">
        <section className="features-section" aria-labelledby="features-title">
          <div className="section-heading">
            <p className="section-kicker">Что умеет система</p>
            <h2 id="features-title">
              Понятный экран для работы с потоком, светофорами и отчетами
            </h2>
          </div>

          <div className="feature-grid">
            {features.map((feature) => (
              <FeatureCard key={feature.title} eyebrow={feature.eyebrow} title={feature.title}>
                {feature.description}
              </FeatureCard>
            ))}
          </div>
        </section>

        <SiteFooter
          onHome={onHome}
          onOpenGreenWave={onOpenGreenWave}
          onOpenScenarios={onOpenScenarios}
        />
      </section>
    </main>
  )
}

export default HomePage
