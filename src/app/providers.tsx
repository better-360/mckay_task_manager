'use client'

import { CopilotKit } from '@copilotkit/react-core'
import { SessionProvider } from 'next-auth/react'

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
       <CopilotKit runtimeUrl="/api/copilotkit">
      {children}
      </CopilotKit>
    </SessionProvider>
  )
} 