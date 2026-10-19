# Uploads

## Purpose

A reusable module for moving files between the browser and object storage:
authorizing a write, signing a read, and tracking each file's state until it is
confirmed. Bytes never pass through the server — the client sends them straight
to object storage, and the API only ever hands out signed links. The pattern
underneath — presigned transfers, the upload state lifecycle and the claim model
— is in [../file-transfer-architecture.md](../file-transfer-architecture.md);
the `Upload` and `Attachment` entities are in [../schema.md](../schema.md).

Nothing here is specific to any one resource. The module is a self-contained
repo, service, controller and router that a host mounts under a base path and
lends two things: the rules its request bodies are parsed with, and a resolver
that names the uploads a request is about. Today the only host is a business'
products, and the only record type is `PRODUCT`, so every upload is a product's
photo and a caller can only reach images inside a business it owns; the concrete
product mount is in [products.md](products.md). This document describes the
module itself, which serves any resource the same way.

## Concept model

- An `Upload` is one file — an id, a storage key, the reported type and size, and
  a status. It knows nothing about what references it.
- An `Attachment` is one claim: one resource's use of an upload. A resource's
  live claim is its attachment with no `deletedAt`, and that is the file it
  shows.
- Status is `PENDING` until the object is seen in storage, then `ACTIVE`; an
  upload whose object is missing when first read becomes `FAILED`. There is no
  client confirmation step — state is resolved lazily at first read
  (§4.3 there).
- A record's file is one upload and one claim. Replacing it reuses both and
  overwrites the same object; it never creates a second claim (§4.5 there).
- Ids are generated, never chosen: an id is the capability, so the record and its
  scope are derived from the session rather than trusted from the request.

## API endpoints

### POST /uploads

Mounted, the full path is `POST /api/businesses/:businessId/{recordName}/uploads`,
where `recordName` names the host's resource collection.

Authorizes one upload and returns where to send it. The record starts unclaimed —
nothing ties it to a resource until a request names its id.

```
Client -> Authorization: Bearer <jwt> + JSON body
   -> auth middleware resolves the owner
   -> business middleware resolves the scope
   -> validation applies the shared create-upload rules (record, mimeType, size)
   -> service mints an upload id and a storage key, records the upload as
      PENDING, and returns a presigned write link
   -> 201 { upload, uploadUrl }
```

The client sends the bytes straight to `uploadUrl`, so they never pass through
the server. An upload that was authorized and never claimed is reclaimed later —
see the limitations below.

### PUT /:recordId/uploads

Mounted, the full path is `PUT /api/businesses/:businessId/{recordName}/:recordId/uploads`.

Sets or replaces the record's file. The record type travels in the body and the
record id in the route, so no upload id appears in the path or the body — the
resolver finds the record's existing upload, or reports that it has none.

```
Client -> Authorization: Bearer <jwt> + JSON body { record, mimeType, sizeBytes? }
   -> auth middleware resolves the owner
   -> business middleware resolves the scope and the record
   -> validation applies the shared update-upload rules (record, mimeType, sizeBytes)
   -> when the record already has an upload:
        service updates that upload's reported type and size,
        resets its status to PENDING, signs a write url for its
        existing object allowing overwrite, and writes nothing else
      when it has none:
        service mints an upload, records it, claims it for the record,
        and signs a write url
   -> 200 { upload, uploadUrl }
```

When the record already has a file, the upload and its claim are left untouched
and the same object is overwritten in place: the record keeps pointing at one
file, and a replacement whose transfer never lands leaves the old file intact, so
the record is never left without one. The first file on a record created without
one is added here too, and is the only path that writes a new upload.

### GET /uploads/urls

Mounted, the full path is `GET /api/businesses/:businessId/{recordName}/uploads/urls`.

Signs a read link for every file claimed in the business.

```
Client -> Authorization: Bearer <jwt>
   -> auth middleware resolves the owner
   -> business middleware resolves the scope
   -> middleware collects the branch's claimed upload ids
   -> service, per upload: skips a failed one; re-checks an unconfirmed one
      against storage, marking it failed when missing; then signs a link
   -> 200 [ { uploadId, url }, ... ]
```

