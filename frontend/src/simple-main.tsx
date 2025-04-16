import React from 'react'
import { createRoot } from 'react-dom/client'
import SimpleApp from './SimpleApp'

// Find the root element
const rootElement = document.getElementById('root')

// Log for debugging
console.log('Root element:', rootElement)

// Create and render the app
if (rootElement) {
  const root = createRoot(rootElement)
  
  try {
    console.log('Rendering SimpleApp...')
    root.render(
      <React.StrictMode>
        <SimpleApp />
      </React.StrictMode>
    )
    console.log('SimpleApp rendered successfully')
  } catch (error) {
    console.error('Error rendering SimpleApp:', error)
    
    // Display error on the page
    rootElement.innerHTML = `
      <div style="color: red; padding: 20px; border: 1px solid #ffcccc; margin: 20px; background-color: #fff8f8;">
        <h2>Error Rendering React App</h2>
        <p>${error instanceof Error ? error.message : String(error)}</p>
        <p>Check the browser console for more details.</p>
      </div>
    `
  }
} else {
  console.error('Root element not found')
}
