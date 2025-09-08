# Sesami Appointment Management Service

A high-performance appointment management service built with NestJS, Fastify, and PostgreSQL, designed to handle concurrent appointment requests with conflict resolution and historical data tracking.

## Features

- **Appointment Management**: Create, update, and retrieve appointments
- **Conflict Prevention**: Automatic detection and prevention of overlapping appointments
- **Organization Support**: Multi-tenant support with organization-level isolation
- **Historical Tracking**: Complete version history for all appointment changes
- **Concurrency Safe**: Handles multiple concurrent requests correctly
- **Data Validation**: Comprehensive input validation and error handling

## Architecture

### Project Structure

```
src/
├── main.ts                    # Application bootstrap
├── api/                       # API modules
│   ├── index.ts              # API exports
│   └── appointments/         # Appointments module
│       ├── appointments.controller.ts
│       ├── appointments.service.ts
│       ├── appointments.module.ts
│       ├── dto/              # Data Transfer Objects
│       └── entities/         # Database entities
├── shared/                   # Shared utilities
│   ├── constants/           # Application constants
│   ├── types/              # TypeScript types
│   └── utils/              # Utility functions
└── migrations/             # Database migrations
```

### Database Design

The service uses two main tables:

1. **`appointments`**: Current state of all appointments
   - Primary key: UUID
   - Unique constraint: `(orgId, externalId)`
   - Exclusion constraint: Prevents overlapping appointments within the same organization

2. **`appointment_versions`**: Complete historical record of all changes
   - Links to appointments table
   - Stores version number and all appointment data
   - Timestamp of when the change was received

### Key Features

- **Latest-Wins Strategy**: When the same appointment ID is received multiple times, the latest `updatedAt` timestamp wins. If `updatedAt` equals the current record, the update is ignored (idempotent tie-break).
- **Stale Update Detection**: Older updates are ignored to prevent data corruption
- **Pessimistic Locking**: Uses database-level locking to ensure data consistency
- **Exclusion Constraints**: Database-level prevention of overlapping appointments using a half-open interval model `[start, end)`, allowing adjacency (`end == start`).

## API Documentation

Interactive API documentation is available at `/api/docs` when the server is running. The Swagger UI provides:

- Complete API endpoint documentation
- Request/response schemas
- Interactive testing interface
- Example requests and responses
- Error response documentation

## API Endpoints

### POST /api/appointments

Creates or updates an appointment.

**Request Body:**
```json
{
  "id": "string",
  "start": "2020-10-10 20:20",
  "end": "2020-10-10 20:30",
  "createdAt": "2020-09-02 14:23:12",
  "updatedAt": "2020-09-28 14:23:12",
  "orgId": "optional-org-id"
}
```

**Response:**
```json
{
  "status": "ok" | "ignored-stale"
}
```

**Error Responses:**
- `400 Bad Request`: Invalid data format or validation errors
- `409 Conflict`: Time range overlaps with existing appointment

### GET /api/appointments

Retrieves appointments.

**Query Parameters:**
- `org` (optional): Organization ID (defaults to "default")
- `at` (optional): ISO timestamp to find appointments at a specific time. If omitted, returns the current state (latest active versions).

**Response:**
```json
[
  {
    "id": "uuid",
    "orgId": "string",
    "externalId": "string",
    "start": "2020-10-10T20:20:00.000Z",
    "end": "2020-10-10T20:30:00.000Z",
    "payloadCreatedAt": "2020-09-02T14:23:12.000Z",
    "payloadUpdatedAt": "2020-09-28T14:23:12.000Z",
    "version": 1
  }
]
```

## Setup Instructions

### Prerequisites

- Node.js 18+ 
- PostgreSQL 12+
- Docker (optional, for database)

### Installation

1. **Clone the repository:**
   ```bash
   git clone <repository-url>
   cd sesami
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Set up the database:**
   
   **Option A: Using Docker (Recommended)**
   ```bash
   docker-compose up -d
   ```
   
   **Option B: Local PostgreSQL**
   - Create a database named `sesami`
   - Update connection details in environment variables

4. **Environment Configuration:**
   
   Copy the sample environment file:
   ```bash
   cp sample.env .env
   ```
   
   Update `.env` with your database configuration:
   ```env
   DATABASE_URL=postgres://postgres:123@localhost:5432/sesami
   PORT=3000
   ```

5. **Run database migrations:**
   ```bash
   npm run migration:up
   ```

6. **Start the application:**
   ```bash
   # Development
   npm run start:dev
   
   # Production
   npm run build
   npm run start:prod
   ```

The service will be available at `http://localhost:3000`

**API Documentation**: Visit `http://localhost:3000/api/docs` for interactive Swagger documentation

## Design Decisions

- Latest-write-wins (LWW) on `updatedAt`; equal timestamps are considered stale and ignored.
- Overlap checks run only against the latest active versions. Historical records are for auditing only.
- Time intervals are half-open `[start, end)`, so adjacency (`end == start`) is allowed.
- `createdAt`/`updatedAt` are payload metadata; `updatedAt` is only used for LWW conflict resolution, not time-range validation.

## Testing

### Running Tests

```bash
# Unit tests
npm run test

# E2E tests
npm run test:e2e

# Test coverage
npm run test:cov
```

### Load Testing

Use the provided bash script to test concurrent requests:

```bash
chmod +x load-test.sh
./load-test.sh 100  # Test with 100 concurrent requests
```

## Development

### Database Migrations

```bash
# Create a new migration
npm run migration:create

# Run migrations
npm run migration:up

# Rollback migrations
npm run migration:down
```

### Code Quality

```bash
# Linting
npm run lint

# Formatting
npm run format
```

## Production Considerations

### Performance

- **Fastify Framework**: 2-3x faster than Express for JSON-heavy APIs
- Uses PostgreSQL exclusion constraints for efficient overlap detection
- Pessimistic locking ensures data consistency under high concurrency
- Indexed queries for fast appointment lookups
- Optimized JSON parsing and serialization

### Monitoring

- Structured logging for all operations
- Error tracking for failed requests
- Database query performance monitoring

### Scaling

- Stateless service design allows horizontal scaling
- Database connection pooling for high throughput
- Consider read replicas for GET operations

## Error Handling

The service provides comprehensive error handling:

- **Validation Errors**: Invalid date formats, logical inconsistencies
- **Conflict Errors**: Overlapping appointment times
- **Database Errors**: Connection issues, constraint violations
- **Concurrency Errors**: Handled through database locking

## License

This project is licensed under the UNLICENSED license.
