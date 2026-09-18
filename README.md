## Libro
A multi-library platform for students to search and rent books, reserve study rooms, and view library availability.

## Tech stack

| Area | Technology |
| --- | --- |
| Frontend | Next.js, React, TypeScript, Tailwind CSS |
| Backend | FastAPI, Python |
| Data | Google Books API|
| Auth and Database | PostgreSQL, Supabase |
| AI | TBD |
| DevOps | Docker Compose, GitHub Actions|
| Deployment | TBD |
| Testing| TBD |

## System Design
```mermaid
flowchart LR
    A["Next.js + React<br/>Frontend"]
    B["FastAPI + Python<br/>Backend API"]
    C["Supabase Auth<br/>User login and roles"]
    D[("PostgreSQL<br/>Users, books, rooms,<br/>reservations")]
    E["Google Books API<br/>Titles, authors, ISBNs,<br/>cover images"]

    A -->|"REST API requests"| B
    B -->|"Verify users"| C
    B -->|"Read and save data"| D
    E -->|"Book metadata"| B

    classDef frontend fill:#1f6feb,color:#ffffff,stroke:#58a6ff,stroke-width:2px;
    classDef backend fill:#238636,color:#ffffff,stroke:#3fb950,stroke-width:2px;
    classDef auth fill:#7c3aed,color:#ffffff,stroke:#a78bfa,stroke-width:2px;
    classDef database fill:#0f766e,color:#ffffff,stroke:#2dd4bf,stroke-width:2px;
    classDef external fill:#b45309,color:#ffffff,stroke:#fbbf24,stroke-width:2px;

    class A frontend;
    class B backend;
    class C auth;
    class D database;
    class E external;
```

## Team
- Emanuel Mora
- Jaden Morales
- Simon Salazar-Marin
- Tanner Slaughter
