import { useEffect, useMemo, useState } from 'react'

import { mergeStreetUpdates, parseTrafficMessage } from './trafficState'
import type { TrafficSocketState } from './types'

const DEFAULT_SOCKET_URL = 'ws://127.0.0.1:8001/ws'

export function useTrafficWebSocket(socketUrl = DEFAULT_SOCKET_URL): TrafficSocketState {
  const [state, setState] = useState<TrafficSocketState>({
    connectionStatus: 'connecting',
    streets: [],
  })

  const stableSocketUrl = useMemo(() => socketUrl.trim() || DEFAULT_SOCKET_URL, [socketUrl])

  useEffect(() => {
    const socket = new WebSocket(stableSocketUrl)

    setState((current) => ({
      ...current,
      connectionStatus: 'connecting',
      error: undefined,
    }))

    socket.addEventListener('open', () => {
      setState((current) => ({
        ...current,
        connectionStatus: 'open',
        error: undefined,
      }))
    })

    socket.addEventListener('message', (event) => {
      try {
        const updates = parseTrafficMessage(String(event.data))

        setState((current) => ({
          ...current,
          streets: mergeStreetUpdates(current.streets, updates),
          lastMessageAt: new Date().toISOString(),
          error: undefined,
        }))
      } catch {
        setState((current) => ({
          ...current,
          error: 'Не удалось прочитать JSON из WebSocket',
        }))
      }
    })

    socket.addEventListener('close', () => {
      setState((current) => ({
        ...current,
        connectionStatus: 'closed',
      }))
    })

    socket.addEventListener('error', () => {
      setState((current) => ({
        ...current,
        connectionStatus: 'error',
        error: 'WebSocket недоступен',
      }))
    })

    return () => {
      socket.close()
    }
  }, [stableSocketUrl])

  return state
}
