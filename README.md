# EventSphere Backend Architecture

Complete backend service-layer architecture for EventSphere hackathon MVP.

## 📁 Folder Structure

```
src/
├── firebase/              # Firebase configuration and initialization
│   ├── config.ts         # Firebase app, auth, and Firestore setup
│   └── index.ts          # Central exports
│
├── services/             # Business logic layer (all backend operations)
│   ├── auth/             # Authentication service
│   │   └── authService.ts
│   ├── event/            # Event management service
│   │   └── eventService.ts
│   ├── ticket/           # Ticket management service
│   │   └── ticketService.ts
│   ├── qr/               # QR code service
│   │   └── qrService.ts
│   ├── ai/               # Gemini AI service
│   │   └── aiService.ts
│   └── index.ts          # Central exports
│
├── types/                # TypeScript type definitions
│   ├── user.ts           # User types
│   ├── event.ts          # Event types
│   ├── ticket.ts         # Ticket types
│   └── index.ts          # Central exports
│
├── utils/                # Utility/helper functions
│   ├── dateUtils.ts      # Date formatting and manipulation
│   ├── validationUtils.ts # Input validation
│   ├── errorUtils.ts     # Error handling
│   └── index.ts          # Central exports
│
└── constants/            # App constants and configuration
    ├── config.ts         # Environment variables and app config
    ├── collections.ts    # Firestore collection names
    └── index.ts          # Central exports
```

---

## 🏗️ Service Architecture

### 1. **Auth Service** (`services/auth/authService.ts`)
**Purpose**: Handle all authentication operations

**Responsibilities**:
- User signup with email/password
- User login
- User logout
- Get current authenticated user
- Role-based access control

**Key Functions**:
- `signup(email, password, role)` - Create new user
- `login(email, password)` - Authenticate user
- `logout()` - Sign out user
- `getCurrentUser()` - Get current user data
- `hasRole(user, role)` - Check user role

**Data Flow**:
```
Frontend → signup() → Firebase Auth → Firestore (users collection) → User data
```

---

### 2. **Event Service** (`services/event/eventService.ts`)
**Purpose**: Manage all event operations

**Responsibilities**:
- Create new events
- Fetch all events
- Fetch single event by ID
- Fetch events by organizer
- Update event details
- Delete events

**Key Functions**:
- `createEvent(eventData, organizerId)` - Create event
- `fetchAllEvents()` - Get all events
- `fetchEventById(eventId)` - Get single event
- `fetchEventsByOrganizer(organizerId)` - Get organizer's events
- `updateEvent(eventId, eventData)` - Update event
- `deleteEvent(eventId)` - Delete event

**Data Flow**:
```
Frontend → createEvent() → Firestore (events collection) → Event data
```

---

### 3. **Ticket Service** (`services/ticket/ticketService.ts`)
**Purpose**: Handle ticket registration and attendance tracking

**Responsibilities**:
- Register tickets for events
- Generate unique ticket IDs
- Fetch tickets by user
- Fetch tickets by event
- Mark tickets as scanned (with duplicate prevention)
- Get attendance counts

**Key Functions**:
- `registerTicket(ticketData)` - Create ticket
- `generateTicketId()` - Generate unique ID
- `fetchTicketByTicketId(ticketId)` - Get ticket by ID
- `fetchTicketsByUser(userId)` - Get user's tickets
- `fetchTicketsByEvent(eventId)` - Get event tickets
- `markTicketAsScanned(ticketId)` - Mark as scanned (transaction-based)
- `getEventAttendanceCount(eventId)` - Get attendance count

**Data Flow**:
```
Frontend → registerTicket() → Firestore (tickets collection) → Ticket data
Frontend → markTicketAsScanned() → Firestore transaction → Prevent duplicates
```

---

### 4. **QR Service** (`services/qr/qrService.ts`)
**Purpose**: Handle QR code generation and validation

**Responsibilities**:
- Generate QR data for tickets
- Validate QR codes
- Check for duplicate scans
- Optional time-based expiry

**Key Functions**:
- `generateQRData(ticketId)` - Create QR data string
- `validateQR(qrData)` - Validate QR code
- `isQRExpired(qrData, expiryHours)` - Check expiry

**Data Flow**:
```
Frontend → generateQRData() → QR string → QR library → QR code image
Frontend → validateQR() → Ticket Service → Firestore → Validation result
```

---

### 5. **AI Service** (`services/ai/aiService.ts`)
**Purpose**: Integrate Gemini AI for event description generation

**Responsibilities**:
- Generate event descriptions
- Generate event tags
- Generate event suggestions

