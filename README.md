# Package.AI - Offline-First Mobile App

A React Native mobile application built with Expo that demonstrates an offline-first architecture for delivery drivers. The app allows drivers to manage packages (small requests and large requests with images) even when offline, with automatic synchronization when connectivity is restored.
The base methodology here is local-first with a sync layer on top.
Treat the local data as the API and the API as a backup.

## How to Run

### Prerequisites

- Node.js (v18 or higher)
- npm or yarn
- Expo CLI (`npm install -g expo-cli`)
- iOS Simulator (for Mac) or Android Emulator

### Setup

1. **Install dependencies:**

   ```bash
   npm install
   ```

2. **Start the Expo app:**
   ```bash
   npm start
   ```
   Then press `i` for iOS Simulator, `a` for Android Emulator, or scan the QR code with Expo Go.

## Approach to Handling Offline Actions and Retries

### Optimistic UI Pattern

When a driver creates a package:

1. Package is written to local SQLite database immediately (via Drizzle ORM)
2. UI shows green checkmark instantly (no loading spinner)
3. Mutation is queued for background sync
4. When online, mutation is sent to backend
5. Package status updates to "synced" when server confirms

### Mutation Queue (FIFO)

- **Small packages** are processed before **large packages** (priority queue)
- Mutations are processed in order (First In, First Out)
- **Retry logic**: Failed mutations retry up to 3 times with exponential backoff (1s, 2s, 4s)
- All mutations persist to database, so queue survives app restarts

### Image Upload Independence

- JSON data (package status) syncs immediately via mutation queue
- Image files are queued separately for background upload
- Images don't block user actions or JSON sync
- Failed image uploads retry independently from JSON mutations

### Network State Management

- Uses NetInfo to monitor connection status
- Automatically triggers sync when network returns
- Periodic sync every 30 seconds when online
- UI displays online/offline status and pending queue counts

### Delta Sync

- Pulls only changes since last sync (sends `last_pulled_at` timestamp)
- Avoids downloading entire database on each sync
- Efficient data transfer for rural/low-bandwidth scenarios

## Trade-offs & Simplifications

1. **Retry Strategy**: Fixed 3 retries with exponential backoff instead of infinite retries. In production, would implement infinite retries with circuit breaker pattern.

2. **Conflict Resolution**: Last-write-wins strategy. In production, would implement CRDTs or vector clocks for proper conflict resolution.

3. **Reactive Queries**: Uses polling (every 2 seconds) instead of reactive observables. Chose Drizzle ORM over WatermelonDB for better TypeScript support, simpler API, and full control over sync behavior.

4. **Mock Server**: Simple Express server for testing instead of real backend integration. Includes simulated failures (30% failure rate) to test retry logic.

5. **Schema Migrations**: Basic automatic table creation on first run. In production, would use Drizzle Kit for versioned migrations.

6. **Multi-user Support**: Not implemented. Production would require user isolation, permissions, and multi-device sync.

7. **Image Uploads**: No chunked uploads for very large files. Would be needed in production for better reliability.
