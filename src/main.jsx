import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import App from './App.jsx'
import { ReferralProvider } from './context/ReferralContext.jsx'
import './index.css'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <ReferralProvider>
        <App />
      </ReferralProvider>
    </BrowserRouter>
  </React.StrictMode>,
)
