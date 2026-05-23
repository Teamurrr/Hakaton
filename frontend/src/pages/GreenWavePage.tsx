import { useEffect, useRef, useState } from 'react'
import styles from './GreenWavePage.module.scss'

const yandexMapsApiKey = import.meta.env.VITE_YANDEX_MAPS_API_KEY
const backendApiBaseUrl = import.meta.env.VITE_API_BASE_URL ?? 'http://127.0.0.1:8000'
const ANIMATION_ACCELERATION = 30
const TRAFFIC_LIGHT_ROUTE_TOLERANCE_M = 60

type Coordinate = [number, number]
type SelectionMode = 'start' | 'end' | null
type MapStatus = 'loading' | 'ready' | 'error'
type RouteStatus = 'idle' | 'building' | 'ready' | 'error'
type SyncStatus = 'idle' | 'syncing' | 'synced' | 'error'
type RecommendationStatus = 'idle' | 'loading' | 'ready' | 'error'
type GeolocationStatus = 'idle' | 'loading' | 'ready' | 'error' | 'unsupported'
type SignalState = 'green' | 'red'

type TrafficLightData = {
  coordinate: Coordinate
  cycleDurationSec: number
  greenDurationSec: number
  greenStartSec: number
  id: string
  name: string
}

type RouteTrafficLight = TrafficLightData & {
  distanceFromStartM: number
}

type RouteStats = {
  distanceM: number
}

type RecommendationResponse = {
  advice: string
  calculated_at_sec: number
  departure_delay_sec: number
  expected_stops_count: number
  expected_wait_sec: number
  green_wave_available: boolean
  next_light_green_in_sec: number
  recommended_speed_kmh: number
  target_arrival_in_sec: number
  target_light: {
    id: string
    name: string
  }
}

type MotionSegment =
  | {
      distanceM: number
      durationSec: number
      kind: 'wait'
      startTimeSec: number
    }
  | {
      durationSec: number
      endDistanceM: number
      kind: 'move'
      startDistanceM: number
      startTimeSec: number
    }

type MotionPlan = {
  segments: MotionSegment[]
  totalDurationSec: number
}

type GreenWavePageProps = {
  onBack: () => void
}

type PointSelectEvent = {
  get: (name: 'coords') => Coordinate
}

type MapClickHandler = (event: PointSelectEvent) => void

type YMapEvents = {
  add: (eventName: string, callback: MapClickHandler) => void
  remove: (eventName: string, callback: MapClickHandler) => void
}

type YMapGeoObjects = {
  add: (object: object) => void
  remove: (object: object) => void
}

type YMapInstance = {
  destroy: () => void
  events: YMapEvents
  geoObjects: YMapGeoObjects
  setBounds: (bounds: number[][], options?: object) => void
  setCenter: (center: Coordinate, zoom?: number, options?: object) => void
}

type YPlacemark = {
  geometry: {
    setCoordinates: (coordinates: Coordinate) => void
  }
  options?: {
    set: (name: string, value: unknown) => void
  }
}

type YRoutePath = {
  geometry: {
    getCoordinates: () => Coordinate[]
  }
}

type YRoute = {
  getBounds: () => number[][]
  getPaths: () => {
    get: (index: number) => YRoutePath
    getLength: () => number
  }
  options?: {
    set: (options: object) => void
  }
}

type YPolyline = {
  geometry: {
    getCoordinates: () => Coordinate[]
  }
}

type RoadRouteData = {
  coordinates: Coordinate[]
  distanceM: number
}

type AnimationContext = {
  active: boolean
  simulationAbsoluteStartSec: number
  simulationTimeSec: number
}

type YMapsApi = {
  Map: new (
    element: HTMLElement,
    options: {
      center: Coordinate
      controls?: string[]
      zoom: number
    },
  ) => YMapInstance
  Placemark: new (coordinates: Coordinate, properties?: object, options?: object) => YPlacemark
  Polyline: new (coordinates: Coordinate[], properties?: object, options?: object) => YPolyline
  ready: (callback: () => void) => void
  route: (points: Coordinate[], params?: object) => PromiseLike<YRoute>
}

declare global {
  interface Window {
    ymaps?: YMapsApi
  }
}

type YandexMapProps = {
  animationVersion: number
  endPoint: Coordinate | null
  focusPoint: Coordinate | null
  onBackendSyncStatusChange: (status: SyncStatus) => void
  onIntersectingLightsChange: (lights: RouteTrafficLight[]) => void
  onPointSelect: (mode: Exclude<SelectionMode, null>, coordinates: Coordinate) => void
  onRouteStatsChange: (stats: RouteStats | null) => void
  recommendedSpeedKmh: number | null
  recommendedStartSec: number | null
  routeStatus: RouteStatus
  selectionMode: SelectionMode
  speedKmh: number | null
  startPoint: Coordinate | null
  setRouteStatus: (status: RouteStatus) => void
}

