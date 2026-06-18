# Requirements Document

## Introduction

QuantTube's Library "Watch History", "Playlists", and "Watch Later" surfaces — plus the `playlist/[id]` detail page — currently render hardcoded `MOCK_*` arrays behind a fake `setTimeout`-based delay instead of calling the backend. This feature replaces that fake-async-with-mock pattern on those in-scope screens with the sanctioned QuantTube data path already shipped for the creator-economy surface: typed React Query hooks (`useApiQuery`/`useApiMutation`) → a same-origin Next.js proxy route (`proxyEngineRequest`) → a Fastify backend route behind the global auth hook → a decorated engine/service returning the `{ success, data }` envelope.

The requirements below are derived from the approved design document and reflect the scope confirmed for this first slice.

**In scope (wire against existing backend):**

- Library "Watch History" tab — call the existing backend `GET /history` and enrich each entry with `VideoService` metadata to satisfy the page's `HistoryItem` contract.

**In scope (build minimal backend this slice, mirroring the creator-economy decorator pattern):**

- Playlists — the Library "Playlists" tab and the `playlist/[id]` detail page (replacing `MOCK_PLAYLISTS`, `MOCK_PLAYLIST`, `MOCK_VIDEOS`).
- Watch Later — modeled as a reserved system playlist (replacing `MOCK_WATCH_LATER`).
- Each backed by a new minimal in-memory service, Fastify routes, Next.js proxy routes, and React Query hooks.

**Out of scope (explicitly deferred to dedicated follow-up specs):**

- **Music** (`music.tsx`), **Live** (`live.tsx`), **Podcasts** (`podcasts.tsx`), and **Library Downloads** (`MOCK_DOWNLOADS`). These have no backend engine and no reusable engine package today; each is a substantial new domain warranting its own spec. They are NOT built or wired in this slice. The Live domain additionally carries a known authentication hazard (the `/live` prefix is in `PUBLIC_PATHS`); this requirements document records that constraint (Requirement 11) so the deferred Live spec does not reintroduce it, but performs no Live work here.

## Glossary

- **Seam / call path**: The fixed chain UI hook → `/api/*` Next.js proxy route → backend Fastify route → decorated service. The only sanctioned way a UI surface reaches backend data; UI surfaces never call `fetch` directly.
- **`useApiQuery` / `useApiMutation`**: Canonical React Query hooks from `@quant/api-client` that wrap `apiFetch` against a same-origin proxy path and return the `APIResponse<T>` envelope.
- **`proxyEngineRequest`**: The canonical proxy helper in `app/api/_lib/engine-proxy.ts` that forwards the bearer token and `x-request-id` header to the backend and relays the backend status and body unchanged.
- **Envelope / `APIResponse<T>`**: The JSON shape `{ success: boolean, data: T, error?, metadata? }` returned by every backend route.
- **Decorated service**: A service composed once at boot via `app.decorate('name', ...)` and read per-request as `fastify.name` (e.g. `fastify.playlists`), never constructed per-request.
- **Global auth hook**: The server-core `onRequest` hook that runs `requireAuth()` for every non-`PUBLIC_PATHS` route, returning `401` when unauthenticated.
- **`requireAuth({ scopes })`**: A per-route `preHandler` enforcing fine-grained scopes, returning `403` when a required scope is missing.
- **`PUBLIC_PATHS`**: The server-core allowlist that bypasses auth: `['/health','/healthz','/ready','/readyz','/live','/livez','/metrics']`. Note that `/live` is present.
- **Enrichment**: Joining a thin backend record (e.g. a history entry holding only `videoId`) with video/channel metadata to satisfy the richer UI contract.
- **HistoryService**: The existing in-memory backend service (`backend/services/history.service.ts`) that serves `GET /history`. Reused as-is.
- **VideoService**: The existing backend service that resolves video metadata (`title`, `thumbnailUrl`, `channel`, `duration`) by `videoId`.
- **PlaylistService**: The new in-memory service introduced this slice, decorated as `fastify.playlists`, serving playlists, playlist membership, and the reserved system playlists (including `Watch Later`).
- **In-scope pages**: The QuantTube `library` page (History, Playlists, Watch Later tabs) and the `playlist/[id]` detail page.
- **System playlist**: A server-reserved playlist (e.g. `Watch Later`) whose `isSystem` flag is server-assigned and never client-set.
- **HistoryItem / PlaylistData / PlaylistDetail / PlaylistVideo / WatchLaterItem**: The page-local TypeScript interfaces treated as the authoritative response contracts; the backend (or proxy enrichment) produces exactly these shapes.

