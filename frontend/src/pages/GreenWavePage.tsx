import { useEffect, useRef, useState } from 'react'
import styles from './GreenWavePage.module.scss'

const yandexMapsApiKey = import.meta.env.VITE_YANDEX_MAPS_API_KEY

type GreenWavePageProps = {
  onBack: () => void
}

declare global {
  interface Window {
    ymaps?: {
      ready: (callback: () => void) => void
      Map: new (
        element: HTMLElement,
        options: {
          center: [number, number]
          zoom: number
          controls?: string[]
        },
      ) => {
        destroy: () => void
      }
    }
  }
}

function YandexMap() {
  const mapRef = useRef<HTMLDivElement | null>(null)
  const mapInstanceRef = useRef<{ destroy: () => void } | null>(null)
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading')

  useEffect(() => {
    if (!mapRef.current) {
      return
    }

    if (!yandexMapsApiKey) {
      setStatus('error')
      return
    }

    const initMap = () => {
      if (!window.ymaps || !mapRef.current || mapInstanceRef.current) {
        return
      }

      const ymaps = window.ymaps

      ymaps.ready(() => {
        if (!mapRef.current || mapInstanceRef.current) {
          return
        }

        mapInstanceRef.current = new ymaps.Map(mapRef.current, {
          center: [43.238949, 76.889709],
          zoom: 12,
          controls: ['zoomControl', 'fullscreenControl'],
        })
        setStatus('ready')
      })
    }

    const existingScript = document.querySelector<HTMLScriptElement>(
      'script[data-yandex-maps="true"]',
    )

    if (existingScript) {
      if (window.ymaps) {
        initMap()
      } else {
        existingScript.addEventListener('load', initMap, { once: true })
      }
    } else {
      const script = document.createElement('script')
      script.src = `https://api-maps.yandex.ru/2.1/?apikey=${yandexMapsApiKey}&lang=ru_RU`
      script.async = true
      script.dataset.yandexMaps = 'true'
      script.addEventListener('load', initMap, { once: true })
      script.addEventListener('error', () => setStatus('error'), { once: true })
      document.head.append(script)
    }

    return () => {
      mapInstanceRef.current?.destroy()
      mapInstanceRef.current = null
    }
  }, [])

  return (
    <>
      <div className={styles.mapContainer} ref={mapRef} />
      {status !== 'ready' && (
        <div className={styles.mapStatus} role="status">
          {status === 'loading' ? 'Карта загружается...' : 'Не удалось загрузить карту'}
        </div>
      )}
    </>
  )
}

function GreenWavePage({ onBack }: GreenWavePageProps) {
  return (
    <section className={styles.mapPage} aria-label="Зеленая волна">
      <aside className={styles.sidePanel} aria-label="Показатели движения">
        <button className={styles.backButton} onClick={onBack} type="button">
          Назад
        </button>

        <div className={styles.metricCard}>
          <span className={styles.metricLabel}>Рекомендуемая скорость</span>
          <strong className={styles.metricValue}>-- км/ч</strong>
        </div>

        <div className={styles.metricCard}>
          <span className={styles.metricLabel}>Текущая скорость</span>
          <strong className={styles.metricValue}>-- км/ч</strong>
        </div>

        <div className={styles.panelEmpty} aria-label="Пустой блок" />
      </aside>

      <section className={styles.mapArea} aria-label="Карта">
        <YandexMap />
      </section>
    </section>
  )
}

export default GreenWavePage
