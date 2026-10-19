# File Transfer Technical Architecture

### Direct-to-Storage File Transfer, Presigned URL Pattern for Upload and Download, with Database State Tracking

---

## 1. Purpose and Scope

This document specifies the architecture for handling user file and media transfer — both upload and download — within the system. It defines the interaction model between the client application, the backend service, and the object storage provider, and establishes the data lifecycle governing uploaded files from initiation through confirmation or expiration.

The architecture is designed to decouple raw data transport from authorization and state management. Object storage is responsible for receiving and serving file bytes; the backend is responsible for issuing access credentials, enforcing authorization, and maintaining an authoritative record of upload status.

---

## 2. Architectural Pattern

**Selected Approach:** Backend-Issued Presigned URLs with Database-Backed State Tracking

Under this pattern, the backend does not handle file bytes directly for either uploads or downloads. Instead, it authorizes each operation by issuing a time-limited, cryptographically signed URL that permits the client to transfer data directly with object storage. Each file is tracked as a discrete record in the application database, created at upload time and referenced on every subsequent download request.

### 2.1 Rationale

| Consideration                   | Justification                                                                                                                                                                                                                  |
| ------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Server resource protection      | Raw file bytes bypass the backend entirely on both upload and download, eliminating memory and bandwidth pressure from large or concurrent transfers.                                                                          |
| Storage provider portability    | The backend relies on standard cryptographic signing rather than provider-specific transfer logic. Migration between providers (e.g., AWS S3, Cloudflare R2) requires only configuration changes, not architectural rework.    |
| Data integrity and traceability | The database record is created prior to the upload attempt and consulted on every download, establishing a single source of truth and avoiding reliance on asynchronous storage webhooks or triggers for state reconciliation. |

### 2.2 Trade-offs

| Consideration               | Impact                                                                                                                                                                                                                              |
| --------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Coordination overhead       | The pattern requires an explicit multi-step handshake between client, backend, and storage provider for every transfer.                                                                                                             |
| Orphaned record risk        | Interrupted or abandoned uploads leave incomplete database records that must be actively reconciled through a background process.                                                                                                   |
| No in-flight transformation | Because the backend does not touch file bytes, transformation (resizing, watermarking, format conversion) is not possible without introducing a proxy step, which reintroduces the resource cost this pattern is designed to avoid. |

---

## 3. Upload Workflow

The upload process is executed in three sequential phases, illustrated below.

```
[Client]                    [Express Backend]              [Object Storage (S3)]
   |                                |                                |
   |  (file selected)               |                                |
   |-- 1. Request upload ------->   |-- 2. Validate metadata          |
   |                                |-- 3. Create Upload record       |
   |                                |      (status: PENDING)         |
   |                                |-- 4. Request presigned URL --->|
   |                                |<-- 5. Return presigned URL ----|
   |<- 6. presigned URL + uploadId-|                                |
   |                                |                                |
   |  (form submitted)              |                                |
   |-- 7a. PUT file ---------------------------------------------------->|
   |-- 7b. Create reference record-->|
         (concurrent with 7a)
```

**Phase 1 — Initialization**
The client requests upload authorization at the moment a file is selected, submitting basic file metadata (MIME type, size) for validation. The backend validates the metadata, creates a database record with status `PENDING`, and requests a presigned URL from the object storage provider. The URL and record identifier are returned to the client. No file bytes are transferred in this phase, and initialization is decoupled from the lifecycle of any form that will reference the upload — the client may continue collecting other input before submission.

**Phase 2 — Direct Data Transfer and Record Creation**
The client transmits the file directly to object storage using the presigned URL. This transfer is not required to precede or block the creation of any entity that will reference the upload; the two operations may occur concurrently at form submission. The backend is not involved in the file transfer and does not process the file payload.

There is no confirmation step. The backend does not rely on client notification to determine transfer outcome; status is instead resolved lazily, as described in Section 4.3.

---

## 4. Download Workflow

Downloads follow the same direct-transfer principle as uploads, but the authorization check is different in nature: rather than confirming _who_ is initiating a write, the backend must confirm _whether the requester is permitted to read this specific file_.

```
[Client]                    [Express Backend]              [Object Storage (S3)]
   |                                |                                |
   |-- 1. Request download ------->|                                |
   |   (record ID + auth token)    |                                |
   |                                |-- 2. Look up Upload via         |
   |                                |      live Attachment            |
   |                                |                                |
   |                                |-- if status = PENDING:          |
   |                                |     3. Verify object exists --->|
   |                                |<-- 4. Existence result --------|
   |                                |     5. Transition to            |
   |                                |        ACTIVE or FAILED        |
   |                                |                                |
   |                                |-- 6. Authorization check --     |
   |                                |   (only if ACTIVE)             |
   |                                |-- 7. Request presigned GET --->|
   |                                |<-- 8. Return presigned URL ----|
   |<- 9. Deliver presigned URL ---|                                |
   |                                |                                |
   |-- 10. GET file directly ----------------------------------------->|
```

**Phase 1 — Request and Authorization**
The client requests a download by file ID, supplying its authorization token. The backend looks up the corresponding database record and verifies both that the file's status is `ACTIVE` and that the requester is permitted to access it.

**Phase 2 — URL Issuance**
Once authorization succeeds, the backend requests a presigned GET URL from object storage and returns it to the client.

**Phase 3 — Direct Data Transfer**
The client retrieves the file directly from object storage using the presigned URL. The backend is not involved in this transfer.

### 4.1 Authorization Models

Since downloaded files in this system are private, every request must pass an access check before a URL is issued. Two models are commonly used, and may be combined:

