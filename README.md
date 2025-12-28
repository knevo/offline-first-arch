# Package.AI - Offline-First Mobile App

This is a React Native mobile application built with Expo that demonstrates an offline-first architecture for delivery drivers. The app allows drivers to perform actions (small requests and large requests with images) even when offline, with automatic synchronization when connectivity is restored.

## Overview

Package.AI provides delivery drivers with a mobile app to manage their daily routes. This implementation solves the problem of poor cellular reception in rural areas by making the app **offline-first**:

> **Note**: This project was recently migrated from WatermelonDB to Drizzle ORM for improved TypeScript support, simpler API, and better developer experience. See `MIGRATION_NOTES.md` for details.

- **Optimistic UI**: Actions appear to complete instantly (green checkmark) even when offline
- **Background Sync**: Network requests happen silently in the background
- **Priority Queue**: Small requests sync before large requests
- **Persistence**: All pending actions persist between app restarts
- **Delta Sync**: Only pulls changes since last sync (efficient data transfer)

## Architecture

### Core Components

```
┌─────────────┐
│     UI      │
│  (React)    │
└──────┬──────┘
       │ Optimistic writes
       ▼
┌─────────────┐
│ Drizzle ORM │
│  (SQLite)    │
└──────┬──────┘
       │
       ├──► Actions (user data)
       ├──► Mutations (sync queue)
       ├──► ImageUploads (file queue)
       └──► SyncMetadata (timestamps)
       │
       ▼
┌─────────────┐
│ Sync Engine │
└──────┬──────┘
       │
       ├──► Delta Sync (pull changes)
       ├──► Mutation Queue (push JSON - FIFO)
       └──► Image Upload (push files - independent)
       │
       ▼
┌─────────────┐
│  Mock API   │
│   Server    │
└─────────────┘
```

### Key Technologies

- **Drizzle ORM**: Modern TypeScript ORM with SQLite backend for reliable local persistence
- **expo-sqlite**: Native SQLite support for Expo with full SQL capabilities
- **Expo**: React Native framework with built-in camera and file system support
- **NetInfo**: Network state monitoring
- **Axios**: HTTP client for API requests

## Setup Instructions

### Prerequisites

- Node.js (v18 or higher)
- npm or yarn
- Expo CLI (`npm install -g expo-cli`)
- iOS Simulator (for Mac) or Android Emulator

### 1. Install Dependencies

```bash
# Install app dependencies
npm install

# Install server dependencies
cd server
npm install
cd ..
```

### 2. Start the Mock API Server

In a separate terminal:

```bash
cd server
npm start
```

The server will start on `http://localhost:3000` and display available endpoints.

### 3. Start the Expo App

```bash
npm start
```

Then:

- Press `i` for iOS Simulator
- Press `a` for Android Emulator
- Scan QR code with Expo Go app on your device

## How It Works

### Optimistic UI Pattern

When a driver performs an action:

1. **Instant Write**: Action is written to local Drizzle/SQLite database immediately
2. **UI Update**: Green checkmark appears instantly (no loading spinner)
3. **Background Sync**: Mutation is created and queued for sync
4. **Network Sync**: When online, mutation is sent to backend
5. **Status Update**: Action is marked as "synced" when server confirms

### Delta Sync (Pull Changes)

The app uses **delta sync** to efficiently pull changes from the server:

1. Sends `last_pulled_at` timestamp to `/api/sync/pull`
2. Server returns only records created/modified after that timestamp
3. Local database is updated with new/changed records
4. `last_pulled_at` is updated for next sync

This avoids downloading the entire database on each sync.

### FIFO Mutation Queue (Push Changes)

User actions create **mutations** that are queued for sync:

1. **Small Actions**: Create mutations with type `create_small_action`
2. **Large Actions**: Create mutations with type `create_large_action`
3. **FIFO Processing**: Mutations are processed in order (First In, First Out)
4. **Retry Logic**: Failed mutations retry up to 3 times with exponential backoff (1s, 2s, 4s)
5. **Priority**: Small mutations are processed before large mutations

### Image Upload Independence

Images are handled separately from JSON data:

1. **JSON Data**: Action status syncs immediately (high priority)
2. **Image File**: Queued independently for background upload
3. **Progress Tracking**: Upload progress is tracked and displayed
4. **Retry Logic**: Failed uploads retry independently from JSON mutations
5. **User Experience**: Driver can continue working while images upload

### Network State Management

- **Online Detection**: Uses NetInfo to monitor connection status
- **Auto-Sync**: Automatically triggers sync when network returns
- **Periodic Sync**: Syncs every 30 seconds when online
- **Status Display**: Shows online/offline status and pending queue counts

## Testing Offline Behavior

### Simulating Offline Mode

1. **iOS Simulator**:
   - Settings → Airplane Mode (or use Network Link Conditioner)
2. **Android Emulator**:
   - Settings → Network & Internet → Airplane Mode
3. **Physical Device**:
   - Enable Airplane Mode in device settings

### Test Flow

1. **Start with Network Online**:

   - Press "Small Request" → Should sync immediately
   - Press "Large Request with Image" → Takes photo, syncs JSON, uploads image

