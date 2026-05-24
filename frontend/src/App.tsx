import { useEffect, useState } from 'react'
import GreenWavePage from './pages/GreenWavePage'
import HomePage from './pages/HomePage'
import SmartTrafficLitePage from './pages/smarttrafficlite'
import './App.css'

const HOME_PATH = '/'
const GREEN_WAVE_PATH = '/greenwave'
const SMART_TRAFFIC_LITE_PATH = '/smarttrafficlite'

type Path = '/' | '/greenwave' | '/smarttrafficlite'

function getCurrentPath(): Path {
  const pathname = window.location.pathname

  if (pathname === GREEN_WAVE_PATH || pathname === SMART_TRAFFIC_LITE_PATH) {
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
    return (
      <GreenWavePage
        onBack={() => navigateTo(HOME_PATH)}
        onHome={() => navigateTo(HOME_PATH)}
        onOpenScenarios={() => navigateTo(SMART_TRAFFIC_LITE_PATH)}
      />
    )
  }

  if (pathname === SMART_TRAFFIC_LITE_PATH) {
    return (
      <SmartTrafficLitePage
        onHome={() => navigateTo(HOME_PATH)}
        onOpenGreenWave={() => navigateTo(GREEN_WAVE_PATH)}
        onOpenScenarios={() => navigateTo(SMART_TRAFFIC_LITE_PATH)}
      />
    )
  }

  return (
    <HomePage
      onHome={() => navigateTo(HOME_PATH)}
      onOpenGreenWave={() => navigateTo(GREEN_WAVE_PATH)}
      onOpenScenarios={() => navigateTo(SMART_TRAFFIC_LITE_PATH)}
    />
  )
}

export default App
