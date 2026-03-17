import { useState } from 'react'
import { askAi } from '../api'

export function AskAi() {
  const [question, setQuestion] = useState('')
  const [answer, setAnswer] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!question.trim()) return
    setError(null)
    setAnswer(null)
    setLoading(true)
    try {
      const result = await askAi(question.trim())
      setAnswer(result)
    } catch {
      setError('Failed to get answer. Is the API running on port 8000?')
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="form">
      <div className="field">
        <label htmlFor="question">Question</label>
        <textarea
          id="question"
          rows={3}
          placeholder="e.g. Why does low elevation increase flood risk?"
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
        />
      </div>
      <button type="submit" disabled={loading || !question.trim()}>
        {loading ? 'Asking…' : 'Ask'}
      </button>
      {error && <p className="error">{error}</p>}
      {answer && <div className="answer">{answer}</div>}
    </form>
  )
}