## Requirements

### Requirement 1: Wire the Library Watch History tab to the existing backend

**User Story:** As a QuantTube viewer, I want my Library "Watch History" tab to show my actual watch history from the backend, so that I see real videos I have watched instead of placeholder data.

#### Acceptance Criteria

1. WHEN the Watch History tab mounts, THE QuantTube_Web_App SHALL issue exactly one watch-history request through the `useWatchHistory` React Query hook, which calls the same-origin proxy path mapped to the backend `GET /history` route.
2. THE QuantTube_Web_App SHALL NOT reference the `MOCK_HISTORY` constant in the Watch History tab.
3. THE QuantTube_Web_App SHALL NOT use any `setTimeout`-based loader to populate the Watch History tab.
4. WHEN the `useWatchHistory` hook resolves with a successful response, THE QuantTube_Web_App SHALL render one list entry for each element of the response envelope `data.items`, in the same order the array is received, and SHALL render no entries that are absent from `data.items`.
5. WHILE the `useWatchHistory` request is pending and no previously successful response is cached, THE QuantTube_Web_App SHALL display a loading indicator and SHALL NOT display any history entries.
6. IF the `useWatchHistory` request fails (network error or non-success response), THEN THE QuantTube_Web_App SHALL display an error indication communicating that watch history could not be loaded, and SHALL NOT display any placeholder or partial history entries.
7. WHEN the `useWatchHistory` hook resolves successfully with `data.items` containing zero elements, THE QuantTube_Web_App SHALL display an empty-history indication and SHALL render zero history entries.
8. THE Backend_History_Route SHALL return a response body conforming to the `HistoryListResponse` contract `{ items: HistoryItem[], total: integer, page: integer, pageSize: integer }`, where `total >= 0`, `page >= 1`, `pageSize >= 1`, and `items.length <= pageSize`.
9. WHERE a history entry's `videoId` resolves to an existing video, THE Backend_History_Route SHALL include that entry in `items` enriched with `title`, `thumbnail`, `channelName`, and `duration` (duration in whole seconds, `duration >= 0`) from `VideoService`, and SHALL set `watchedAt` to an ISO-8601 UTC timestamp.
10. WHERE a history entry's `videoId` does not resolve to an existing video, THE Backend_History_Route SHALL omit that entry from `items` and SHALL NOT count it toward `total`.
11. THE Backend_History_Route SHALL set each `HistoryItem.progress` to `max(0, min(1, watchDuration / max(1, duration)))` (seconds), such that `0 <= progress <= 1`.
12. THE Backend_History_Route SHALL return the entries in `items` sorted by `watchedAt` descending, and WHERE entries share an identical `watchedAt`, SHALL preserve the relative order produced by `HistoryService`.

### Requirement 2: Wire the Playlists tab and playlist detail page to a new backend

**User Story:** As a QuantTube viewer, I want my Library "Playlists" tab and each playlist's detail page to display my real playlists and their videos, so that I can browse my own curated collections instead of mock data.

#### Acceptance Criteria

