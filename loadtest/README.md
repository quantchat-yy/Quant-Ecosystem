# Load Testing

Performance and reliability testing for the Quant Ecosystem using [k6](https://k6.io/).

## Prerequisites

Install k6:

```bash
# macOS
brew install k6

# Linux (Debian/Ubuntu)
sudo gpg -k
sudo gpg --no-default-keyring --keyring /usr/share/keyrings/k6-archive-keyring.gpg --keyserver hkp://keyserver.ubuntu.com:80 --recv-keys C5AD17C747E3415A3642D57D77C6C491D6AC1D68
echo "deb [signed-by=/usr/share/keyrings/k6-archive-keyring.gpg] https://dl.k6.io/deb stable main" | sudo tee /etc/apt/sources.list.d/k6.list
sudo apt-get update && sudo apt-get install k6

# Docker
docker pull grafana/k6
```

## Running Tests

### Smoke Test

Quick verification that all critical endpoints are responding:

```bash
k6 run k6/scenarios/smoke.js
```

### Load Test

Simulates typical production load (50 VUs over 5 minutes):

```bash
k6 run k6/scenarios/load.js
```

### Stress Test

Pushes the system to find breaking points (ramps to 200 VUs):

```bash
k6 run k6/scenarios/stress.js
```

### With Custom Base URL

```bash
k6 run -e BASE_URL=https://staging.quant.dev k6/scenarios/load.js
```

### With Custom JWT Secret

```bash
k6 run -e JWT_SECRET=my-secret -e BASE_URL=http://localhost:3000 k6/scenarios/load.js
```

## Interpreting Results

k6 outputs metrics at the end of each run:

| Metric              | Description                                  |
| ------------------- | -------------------------------------------- |
| `http_req_duration` | Time from request start to response received |
| `http_req_failed`   | Rate of failed requests (non-2xx)            |
| `http_reqs`         | Total request count and rate                 |
| `iterations`        | Completed VU iterations                      |
| `checks`            | Pass/fail rate for assertions                |

Look for:

- **p(95)** and **p(99)** values in `http_req_duration` to assess latency
- **http_req_failed rate** to assess reliability
- **http_reqs rate** to assess throughput

## SLO Targets

Defined in `slo.json`:

| SLO          | Target       |
| ------------ | ------------ |
| Latency p95  | < 200ms      |
| Latency p99  | < 500ms      |
| Error Rate   | < 0.1%       |
| Throughput   | > 1000 req/s |
| Availability | 99.9%        |

## Environment Variables

| Variable     | Default                               | Description                           |
| ------------ | ------------------------------------- | ------------------------------------- |
| `BASE_URL`   | `http://localhost:3000`               | Base URL of the application           |
| `JWT_SECRET` | `dev-only-change-me-in-production!!!` | Secret for generating test JWT tokens |

## Directory Structure

```
loadtest/
  k6/
    helpers/
      auth.js      - JWT token generation for authenticated requests
      config.js    - Shared configuration (URLs, headers, thresholds)
    scenarios/
      smoke.js     - Quick health check (1 VU, 10 iterations)
      load.js      - Normal load simulation (50 VUs, 5 min)
      stress.js    - Stress/breaking point test (200 VUs, 6 min)
  slo.json         - SLO target definitions
  README.md        - This file
```