const TRAFFIC_LIGHTS: TrafficLightData[] = [
  {
    coordinate: [42.8765, 74.5896],
    cycleDurationSec: 92,
    greenDurationSec: 34,
    greenStartSec: 8,
    id: 'tl_001',
    name: 'Chui x Manas',
  },
  {
    coordinate: [42.8767, 74.5982],
    cycleDurationSec: 101,
    greenDurationSec: 29,
    greenStartSec: 24,
    id: 'tl_002',
    name: 'Chui x Abdrahmanov',
  },
  {
    coordinate: [42.8769, 74.6058],
    cycleDurationSec: 109,
    greenDurationSec: 33,
    greenStartSec: 41,
    id: 'tl_003',
    name: 'Chui x Ibraimov',
  },
  {
    coordinate: [42.8724, 74.5894],
    cycleDurationSec: 78,
    greenDurationSec: 22,
    greenStartSec: 18,
    id: 'tl_004',
    name: 'Toktogul x Manas',
  },
  {
    coordinate: [42.8839485, 74.5889698],
    cycleDurationSec: 120,
    greenDurationSec: 36,
    greenStartSec: 55,
    id: 'tl_101',
    name: 'Manas corridor signal 1',
  },
  {
    coordinate: [42.8816527, 74.5887747],
    cycleDurationSec: 120,
    greenDurationSec: 36,
    greenStartSec: 75,
    id: 'tl_102',
    name: 'Manas corridor signal 2',
  },
  {
    coordinate: [42.8765928, 74.5882993],
    cycleDurationSec: 120,
    greenDurationSec: 36,
    greenStartSec: 0,
    id: 'tl_103',
    name: 'Manas corridor signal 3',
  },
  {
    coordinate: [42.875304, 74.5882038],
    cycleDurationSec: 120,
    greenDurationSec: 36,
    greenStartSec: 12,
    id: 'tl_104',
    name: 'Manas corridor signal 4',
  },
  {
    coordinate: [42.8728159, 74.5879442],
    cycleDurationSec: 120,
    greenDurationSec: 36,
    greenStartSec: 34,
    id: 'tl_105',
    name: 'Manas corridor signal 5',
  },
  {
    coordinate: [42.8702613, 74.5877019],
    cycleDurationSec: 120,
    greenDurationSec: 36,
    greenStartSec: 57,
    id: 'tl_106',
    name: 'Manas corridor signal 6',
  },
  {
    coordinate: [42.8677126, 74.5874127],
    cycleDurationSec: 120,
    greenDurationSec: 36,
    greenStartSec: 79,
    id: 'tl_107',
    name: 'Manas corridor signal 7',
  },
  {
    coordinate: [42.8676451, 74.5891212],
    cycleDurationSec: 120,
    greenDurationSec: 36,
    greenStartSec: 81,
    id: 'tl_108',
    name: 'Manas corridor signal 8',
  },
  {
    coordinate: [42.8575608, 74.5868326],
    cycleDurationSec: 120,
    greenDurationSec: 36,
    greenStartSec: 50,
    id: 'tl_109',
    name: 'Manas corridor signal 9',
  },
  {
    coordinate: [42.8537022, 74.5866112],
    cycleDurationSec: 120,
    greenDurationSec: 36,
    greenStartSec: 84,
    id: 'tl_110',
    name: 'Manas corridor signal 10',
  },
]

function currentSecondsSinceMidnight() {
  const now = new Date()
  return now.getHours() * 3600 + now.getMinutes() * 60 + now.getSeconds()
}

function formatCoordinate(point: Coordinate | null) {
  if (!point) {
    return 'не выбрана'
  }

  return `${point[0].toFixed(5)}, ${point[1].toFixed(5)}`
}

function translateAdvice(advice: string) {
  switch (advice) {
    case 'maintain_speed':
      return 'Держите текущую скорость'
    case 'speed_up':
      return 'Нужно немного ускориться'
    case 'slow_down':
      return 'Нужно снизить скорость'
    case 'prepare_to_stop':
      return 'Готовьтесь к остановке'
    case 'follow_recommendation':
      return 'Следуйте рекомендуемой скорости'
    default:
      return advice
  }
}

function getGeolocationErrorMessage(error: GeolocationPositionError) {
  switch (error.code) {
    case 1:
      return 'Браузер запретил доступ к геолокации. Проверьте разрешение именно для этого сайта.'
    case 2:
      return 'Телефон не смог определить позицию. Включите GPS, Wi-Fi и мобильные данные, затем попробуйте еще раз.'
    case 3:
      return 'Телефон слишком долго определял позицию. Выйдите на открытое место или попробуйте еще раз.'
    default:
      return 'Не удалось получить местоположение. Проверьте доступ в браузере.'
  }
}

function distanceBetweenCoordinates(start: Coordinate, end: Coordinate) {
  const earthRadiusM = 6_371_000
  const toRadians = (value: number) => (value * Math.PI) / 180

  const dLat = toRadians(end[0] - start[0])
  const dLon = toRadians(end[1] - start[1])
  const lat1 = toRadians(start[0])
  const lat2 = toRadians(end[0])

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) * Math.sin(dLon / 2)

  return 2 * earthRadiusM * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

function buildRouteCoordinates(route: YRoute) {
  const coordinates: Coordinate[] = []
  const paths = route.getPaths()

  for (let pathIndex = 0; pathIndex < paths.getLength(); pathIndex += 1) {
    const pathCoordinates = paths.get(pathIndex).geometry.getCoordinates()

    pathCoordinates.forEach((point, pointIndex) => {
      if (pathIndex > 0 && pointIndex === 0) {
        return
      }

      coordinates.push(point)
    })
  }

  return coordinates
}

function buildDistanceTable(coordinates: Coordinate[]) {
  const distances = [0]

  for (let index = 1; index < coordinates.length; index += 1) {
    distances.push(
      distances[index - 1] + distanceBetweenCoordinates(coordinates[index - 1], coordinates[index]),
    )
  }

  return distances
}

function getSignalState(light: TrafficLightData, absoluteSec: number): SignalState {
  const phase = absoluteSec % light.cycleDurationSec
  const greenEnd = light.greenStartSec + light.greenDurationSec
  return phase >= light.greenStartSec && phase <= greenEnd ? 'green' : 'red'
}

function secondsUntilGreen(light: TrafficLightData, absoluteSec: number) {
  if (getSignalState(light, absoluteSec) === 'green') {
    return 0
  }

  const phase = absoluteSec % light.cycleDurationSec
  if (phase < light.greenStartSec) {
    return light.greenStartSec - phase
  }

  return light.cycleDurationSec - phase + light.greenStartSec
}

function buildMotionPlan(
  routeDistanceM: number,
  trafficLights: RouteTrafficLight[],
  speedKmh: number,
  simulationAbsoluteStartSec: number,
): MotionPlan {
  const speedMps = speedKmh / 3.6
  const segments: MotionSegment[] = []
  let currentDistanceM = 0
  let currentTimeSec = 0

  for (const light of trafficLights) {
    if (light.distanceFromStartM <= currentDistanceM || light.distanceFromStartM >= routeDistanceM) {
      continue
    }

    const moveDistanceM = light.distanceFromStartM - currentDistanceM
    const moveDurationSec = moveDistanceM / speedMps

    segments.push({
      durationSec: moveDurationSec,
      endDistanceM: light.distanceFromStartM,
      kind: 'move',
      startDistanceM: currentDistanceM,
      startTimeSec: currentTimeSec,
    })

    currentDistanceM = light.distanceFromStartM
    currentTimeSec += moveDurationSec

    const waitDurationSec = secondsUntilGreen(light, simulationAbsoluteStartSec + currentTimeSec)

    if (waitDurationSec > 0) {
      segments.push({
        distanceM: currentDistanceM,
        durationSec: waitDurationSec,
        kind: 'wait',
        startTimeSec: currentTimeSec,
      })
      currentTimeSec += waitDurationSec
    }
  }

  if (currentDistanceM < routeDistanceM) {
    const remainingDistanceM = routeDistanceM - currentDistanceM
    segments.push({
      durationSec: remainingDistanceM / speedMps,
      endDistanceM: routeDistanceM,
      kind: 'move',
      startDistanceM: currentDistanceM,
      startTimeSec: currentTimeSec,
    })
    currentTimeSec += remainingDistanceM / speedMps
  }

  return {
    segments,
    totalDurationSec: currentTimeSec,
  }
}

