# API Usage

## Health
`GET /health`

## Predict flood
`POST /predict_flood`

Payload:
```json
{
  "latitude": 14.6760,
  "longitude": 121.0437
}
```

## Ask AI
`POST /ask_ai`

Payload:
```json
{
  "question": "Why does low elevation increase flood risk?"
}
```