| Model               | Description                                                                                                                             |
| ------------------- | --------------------------------------------------------------------------------------------------------------------------------------- |
| Ownership-based     | The requester must be the file's original owner (`record.owner_id === requester.id`).                                                   |
| ACL / sharing-based | Access is granted via an explicit permissions table (e.g., `file_shares`), enabling sharing with other users or teams beyond the owner. |

### 4.2 URL Expiration

Presigned download URLs are issued with a short lifetime (typically 1–15 minutes). Because the client requests a fresh URL from the backend for every download, there is no operational reason to issue longer-lived URLs — doing so would only widen the exposure window if a URL is inadvertently retained in browser history, logs, or referrer headers.

### 4.3 Status Precondition

A presigned download URL is issued only for records with status `ACTIVE`. Records in `PENDING` or `FAILED` status have no reliable guarantee that the corresponding file exists in storage, and must not be served.

### 4.4 Claim Model

An `Upload` record does not know what, if anything, references it. Instead, a separate record — an **Attachment** — represents a single claim: a specific entity's use of a specific upload. An `Upload` is considered claimed if at least one live `Attachment` referencing it exists; it is unclaimed if no such record exists, or if all `Attachment` records referencing it have been soft-deleted (Section 4.5).

This indirection is what allows `Upload` to remain fully generic across consumer types: the backend never needs to modify `Upload` itself, or scan multiple consumer tables, to determine whether a given upload is currently in use.

### 4.5 Attachment Lifecycle

An `Attachment` is created at the moment an owning record is created or updated to reference an upload — for example, when a product is submitted. This does not presuppose that the file transfer has already completed by that point: per Section 3, the direct transfer to object storage and the creation of the owning record (and its `Attachment`) occur concurrently at submission, not sequentially. An `Attachment` may therefore reference an `Upload` that is still `PENDING`; this is expected, and is resolved the same way as any other `PENDING` record, lazily, at first download request (Section 4.3).

Not every `Upload` is ever claimed by an `Attachment`. A file may be initialized and transferred and never referenced by any record — for example, when a user selects an image, initiates its upload, and changes their selection before the form is submitted. Such uploads are unclaimed from creation and are reclaimed identically to any other unclaimed upload (Section 6.2).

An `Attachment` is removed by soft deletion rather than by deleting the row outright: a `deletedAt` timestamp is set to indicate that the owning record no longer references the upload, while the `Attachment` row itself is retained. The underlying `Upload` and its object in storage are not affected by this action — they become unclaimed and are handled by reconciliation, not deleted synchronously as part of removing the reference.

> **Current implementation: one live claim.** A record holds a single file and at most one live `Attachment`. Replacing it creates neither a new `Upload` nor a new `Attachment`: the write URL is signed against the existing object with upsert, so the bytes are overwritten in place and a failed replacement leaves the old file intact. A record created without a file gets its first `Upload` and `Attachment` here. Enabling historical or multiple files later is just minting a new `Upload` on a fresh key.

### 4.6 Audit Logging

Because downloaded files are private, each presigned-URL issuance should be logged (requester, file ID, timestamp) to support audit and access-review requirements. This logging is independent of the file's `PENDING` / `ACTIVE` / `FAILED` state and does not introduce any new lifecycle states.

---

## 5. State Lifecycle

Each file record progresses through a defined set of states. This lifecycle governs both upload confirmation and download eligibility — no additional states are introduced for download, which is treated as a stateless read against the existing model.

```
                    [Client initiates upload]
                              |
                              v
                        +-----------+
                        |  PENDING  |
                        +-----------+
                         /         \
        (upload not completed)   (upload completed and confirmed)
                       /             \
                      v               v
               +-----------+     +-----------+
               |  FAILED   |     |  ACTIVE   |
               +-----------+     +-----------+
```

| State     | Description                                                                | Transition Trigger                  |
| --------- | -------------------------------------------------------------------------- | ----------------------------------- |
| `PENDING` | Initial state; record created at authorization time.                       | Upload request received.            |
| `ACTIVE`  | Upload confirmed; eligible for download.                                   | File verified in storage.           |
| `FAILED`  | Upload not completed within the allowed window; not eligible for download. | Reconciliation process (Section 6). |

---

## 6. Reconciliation and Cleanup

To maintain data consistency and control storage costs, two automated mechanisms are defined:

1. **Unresolved Transfer Reconciliation** A scheduled process runs periodically within the backend application. It identifies records remaining in `PENDING` status for longer than a defined threshold and not yet resolved by a prior download request. If the record predates the storage provider's own object lifecycle deletion window (point 2, below), the process performs a storage-layer existence check: if the object exists, the record is transitioned to `ACTIVE`; if not, it is transitioned to `FAILED`. Once that lifecycle window has passed, an unresolved record is transitioned to `FAILED` on age alone, without a storage call, since the underlying object is guaranteed to no longer exist by that point. Resolution by either this process or a download request, whichever occurs first, is authoritative and final.

2. **Storage Lifecycle Policy.** An object lifecycle rule is configured directly on the storage bucket to automatically delete unconfirmed files after 24–48 hours, limiting the retention of unused data at the storage layer independent of application logic.

3. **Unclaimed Upload Reconciliation.** Independently of transfer status, the process identifies Upload records with no live Attachment (Section 4.4) for longer than a defined grace period, and marks them for deletion. This single condition covers every path by which an upload becomes unused — a photo selected and then discarded before the form is submitted, or a claim that is simply abandoned — without requiring the reconciliation process to have any awareness of which entity types reference uploads. The grace period must be sized to accommodate normal in-progress user interaction, such as time spent completing a form, not only transient system-level inconsistency.