1. WHEN the Playlists tab mounts, THE QuantTube_Web_App SHALL request the playlist list through the `usePlaylists` React Query hook, which calls the same-origin proxy path for the backend `GET /playlists` route.
2. WHEN the `playlist/[id]` detail page mounts with a route id, THE QuantTube_Web_App SHALL request the playlist detail through the `usePlaylist` hook, which calls the same-origin proxy path for the backend `GET /playlists/{id}` route.
3. THE QuantTube_Web_App SHALL NOT reference the `MOCK_PLAYLISTS`, `MOCK_PLAYLIST`, or `MOCK_VIDEOS` constants in the Playlists tab or the `playlist/[id]` page.
4. THE QuantTube_Web_App SHALL NOT use any `setTimeout`-based loader to populate the Playlists tab or the `playlist/[id]` page.
5. THE Backend_Playlist_Route SHALL return the playlist list as a body conforming to the `PlaylistListResponse` contract `{ items: PlaylistData[] }`.
6. THE Backend_Playlist_Route SHALL return playlist detail as a body conforming to the `PlaylistDetailResponse` contract `{ playlist: PlaylistDetail, videos: PlaylistVideo[] }`.
7. WHEN user A requests the playlist list, THE Backend_Playlist_Route SHALL return only playlists owned by user A and SHALL exclude every playlist owned by any other user.
8. IF a playlist detail is requested for an id that does not exist OR for an id owned by another user, THEN THE Backend_Playlist_Route SHALL respond with status `404` and an error envelope, and SHALL NOT disclose whether the id exists for another user (no existence leakage; not `403`).
9. IF the backend responds with status `404` for a playlist detail request, THEN THE QuantTube_Web_App SHALL render the existing "Playlist Not Found" branch.
10. WHEN a non-empty playlist's detail is returned, THE Backend_Playlist_Route SHALL return `videos` whose `position` values form a contiguous sequence `1..n` (where `n >= 1`) that is a unique permutation with no duplicates and no gaps.
11. WHEN an empty playlist's detail is returned, THE Backend_Playlist_Route SHALL return `videos` as an empty array `[]`, and the `1..n` position invariant SHALL hold vacuously.
12. WHEN a create-playlist mutation is submitted, THE QuantTube_Web_App SHALL call the `useCreatePlaylist` mutation hook against the same-origin proxy path for the backend `POST /playlists` route.
13. WHEN the create-playlist mutation succeeds, THE QuantTube_Web_App SHALL invalidate the playlist list query key.
14. THE Backend_Playlist_Route SHALL validate `CreatePlaylistInput` such that `title` is a string whose length after trimming is in the inclusive range `1..200` and `visibility`, when present, is one of `'public' | 'private' | 'unlisted'`.
15. WHEN a create-playlist request omits `visibility`, THE Backend_Playlist_Route SHALL default `visibility` to `'private'`.
16. WHEN a playlist is created, THE Backend_Playlist_Route SHALL assign `isSystem` on the server and SHALL ignore any client-supplied `isSystem` value.
17. IF a create-playlist request supplies a `title` whose trimmed length is outside the inclusive range `1..200`, OR a `visibility` value outside the permitted enum, THEN THE Backend_Playlist_Route SHALL respond with status `400` and an error envelope, and SHALL NOT create any playlist.

### Requirement 3: Wire the Watch Later tab as a system playlist

**User Story:** As a QuantTube viewer, I want my Library "Watch Later" tab to show the videos I have saved for later from the backend, so that I see my real saved queue instead of placeholder data.

#### Acceptance Criteria

1. WHEN the Watch Later tab mounts, THE QuantTube_Web_App SHALL request watch-later entries through the `useWatchLater` React Query hook, which calls the same-origin proxy path for the backend watch-later route.
2. THE QuantTube_Web_App SHALL NOT reference the `MOCK_WATCH_LATER` constant or any `setTimeout`-based loader in the Watch Later tab.
3. THE PlaylistService SHALL model Watch Later as a server-reserved system playlist whose `isSystem` flag is server-set to `true`, and SHALL never honor an `isSystem` value supplied by client input.
4. THE Backend_Playlist_Route SHALL return watch-later entries as a body conforming to the `WatchLaterListResponse` contract `{ items: WatchLaterItem[] }`.
5. WHERE a watch-later entry's `videoId` resolves to an existing video, THE Backend_Playlist_Route SHALL enrich the entry with `title`, `thumbnail`, `channelName`, and `duration` from `VideoService`.
6. WHERE a watch-later entry's `videoId` does not resolve to an existing video, THE Backend_Playlist_Route SHALL omit that entry from `items`.
7. THE Backend_Playlist_Route SHALL return watch-later `items` in most-recently-added-first order.
8. WHEN a video already present in Watch Later is added again, THE PlaylistService SHALL treat the add as idempotent — creating no duplicate entry and preserving the existing entries' order — and the Backend_Playlist_Route SHALL respond with a `2xx` status.
9. WHEN a video not present in Watch Later is removed, THE PlaylistService SHALL treat the remove as an idempotent no-op, and the Backend_Playlist_Route SHALL respond with a `2xx` status and SHALL NOT respond with status `500`.
10. WHEN an add-to-watch-later or remove-from-watch-later mutation is invoked, THE PlaylistService SHALL apply a single atomic change scoped only to the requesting user's rows.
11. WHEN an add-to-watch-later or remove-from-watch-later mutation succeeds, THE QuantTube_Web_App SHALL invalidate the watch-later query key so the list re-fetches.

