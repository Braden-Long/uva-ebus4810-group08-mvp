import { useState } from 'react'

const SLOW_THRESHOLD = 2000 // 2 seconds

export function useSlowLoading() {
  const [showSlowLoading, setShowSlowLoading] = useState(false)

  const withSlowLoading = async <T,>(apiCall: Promise<T>): Promise<T> => {
    let timeoutId: number | undefined

    // Set timeout to show loading indicator after 2 seconds
    timeoutId = window.setTimeout(() => {
      setShowSlowLoading(true)
    }, SLOW_THRESHOLD)

    try {
      const result = await apiCall
      return result
    } finally {
      // Clear timeout and hide loading indicator
      if (timeoutId !== undefined) {
        clearTimeout(timeoutId)
      }
      setShowSlowLoading(false)
    }
  }

  return { showSlowLoading, withSlowLoading }
}
