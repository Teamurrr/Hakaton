import { useEffect, useMemo, useRef, useState } from 'react'

import { mergeStreetUpdates, parseTrafficMessage } from './trafficState'
import type { TrafficSocketState } from './types'

const DEFAULT_SOCKET_URL = 'ws://127.0.0.1:8001/ws'

export function useTrafficWebSocket(socketUrl = DEFAULT_SOCKET_URL): TrafficSocketState {
  const [state, setState] = useState<TrafficSocketState>({
    connectionStatus: 'connecting',
    streets: [],
  })
  const stableSocketUrl = useMemo(() => socketUrl.trim() || DEFAULT_SOCKET_URL, [socketUrl])
  const reconnectTimerRef = useRef<number | null>(null)

  useEffect(() => {
    let isDisposed = false
    let socket: WebSocket | null = null

    const clearReconnectTimer = () => {
      if (reconnectTimerRef.current !== null) {
        window.clearTimeout(reconnectTimerRef.current)
        reconnectTimerRef.current = null
      }
    }

    const connect = () => {
      if (isDisposed) {
        return
      }

      socket = new WebSocket(stableSocketUrl)

      setState((current) => ({
        ...current,
        connectionStatus: 'connecting',
        error: undefined,
      }))

      socket.addEventListener('open', () => {
        if (isDisposed) {
          return
        }

        setState((current) => ({
          ...current,
          connectionStatus: 'open',
          error: undefined,
        }))
      })

      socket.addEventListener('message', (event) => {
        if (isDisposed) {
          return
        }

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
        if (isDisposed) {
          return
        }

        setState((current) => ({
          ...current,
          connectionStatus: 'closed',
        }))

        clearReconnectTimer()
        reconnectTimerRef.current = window.setTimeout(connect, 1000)
      })

      socket.addEventListener('error', () => {
        if (isDisposed) {
          return
        }

        setState((current) => ({
          ...current,
          connectionStatus: 'error',
          error: 'WebSocket недоступен',
        }))
      })
    }

    connect()

    return () => {
      isDisposed = true
      clearReconnectTimer()

      if (socket && socket.readyState === WebSocket.OPEN) {
        socket.close()
      }
    }
  }, [stableSocketUrl])

  return state
}
