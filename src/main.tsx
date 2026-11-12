import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import './index.css'

// Request persistent storage on first launch so IndexedDB is not evicted
if (navigator.storage?.persist) {
  navigator.storage.persist()
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
)

