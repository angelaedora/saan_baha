import { useState } from 'react'
import { predictFlood } from '../api'

export function FloodPrediction() {
  const [lat, setLat] = useState(14.676)
  const [lon, setLon] = useState(121.0437)
  const [result, setResult] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setResult(null)
    setLoading(true)
    try {
      const data = await predictFlood(lat, lon)
      setResult(
        `Risk level: ${data.risk}\n` +
          `Probability: ${(data.probability * 100).toFixed(1)}%\n` +
          `Location: (${data.latitude.toFixed(6)}, ${data.longitude.toFixed(6)})`
      )
    } catch {
      setError('Failed to get prediction. Is the API running on port 8000?')
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="form">
      <div className="field">
        <label htmlFor="lat">Latitude</label>
        <input
          id="lat"
          type="number"
          step="any"
          value={lat}
          onChange={(e) => setLat(Number(e.target.value))}
        />
      </div>
      <div className="field">
        <label htmlFor="lon">Longitude</label>
        <input
          id="lon"
          type="number"
          step="any"
          value={lon}
          onChange={(e) => setLon(Number(e.target.value))}
        />
      </div>
      <button type="submit" disabled={loading}>
        {loading ? 'Predicting…' : 'Predict flood risk'}
      </button>
      {error && <p className="error">{error}</p>}
      {result && <pre className="result">{result}</pre>}
    </form>
  )
}