### Requirement 4: Replace fake loading with real query-driven states

**User Story:** As a QuantTube viewer, I want the in-scope Library screens to show genuine loading, empty, and error states based on the real request, so that the interface reflects the true status of my data.

#### Acceptance Criteria

1. THE QuantTube_Web_App SHALL apply the loading, error, empty, and data state behavior defined in this requirement to exactly the following in-scope Library screens: the History tab, the Playlists tab, the Watch Later tab, and the playlist detail screen (playlist/[id]).
2. WHILE an in-scope Library screen's query is in a pending state (query.isLoading is true OR query.isPending is true), THE QuantTube_Web_App SHALL render that screen's loading-state element, derived from the query flag rather than from a setTimeout timer.
3. IF an in-scope Library screen's query enters the error state (query.isError is true), THEN THE QuantTube_Web_App SHALL render that screen's error-state element, including a retry control.
4. WHEN the user activates the retry control of an in-scope Library screen's error state, THE QuantTube_Web_App SHALL invoke that query's refetch function.
5. WHEN an in-scope Library screen's query resolves successfully (query.isSuccess is true) and the response envelope contains zero items, THE QuantTube_Web_App SHALL render that screen's single designated empty-state element and SHALL render no list items.
6. WHEN an in-scope Library screen's query resolves successfully and the response envelope contains one or more items, THE QuantTube_Web_App SHALL render exactly one list item for each item in the response envelope.
7. WHILE an in-scope Library screen is rendered, THE QuantTube_Web_App SHALL display exactly one of the loading, error, empty, or data states, selected in the precedence order loading → error → empty → data.
8. THE QuantTube_Web_App SHALL NOT use a loading/error useState combined with setTimeout to simulate asynchronous loading on the in-scope Library screens.

### Requirement 5: Provide a minimal Playlists and Watch Later backend service

**User Story:** As a platform engineer, I want a minimal in-memory Playlists and Watch Later service composed with the creator-economy decorator pattern, so that the QuantTube Library surfaces have a real, consistent backend without introducing new database schema.

#### Acceptance Criteria

1. WHEN the Backend_App boots, THE Backend_App SHALL invoke `app.decorate('playlists', ...)` exactly once and construct exactly one PlaylistService instance for the application lifetime.
2. WHEN any request handler reads `fastify.playlists`, THE Backend_App SHALL return the same PlaylistService instance (verifiable by reference equality) across all requests and users, without constructing a new instance per request.
3. THE Backend_App SHALL register the playlist routes at the `/playlists` prefix.
4. THE Backend_App SHALL NOT include any path under the `/playlists` prefix in PUBLIC_PATHS, such that every `/playlists` route requires authentication.
5. IF a request to any `/playlists` route carries no valid authenticated user identity, THEN THE Backend_Playlist_Route SHALL reject with `success: false`, an `error.code` indicating unauthenticated access, and `statusCode` 401, and SHALL NOT read or mutate any row.
6. THE PlaylistService SHALL expose exactly the operations `listPlaylists`, `getPlaylist`, `createPlaylist`, `listWatchLater`, `addToWatchLater`, and `removeFromWatchLater`.
7. WHEN a `/playlists` operation completes successfully, THE Backend_Playlist_Route SHALL return `{ success: true, data: <shape> }` where `data` is present and `success` is true.
8. IF a `/playlists` operation fails, THEN THE Backend_Playlist_Route SHALL return `success: false`, a non-empty `error.code`, and a numeric `statusCode`, and SHALL omit `data`.
9. IF a requested playlist or watch-later entry does not exist for the authenticated user, THEN THE Backend_Playlist_Route SHALL return the not-found failure class with a deterministic `error.code` and `statusCode` 404.
10. IF a request supplies invalid input, THEN THE Backend_Playlist_Route SHALL return the validation failure class with a deterministic `error.code` and `statusCode` 400, and SHALL NOT create, modify, or remove any row.
11. THE Backend_Playlist_Route SHALL map each failure class (unauthenticated, validation, not-found, ownership/authorization, internal) to the same deterministic `error.code` and `statusCode` on every occurrence.
12. WHEN user A requests `listPlaylists`, `getPlaylist`, or `listWatchLater`, THE Backend_Playlist_Route SHALL return only rows owned by user A and exclude every row owned by any other user.
13. WHEN user A invokes a create, add, or remove operation, THE PlaylistService SHALL create, modify, or remove only rows owned by user A and leave all other users' rows unchanged.
14. IF user A targets a playlist or watch-later entry owned by another user, THEN THE Backend_Playlist_Route SHALL deny the operation, leave the target row unchanged, and return a deterministic owner-scoped failure class that does not disclose the existence of another user's row.
15. WHEN any create, add, or remove operation is invoked, THE PlaylistService SHALL apply the mutation atomically (fully completes or leaves prior state unchanged; no partial write observable by a subsequent read).

