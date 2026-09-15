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
[Client]                    [Express Backend]              [Object Storage]
   |                                |                                |
   |-- 1. Request upload -------->|                                |
   |                                |-- 2. Create DB record          |
   |                                |      (status: PENDING)         |
   |                                |                                |
   |                                |-- 3. Request presigned URL --->|
   |                                |<-- 4. Return presigned URL ----|
   |<- 5. Deliver presigned URL ---|                                |
   |      and DB record ID         |                                |
   |                                |                                |
   |-- 6. Upload file (PUT) ------------------------------------------>|
   |                                |                                |
   |-- 7. Confirm completion ----->|                                |
   |                                |-- 8. Update DB record          |
   |                                |      (status: ACTIVE)          |
```

**Phase 1 — Initialization and Authorization**
The client submits an upload request to the backend. The backend creates a database record with status `PENDING` and requests a presigned URL from the object storage provider. The URL, together with the database record identifier, is returned to the client.

**Phase 2 — Direct Data Transfer**
The client transmits the file directly to object storage using the presigned URL. The backend is not involved in this transfer and does not process the file payload.

**Phase 3 — Confirmation**
The client notifies the backend upon successful upload. The backend updates the corresponding database record to status `ACTIVE`, marking the file as available for use.

---

## 4. Download Workflow

Downloads follow the same direct-transfer principle as uploads, but the authorization check is different in nature: rather than confirming _who_ is initiating a write, the backend must confirm _whether the requester is permitted to read this specific file_.

```
[Client]                    [Express Backend]              [Object Storage (S3)]
   |                                |                                |
   |-- 1. Request download ------->|                                |
   |   (file ID + auth token)      |                                |
   |                                |-- 2. Look up DB record          |
   |                                |      (owner check, status)     |
   |                                |                                |
   |                                |-- 3. Authorization check --     |
   |                                |   (is requester allowed?)      |
   |                                |                                |
   |                                |-- 4. Request presigned GET --->|
   |                                |<-- 5. Return presigned URL ----|
   |<- 6. Deliver presigned URL ---|                                |
   |                                |                                |
   |-- 7. GET file directly ------------------------------------------>|
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

### 4.4 Audit Logging

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

1. **Database Reconciliation.** A scheduled process runs daily within the backend application. It identifies records remaining in the `PENDING` state for longer than six hours and transitions them to `FAILED`, preventing incomplete uploads from appearing as valid content or being downloadable.

2. **Storage Lifecycle Policy.** An object lifecycle rule is configured directly on the storage bucket to automatically delete unconfirmed files after 24–48 hours, limiting the retention of unused data at the storage layer independent of application logic.