**Key Functions**:
- `generateEventDescription(eventName, eventType, context)` - Generate description
- `generateEventTags(eventName, description)` - Generate tags
- `generateEventSuggestions(interests, pastEvents)` - Generate suggestions

**Data Flow**:
```
Frontend → generateEventDescription() → Gemini API → AI-generated text → Frontend
```

---

## 🔧 Firebase Configuration

### `firebase/config.ts`
**Purpose**: Initialize Firebase services

**Exports**:
- `auth` - Firebase Auth instance
- `db` - Firestore instance
- `app` - Firebase app instance

**Environment Variables Required**:
```env
VITE_FIREBASE_API_KEY=
VITE_FIREBASE_AUTH_DOMAIN=
VITE_FIREBASE_PROJECT_ID=
VITE_FIREBASE_STORAGE_BUCKET=
VITE_FIREBASE_MESSAGING_SENDER_ID=
VITE_FIREBASE_APP_ID=
VITE_GEMINI_API_KEY=
```

---

## 📝 TypeScript Interface Structure

### User Types (`types/user.ts`)
- `UserRole` - 'attendee' | 'organizer'
- `User` - Complete user data structure
- `CreateUserData` - User creation input

### Event Types (`types/event.ts`)
- `Event` - Complete event data structure
- `CreateEventData` - Event creation input
- `UpdateEventData` - Event update input

### Ticket Types (`types/ticket.ts`)
- `Ticket` - Complete ticket data structure
- `CreateTicketData` - Ticket creation input

---

## 🛠️ Utility/Helper Structure

### Date Utils (`utils/dateUtils.ts`)
- `formatDate()` - Format date to readable string
- `formatTime()` - Format time to readable string
- `isPastDate()` - Check if date is in past
- `isFutureDate()` - Check if date is in future
- `getDaysUntil()` - Get days until event
- `formatDateTime()` - Format date and time together

### Validation Utils (`utils/validationUtils.ts`)
- `isValidEmail()` - Validate email format
- `isValidPassword()` - Validate password strength
- `isValidDateFormat()` - Validate date format
- `isValidTimeFormat()` - Validate time format
- `isValidCapacity()` - Validate event capacity
- `isValidTicketId()` - Validate ticket ID format
- `sanitizeInput()` - Prevent XSS attacks
- `validateRequiredFields()` - Check required fields

### Error Utils (`utils/errorUtils.ts`)
- `getFirebaseErrorMessage()` - Convert Firebase errors to user-friendly messages
- `getFirestoreErrorMessage()` - Convert Firestore errors to user-friendly messages
- `logError()` - Log errors with context
- `createError()` - Create standardized error objects

---

## 📦 Constants Structure

### Config (`constants/config.ts`)
- `GEMINI_API_KEY` - Gemini API key
- `FIREBASE_CONFIG_KEYS` - Required Firebase environment variables
- `APP_CONFIG` - App configuration (name, version, limits)
- `EVENT_TYPES` - Available event types
- `USER_ROLES` - Available user roles

### Collections (`constants/collections.ts`)
- `COLLECTIONS.USERS` - 'users'
- `COLLECTIONS.EVENTS` - 'events'
- `COLLECTIONS.TICKETS` - 'tickets'

---

## 🎯 Naming Conventions

### Files
- **Service files**: `*Service.ts` (e.g., `authService.ts`)
- **Type files**: `*.ts` (e.g., `user.ts`)
- **Utility files**: `*Utils.ts` (e.g., `dateUtils.ts`)
- **Constant files**: `*.ts` (e.g., `config.ts`)

### Functions
- **Service functions**: `camelCase` (e.g., `createEvent`, `fetchTicketById`)
- **Utility functions**: `camelCase` (e.g., `formatDate`, `isValidEmail`)
- **Type guards**: `is*` prefix (e.g., `isValidEmail`, `isPastDate`)

### Variables
- **Constants**: `UPPER_SNAKE_CASE` (e.g., `GEMINI_API_KEY`, `COLLECTIONS`)
- **Regular variables**: `camelCase` (e.g., `userData`, `eventId`)

### Types/Interfaces
- **Types**: `PascalCase` (e.g., `User`, `Event`, `Ticket`)
- **Type unions**: `PascalCase` with `*` suffix (e.g., `UserRole`)

---

## 🔄 Data Flow Architecture

### Authentication Flow
```
Frontend → authService.signup()
         ↓
    Firebase Auth (create user)
         ↓
    Firestore (create user document)
         ↓
    Return user data to frontend
```