function getDistanceForSimulationTime(plan: MotionPlan, simulationTimeSec: number) {
  if (plan.segments.length === 0) {
    return 0
  }

  for (const segment of plan.segments) {
    const segmentEndSec = segment.startTimeSec + segment.durationSec

    if (simulationTimeSec > segmentEndSec) {
      continue
    }

    if (segment.kind === 'wait') {
      return segment.distanceM
    }

    const progress =
      segment.durationSec === 0
        ? 1
        : (simulationTimeSec - segment.startTimeSec) / segment.durationSec

    return (
      segment.startDistanceM +
      (segment.endDistanceM - segment.startDistanceM) * Math.min(Math.max(progress, 0), 1)
    )
  }

  const lastSegment = plan.segments[plan.segments.length - 1]
  return lastSegment.kind === 'wait' ? lastSegment.distanceM : lastSegment.endDistanceM
}

async function fetchRoadRoute(start: Coordinate, end: Coordinate): Promise<RoadRouteData> {
  const response = await fetch(
    `https://router.project-osrm.org/route/v1/driving/${start[1]},${start[0]};${end[1]},${end[0]}?overview=full&geometries=geojson`,
  )

  if (!response.ok) {
    throw new Error(`OSRM request failed with status ${response.status}`)
  }

  const data = (await response.json()) as {
    code?: string
    routes?: Array<{
      distance: number
      geometry?: {
        coordinates: Array<[number, number]>
      }
    }>
  }

  const route = data.routes?.[0]
  const geometry = route?.geometry?.coordinates

  if (data.code !== 'Ok' || !route || !geometry || geometry.length < 2) {
    throw new Error('OSRM did not return a drivable route')
  }

  return {
    coordinates: geometry.map(([lon, lat]) => [lat, lon] satisfies Coordinate),
    distanceM: route.distance,
  }
}

async function syncTrafficLightsToBackend(
  start: Coordinate,
  end: Coordinate,
  routeDistanceM: number,
  trafficLights: RouteTrafficLight[],
) {
  const response = await fetch(`${backendApiBaseUrl}/traffic-lights/sync`, {
    body: JSON.stringify({
      end: {
        lat: end[0],
        lon: end[1],
      },
      route_distance_m: routeDistanceM,
      source: 'yandex-maps-frontend',
      start: {
        lat: start[0],
        lon: start[1],
      },
      traffic_lights: trafficLights.map((light) => ({
        distance_from_start_m: light.distanceFromStartM,
        id: light.id,
        lat: light.coordinate[0],
        lon: light.coordinate[1],
        name: light.name,
      })),
    }),
    headers: {
      'Content-Type': 'application/json',
    },
    method: 'POST',
  })

  if (!response.ok) {
    throw new Error(`Backend sync failed with status ${response.status}`)
  }

  return response.json()
}

async function fetchRecommendedSpeed(
  start: Coordinate,
  end: Coordinate,
): Promise<RecommendationResponse> {
  const payload: {
    current_time_sec: number
    end: {
      lat: number
      lon: number
    }
    start: {
      lat: number
      lon: number
    }
  } = {
    current_time_sec: currentSecondsSinceMidnight(),
    end: {
      lat: end[0],
      lon: end[1],
    },
    start: {
      lat: start[0],
      lon: start[1],
    },
  }

  const response = await fetch(`${backendApiBaseUrl}/green-wave/calculate`, {
    body: JSON.stringify(payload),
    headers: {
      'Content-Type': 'application/json',
    },
    method: 'POST',
  })

  if (!response.ok) {
    throw new Error(`Recommendation request failed with status ${response.status}`)
  }

  return response.json() as Promise<RecommendationResponse>
}

function projectPointOnSegment(start: Coordinate, end: Coordinate, point: Coordinate) {
  const meanLat = ((start[0] + end[0] + point[0]) / 3) * (Math.PI / 180)
  const scaleX = 111_320 * Math.cos(meanLat)
  const scaleY = 110_540

  const ax = start[1] * scaleX
  const ay = start[0] * scaleY
  const bx = end[1] * scaleX
  const by = end[0] * scaleY
  const px = point[1] * scaleX
  const py = point[0] * scaleY

  const abx = bx - ax
  const aby = by - ay
  const apx = px - ax
  const apy = py - ay
  const lengthSquared = abx * abx + aby * aby

  if (lengthSquared === 0) {
    return {
      distanceM: Math.sqrt(apx * apx + apy * apy),
      projection: 0,
    }
  }

  const projection = Math.max(0, Math.min(1, (apx * abx + apy * aby) / lengthSquared))
  const closestX = ax + abx * projection
  const closestY = ay + aby * projection

  return {
    distanceM: Math.sqrt((px - closestX) ** 2 + (py - closestY) ** 2),
    projection,
  }
}

