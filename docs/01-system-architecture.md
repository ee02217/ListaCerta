# System Architecture

```mermaid
flowchart LR
  subgraph Clients
    Mobile[Mobile App\nExpo + TypeScript]
    Admin[Admin Portal\nNext.js App Router]
  end

  subgraph Shared
    SharedTypes[@listacerta/shared-types\nZod Schemas + TS Types]
  end

  subgraph Backend
    API[NestJS API\nREST + Zod Validation]
    DB[(PostgreSQL)]
  end

  subgraph Edge
    OFF[OpenFoodFacts API]
    MinIO[(MinIO S3 - optional)]
  end

  Mobile -->|HTTP/JSON| API
  Admin -->|HTTP/JSON| API

  Mobile -->|local-first storage| MobileSQLite[(SQLite local cache)]

  API --> DB
  API -->|cache-aside product fetch| OFF
  API -->|media/object storage| MinIO

  SharedTypes -. imported by .-> Mobile
  SharedTypes -. imported by .-> API
  SharedTypes -. imported by .-> Admin

  Compose[Docker Compose] -. orchestrates .-> API
  Compose -. orchestrates .-> DB
  Compose -. optional profiles .-> Admin
  Compose -. optional profiles .-> MinIO
```