2. **Enable Airplane Mode**:

   - Press "Small Request" → Appears instantly with "Pending" status
   - Press "Large Request with Image" → Takes photo, appears instantly, both queued

3. **Check Queue Status**:

   - View "Queue Status" card showing pending mutations and images

4. **Disable Airplane Mode**:

   - Watch auto-sync trigger
   - See pending counts decrease
   - See actions change from "Pending" to "Synced"

5. **Restart App**:
   - Actions persist in database
   - Queue is restored
   - Sync continues automatically

## API Endpoints

The mock server provides:

- `POST /api/actions/small` - Small action (500ms delay, always succeeds)
- `POST /api/actions/large` - Large action (2s delay, 30% failure rate)
- `POST /api/sync/pull` - Delta sync (accepts `last_pulled_at`, returns delta)
- `POST /api/images/upload` - Image upload (multipart/form-data, 30% failure rate)
- `GET /api/actions` - List all synced actions (for verification)
- `GET /health` - Health check

## Trade-offs & Design Decisions

### 1. Drizzle ORM vs WatermelonDB vs Realm

**Chosen: Drizzle ORM**

- **Pros**: Modern TypeScript-first ORM, excellent type safety, simpler API, smaller bundle size, active development
- **Cons**: No built-in reactive queries (uses polling instead), newer ecosystem
- **Rationale**: Better TypeScript support, cleaner code, easier to maintain, and full control over sync behavior. The polling approach (every 2 seconds) is sufficient for this use case and simpler than reactive observables.

### 2. Retry Strategy

**Chosen: Fixed 3 retries with exponential backoff**

- **Pros**: Prevents infinite retry loops, predictable behavior
- **Cons**: Some mutations may fail permanently after 3 retries
- **Production**: Would implement infinite retries with circuit breaker pattern

### 3. Image Upload Independence

**Chosen: Separate queue for images**

- **Pros**: JSON data syncs immediately, images don't block user actions
- **Cons**: More complex state management
- **Production**: Would add chunked uploads for very large files

### 4. Conflict Resolution

**Chosen: Last-write-wins**

- **Pros**: Simple, predictable
- **Cons**: May lose data in concurrent edit scenarios
- **Production**: Would implement CRDTs or vector clocks for proper conflict resolution

### 5. Mock Server vs Real Backend

**Chosen: Simple Express mock server**

- **Pros**: Easy to test, no backend setup required
- **Cons**: Doesn't demonstrate real-world complexity
- **Production**: Would integrate with real Package.AI backend API

### 6. Schema Migrations

**Implemented: Basic migration system**

- Automatic table creation on first run via `migrations.ts`
- **Production**: Would use Drizzle Kit for versioned migrations and schema evolution

### 7. Multi-user Support

**Not Implemented**

- **Production**: Would add user isolation, permissions, and multi-device sync

## Code Structure

```
├── app/
│   ├── (tabs)/
│   │   └── index.tsx          # Main UI screen
│   └── _layout.tsx            # Root layout with DB init
├── database/
│   ├── drizzle/
│   │   ├── schema.ts           # Drizzle schema definitions
│   │   ├── client.ts           # Database client initialization
│   │   └── migrations.ts       # Database migration runner
│   └── index.ts                # Database exports
├── contexts/
│   ├── DatabaseContext.tsx     # Database provider and hooks
│   └── SyncContext.tsx         # Sync state management
├── services/
│   ├── ActionService.ts        # Business logic
│   └── sync/
│       ├── DeltaSyncService.ts      # Pull sync
│       ├── MutationQueueService.ts  # Push sync (FIFO)
│       ├── ImageUploadService.ts    # Image uploads
│       └── SyncOrchestrator.ts      # Sync coordination
├── server/
│   ├── index.js                # Mock API server
│   └── package.json
└── README.md                   # This file
```

## Evaluation Criteria Addressed

✅ **Correctness and clarity of offline-first logic**

- Optimistic UI with instant feedback
- Proper queue management with FIFO processing
- Priority handling (small before large)
- Retry logic with exponential backoff

✅ **Code structure and readability**

- Clear separation of concerns (database, services, UI)
- TypeScript for type safety
- Well-documented code

✅ **Simplicity and maintainability**

- Uses modern TypeScript patterns (Drizzle ORM, type-safe queries)
- Modular architecture
- Easy to extend
- Clean, readable code without decorators

✅ **Handling of persistence and sync logic**

- Drizzle ORM with SQLite for reliable persistence
- Delta sync for efficiency
- Mutation queue with retry logic
- Image upload independence
- Polling-based UI updates (every 2 seconds) for real-time feel

## Future Enhancements

- [ ] Infinite retry with circuit breaker
- [ ] Chunked image uploads for large files
- [ ] Conflict resolution with CRDTs
- [ ] Schema migrations
- [ ] Multi-user support
- [ ] Real backend integration
- [ ] Push notifications for sync status
- [ ] Offline queue size limits
- [ ] Compression before image upload

## License

This is a home assignment project for Package.AI.
