# ADR-008: Realtime Architecture — WebSockets / Socket.IO

## Context
MerQent facilitates direct negotiation and collaboration between Private Equity investment directors and independent PMI consultants. Realtime capabilities are required for direct messaging, delivery states (sent, delivered, read), typing indicators, online presence, and instantaneous project matching alerts.

## Problem
Selecting a realtime bidirectional communication protocol and library that integrates cleanly with NestJS, handles stateful room authorization, scales horizontally across multiple backend instances, and provides cross-client compatibility with both Next.js and Flutter mobile.

## Options Considered
1. **WebSockets via Socket.IO + Redis Adapter** (Selected)
2. **Server-Sent Events (SSE) + REST polling**
3. **Pure Raw WebSockets (`ws`)**
4. **Third-Party Realtime SaaS (Pusher / Ably)**

## Decision
Adopt **WebSockets powered by Socket.IO with `@socket.io/redis-adapter`** within NestJS gateways (`@nestjs/platform-socket.io`).

## Rationale
- **Bidirectional Low-Latency**: Enables instantaneous client-to-server and server-to-client events without HTTP connection renegotiation overhead.
- **Battle-Tested Resilience**: Socket.IO provides automatic heartbeat, connection health monitoring, reconnection logic, packet buffering, and HTTP long-polling fallback for restrictive corporate proxy environments common in PE firms.
- **Horizontal Scalability**: The Redis Streams/PubSub adapter allows multiple NestJS instances behind a load balancer to broadcast room events seamlessly.
- **Granular Room Security**: Direct room isolation (`conversation:{id}` and `user:{id}`) authenticated during the WebSocket handshake using the user's JWT access token.
- **Mobile Ecosystem Support**: First-class client libraries exist for both Web (TypeScript) and Mobile (Flutter/Dart).

## Protocol Separation
- **REST APIs**: Handle historical data fetching, pagination, message search, and transactional operations (`POST /api/v1/conversations/:id/messages`).
- **WebSockets / Socket.IO**: Handle realtime event delivery (`message:received`, `message:read`, `typing:start`, `typing:stop`, `user:online`, `notification:received`).

## Trade-offs
- Stateful WebSocket connections require memory management and sticky sessions or Redis adapter fanout when scaling across multiple nodes.
- Requires robust authentication handling at handshake time and periodic token expiration renewal.

## Consequences
- NestJS Gateway implemented in `src/infrastructure/realtime/realtime.gateway.ts`.
- Integrated with `src/modules/messaging/` and `src/modules/notifications/`.

## Alternatives Rejected
- *Server-Sent Events (SSE)*: Unidirectional only; requires separate HTTP POST requests for typing indicators and client receipts, adding unnecessary HTTP overhead.
- *Raw `ws`*: Lacks built-in reconnection management, room primitives, and automated Redis cluster adapters out of the box.

## Future Implications
Enables future rich collaborative features such as live document review or collaborative interview whiteboarding without architectural changes.
