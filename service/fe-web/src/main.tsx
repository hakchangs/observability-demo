import './instrumentation/otel-traces.ts';
// import './instrumentation/otel-logs.ts'
// import './instrumentation/otel-console.ts'
import './instrumentation/otel-loglevel.ts'
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
