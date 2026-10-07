# ADR-009: Real-Time & Event Messaging Strategy — Server-Sent Events (SSE) with Redis Pub/Sub

**Status:** Accepted  
**Date:** 2026-10-07  
**Deciders:** Lead Software Architect, Principal Engineer  
**Classification:** Core Architectural Decision  

---

## 1. Context
MerQent requires real-time push capabilities for:
1. Instant delivery of incoming messages in active conversations.
2. Real-time updates for connection requests, status changes, and meeting proposals.
3. In-app notification badges and alert popups.
Financial and private equity corporate networks often operate behind strict proxy servers and firewall policies that intercept or terminate long-lived bi-directional WebSocket connections.

## 2. Problem
Evaluate whether to implement real-time communication using WebSockets (Socket.io), Server-Sent Events (SSE), or standard HTTP Polling.

## 3. Options Considered
- **Option 1:** WebSockets (Socket.io / ws)
- **Option 2:** Server-Sent Events (SSE) over HTTP/2 with Redis Pub/Sub
- **Option 3:** Periodic HTTP Short / Long Polling

## 4. Decision
Select **Option 2: Server-Sent Events (SSE) over HTTP/2 backed by Redis Pub/Sub**:
- **Client Ingestion:** Messages are dispatched via standard authenticated REST POST endpoints (`POST /api/v1/conversations/:id/messages`).
- **Server Push:** Connected clients subscribe to an authenticated SSE stream (`GET /api/v1/events/stream`).
- **Message Routing:** When an event occurs (e.g., `MessageCreated`, `NotificationDispatched`), NestJS publishes to a Redis Pub/Sub channel (`user:{userId}:events`), which distributes the event to whichever server instance currently holds the client's SSE connection.
- **Client Auto-Reconnect:** Utilizes native browser `EventSource` with standard reconnection tokens (`Last-Event-ID`).

## 5. Why Selected
1. **Enterprise Firewall Immunity:** SSE runs over standard HTTPS (Port 443) using HTTP/2 multiplexing, passing transparently through corporate proxies and VPNs that block or drop WebSocket upgrades.
2. **Simplified Backend State:** Eliminates bidirectional WebSocket connection management, ping/pong state machines, and socket session reconciliation.
3. **Native Auto-Reconnection:** The HTTP `EventSource` API handles reconnection and backoff automatically in the browser with zero custom client reconnect code.
4. **Horizontal Scalability:** Backed by a lightweight Redis instance, multiple NestJS backend pods can broadcast real-time events across any number of connected clients.

## 6. Alternatives Rejected
- **WebSockets:** Unnecessary complexity for a workflow where client-to-server traffic is low-frequency and better served by standard REST POST mutations with request validation and rate limiting.
- **HTTP Polling:** Generates wasteful database read queries and introduces 5–10 second message arrival latency.

## 7. Trade-offs & Consequences
- **Trade-off:** SSE is strictly unidirectional (Server to Client).
- **Consequence:** Client actions (sending a message, typing indicator) must use standard HTTP POST requests. This aligns with RESTful API best practices and simplifies audit logging.

## 8. Migration & Future Implications
- If future video calling or real-time document co-editing requires bidirectional sub-50ms data streaming, WebRTC/WebSockets can be integrated selectively alongside the existing SSE notification stream.
