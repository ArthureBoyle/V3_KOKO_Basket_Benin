import '@fontsource-variable/geist'
import '@fontsource-variable/geist-mono'
import './styles/index.css'

import { QueryClientProvider } from '@tanstack/react-query'
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { RouterProvider } from 'react-router'
import { queryClient } from './lib/queryClient'
import { router } from './routes/router'

const racine = document.getElementById('root')
if (!racine) throw new Error('Element #root introuvable dans index.html')

createRoot(racine).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
    </QueryClientProvider>
  </StrictMode>,
)