### Requirement 6: Enforce the authentication and scope seam on backend routes

**User Story:** As a security-conscious platform owner, I want the in-scope backend routes to require authentication and the correct scope, so that only authorized users can read and mutate their own data.

#### Acceptance Criteria

1. IF a request to an in-scope backend route carries no bearer token, an expired bearer token, a malformed bearer token, or a bearer token that fails verification, THEN THE Global_Auth_Hook SHALL respond with status `401`.
2. IF a request to an in-scope backend route fails authentication, THEN the request SHALL NOT reach the service and the route SHALL NOT read or mutate any row.
3. THE Backend_History_Route AND THE Backend_Playlist_Route SHALL NOT be registered under any `PUBLIC_PATHS` prefix.
4. WHERE an in-scope backend route mutates data (defined as any route using the `POST`, `PUT`, `PATCH`, or `DELETE` HTTP method), THE Backend_Route SHALL guard the route with `requireAuth({ scopes: ['library:write'] })`.
5. WHERE an in-scope backend route is read-only (defined as a route using the `GET` HTTP method), THE Backend_Route SHALL authorize the request on a valid token alone behind the global auth hook and SHALL NOT require any additional scope.
6. IF an authenticated request to a scope-guarded mutating route lacks the required scope, THEN THE Backend_Route SHALL respond with status `403` and SHALL leave all data unchanged.
7. WHEN an authenticated request to a scope-guarded mutating route carries the required scope, THE Backend_Route SHALL respond with a `2xx` status.
8. IF an authorization failure occurs on a mutating route, THEN THE Backend_Route SHALL classify it at the route boundary as `403`, SHALL NOT respond with status `500`, and SHALL leave all data unchanged.

**[DECISION REQUIRED — scope granularity]** Whether the mutating in-scope routes share a single `library:write` scope (as written in criterion 4) or instead use per-resource scopes (`history:write`, `playlist:write`) is an open decision, to be resolved consistently with the repository's existing `<resource>:read` / `<resource>:write` scope-naming convention.

### Requirement 7: Route all backend data through the same-origin Next.js proxy

**User Story:** As a frontend engineer, I want every in-scope backend call to pass through the canonical same-origin proxy, so that the bearer token and request id are forwarded consistently and the backend status is preserved.

#### Acceptance Criteria