A failed or missing upload is dropped from the list rather than failing the whole
read, so one broken file never blanks a whole page. The client holds the signed
links for the life of the page.

### GET /:recordId/uploads/:uploadId/url

Mounted, the full path is
`GET /api/businesses/:businessId/{recordName}/:recordId/uploads/:uploadId/url`.

Signs a read link for one record's file.

```
Client -> Authorization: Bearer <jwt>
   -> auth middleware resolves the owner
   -> business middleware resolves the scope
   -> middleware resolves the record's live file, ignoring the upload id
      in the path
   -> service re-checks an unconfirmed upload against storage, marking it
      failed when missing, then signs a link
   -> 200 { url }
```

The address carries the record, not just an upload: the upload id in the path is
overridden by the record's live claim, so the only file this can sign is the one
the record currently shows.

## Usage

- **Attaching a file while creating a record.** On file selection the client
  calls `POST /api/businesses/:businessId/{recordName}/uploads`, immediately gets the
  id and a write link, and previews locally; on submit it waits for that
  authorization if still in flight, sends the bytes to the write link, and
  creates the record naming the upload id — all without the bytes touching the
  server. A failed authorization drops the file, shows why, and the record is
  still created without one.
- **Rendering a page of files.** The page calls
  `GET /api/businesses/:businessId/{recordName}/uploads/urls` to sign a link for every
  upload in one request and each item downloads its own, so a slow or broken file
  neither blocks nor fails its neighbours and a repeat visit re-downloads
  nothing.
- **Replacing a record's file.** The edit form calls
  `PUT /api/businesses/:businessId/{recordName}/:recordId/uploads` for the changed
  file and overwrites the same object. Because the id does not change, the client
  drops that file from its cache after a successful replacement; other open
  sessions keep the old file until they reload.

## Limitations

- **Claims are never verified.** The browser-reported type and size are recorded
  as given and never checked against the stored bytes, so a stray client can
  store a non-image or an oversized file under an image name.
- **A failed transfer is invisible.** The authorization failure is reported, but
  the transfer itself is deliberately not awaited, so one that fails leaves a
  record whose file can never load and tells the user nothing.
- **Nothing reclaims unclaimed uploads.** The "changed my mind" case — a file
  authorized and then abandoned before the record is created — leaves a record
  every time, and the periodic reconciliation the architecture assigns to it is
  not implemented. Write links can expire while a dialog stays open.
- **A replaced file keeps its identity.** A replacement overwrites the object
  behind the same upload id, so the browser cache keyed by that id does not
  invalidate itself; the client that made the change drops its own copy, but
  other sessions keep the old file until they reload.
- **Reads scale with the page.** The batch read signs a link for every upload in
  one unbounded request, and the browser keeps every file it has shown for the
  life of the page, with no eviction.
- **Uploads are images only.** The accepted mime types are one image set and the
  size cap is 10 MB, so any file that is not a supported image is refused before
  it can be stored.

## Error concepts

- Unauthenticated request: the identity cannot be established.
- Not your business: the business is not one the owner owns, or it has no branch
  to scope to.
- Invalid payload: fails the shared create-upload or update-upload rules,
  reported with per-field detail.
- Not found: a specific file was asked for and the record has no live claim for
  it, or its claimed upload turned out not to exist.
- Storage unavailable: storage is not configured in the deployment, or a link
  could not be signed.

Every failure is delivered as a structured error envelope by the global error
handler; see [error-handling.md](error-handling.md).

## Cross-references

- [auth.md](auth.md) — how the acting owner is resolved.
- [business.md](business.md) — where the business and its default branch come
  from.
- [products.md](products.md) — the module's only host today, and the concrete
  product-scoped paths.
- [error-handling.md](error-handling.md) — the structured error envelope.
- [../file-transfer-architecture.md](../file-transfer-architecture.md) — the
  presigned transfer pattern, the upload state lifecycle, and the claim model.
- [../schema.md](../schema.md) — the `Upload` and `Attachment` entities.
