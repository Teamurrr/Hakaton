import { useEffect, useState } from 'react'
import GreenWavePage from './pages/GreenWavePage'
import './App.css'

const GREEN_WAVE_PATH = '/greenwave'

const navItems = [
  { label: 'зеленая волна', path: GREEN_WAVE_PATH, primary: true },
  { label: 'текст 2' },
  { label: 'текст 3' },
]

function getCurrentPath() {
  return window.location.pathname
}

function navigateTo(path: string) {
  window.history.pushState({}, '', path)
  window.dispatchEvent(new PopStateEvent('popstate'))
}

function App() {
  const [pathname, setPathname] = useState(getCurrentPath)

  useEffect(() => {
    const handlePopState = () => setPathname(getCurrentPath())

    window.addEventListener('popstate', handlePopState)

    return () => {
      window.removeEventListener('popstate', handlePopState)
    }
  }, [])

  if (pathname === GREEN_WAVE_PATH) {
    return <GreenWavePage onBack={() => navigateTo('/')} />
  }

  return (
    <main className="app-shell">
      <header className="topbar">
        <div className="brand">
          <span className="brand-mark" aria-hidden="true" />
          <span>Главная панель</span>
        </div>

        <nav className="nav-actions" aria-label="Основная навигация">
          {navItems.map((item) => (
            <button
              className={item.primary ? 'nav-button nav-button-primary' : 'nav-button'}
              key={item.label}
              onClick={() => item.path && navigateTo(item.path)}
              type="button"
            >
              {item.label}
            </button>
          ))}
        </nav>
      </header>

      <section className="workspace" aria-label="Рабочая область" />
    </main>
  )
}

export default App