function findIntersectingLights(routeCoordinates: Coordinate[]) {
  if (routeCoordinates.length < 2) {
    return []
  }

  const distances = buildDistanceTable(routeCoordinates)

  return TRAFFIC_LIGHTS.map((light) => {
    let bestDistanceM = Number.POSITIVE_INFINITY
    let bestDistanceFromStartM = 0

    for (let index = 1; index < routeCoordinates.length; index += 1) {
      const segmentStart = routeCoordinates[index - 1]
      const segmentEnd = routeCoordinates[index]
      const projection = projectPointOnSegment(segmentStart, segmentEnd, light.coordinate)

      if (projection.distanceM < bestDistanceM) {
        bestDistanceM = projection.distanceM
        const segmentLength = distanceBetweenCoordinates(segmentStart, segmentEnd)
        bestDistanceFromStartM = distances[index - 1] + segmentLength * projection.projection
      }
    }

    if (bestDistanceM > TRAFFIC_LIGHT_ROUTE_TOLERANCE_M) {
      return null
    }

    return {
      ...light,
      distanceFromStartM: bestDistanceFromStartM,
    } satisfies RouteTrafficLight
  })
    .filter((light): light is RouteTrafficLight => light !== null)
    .sort((left, right) => left.distanceFromStartM - right.distanceFromStartM)
}

function getCoordinateAtDistance(
  coordinates: Coordinate[],
  distances: number[],
  targetDistance: number,
) {
  if (coordinates.length === 0) {
    return null
  }

  if (targetDistance <= 0) {
    return coordinates[0]
  }

  const totalDistance = distances[distances.length - 1]
  if (targetDistance >= totalDistance) {
    return coordinates[coordinates.length - 1]
  }

  for (let index = 1; index < distances.length; index += 1) {
    const segmentStartDistance = distances[index - 1]
    const segmentEndDistance = distances[index]

    if (targetDistance > segmentEndDistance) {
      continue
    }

    const progress =
      (targetDistance - segmentStartDistance) / (segmentEndDistance - segmentStartDistance || 1)

    const start = coordinates[index - 1]
    const end = coordinates[index]

    return [
      start[0] + (end[0] - start[0]) * progress,
      start[1] + (end[1] - start[1]) * progress,
    ] satisfies Coordinate
  }

  return coordinates[coordinates.length - 1]
}

