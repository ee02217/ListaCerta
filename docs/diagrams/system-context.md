# System Context Diagram

```mermaid
flowchart TB
  User((User)) --> Mobile
  User --> Admin
  Mobile --> ListaCertaAPI[ListaCerta API]
  Admin --> ListaCertaAPI
  ListaCertaAPI --> Postgres
  ListaCertaAPI --> OpenFoodFacts
  ListaCertaAPI --> MinIO
```
