# Customers

## Purpose

Recording who a sale is for. A customer is a business-owned, no-login reference — a name plus optional contact — that a sale can be attributed to, so the sale is explicitly linked to that individual for tracking, reporting and operational history. A customer is a property of the sale itself and never dictates, restricts or depends on the payment method or status: any sale can be processed with or without one.

Customers are mostly recorded at the point of sale, which is why creating one is open to the cashier as well as the owner and manager.

## API Endpoints

Every route is business-scoped: the business and its default branch come from the session plus the `:businessId` route param, and the acting member from the resolved identity. None of them is ever accepted from the request body.

The request and response shapes below, and the `CustomerFormValues` the create form starts from, are the shared contract in `@mez/types` (`packages/types/src/customers/customers.types.ts`). The shared validation in `@mez/validation` coerces those form values into `CreateCustomerInput`.

| Method | Path                                    | Request               | Success                         |
| ------ | --------------------------------------- | --------------------- | ------------------------------- |
| GET    | `/api/businesses/:businessId/customers` | —                     | `200 CustomerSummaryResponse[]` |
| POST   | `/api/businesses/:businessId/customers` | `CreateCustomerInput` | `201 CreateCustomerResponse`    |

A list read returns each customer as a `CustomerSummary` — its id, name and optional phone and email — which is what a picker and a sale record show. The owning business always comes from the resolved scope, never the body. A blank optional contact is stored as no contact rather than an empty string.