1. THE QuantTube_Web_App SHALL reach the backend for all in-scope reads and writes through `app/api/*` proxy route handlers that use `proxyEngineRequest`.
2. WHEN the Proxy_Route forwards an in-scope request to the backend, THE Proxy_Route SHALL forward the bearer token to the backend.
3. WHEN the Proxy_Route forwards an in-scope request to the backend, THE Proxy_Route SHALL forward the `x-request-id` header to the backend.
4. WHEN the backend returns a response, THE Proxy_Route SHALL relay the backend response status code unchanged without rewriting it.
5. WHEN the backend returns a response, THE Proxy_Route SHALL relay the backend response body byte-for-byte unchanged.
6. WHEN the backend returns a `4xx` or `5xx` error envelope, THE Proxy_Route SHALL relay that error envelope verbatim — the same status code and the same body — without rewriting, augmenting, or omitting any field.
7. IF the backend is unreachable or does not respond within a 30-second upstream timeout, THEN THE Proxy_Route SHALL respond with status `502` and a JSON error envelope matching the backend envelope shape, and SHALL NOT propagate an unhandled exception.
8. THE Proxy_Route handlers SHALL contain no business logic beyond selecting the backend path and optional body or query parameters, and SHALL NOT make any authentication or authorization decision (SHALL NOT evaluate, accept, reject, or transform credentials, tokens, or roles).

### Requirement 8: Reuse page-local interfaces as authoritative data contracts

**User Story:** As an engineer maintaining QuantTube, I want the page-local TypeScript interfaces to remain the authoritative response contracts, so that the backend and proxy produce exactly the shapes the pages already expect.

#### Acceptance Criteria

1. WHEN the Backend_Route or the Proxy_Route returns a successful response for a history, playlist, playlist-detail, or watch-later operation, THE producing route SHALL emit a body that structurally conforms to exactly one of the nine page-local interfaces: HistoryItem, HistoryListResponse, PlaylistData, PlaylistListResponse, PlaylistDetail, PlaylistVideo, PlaylistDetailResponse, WatchLaterItem, WatchLaterListResponse.
2. WHEN the Backend_History_Route produces a HistoryItem, THE Backend_History_Route SHALL populate every field declared by HistoryItem with a defined, non-null value of the declared type.
3. WHEN the Backend_Route or the Proxy_Route serializes any of the nine contract objects, THE producing route SHALL populate every declared field with a defined, non-null value (no undefined leakage).
4. IF a serialized body would contain a field not declared by its matching interface, THEN THE producing route SHALL omit that field (only interface-declared fields emitted).
5. THE Feature_Hooks SHALL be typed against the corresponding contract interface and SHALL return APIResponse<T> where T is that contract.
6. THE Feature_Hooks SHALL hold no UI state.
7. THE Feature_Hooks SHALL NOT call fetch directly.
8. [DECISION REQUIRED — page-local definitions vs a single shared types module] THE nine contract interfaces SHALL be defined in exactly one authoritative location, and the Backend_Route, Proxy_Route, and Feature_Hooks SHALL reference that single source rather than redefining the shapes.

### Requirement 9: Eliminate mock data and inline fetches from in-scope pages

**User Story:** As an engineer reviewing this slice, I want a verifiable guarantee that no mock constants or inline fetches remain in the in-scope pages, so that the screens are genuinely wired to the backend.

#### Acceptance Criteria

1. THE QuantTube_Web_App SHALL define the in-scope pages of this requirement as exactly the two files `apps/quantube/src/pages/library.tsx` (Watch History, Playlists, Watch Later tabs) and `apps/quantube/src/pages/playlist/[id].tsx` (playlist detail), and SHALL treat no other page — including `music.tsx`, `live.tsx`, `podcasts.tsx`, and the deferred Library Downloads tab — as in scope.
2. WHEN wiring of an in-scope page is complete, THE QuantTube_Web_App SHALL contain zero referenced occurrences of `MOCK_HISTORY`, `MOCK_PLAYLISTS`, and `MOCK_WATCH_LATER` in `library.tsx` and `MOCK_PLAYLIST` and `MOCK_VIDEOS` in `playlist/[id].tsx` ("referenced" = identifier read/assigned/destructured/passed); the deferred `MOCK_DOWNLOADS` constant is out of scope and its continued presence SHALL NOT count as a violation.
3. WHEN an in-scope page renders a data-loading, empty, or error state, THE QuantTube_Web_App SHALL derive that state from a React Query status flag (`isLoading`, `isPending`, `isError`) and SHALL contain no `setTimeout` (or equivalent timer) used to simulate, delay, or gate loading of fetched data in either in-scope file.
4. WHERE a `setTimeout` in an in-scope page serves a non-data-loading purpose (debounce, animation, transient notification), THE QuantTube_Web_App MAY retain it, provided it neither gates rendering of fetched data nor simulates request latency.
5. THE in-scope pages SHALL contain zero direct `fetch(` calls; all backend reads/writes go exclusively through `useApiQuery` or `useApiMutation`.
6. THE QuantTube*Web_App SHALL pass a repository static scan over the two in-scope files reporting zero referenced in-scope `MOCK*`constants, zero data-loading`setTimeout`usages, and zero direct`fetch(` calls, such that two independent reviewers obtain identical results.

