const API_BASE = '/api';

export interface PredictResponse {
  latitude: number;
  longitude: number;
  risk: string;
  probability: number;
  features: number[];
}

export interface AskResponse {
  answer: string;
}

export async function predictFlood(latitude: number, longitude: number): Promise<PredictResponse> {
  const res = await fetch(`${API_BASE}/predict_flood`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ latitude, longitude }),
  });
  if (!res.ok) throw new Error('Prediction failed');
  return res.json();
}

export async function askAi(question: string): Promise<string> {
  const res = await fetch(`${API_BASE}/ask_ai`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ question }),
  });
  if (!res.ok) throw new Error('Ask AI failed');
  const data: AskResponse = await res.json();
  return data.answer;
}