function YandexMap({
  animationVersion,
  endPoint,
  focusPoint,
  onBackendSyncStatusChange,
  onIntersectingLightsChange,
  onPointSelect,
  onRouteStatsChange,
  recommendedSpeedKmh,
  recommendedStartSec,
  routeStatus,
  selectionMode,
  speedKmh,
  startPoint,
  setRouteStatus,
}: YandexMapProps) {
  const mapRef = useRef<HTMLDivElement | null>(null)
  const mapInstanceRef = useRef<YMapInstance | null>(null)
  const routeRef = useRef<YRoute | null>(null)
  const polylineRef = useRef<YPolyline | null>(null)
  const startPlacemarkRef = useRef<YPlacemark | null>(null)
  const endPlacemarkRef = useRef<YPlacemark | null>(null)
  const carPlacemarkRef = useRef<YPlacemark | null>(null)
  const trafficLightPlacemarkRefs = useRef<Record<string, YPlacemark>>({})
  const routeTrafficLightsRef = useRef<RouteTrafficLight[]>([])
  const animationFrameRef = useRef<number | null>(null)
  const signalAnimationFrameRef = useRef<number | null>(null)
  const routeCoordinatesRef = useRef<Coordinate[]>([])
  const routeDistancesRef = useRef<number[]>([])
  const selectionModeRef = useRef<SelectionMode>(selectionMode)
  const onPointSelectRef = useRef(onPointSelect)
  const animationContextRef = useRef<AnimationContext>({
    active: false,
    simulationAbsoluteStartSec: currentSecondsSinceMidnight(),
    simulationTimeSec: 0,
  })
  const [mapStatus, setMapStatus] = useState<MapStatus>('loading')

  const updateTrafficLightColors = (absoluteSec: number) => {
    Object.entries(trafficLightPlacemarkRefs.current).forEach(([lightId, placemark]) => {
      const routeLight = routeTrafficLightsRef.current.find((light) => light.id === lightId)

      if (!routeLight) {
        placemark.options?.set('preset', 'islands#grayCircleDotIcon')
        return
      }

      placemark.options?.set(
        'preset',
        getSignalState(routeLight, absoluteSec) === 'green'
          ? 'islands#greenCircleDotIcon'
          : 'islands#redCircleDotIcon',
      )
    })
  }

  const registerRouteData = (routeCoordinates: Coordinate[], routeDistanceM: number) => {
    const routeDistances = buildDistanceTable(routeCoordinates)
    const intersectingLights = findIntersectingLights(routeCoordinates)

    routeCoordinatesRef.current = routeCoordinates
    routeDistancesRef.current = routeDistances
    routeTrafficLightsRef.current = intersectingLights

    onRouteStatsChange({
      distanceM: routeDistanceM,
    })
    onIntersectingLightsChange(intersectingLights)
    onBackendSyncStatusChange('syncing')
    updateTrafficLightColors(currentSecondsSinceMidnight())

    return intersectingLights
  }

  const createPolylineRoute = (routeData: RoadRouteData) => {
    const map = mapInstanceRef.current
    const ymaps = window.ymaps

    if (!map || !ymaps || routeData.coordinates.length < 2) {
      setRouteStatus('error')
      return
    }

    const polyline = new ymaps.Polyline(
      routeData.coordinates,
      {},
      {
        opacity: 0.9,
        strokeColor: '#0f766e',
        strokeWidth: 6,
      },
    )

    polylineRef.current = polyline
    map.geoObjects.add(polyline)

    const intersectingLights = registerRouteData(routeData.coordinates, routeData.distanceM)
    const start = routeData.coordinates[0]
    const end = routeData.coordinates[routeData.coordinates.length - 1]

    carPlacemarkRef.current = new ymaps.Placemark(
      start,
      {
        iconCaption: 'Авто',
      },
      {
        preset: 'islands#darkGreenAutoIcon',
      },
    )
    map.geoObjects.add(carPlacemarkRef.current)

    map.setBounds(
      [
        [Math.min(start[0], end[0]), Math.min(start[1], end[1])],
        [Math.max(start[0], end[0]), Math.max(start[1], end[1])],
      ],
      { checkZoomRange: true },
    )
    setRouteStatus('ready')

    void syncTrafficLightsToBackend(start, end, routeData.distanceM, intersectingLights)
      .then(() => onBackendSyncStatusChange('synced'))
      .catch(() => onBackendSyncStatusChange('error'))
  }

  useEffect(() => {
    selectionModeRef.current = selectionMode
  }, [selectionMode])

  useEffect(() => {
    const map = mapInstanceRef.current

    if (!map || !focusPoint || mapStatus !== 'ready') {
      return
    }

    map.setCenter(focusPoint, 16, { duration: 500 })
  }, [focusPoint, mapStatus])

  useEffect(() => {
    onPointSelectRef.current = onPointSelect
  }, [onPointSelect])

  useEffect(() => {
    if (!mapRef.current) {
      return
    }

    if (!yandexMapsApiKey) {
      setMapStatus('error')
      return
    }

    let disposed = false
    let scriptListenersBoundTo: HTMLScriptElement | null = null

    const handleMapClick: MapClickHandler = (event) => {
      const currentSelectionMode = selectionModeRef.current

      if (!currentSelectionMode) {
        return
      }

      onPointSelectRef.current(currentSelectionMode, event.get('coords'))
    }

    const initializeMap = () => {
      if (disposed || !window.ymaps || !mapRef.current || mapInstanceRef.current) {
        return
      }

      window.ymaps.ready(() => {
        if (disposed || !window.ymaps || !mapRef.current || mapInstanceRef.current) {
          return
        }

        const map = new window.ymaps.Map(mapRef.current, {
          center: [42.8746, 74.5698],
          controls: ['zoomControl', 'fullscreenControl'],
          zoom: 12,
        })

        trafficLightPlacemarkRefs.current = Object.fromEntries(
          TRAFFIC_LIGHTS.map((light) => {
            const placemark = new window.ymaps!.Placemark(
              light.coordinate,
              {
                balloonContent: light.name,
                iconCaption: 'Светофор',
              },
              {
                preset: 'islands#grayCircleDotIcon',
              },
            )
            map.geoObjects.add(placemark)
            return [light.id, placemark]
          }),
        )

        map.events.add('click', handleMapClick)
        mapInstanceRef.current = map
        setMapStatus('ready')
      })
    }

    const existingScript = document.querySelector<HTMLScriptElement>(
      'script[data-yandex-maps="true"]',
    )

    if (existingScript) {
      scriptListenersBoundTo = existingScript

      if (window.ymaps) {
        initializeMap()
      } else {
        existingScript.addEventListener('load', initializeMap, { once: true })
      }
    } else {
      const script = document.createElement('script')
      script.src = `https://api-maps.yandex.ru/2.1/?apikey=${yandexMapsApiKey}&lang=ru_RU`
      script.async = true
      script.dataset.yandexMaps = 'true'
      script.addEventListener('load', initializeMap, { once: true })
      script.addEventListener('error', () => setMapStatus('error'), { once: true })
      document.head.append(script)
      scriptListenersBoundTo = script
    }

    return () => {
      disposed = true

      if (animationFrameRef.current !== null) {
        cancelAnimationFrame(animationFrameRef.current)
      }

      if (signalAnimationFrameRef.current !== null) {
        cancelAnimationFrame(signalAnimationFrameRef.current)
      }

      if (mapInstanceRef.current) {
        mapInstanceRef.current.events.remove('click', handleMapClick)
        mapInstanceRef.current.destroy()
        mapInstanceRef.current = null
      }

      if (scriptListenersBoundTo) {
        scriptListenersBoundTo.removeEventListener('load', initializeMap)
      }
    }
  }, [])

  useEffect(() => {
    const map = mapInstanceRef.current
    const ymaps = window.ymaps

    if (!map || !ymaps) {
      return
    }

    if (startPoint) {
      if (!startPlacemarkRef.current) {
        startPlacemarkRef.current = new ymaps.Placemark(
          startPoint,
          { iconCaption: 'Точка A' },
          { preset: 'islands#greenStretchyIcon' },
        )
        map.geoObjects.add(startPlacemarkRef.current)
      } else {
        startPlacemarkRef.current.geometry.setCoordinates(startPoint)
      }
    } else if (startPlacemarkRef.current) {
      map.geoObjects.remove(startPlacemarkRef.current)
      startPlacemarkRef.current = null
    }

    if (endPoint) {
      if (!endPlacemarkRef.current) {
        endPlacemarkRef.current = new ymaps.Placemark(
          endPoint,
          { iconCaption: 'Точка B' },
          { preset: 'islands#redStretchyIcon' },
        )
        map.geoObjects.add(endPlacemarkRef.current)
      } else {
        endPlacemarkRef.current.geometry.setCoordinates(endPoint)
      }
    } else if (endPlacemarkRef.current) {
      map.geoObjects.remove(endPlacemarkRef.current)
      endPlacemarkRef.current = null
    }
  }, [endPoint, startPoint])

  useEffect(() => {
    const map = mapInstanceRef.current
    const ymaps = window.ymaps

    if (!map || !ymaps) {
      return
    }

    if (animationFrameRef.current !== null) {
      cancelAnimationFrame(animationFrameRef.current)
      animationFrameRef.current = null
    }

    animationContextRef.current = {
      active: false,
      simulationAbsoluteStartSec: currentSecondsSinceMidnight(),
      simulationTimeSec: 0,
    }

    if (routeRef.current) {
      map.geoObjects.remove(routeRef.current)
      routeRef.current = null
    }

    if (polylineRef.current) {
      map.geoObjects.remove(polylineRef.current)
      polylineRef.current = null
    }

    routeCoordinatesRef.current = []
    routeDistancesRef.current = []
    routeTrafficLightsRef.current = []
    onRouteStatsChange(null)
    onIntersectingLightsChange([])
    onBackendSyncStatusChange('idle')
    updateTrafficLightColors(currentSecondsSinceMidnight())

    if (carPlacemarkRef.current) {
      map.geoObjects.remove(carPlacemarkRef.current)
      carPlacemarkRef.current = null
    }

    if (!startPoint || !endPoint) {
      setRouteStatus('idle')
      return
    }

    setRouteStatus('building')

    ymaps.route([startPoint, endPoint], {
      mapStateAutoApply: true,
      routingMode: 'auto',
    }).then(
      (route) => {
        if (!mapInstanceRef.current || !window.ymaps) {
          return
        }

        route.options?.set({
          opacity: 0.9,
          strokeColor: '#0f766e',
          strokeWidth: 6,
        })

        routeRef.current = route
        map.geoObjects.add(route)

        const routeCoordinates = buildRouteCoordinates(route)
        const routeDistances = buildDistanceTable(routeCoordinates)
        const routeDistanceM = routeDistances[routeDistances.length - 1] ?? 0
        const intersectingLights = registerRouteData(routeCoordinates, routeDistanceM)
        const initialCoordinate = routeCoordinates[0] ?? startPoint

        carPlacemarkRef.current = new window.ymaps.Placemark(
          initialCoordinate,
          {
            iconCaption: 'Авто',
          },
          {
            preset: 'islands#darkGreenAutoIcon',
          },
        )
        map.geoObjects.add(carPlacemarkRef.current)
        map.setBounds(route.getBounds(), { checkZoomRange: true })
        setRouteStatus('ready')

        void syncTrafficLightsToBackend(
          routeCoordinates[0] ?? startPoint,
          routeCoordinates[routeCoordinates.length - 1] ?? endPoint,
          routeDistanceM,
          intersectingLights,
        )
          .then(() => onBackendSyncStatusChange('synced'))
          .catch(() => onBackendSyncStatusChange('error'))
      },
      async () => {
        try {
          const roadRoute = await fetchRoadRoute(startPoint, endPoint)
          createPolylineRoute(roadRoute)
        } catch {
          setRouteStatus('error')
        }
      },
    )
  }, [
    endPoint,
    onBackendSyncStatusChange,
    onIntersectingLightsChange,
    onRouteStatsChange,
    setRouteStatus,
    startPoint,
  ])

  useEffect(() => {
    if (routeStatus !== 'ready') {
      return
    }

    const tick = () => {
      const animationContext = animationContextRef.current
      const absoluteSec = animationContext.active
        ? animationContext.simulationAbsoluteStartSec + animationContext.simulationTimeSec
        : currentSecondsSinceMidnight()

      updateTrafficLightColors(absoluteSec)
      signalAnimationFrameRef.current = requestAnimationFrame(tick)
    }

    tick()

    return () => {
      if (signalAnimationFrameRef.current !== null) {
        cancelAnimationFrame(signalAnimationFrameRef.current)
        signalAnimationFrameRef.current = null
      }
    }
  }, [routeStatus, startPoint, endPoint])

  useEffect(() => {
    const carPlacemark = carPlacemarkRef.current
    const routeCoordinates = routeCoordinatesRef.current
    const routeDistances = routeDistancesRef.current
    const routeTrafficLights = routeTrafficLightsRef.current

    if (!carPlacemark || !speedKmh || speedKmh <= 0 || routeCoordinates.length < 2) {
      return
    }

    if (routeStatus !== 'ready') {
      return
    }

    if (animationFrameRef.current !== null) {
      cancelAnimationFrame(animationFrameRef.current)
    }

    const totalDistance = routeDistances[routeDistances.length - 1]
    if (!totalDistance) {
      return
    }

    const shouldUseRecommendedPlan =
      recommendedSpeedKmh !== null &&
      recommendedStartSec !== null &&
      Math.abs(speedKmh - recommendedSpeedKmh) <= 0.6
    const simulationAbsoluteStartSec = shouldUseRecommendedPlan
      ? recommendedStartSec
      : currentSecondsSinceMidnight()
    const motionPlan = buildMotionPlan(
      totalDistance,
      routeTrafficLights,
      speedKmh,
      simulationAbsoluteStartSec,
    )

    const durationMs = Math.max(
      4_000,
      (motionPlan.totalDurationSec * 1000) / ANIMATION_ACCELERATION,
    )
    const startedAt = performance.now()

    animationContextRef.current = {
      active: true,
      simulationAbsoluteStartSec,
      simulationTimeSec: 0,
    }

    const animate = (timestamp: number) => {
      const elapsedMs = timestamp - startedAt
      const simulationTimeSec = Math.min(
        motionPlan.totalDurationSec,
        (elapsedMs / 1000) * ANIMATION_ACCELERATION,
      )
      const currentDistance = getDistanceForSimulationTime(motionPlan, simulationTimeSec)
      const currentCoordinate = getCoordinateAtDistance(
        routeCoordinates,
        routeDistances,
        currentDistance,
      )

      animationContextRef.current = {
        active: simulationTimeSec < motionPlan.totalDurationSec,
        simulationAbsoluteStartSec,
        simulationTimeSec,
      }

      if (currentCoordinate) {
        carPlacemark.geometry.setCoordinates(currentCoordinate)
      }

      if (elapsedMs < durationMs) {
        animationFrameRef.current = requestAnimationFrame(animate)
      } else {
        animationContextRef.current = {
          active: false,
          simulationAbsoluteStartSec,
          simulationTimeSec: motionPlan.totalDurationSec,
        }
        animationFrameRef.current = null
      }
    }

    animationFrameRef.current = requestAnimationFrame(animate)

    return () => {
      if (animationFrameRef.current !== null) {
        cancelAnimationFrame(animationFrameRef.current)
        animationFrameRef.current = null
      }

      animationContextRef.current = {
        active: false,
        simulationAbsoluteStartSec,
        simulationTimeSec: 0,
      }
    }
  }, [animationVersion, recommendedSpeedKmh, recommendedStartSec, routeStatus, speedKmh])

  return (
    <>
      <div className={styles.mapContainer} ref={mapRef} />
      {mapStatus !== 'ready' && (
        <div className={styles.mapStatus} role="status">
          {mapStatus === 'loading' ? 'Карта загружается...' : 'Не удалось загрузить карту'}
        </div>
      )}
    </>
  )
}

