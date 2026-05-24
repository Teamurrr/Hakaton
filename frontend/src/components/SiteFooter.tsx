type SiteFooterProps = {
  onHome: () => void
  onOpenGreenWave: () => void
  onOpenScenarios: () => void
}

export default function SiteFooter({
  onHome,
  onOpenGreenWave,
  onOpenScenarios,
}: SiteFooterProps) {
  return (
    <footer className="site-footer">
      <div className="site-footer__grid">
        <div className="site-footer__brand-block">
          <button className="site-footer__brand" onClick={onHome} type="button">
            <span className="brand-mark" aria-hidden="true" />
            <span>Smart Traffic</span>
          </button>
          <p className="site-footer__copy">
            Панель для мониторинга трафика, управления перекрестками и запуска сценариев
            адаптивного светофорного регулирования.
          </p>
        </div>

        <div className="site-footer__nav-block">
          <span className="site-footer__title">Навигация</span>
          <div className="site-footer__links">
            <button className="site-footer__link" onClick={onHome} type="button">
              Главная
            </button>
            <button className="site-footer__link" onClick={onOpenGreenWave} type="button">
              Зеленая волна
            </button>
            <button className="site-footer__link" onClick={onOpenScenarios} type="button">
              Умный светофор
            </button>
          </div>
        </div>

        <div className="site-footer__meta-block">
          <span className="site-footer__title">Статус</span>
          <div className="site-footer__badge">Городская демо-платформа</div>
          <p className="site-footer__meta">
            Обновление интерфейса и аналитики в реальном времени для демонстрации дорожных
            сценариев.
          </p>
        </div>
      </div>

      <div className="site-footer__bottom">
        <span>© {new Date().getFullYear()} Smart Traffic</span>
        <span>Adaptive traffic control demo</span>
      </div>
    </footer>
  )
}
