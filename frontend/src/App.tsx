import { useState } from 'react'
import { FloodPrediction } from './components/FloodPrediction'
import { AskAi } from './components/AskAi'
import './App.css'

function App() {
  const [activeTab, setActiveTab] = useState<'predict' | 'ask'>('predict')

  return (
    <div className="app">
      <header className="header">
        <h1>AI Flood Intelligence System</h1>
      </header>
      <nav className="tabs">
        <button
          className={activeTab === 'predict' ? 'active' : ''}
          onClick={() => setActiveTab('predict')}
        >
          Flood Prediction
        </button>
        <button
          className={activeTab === 'ask' ? 'active' : ''}
          onClick={() => setActiveTab('ask')}
        >
          Ask AI
        </button>
      </nav>
      <main className="content">
        {activeTab === 'predict' && <FloodPrediction />}
        {activeTab === 'ask' && <AskAi />}
      </main>
    </div>
  )
}

export default App
