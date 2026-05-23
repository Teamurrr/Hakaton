import './App.css'

const navItems = ['зеленая волна', 'текст 2', 'текст 3']

function App() {
  return (
    <main className="app-shell">
      <header className="topbar">
        <div className="brand">
          <span className="brand-mark" aria-hidden="true" />
          <span>Главная панель</span>
        </div>

        <nav className="nav-actions" aria-label="Основная навигация">
          {navItems.map((item, index) => (
            <button
              className={index === 0 ? 'nav-button nav-button-primary' : 'nav-button'}
              key={item}
              type="button"
            >
              {item}
            </button>
          ))}
        </nav>
      </header>

      <section className="workspace" aria-label="Рабочая область" />
    </main>
  )
}

export default App