### Requirement 10: Preserve correct pagination on history reads

**User Story:** As a QuantTube viewer with a long watch history, I want paginated history reads to behave predictably, so that I can page through my history without missing or duplicated entries.

#### Acceptance Criteria

1. WHEN a history request omits the page parameter, THE Backend_History_Route SHALL apply a default page value of 1.
2. WHEN a history request omits the pageSize parameter, THE Backend_History_Route SHALL apply a default pageSize value of 20.
3. WHEN a history request specifies (page, pageSize), THE Backend_History_Route SHALL return a response in which items.length <= the effective pageSize.
4. WHEN a history request specifies a pageSize greater than 100, THE Backend_History_Route SHALL clamp the effective pageSize to 100.
5. WHEN a history request specifies a pageSize less than 1, THE Backend_History_Route SHALL clamp the effective pageSize to 1.
6. IF a history request specifies a page or pageSize that is non-numeric, non-integer, or less than 1, THEN THE Backend_History_Route SHALL reject with a validation error indicating which parameter is invalid, and SHALL NOT return any items.
7. WHEN a history request specifies a page greater than the last populated page (ceil(total / effective pageSize)), THE Backend_History_Route SHALL return an empty items array.
8. WHEN a history request specifies a page beyond the last populated page, THE Backend_History_Route SHALL return the same total it returns for an in-range page under identical filter conditions.
9. WHEN a history request specifies a page, THE Backend_History_Route SHALL echo that effective page value in the response.
10. THE Backend_History_Route SHALL return a total independent of the requested page, reflecting the full count of entries matching the request's filter conditions.
11. WHEN a dataset of N entries is read across all pages 1..ceil(N / effective pageSize) using a constant pageSize and filter, THE Backend_History_Route SHALL return items whose ordered concatenation equals the full ordered history set exactly once (no duplicates, no omissions).
12. WHEN the Backend_History_Route computes a single page response, THE Backend_History_Route SHALL derive that page's items, echoed page, and total from one consistent snapshot.

### Requirement 11: Record the `/live` auth-bypass constraint for the deferred Live spec

**User Story:** As a platform owner planning the deferred Live domain, I want the `/live` authentication-bypass hazard documented as a binding constraint, so that the follow-up Live spec does not register routes that silently bypass authentication.

#### Acceptance Criteria

1. THE Requirements_Document SHALL state that the path prefixes `/live` and `/livez` are members of PUBLIC_PATHS.
2. THE Requirements_Document SHALL state that any backend route registered under a PUBLIC_PATHS prefix bypasses the global authentication hook.
3. THE Requirements_Document SHALL record, as a binding constraint on the deferred Live spec, that the follow-up Live spec MUST NOT register any authenticated route under the `/live` or `/livez` prefixes.
4. WHERE the deferred Live domain is later built, THE Live_Backend_Route SHALL be registered under a prefix that is not a member of PUBLIC_PATHS (e.g. `/live-streams` or `/streaming`).
5. WHERE the deferred Live domain is later built, THE Live_Backend_Route SHALL NOT be registered under the `/live` or `/livez` prefixes.
6. THE current slice SHALL NOT add any backend route, route registration, service module, background worker, or middleware/auth-hook entry for the Music, Live, Podcasts, or Library Downloads domains, such that inspection shows zero artifacts attributable to those four domains.
7. THE current slice SHALL be a documentation-and-constraint change only for Requirement 11, verifiable by inspecting the Requirements_Document text and the route-registration set.

## Design Traceability