function GreenWavePage({ onBack }: GreenWavePageProps) {
  const [currentSpeed, setCurrentSpeed] = useState('')
  const [startPoint, setStartPoint] = useState<Coordinate | null>(null)
  const [endPoint, setEndPoint] = useState<Coordinate | null>(null)
  const [mapFocusPoint, setMapFocusPoint] = useState<Coordinate | null>(null)
  const [selectionMode, setSelectionMode] = useState<SelectionMode>('start')
  const [routeStatus, setRouteStatus] = useState<RouteStatus>('idle')
  const [routeStats, setRouteStats] = useState<RouteStats | null>(null)
  const [intersectingLights, setIntersectingLights] = useState<RouteTrafficLight[]>([])
  const [backendSyncStatus, setBackendSyncStatus] = useState<SyncStatus>('idle')
  const [recommendationStatus, setRecommendationStatus] = useState<RecommendationStatus>('idle')
  const [recommendation, setRecommendation] = useState<RecommendationResponse | null>(null)
  const [geolocationStatus, setGeolocationStatus] = useState<GeolocationStatus>('idle')
  const [geolocationAccuracyM, setGeolocationAccuracyM] = useState<number | null>(null)
  const [geolocationErrorMessage, setGeolocationErrorMessage] = useState<string | null>(null)
  const [animationVersion, setAnimationVersion] = useState(0)

  const speedKmh = currentSpeed ? Number(currentSpeed) : null
  const hasValidSpeed = speedKmh !== null && Number.isFinite(speedKmh) && speedKmh > 0
  const estimatedDurationSec =
    hasValidSpeed && routeStats ? routeStats.distanceM / (speedKmh / 3.6) : null
  const recommendedStartSec =
    recommendation && recommendationStatus === 'ready'
      ? (recommendation.calculated_at_sec + recommendation.departure_delay_sec) % 86_400
      : null

  useEffect(() => {
    if (!startPoint || !endPoint || routeStatus !== 'ready') {
      setRecommendation(null)
      setRecommendationStatus('idle')
      return
    }

    if (backendSyncStatus === 'idle' || backendSyncStatus === 'syncing') {
      setRecommendationStatus('loading')
      return
    }

    let cancelled = false
    setRecommendationStatus('loading')

    void fetchRecommendedSpeed(startPoint, endPoint)
      .then((response) => {
        if (cancelled) {
          return
        }

        setRecommendation(response)
        setRecommendationStatus('ready')
      })
      .catch(() => {
        if (cancelled) {
          return
        }

        setRecommendation(null)
        setRecommendationStatus('error')
      })

    return () => {
      cancelled = true
    }
  }, [backendSyncStatus, endPoint, routeStatus, startPoint])

  const handlePointSelect = (mode: Exclude<SelectionMode, null>, coordinates: Coordinate) => {
    if (mode === 'start') {
      setStartPoint(coordinates)
      setEndPoint(null)
      setSelectionMode('end')
      setRouteStatus('idle')
      setRouteStats(null)
      setIntersectingLights([])
      setRecommendation(null)
      setRecommendationStatus('idle')
      return
    }

    setEndPoint(coordinates)
    setSelectionMode(null)
  }

  const handleUseCurrentLocation = () => {
    if (!window.isSecureContext) {
      setGeolocationStatus('error')
      setGeolocationAccuracyM(null)
      setGeolocationErrorMessage(
        'Геолокация в браузере работает только через HTTPS или localhost. Если вы открыли сайт с телефона по http://IP:порт, телефон заблокирует местоположение.',
      )
      return
    }

    if (!navigator.geolocation) {
      setGeolocationStatus('unsupported')
      setGeolocationAccuracyM(null)
      setGeolocationErrorMessage(null)
      return
    }

    setGeolocationStatus('loading')
    setGeolocationAccuracyM(null)
    setGeolocationErrorMessage(null)

    let bestPosition: GeolocationPosition | null = null
    let settled = false
    let watchId: number | null = null
    let settleTimer: number | null = null

    const clearWatch = () => {
      if (watchId !== null) {
        navigator.geolocation.clearWatch(watchId)
        watchId = null
      }

      if (settleTimer !== null) {
        window.clearTimeout(settleTimer)
        settleTimer = null
      }
    }

    const applyBestPosition = () => {
      if (settled) {
        return
      }

      if (!bestPosition) {
        settled = true
        clearWatch()
        setGeolocationErrorMessage('Телефон не успел определить позицию. Попробуйте еще раз или включите GPS.')
        setGeolocationStatus('error')
        return
      }

      settled = true
      clearWatch()

      const { coords } = bestPosition
      const location = [coords.latitude, coords.longitude] satisfies Coordinate

      setMapFocusPoint(location)
      setStartPoint(location)
      setEndPoint(null)
      setSelectionMode('end')
      setRouteStatus('idle')
      setRouteStats(null)
      setIntersectingLights([])
      setRecommendation(null)
      setRecommendationStatus('idle')
      setBackendSyncStatus('idle')
      setGeolocationAccuracyM(coords.accuracy)
      setGeolocationErrorMessage(null)
      setGeolocationStatus('ready')
    }

    watchId = navigator.geolocation.watchPosition(
      (position) => {
        if (
          !bestPosition ||
          position.coords.accuracy < bestPosition.coords.accuracy
        ) {
          bestPosition = position
        }

        if (position.coords.accuracy <= 50) {
          applyBestPosition()
        }
      },
      (error) => {
        if (!bestPosition) {
          settled = true
          clearWatch()
          setGeolocationErrorMessage(getGeolocationErrorMessage(error))
          setGeolocationStatus('error')
        }
      },
      {
        enableHighAccuracy: true,
        maximumAge: 0,
        timeout: 12_000,
      },
    )

    settleTimer = window.setTimeout(applyBestPosition, 8_000)
  }

  const handleStartAnimation = () => {
    if (!hasValidSpeed || routeStatus !== 'ready') {
      return
    }

    setAnimationVersion((value) => value + 1)
  }

  return (
    <section className={styles.mapPage} aria-label="Зеленая волна">
      <aside className={styles.sidePanel} aria-label="Параметры маршрута">
        <button className={styles.backButton} onClick={onBack} type="button">
          Назад
        </button>

        <div className={styles.metricCard}>
          <span className={styles.metricLabel}>Построение маршрута</span>
          <p className={styles.helperText}>
            Выберите сначала точку A, затем точку B. После этого введите скорость и
            запустите анимацию движения автомобиля.
          </p>

          <div className={styles.routeActions}>
            <button
              className={selectionMode === 'start' ? styles.actionButtonActive : styles.actionButton}
              onClick={() => setSelectionMode('start')}
              type="button"
            >
              Выбрать точку A
            </button>

            <button
              className={selectionMode === 'end' ? styles.actionButtonActive : styles.actionButton}
              disabled={!startPoint}
              onClick={() => setSelectionMode('end')}
              type="button"
            >
              Выбрать точку B
            </button>

            <button
              className={`${styles.actionButton} ${styles.locationButton}`}
              disabled={geolocationStatus === 'loading'}
              onClick={handleUseCurrentLocation}
              type="button"
            >
              {geolocationStatus === 'loading' ? 'Ищем местоположение...' : 'Мое местоположение'}
            </button>
          </div>

          {geolocationStatus === 'ready' && (
            <p className={styles.helperText}>
              Точка A установлена по лучшей найденной позиции
              {geolocationAccuracyM !== null
                ? `. Точность: примерно ${Math.round(geolocationAccuracyM)} м${
                    geolocationAccuracyM > 500 ? ' (координаты могут быть неточными).' : '.'
                  }`
                : '.'}
            </p>
          )}
          {geolocationStatus === 'error' && (
            <p className={styles.helperText}>
              {geolocationErrorMessage ?? 'Не удалось получить местоположение. Проверьте доступ в браузере.'}
            </p>
          )}
          {geolocationStatus === 'unsupported' && (
            <p className={styles.helperText}>Браузер не поддерживает геолокацию.</p>
          )}

          <div className={styles.coordinateList}>
            <div>
              <span className={styles.coordinateLabel}>Точка A</span>
              <strong className={styles.coordinateValue}>{formatCoordinate(startPoint)}</strong>
            </div>

            <div>
              <span className={styles.coordinateLabel}>Точка B</span>
              <strong className={styles.coordinateValue}>{formatCoordinate(endPoint)}</strong>
            </div>
          </div>
        </div>

        <div className={styles.metricCard}>
          <span className={styles.metricLabel}>Рекомендуемая скорость</span>
          <strong className={styles.metricValue}>
            {recommendationStatus === 'ready' && recommendation
              ? `${Math.round(recommendation.recommended_speed_kmh)} км/ч`
              : recommendationStatus === 'loading'
                ? '...'
                : '--'}
          </strong>
          <p className={styles.helperText}>
            {recommendationStatus === 'ready' && recommendation
              ? `${translateAdvice(recommendation.advice)}. Ожидаемых остановок: ${recommendation.expected_stops_count}.`
              : recommendationStatus === 'loading'
                ? 'Запрашиваем расчет у backend...'
                : recommendationStatus === 'error'
                  ? 'Не удалось получить рекомендацию скорости.'
                  : 'Рекомендация появится после построения маршрута.'}
          </p>
        </div>

        <div className={styles.metricCard}>
          <span className={styles.metricLabel}>Текущая скорость</span>
          <label className={styles.speedField}>
            <input
              className={styles.speedInput}
              inputMode="numeric"
              min="1"
              onChange={(event) => setCurrentSpeed(event.target.value)}
              placeholder="Введите скорость"
              type="number"
              value={currentSpeed}
            />
            <span className={styles.speedUnit}>км/ч</span>
          </label>

          <button
            className={styles.animateButton}
            disabled={!hasValidSpeed || routeStatus !== 'ready'}
            onClick={handleStartAnimation}
            type="button"
          >
            Запустить анимацию
          </button>

          <p className={styles.helperText}>
            Анимация ускорена для демонстрации, но логика остановки на красный сохраняется.
          </p>
        </div>

        <div className={styles.metricCard}>
          <span className={styles.metricLabel}>Длина маршрута</span>
          <strong className={styles.metricValue}>
            {routeStats ? `${(routeStats.distanceM / 1000).toFixed(2)} км` : '--'}
          </strong>
        </div>

        <div className={styles.metricCard}>
          <span className={styles.metricLabel}>Время в пути</span>
          <strong className={styles.metricValue}>
            {estimatedDurationSec ? `${Math.ceil(estimatedDurationSec)} сек` : '--'}
          </strong>
          {recommendation && (
            <p className={styles.helperText}>
              Плановый старт через: {recommendation.departure_delay_sec} сек
            </p>
          )}
        </div>

        <div className={styles.metricCard}>
          <span className={styles.metricLabel}>Светофоры на маршруте</span>
          <strong className={styles.metricValueSmall}>{intersectingLights.length}</strong>
          {intersectingLights.length > 0 ? (
            <div className={styles.trafficLightList}>
              {intersectingLights.map((light) => (
                <div className={styles.trafficLightItem} key={light.id}>
                  <span className={styles.trafficLightName}>{light.name}</span>
                  <span className={styles.trafficLightDistance}>
                    {Math.round(light.distanceFromStartM)} м от старта
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <p className={styles.helperText}>На текущем маршруте светофоры из набора не найдены.</p>
          )}
        </div>

        <div className={styles.statusCard} aria-live="polite">
          <span className={styles.metricLabel}>Статус</span>
          <strong className={styles.statusValue}>
            {routeStatus === 'idle' && 'Выберите точки маршрута'}
            {routeStatus === 'building' && 'Маршрут строится...'}
            {routeStatus === 'ready' && 'Маршрут готов, можно запускать анимацию'}
            {routeStatus === 'error' && 'Не удалось построить маршрут'}
          </strong>
          <span className={styles.syncStatus}>
            {backendSyncStatus === 'idle' && 'Синхронизация с backend еще не запускалась'}
            {backendSyncStatus === 'syncing' && 'Светофоры отправляются в backend...'}
            {backendSyncStatus === 'synced' && 'Светофоры успешно отправлены в backend'}
            {backendSyncStatus === 'error' && 'Не удалось отправить светофоры в backend'}
          </span>
        </div>
      </aside>

      <section className={styles.mapArea} aria-label="Карта маршрута">
        <YandexMap
          animationVersion={animationVersion}
          endPoint={endPoint}
          focusPoint={mapFocusPoint}
          onBackendSyncStatusChange={setBackendSyncStatus}
          onIntersectingLightsChange={setIntersectingLights}
          onPointSelect={handlePointSelect}
          onRouteStatsChange={setRouteStats}
          recommendedSpeedKmh={recommendation?.recommended_speed_kmh ?? null}
          recommendedStartSec={recommendedStartSec}
          routeStatus={routeStatus}
          selectionMode={selectionMode}
          setRouteStatus={setRouteStatus}
          speedKmh={hasValidSpeed ? speedKmh : null}
          startPoint={startPoint}
        />
      </section>
    </section>
  )
}

export default GreenWavePage
