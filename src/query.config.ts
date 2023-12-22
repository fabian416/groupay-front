// query.config.ts
import { QueryClient } from 'react-query'

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      staleTime: 600000, // 10 minutes before consider "stale"
    },
  },
})
