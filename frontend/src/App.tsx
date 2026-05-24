import { useEffect, useState } from 'react'
import GreenWavePage from './pages/GreenWavePage'
import SmartTrafficLitePage from './pages/smarttrafficlite'
import HomePage from './pages/HomePage'
import './App.css'

const HOME_PATH = '/'
const GREEN_WAVE_PATH = '/greenwave'
const SMART_TRAFFIC_LITE_PATH = '/smarttrafficlite'
const API_PATH = '/api'

type Path = '/' | '/greenwave' | '/api'

function getCurrentPath(): Path {
  const pathname = window.location.pathname

  if (pathname === GREEN_WAVE_PATH || pathname === API_PATH) {
    return pathname
  }

  return HOME_PATH
}

function navigateTo(path: Path) {
  window.history.pushState({}, '', path)
  window.dispatchEvent(new PopStateEvent('popstate'))
}

function App() {
  const [pathname, setPathname] = useState<Path>(getCurrentPath)

  useEffect(() => {
    const handlePopState = () => setPathname(getCurrentPath())

    window.addEventListener('popstate', handlePopState)

    return () => {
      window.removeEventListener('popstate', handlePopState)
    }
  }, [])

  if (pathname === GREEN_WAVE_PATH) {
    return <GreenWavePage onBack={() => navigateTo(HOME_PATH)} />
  }

  if (pathname === API_PATH) {
    return (
      <main className="app-shell app-shell-api">
        <header className="topbar">
          <button className="brand" onClick={() => navigateTo(HOME_PATH)} type="button">
            <span className="brand-mark" aria-hidden="true" />
            <span>Smart Traffic</span>
          </button>

          <nav className="nav-actions" aria-label="Основная навигация">
            <button className="nav-button" onClick={() => navigateTo(HOME_PATH)} type="button">
              Главная
            </button>
            <button className="nav-button nav-button-primary" onClick={() => navigateTo(GREEN_WAVE_PATH)} type="button">
              Зеленая волна
            </button>
          </nav>
        </header>

        <section className="workspace">
          <div className="container api-page">
            <p className="section-kicker">Сценарии работы</p>
            <h1>Что видит и делает диспетчер во время смены</h1>
            <p className="lead">Этот экран собран для быстрых действий: проверить поток, увидеть загрузку и включить нужный режим управления.</p>

            <div className="feature-grid feature-grid-api">
              <article className="feature-card feature-card-compact">
                <span className="feature-badge">Режим 1</span>
                <h3>Утренний пик</h3>
                <p>Укорачиваем простои на ключевых перекрестках и даем приоритет основному потоку.</p>
              </article>

              <article className="feature-card feature-card-compact">
                <span className="feature-badge">Режим 2</span>
                <h3>Плотный поток</h3>
                <p>Подстраиваем фазы светофоров под загруженные направления и уменьшаем очередь машин.</p>
              </article>
            </div>

            <div className="api-panel">
              <h3>Что происходит на линии</h3>
              <pre>Система смотрит на поток, подбирает фазу и помогает держать движение ровным.</pre>
            </div>

            <div className="hero-actions api-actions">
              <span className="link-muted">Наблюдение в реальном времени</span>
              <button className="nav-button" onClick={() => navigateTo(HOME_PATH)} type="button">
                Назад на главную
              </button>
            </div>
          </div>
        </section>
      </main>
    )
  }

  if (pathname === SMART_TRAFFIC_LITE_PATH) {
    return <SmartTrafficLitePage />
  }

  return (
<<<<<<< Updated upstream
    <main className="app-shell">
      <header className="topbar">
        <div className="brand">
          <span className="brand-mark" aria-hidden="true" />
          <span>Главная панель</span>
        </div>

        <nav className="nav-actions" aria-label="Основная навигация">
          {navItems.map((item, index) => (
            <button
              className={item.primary ? 'nav-button nav-button-primary' : 'nav-button'}
              key={item.label}
              onClick={() => {
                const targetPath = index === 1 ? SMART_TRAFFIC_LITE_PATH : item.path
                if (targetPath) {
                  navigateTo(targetPath)
                }
              }}
              type="button"
            >
              {item.label}
            </button>
          ))}
        </nav>
      </header>

      <section className="workspace" aria-label="Рабочая область" />
    </main>
=======
    <HomePage
      onHome={() => navigateTo(HOME_PATH)}
      onOpenApi={() => navigateTo(API_PATH)}
      onOpenGreenWave={() => navigateTo(GREEN_WAVE_PATH)}
    />
>>>>>>> Stashed changes
  )
}

export default App
