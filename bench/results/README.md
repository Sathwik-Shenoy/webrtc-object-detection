# Benchmark Results

This directory contains the output from benchmark runs.

## Files

- `metrics.json` - Latest benchmark results
- `metrics-YYYY-MM-DDTHH-mm-ss.json` - Timestamped benchmark results

## Metrics Structure

```json
{
  "timestamp": "2024-01-01T12:00:00.000Z",
  "duration": 30.0,
  "mode": "wasm",
  "frames": {
    "total": 450,
    "processed": 445,
    "dropped": 5
  },
  "fps": {
    "processed": 14.8,
    "target": 15.0
  },
  "latency": {
    "e2e": {
      "median": 180,
      "p95": 320,
      "min": 120,
      "max": 450,
      "avg": 195
    },
    "server": {
      "median": 80,
      "p95": 150
    },
    "network": {
      "median": 100,
      "p95": 180
    }
  },
  "bandwidth": {
    "uplink_kbps": 1200,
    "downlink_kbps": 120
  },
  "detections": {
    "total": 892,
    "average": 2.0
  }
}
```

## Running Benchmarks

```bash
# Standard 30-second benchmark
../run_bench.sh

# Custom duration
../run_bench.sh --duration 60

# Server mode
../run_bench.sh --mode server

# Custom output file
../run_bench.sh --output my-benchmark.json
```

## Analyzing Results

```bash
# Pretty print JSON
cat metrics.json | jq

# Extract key metrics
jq '.latency.e2e.median' metrics.json
jq '.fps.processed' metrics.json

# Compare benchmarks
diff metrics-old.json metrics-new.json
```
