from prometheus_client import Counter, Histogram

PREDICT_REQUESTS = Counter("predict_requests_total", "Total flood prediction requests")
PREDICT_LATENCY = Histogram("predict_latency_seconds", "Flood prediction request latency")