### Event Creation Flow
```
Frontend → eventService.createEvent()
         ↓
    Firestore (add to events collection)
         ↓
    Return event data to frontend
```

### Ticket Registration Flow
```
Frontend → ticketService.registerTicket()
         ↓
    Generate unique ticket ID
         ↓
    Firestore (add to tickets collection)
         ↓
    Return ticket data to frontend
```

### QR Validation Flow
```
Frontend → qrService.validateQR(qrData)
         ↓
    Parse QR data
         ↓
    ticketService.fetchTicketByTicketId()
         ↓
    Firestore (query tickets collection)
         ↓
    Validate ticket (not scanned, event not past)
         ↓
    Return validation result to frontend
```

### Attendance Tracking Flow
```
Frontend → ticketService.markTicketAsScanned()
         ↓
    Firestore transaction (atomic operation)
         ↓
    Check if already scanned
         ↓
    Update ticket (scanned: true, scannedAt: timestamp)
         ↓
    Return result to frontend
```

### AI Generation Flow
```
Frontend → aiService.generateEventDescription()
         ↓
    Gemini API (generate content)
         ↓
    Return generated text to frontend
```

---

## 🗄️ Database Collections

### Users Collection
```typescript
{
  uid: string;           // Firebase Auth UID
  email: string;         // User email
  role: 'attendee' | 'organizer';
  createdAt: string;     // ISO timestamp
  displayName?: string;
  phoneNumber?: string;
}
```

### Events Collection
```typescript
{
  title: string;
  description: string;
  eventType: string;
  date: string;          // YYYY-MM-DD
  time: string;          // HH:MM
  location: string;
  capacity: number;
  imageUrl?: string;
  tags: string[];
  organizerId: string;   // User UID
  createdAt: Timestamp;
  updatedAt: Timestamp;
}
```

### Tickets Collection
```typescript
{
  ticketId: string;      // TICK-xxxx-xxxx
  eventId: string;
  eventTitle: string;
  eventDate: string;
  userId: string;        // User UID
  userEmail: string;
  userName: string;
  createdAt: Timestamp;
  scanned: boolean;
  scannedAt?: Timestamp;
}
```

---

## 🔒 Security Features

1. **Firebase Authentication** - Secure user authentication
2. **Firestore Security Rules** - Server-side data validation (to be added)
3. **Input Sanitization** - XSS prevention in validationUtils
4. **Transaction-based Scanning** - Prevent duplicate ticket scans
5. **Role-based Access** - Organizer vs Attendee permissions

---

## 🚀 Quick Start for Frontend Team

### Installation
```bash
npm install firebase @google/generative-ai
```

### Environment Variables
Create `.env` file:
```env
VITE_FIREBASE_API_KEY=your_api_key
VITE_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your_project_id
VITE_FIREBASE_STORAGE_BUCKET=your_project.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
VITE_FIREBASE_APP_ID=your_app_id
VITE_GEMINI_API_KEY=your_gemini_api_key
```

### Import Services
```typescript
import { signup, login, createEvent, registerTicket, generateQRData, validateQR, generateEventDescription } from '@/services';
import { User, Event, Ticket } from '@/types';
```

### Example Usage
```typescript
// Signup
const user = await signup('user@example.com', 'password123', 'attendee');

// Create Event
const event = await createEvent({
  title: 'Tech Conference',
  description: 'Amazing tech event',
  eventType: 'Conference',
  date: '2024-06-15',
  time: '09:00',
  location: 'San Francisco',
  capacity: 100,
}, organizerId);

// Register Ticket
const ticket = await registerTicket({
  eventId: event.id,
  eventTitle: event.title,
  eventDate: event.date,
  userId: user.uid,
  userEmail: user.email,
  userName: user.displayName || 'User',
});

// Generate QR
const qrData = generateQRData(ticket.ticketId);

// Validate QR
const result = await validateQR(qrData);

// Generate AI Description
const description = await generateEventDescription('Tech Conference', 'Conference');
```

---

## 📊 Scalability Notes

This architecture is optimized for hackathon MVP but includes scalability features:

1. **Service Layer Separation** - Easy to add new services
2. **Type Safety** - TypeScript prevents runtime errors
3. **Centralized Constants** - Easy configuration changes
4. **Utility Functions** - Reusable code across services
5. **Transaction Support** - Handles concurrent operations
6. **Error Handling** - Consistent error management

For production scaling, consider:
- Adding Firebase Security Rules
- Implementing pagination for large datasets
- Adding caching layer
- Implementing rate limiting
- Adding analytics and monitoring