Because this is a design-first spec, every requirement is derived from — and traceable back to — the approved `design.md`. The table below maps each requirement to the design's correctness properties (P1–P11) and the design components/sections it originates from. Conversely, all 11 design properties are covered by at least one requirement, so no property is left unverified.

| Requirement                                              | Design correctness properties                             | Design components / sections                                                                                                                                                                               |
| -------------------------------------------------------- | --------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **1** — Wire Watch History + enrichment                  | P4 (enrichment totality), P5 (ordering), P9 (no-mock)     | Component 3 (`HistoryService` + enrichment join, `VideoService`); "Read flow — Library History" sequence; "History enrichment" pseudocode; Data Models → History; availability matrix (History = Wire Now) |
| **2** — Playlists tab + `playlist/[id]`                  | P1 (envelope), P7 (position invariant), P9 (no-mock)      | Component 3 (`PlaylistService`, `/playlists` route); "Read flow — Playlist detail" sequence; Data Models → Playlists; Error Handling (404 not-found, 400 invalid input)                                    |
| **3** — Watch Later as system playlist                   | P1 (envelope), P4 (enrichment), P9 (no-mock)              | Component 3 (`PlaylistService.listWatchLater/add/remove`); Data Models → Watch Later; availability matrix (Watch Later = build minimal backend)                                                            |
| **4** — Real query-driven loading/empty/error            | P9 (no-mock), P10 (no inline fetch)                       | "Loading / Empty / Error states" section; "Page consumption — replacing the fake setTimeout" pseudocode                                                                                                    |
| **5** — Minimal Playlists/Watch Later backend service    | P1 (envelope), P8 (user isolation)                        | Component 3 (`PlaylistService` interface, `app.decorate('playlists')`, `/playlists` prefix); Dependencies (new, in-memory)                                                                                 |
| **6** — Auth + scope seam (401 / 403)                    | P2 (auth seam 401), P3 (scope seam 403)                   | Architecture → layered seam + global auth hook; Glossary (`requireAuth`, `PUBLIC_PATHS`); Error Handling (401 / 403 route-boundary, Bug-3 precedent)                                                       |
| **7** — Same-origin Next.js proxy                        | P11 (proxy passthrough)                                   | Component 2 (proxy routes, `proxyEngineRequest`); Architecture "Key rules" (one-line handlers, relay status+body)                                                                                          |
| **8** — Page-local interfaces as authoritative contracts | P1 (envelope), P4 (field totality), P10 (no inline fetch) | Component 1 (feature hooks, typed `APIResponse<T>`); Data Models (REUSED page-local interfaces)                                                                                                            |
| **9** — Eliminate mocks + inline fetches                 | P9 (no-mock invariant), P10 (no inline fetch)             | "No-mock invariant" note in pseudocode; Testing Strategy → repo-level scan of in-scope pages                                                                                                               |
| **10** — Pagination on history reads                     | P6 (pagination invariant)                                 | "History enrichment" pseudocode (page/pageSize/total); Data Models → `HistoryListResponse`                                                                                                                 |
| **11** — Record `/live` auth-bypass constraint           | P2 (auth seam) — preventive                               | Architecture note "the `/live` PUBLIC_PATHS auth-bypass hazard"; Scope → Out of scope; availability matrix (Live = Defer)                                                                                  |

**Property coverage check (design → requirements):**

The refinement of the acceptance criteria changed individual criterion numbering, so this coverage table is maintained at the requirement granularity (which remains valid and traceable). Each design property is verified by at least one requirement below.

| Design property                  | Verified by requirement(s) |
| -------------------------------- | -------------------------- |
| P1 — Envelope invariant          | 2, 3, 5, 8                 |
| P2 — Auth seam (401)             | 6, 11                      |
| P3 — Scope seam (403)            | 6                          |
| P4 — History enrichment totality | 1, 3, 8                    |
| P5 — Ordering invariant          | 1                          |
| P6 — Pagination invariant        | 10                         |
| P7 — Playlist position invariant | 2                          |
| P8 — User isolation              | 5                          |
| P9 — No-mock invariant           | 1, 2, 3, 4, 9              |
| P10 — No inline fetch            | 8, 9                       |
| P11 — Proxy passthrough          | 7                          |
