# Shipmozo API Integration — Complete Implementation Plan

**Project:** Shipmozo Shipping API Integration  
**Source:** `API Setup Guide.pdf`  
**Execution environment:** Antigravity  
**Purpose:** Implement every API from the guide one-by-one in dependency order.

---

# IMPORTANT — HOW TO EXECUTE THIS FILE

This document contains the **complete implementation roadmap**.

Do NOT implement everything in one pass.

Execute the tasks strictly in the order below:

```text
TASK 01 → TASK 02 → TASK 03 → TASK 04 → TASK 05
→ TASK 06 → TASK 07 → TASK 08 → TASK 09 → TASK 10
→ TASK 11 → TASK 12 → TASK 13
```

For each task:

1. Inspect the existing implementation first.
2. Implement only the current task.
3. Run the relevant tests.
4. Run existing regression tests.
5. Verify the acceptance criteria.
6. Report what changed.
7. **STOP.**
8. Do not start the next task automatically.

The next task should only begin when explicitly requested.

---

# Business Flow

The desired shipping workflow is:

```text
Authentication
      ↓
Warehouse
      ↓
Order Creation
      ↓
Rate Calculation
      ↓
Courier Assignment / Auto Assignment
      ↓
Pickup Scheduling (when required)
      ↓
AWB
      ↓
Tracking
      ↓
Shipping Label
      ↓
Support
   ┌──┴─────────────┐
   ↓                ↓
Return          Cancellation
      ↓
Final Order Status
```

Supporting APIs such as serviceability, return reasons, warehouse management, API health and order detail are implemented where they logically belong.

---

# API Inventory From Documentation

## Foundation

1. Info API
2. Login API

## Order

3. Push-Order API
4. Get-Order-Detail API

## Shipment

5. Rate-Calculator API
6. Assign-Courier API
7. Auto-Assign Order API
8. Schedule-Pickup API

## Tracking / Label

9. Track-Order API
10. Get-Order-Label API

## Returns / Support

11. Get-Return-Reason API
12. Push-Return-Order API
13. Cancel-Order API

## Warehouse

14. Create-Warehouse API
15. Update-Warehouse API
16. Get-Warehouses API

## Validation

17. Pincode-Serviceability API

---

# API Base Configuration

Base URL:

```text
https://shipping-api.com/app/api/v1
```

IMPORTANT:

- Do not add a trailing `/`.
- Every API request requires the configured public key and private key in the request headers.
- Credentials must never be hardcoded.
- Credentials must never be logged.
- Credentials must never be exposed to frontend clients.

Recommended environment configuration:

```text
SHIPMOZO_BASE_URL=https://shipping-api.com/app/api/v1
SHIPMOZO_PUBLIC_KEY=
SHIPMOZO_PRIVATE_KEY=
```

Use the project's existing configuration conventions where possible.

---

# TASK 01 — Authentication & Common API Client

**Priority:** P0 — BLOCKER  
**Phase:** Foundation

## Objective

Build the reusable Shipmozo API foundation used by every other API.

Do not implement business workflows in this task.

## Implement

### Common API Client

Create a centralized client/service supporting:

- Base URL
- Authentication headers
- GET
- POST
- JSON serialization/deserialization
- Timeout
- Network errors
- HTTP errors
- Shipmozo API/business errors
- Safe logging

Do not duplicate HTTP/header logic across future services.

### Authentication

Every request must automatically include:

```text
public-key
private-key
```

Use the exact header convention required by the existing application/API integration.

### Login API

```text
POST /login
```

Request:

```json
{
  "username": "testuser",
  "password": "your_password"
}
```

Successful response contains:

```text
name
public_key
private_key
```

Implement this as a reusable authentication capability if the application's architecture requires dynamic login.

Do not expose or log the private key.

### Info API

```text
GET /info
```

Expected response:

```json
{
  "result": "1",
  "message": "Success",
  "data": {
    "Info": "Hello External V1 Api World!"
  }
}
```

### Common Response

Handle:

```text
result = "1" → success
result = "0" → Shipmozo/API business failure
```

Preserve:

```text
result
message
data
```

### Error Handling

Handle separately:

- configuration errors
- network errors
- timeouts
- HTTP errors
- invalid JSON
- Shipmozo `result = "0"`

## Tests

Test:

- configuration
- authentication headers
- successful response
- API failure
- network failure
- timeout
- HTTP error
- invalid JSON
- Info API

## Acceptance Criteria

- [ ] Centralized Shipmozo client exists.
- [ ] Base URL is configurable.
- [ ] No trailing slash is introduced.
- [ ] Public/private keys are configurable.
- [ ] Headers are automatically added.
- [ ] GET and POST work.
- [ ] Common response handling exists.
- [ ] Errors are distinguishable.
- [ ] Secrets are not logged.
- [ ] Login capability exists where appropriate.
- [ ] Info API works.
- [ ] Tests pass.
- [ ] Existing tests pass.
- [ ] No unrelated functionality is changed.

## STOP

After completion, report files changed, configuration, tests, security and blockers.

**STOP. Do not begin Task 02.**

---

# TASK 02 — Warehouse Integration

**Priority:** P0 — BLOCKER  
**Depends on:** Task 01

## Objective

Implement warehouse retrieval and creation.

The Push-Order API requires `warehouse_id`.

## APIs

### Get Warehouses

```text
GET /get-warehouses
```

Returns warehouse objects including:

```text
id
default
address_title
name
email
phone
alt_phone
address_line_one
address_line_two
pincode
city
state
country
status
```

### Create Warehouse

```text
POST /create-warehouse
```

Required:

```text
address_title
pin_code
```

Optional:

```text
name
phone
alternate_phone
email
address_line_two
```

Important:

- `address_title` should be unique.
- If a warehouse already exists, Get-Warehouses should be used to retrieve its ID.
- Create/reuse behavior must not create duplicate warehouses unnecessarily.

## Implementation

Create a reusable warehouse service.

Suggested methods:

```text
getWarehouses()
createWarehouse(...)
findWarehouse(...)
```

Use project conventions for naming.

## Validation

Validate required fields before API calls.

Do not send invalid warehouse payloads.

## Tests

Test:

- warehouse list success
- empty warehouse list
- warehouse creation success
- duplicate/address-title behavior
- validation failures
- API failure
- network failure

## Acceptance Criteria

- [ ] Get Warehouses implemented.
- [ ] Create Warehouse implemented.
- [ ] Warehouse response models/types exist.
- [ ] Required fields validated.
- [ ] Warehouse ID can be obtained for order creation.
- [ ] No duplicate creation logic is introduced unnecessarily.
- [ ] Tests pass.
- [ ] Existing tests pass.

## STOP

Do not implement Push Order yet.

---

# TASK 03 — Order Creation / Push Order

**Priority:** P0 — CORE  
**Depends on:** Tasks 01–02

## Objective

Implement:

```text
POST /push-order
```

This pushes an order to the Shipmozo panel.

The `order_id` must match the ID created by the website/application.

The API requires a valid `warehouse_id`.

## Request Fields

Required:

```text
order_id
order_date
consignee_name
consignee_phone
consignee_address_line_one
consignee_pin_code
consignee_city
consignee_state
product_detail
payment_type
weight
length
width
height
warehouse_id
```

Optional:

```text
order_type
consignee_alternate_phone
consignee_email
consignee_address_line_two
cod_amount
gst_ewaybill_number
gstin_number
```

`payment_type`:

```text
PREPAID
COD
```

## Product Detail

Support the documented product structure:

```json
[
  {
    "name": "Product Name",
    "sku_number": "22",
    "quantity": 1,
    "discount": "",
    "hsn": "#123",
    "unit_price": 1000,
    "product_category": "Other"
  }
]
```

## Successful Response

Expected data includes:

```text
Info
order_id
reference_id
```

## Important

The application should preserve the Shipmozo response/reference information required for subsequent shipment operations.

Do not invent order IDs.

## Implementation

Create a dedicated order/shipping service following the existing project architecture.

Add request/response types/models.

Add validation.

Map the application's order model to the Shipmozo payload rather than spreading Shipmozo-specific fields throughout the application.

## Tests

Test:

- prepaid order
- COD order
- multiple products
- missing required fields
- invalid dimensions
- invalid weight
- API failure
- successful response
- reference/order ID handling

## Acceptance Criteria

- [ ] Push Order works.
- [ ] Payload matches documentation.
- [ ] Warehouse ID is included.
- [ ] Product details are correctly mapped.
- [ ] COD/prepaid are handled.
- [ ] Response IDs are preserved.
- [ ] Errors are handled.
- [ ] Tests pass.

## STOP

Do not implement courier assignment yet.

---

# TASK 04 — Rate Calculator

**Priority:** P1  
**Depends on:** Task 03

## Objective

Implement:

```text
POST /rate-calculator
```

This calculates courier rates.

## Request

Required:

```text
pickup_pincode
delivery_pincode
payment_type
shipment_type
order_amount
type_of_package
rov_type
weight
dimensions
```

Optional:

```text
order_id
cod_amount
```

Dimensions:

```json
[
  {
    "no_of_box": "1",
    "length": "22",
    "width": "10",
    "height": "10"
  }
]
```

## Implementation

Create a rate calculation service.

Support:

1. Existing order rate calculation using `order_id`.
2. New shipment rate calculation using shipment details.

Do not hardcode courier IDs.

The API's returned courier information must be used for subsequent courier assignment.

## Tests

Test:

- existing order
- new shipment
- COD
- prepaid
- forward shipment
- return shipment if supported by the application's workflow
- dimensions
- API failure

## Acceptance Criteria

- [ ] Rate Calculator works.
- [ ] Request is validated.
- [ ] Courier/rate response is mapped.
- [ ] Courier ID can be passed to assignment.
- [ ] Tests pass.

## STOP

---

# TASK 05 — Courier Assignment / Auto Assignment

**Priority:** P1  
**Depends on:** Task 04

Implement both courier assignment approaches.

---

## 5A — Assign Courier

```text
POST /assign-courier
```

Request:

```json
{
  "order_id": "test123",
  "courier_id": 1
}
```

`courier_id` comes from Rate Calculator.

Response contains:

```text
order_id
reference_id
courier
```

---

## 5B — Auto Assign Order

```text
POST /auto-assign-order
```

Request:

```json
{
  "order_id": "12634WP61391513073"
}
```

Successful response contains:

```text
order_id
reference_id
awb_number
courier_company
courier_company_service
```

Auto assignment requires the corresponding setting to be configured in the Shipmozo panel.

Handle the documented error:

```text
please setup auto assign
```

## Implementation

Provide a clear application-level choice between:

```text
manual courier assignment
```

and:

```text
automatic courier assignment
```

Do not silently switch between the two.

## Tests

Test:

- manual assignment
- auto assignment
- missing courier ID
- invalid courier
- auto assignment not configured
- API failure
- successful AWB response

## Acceptance Criteria

- [ ] Manual assignment works.
- [ ] Auto assignment works.
- [ ] Courier ID comes from rate calculation.
- [ ] AWB is preserved.
- [ ] Errors are handled.
- [ ] Tests pass.

## STOP

---

# TASK 06 — Pickup Scheduling

**Priority:** P1  
**Depends on:** Task 05

## Objective

Implement:

```text
POST /schedule-pickup
```

## Request

```json
{
  "order_id": "test123"
}
```

This API is used when:

```text
pickups_automatically_scheduled = NO
```

from the rate calculation/shipment configuration.

## Response

Preserve:

```text
order_id
reference_id
courier
awb_number
lr_number
```

## Important

Do not schedule pickup if the shipment is configured for automatic pickup scheduling.

The application should avoid duplicate scheduling attempts.

## Tests

Test:

- manual pickup scheduling
- automatic pickup condition
- successful AWB/LR response
- invalid order
- duplicate scheduling protection
- API failure

## Acceptance Criteria

- [ ] Schedule Pickup implemented.
- [ ] Automatic/manual scheduling behavior respected.
- [ ] AWB stored/preserved.
- [ ] LR number stored/preserved.
- [ ] Tests pass.

## STOP

---

# TASK 07 — Tracking

**Priority:** P1  
**Depends on:** Task 05/06

## Objective

Implement:

```text
GET /track-order?awb_number={awb}
```

Example:

```text
GET /track-order?awb_number=GGN9000181640
```

## Response

Preserve:

```text
order_id
reference_id
awb_number
courier
expected_delivery_date
current_status
status_time
scan_detail
```

## Implementation

Create tracking service:

```text
trackOrder(awbNumber)
```

Validate AWB before calling the API.

Map Shipmozo tracking statuses to the application's existing status model if one exists.

Do not invent status values. If the application has a status mapping, document the mapping.

## Tests

Test:

- valid AWB
- invalid/missing AWB
- current status
- scan details
- expected delivery date
- API failure

## Acceptance Criteria

- [ ] Tracking endpoint works.
- [ ] AWB validation exists.
- [ ] Tracking response is mapped.
- [ ] Scan details are preserved.
- [ ] Tests pass.

## STOP

---

# TASK 08 — Shipping Label

**Priority:** P1  
**Depends on:** Task 07 / AWB availability

## Objective

Implement:

```text
GET /get-order-label/{awb_number}
```

The response contains a base64-encoded PNG label.

## Response

Preserve:

```text
label
created_at
```

Example:

```text
data:image/png;base64,...
```

## Implementation

Create label service:

```text
getOrderLabel(awbNumber)
```

Validate AWB.

Keep the base64 label handling separate from tracking logic.

If the application already has file/image storage utilities, integrate with them rather than introducing duplicate storage mechanisms.

Do not log the entire base64 image.

## Tests

Test:

- valid AWB
- invalid AWB
- base64 response
- created_at
- API failure
- large response handling

## Acceptance Criteria

- [ ] Label API works.
- [ ] Base64 label is handled correctly.
- [ ] Label is not logged.
- [ ] Tests pass.

## STOP

---

# TASK 09 — Order Detail / Final Status Foundation

**Priority:** P2  
**Depends on:** Task 03

## Objective

Implement:

```text
GET /get-order-detail/{order_id}
```

This provides order-level information.

## Implementation

Create:

```text
getOrderDetail(orderId)
```

Validate `order_id`.

Use this endpoint as one of the sources for the final order state.

Do not assume the exact response fields beyond what the API returns; preserve the API data according to the application's model.

## Tests

Test:

- valid order
- invalid order
- API failure
- response mapping

## Acceptance Criteria

- [ ] Get Order Detail works.
- [ ] Order ID validation exists.
- [ ] Response is safely mapped.
- [ ] Tests pass.

## STOP

---

# TASK 10 — Return Support

**Priority:** P2  
**Depends on:** Tasks 01, 02, 03

Implement:

1. Get Return Reason
2. Push Return Order

---

## 10A — Get Return Reason

```text
GET /get-return-reason
```

Returns:

```text
id
title
```

Example reasons include:

```text
1  Delivery Date has changed
8  No longer Needed
9  Item is damaged
10 Received wrong item
11 Parcel damaged on arrival
12 Size not as expected
13 Changed my mind
14 Other
```

Do not hardcode these values in application logic.

Fetch them from the API.

---

## 10B — Push Return Order

```text
POST /push-return-order
```

Required:

```text
order_id
order_date
pickup_name
pickup_phone
pickup_address_line_one
pickup_pin_code
pickup_city
pickup_state
product_detail
payment_type
weight
length
width
height
return_reason_id
customer_request
```

Optional:

```text
order_type
pickup_email
pickup_address_line_two
warehouse_id
reason_comment
```

Example:

```json
{
  "order_id": "ordID",
  "order_date": "2024-07-27",
  "order_type": "ESSENTIALS",
  "pickup_name": "John",
  "pickup_phone": 8000042323,
  "pickup_email": "johnhelp@gmail.com",
  "pickup_address_line_one": "Sector 49",
  "pickup_address_line_two": "Sohna Road",
  "pickup_pin_code": 122001,
  "pickup_city": "Gurgaon",
  "pickup_state": "Haryana",
  "product_detail": [],
  "payment_type": "PREPAID",
  "weight": 2,
  "length": 10,
  "width": 500,
  "height": 15,
  "warehouse_id": "",
  "return_reason_id": 9,
  "customer_request": "REFUND",
  "reason_comment": ""
}
```

## Important

`return_reason_id` must come from Get Return Reason.

Do not allow arbitrary reason IDs without validation if the application can validate against the retrieved list.

## Tests

Test:

- fetching return reasons
- return order creation
- valid reason
- invalid reason
- missing required fields
- refund request
- API failure

## Acceptance Criteria

- [ ] Return reasons API implemented.
- [ ] Return order API implemented.
- [ ] Reason ID is validated.
- [ ] Return payload is correct.
- [ ] Tests pass.

## STOP

---

# TASK 11 — Cancellation Support

**Priority:** P2  
**Depends on:** AWB availability

## Objective

Implement:

```text
POST /cancel-order
```

Request:

```json
{
  "order_id": "test123",
  "awb_number": 38389839839839
}
```

Both are required.

## Implementation

Create:

```text
cancelOrder(orderId, awbNumber)
```

Validate both fields.

Do not allow cancellation without an AWB because the API requires it.

Preserve:

```text
order_id
reference_id
```

## Tests

Test:

- valid cancellation
- missing order ID
- missing AWB
- invalid AWB
- API failure
- successful response

## Acceptance Criteria

- [ ] Cancellation API implemented.
- [ ] Required fields validated.
- [ ] Successful response handled.
- [ ] Errors handled.
- [ ] Tests pass.

## STOP

---

# TASK 12 — Warehouse Update

**Priority:** P2  
**Depends on:** Tasks 02 and 03

## Objective

Implement:

```text
POST /order/update-warehouse
```

Request:

```json
{
  "order_id": "test123",
  "warehouse_id": 1
}
```

Required:

```text
order_id
warehouse_id
```

## Implementation

Create:

```text
updateOrderWarehouse(orderId, warehouseId)
```

Validate:

- order ID
- warehouse ID

Use a warehouse ID obtained from the warehouse integration.

Preserve:

```text
order_id
reference_id
```

## Tests

Test:

- valid update
- invalid warehouse
- missing order
- API failure
- successful response

## Acceptance Criteria

- [ ] Update Warehouse API implemented.
- [ ] Warehouse ID validation exists.
- [ ] Tests pass.

## STOP

---

# TASK 13 — Pincode Serviceability + Final Status + Health

**Priority:** P3  
**Depends on:** Tasks 01–12

This is the final integration/verification task.

---

## 13A — Pincode Serviceability

Implement:

```text
POST /pincode-serviceability
```

Request:

```json
{
  "pickup_pincode": 122001,
  "delivery_pincode": 110001
}
```

Response:

```json
{
  "result": "1",
  "message": "Success",
  "data": {
    "serviceable": true
  }
}
```

Create:

```text
checkServiceability(pickupPincode, deliveryPincode)
```

Validate both pincodes.

Tests:

- serviceable
- not serviceable
- invalid pincodes
- API failure

---

# 13B — Final Order Status

Combine the implemented order APIs into a reliable final status flow.

Potential sources:

```text
Get Order Detail
Track Order
```

Tracking provides:

```text
current_status
status_time
expected_delivery_date
scan_detail
awb_number
courier
```

Order detail provides order-level information.

## Important

Do not invent a status mapping that is not supported by the existing application.

If the application already has an order status state machine:

1. Inspect it.
2. Map Shipmozo status into the existing states.
3. Document the mapping.
4. Add tests for every mapped status.

If there is no existing state machine, preserve the Shipmozo status rather than inventing a large new set of statuses.

## Final Status Requirements

The final shipment/order representation should make it possible to determine:

```text
Order ID
Reference ID
AWB
Courier
Current Status
Status Time
Expected Delivery Date
Tracking/Scan Details
```

Where data is available.

---

# 13C — API Health Check

Verify the Info API remains functional:

```text
GET /info
```

This should be usable for diagnostics/monitoring.

Do not expose private credentials in health-check output.

---

# Final Integration Tests

After all APIs are implemented, add/verify an end-to-end test flow.

## Forward Order Flow

```text
1. Authentication
2. Get/Create Warehouse
3. Push Order
4. Rate Calculator
5. Assign Courier OR Auto Assign
6. Schedule Pickup if required
7. Obtain AWB
8. Track Order
9. Get Shipping Label
10. Get Order Detail
```

## Return Flow

```text
1. Get Return Reasons
2. Validate selected return reason
3. Push Return Order
```

## Cancellation Flow

```text
1. Existing order
2. AWB available
3. Cancel Order
```

## Warehouse Flow

```text
1. Get Warehouses
2. Create Warehouse if needed
3. Push Order using warehouse ID
4. Update Order Warehouse when required
```

## Validation Flow

```text
Pincode Serviceability
```

---

# Final Acceptance Checklist

## Foundation

- [ ] Authentication implemented
- [ ] Common API client implemented
- [ ] Public/private keys secured
- [ ] Info API implemented
- [ ] Login API implemented where required

## Warehouse

- [ ] Get Warehouses
- [ ] Create Warehouse
- [ ] Update Warehouse

## Order

- [ ] Push Order
- [ ] Get Order Detail

## Shipment

- [ ] Rate Calculator
- [ ] Assign Courier
- [ ] Auto Assign Order
- [ ] Schedule Pickup

## Tracking

- [ ] Track Order
- [ ] Get Order Label

## Support

- [ ] Get Return Reason
- [ ] Push Return Order
- [ ] Cancel Order

## Validation

- [ ] Pincode Serviceability

## Quality

- [ ] Unit tests
- [ ] Integration tests where appropriate
- [ ] End-to-end forward shipment test
- [ ] Return flow test
- [ ] Cancellation flow test
- [ ] Warehouse flow test
- [ ] Error handling tested
- [ ] Timeout handling tested
- [ ] API failure handling tested
- [ ] No credentials in source control
- [ ] No credentials in logs
- [ ] No private credentials exposed to frontend
- [ ] Existing application tests pass
- [ ] No unrelated functionality broken

---

# Final Expected Architecture

Use the existing project architecture where possible.

Conceptually, the implementation should have a structure similar to:

```text
Shipmozo API Client
        │
        ├── Authentication
        │
        ├── Info
        │
        ├── Warehouse Service
        │      ├── Get Warehouses
        │      ├── Create Warehouse
        │      └── Update Warehouse
        │
        ├── Order Service
        │      ├── Push Order
        │      └── Get Order Detail
        │
        ├── Shipment Service
        │      ├── Rate Calculator
        │      ├── Assign Courier
        │      ├── Auto Assign
        │      └── Schedule Pickup
        │
        ├── Tracking Service
        │      ├── Track Order
        │      └── Get Label
        │
        ├── Return Service
        │      ├── Get Return Reasons
        │      └── Push Return Order
        │
        ├── Cancellation Service
        │      └── Cancel Order
        │
        └── Validation Service
               └── Pincode Serviceability
```

This is conceptual only. Follow the existing project's architecture instead of forcing this exact directory structure.

---

# Important Development Rules

## 1. Do not guess API behavior

Use the API Setup Guide as the source of truth for:

- endpoint
- HTTP method
- request fields
- required fields
- response structure
- documented dependencies

If something is not documented, inspect the existing project before deciding.

If still unknown, clearly report the uncertainty instead of inventing behavior.

## 2. Do not rewrite unrelated code

Only change code required for the current task.

## 3. Do not expose credentials

Never commit or print:

```text
public-key
private-key
username
password
```

in places where they should not appear.

## 4. Preserve existing architecture

If the project already has:

- API clients
- services
- repositories
- DTOs
- validators
- environment configuration
- error classes
- test utilities

reuse them.

## 5. Validate before API calls

Required fields should be validated before making external API requests.

## 6. Avoid duplicate external calls

Especially for:

- warehouse creation
- pickup scheduling
- courier assignment
- order creation

Use appropriate application state/idempotency mechanisms if the existing application supports them.

Do not invent a new idempotency system unless needed.

## 7. Keep Shipmozo-specific code isolated

The rest of the application should not need to know how Shipmozo HTTP requests work.

Use a clean boundary between:

```text
Application Domain
        ↓
Shipmozo Service/Adapter
        ↓
Shipmozo API
```

## 8. Every task must be independently testable

Do not mark a task complete merely because code compiles.

Run:

- task-specific tests
- relevant existing tests
- lint/type checks where applicable
- build checks where applicable

---

# Task Completion Protocol

At the end of EVERY task, Antigravity must report:

```text
TASK: <number and name>

STATUS:
COMPLETED / BLOCKED

FILES CREATED:
- ...

FILES MODIFIED:
- ...

IMPLEMENTATION:
- ...

TESTS:
- ...

TEST RESULTS:
- ...

CONFIGURATION:
- ...

SECURITY:
- ...

ASSUMPTIONS:
- ...

BLOCKERS:
- ...

NEXT TASK:
<Task number and name>
```

Then:

**STOP.**

Do not automatically continue to the next task.

---

# Execution Order Summary

```text
P0
TASK 01 — Authentication & Common API Client
        ↓
TASK 02 — Warehouse Integration
        ↓
TASK 03 — Order Creation / Push Order

P1
        ↓
TASK 04 — Rate Calculator
        ↓
TASK 05 — Courier Assignment / Auto Assignment
        ↓
TASK 06 — Pickup Scheduling
        ↓
TASK 07 — Tracking
        ↓
TASK 08 — Shipping Label

P2
        ↓
TASK 09 — Order Detail
        ↓
TASK 10 — Return Support
        ↓
TASK 11 — Cancellation
        ↓
TASK 12 — Warehouse Update

P3
        ↓
TASK 13 — Serviceability + Final Status + Health
        ↓
FINAL END-TO-END VERIFICATION
```

# DONE

When Task 13 and the final end-to-end verification are complete, provide a final integration report containing:

1. All implemented APIs
2. Files/modules created
3. Files/modules modified
4. Environment variables
5. Database/schema changes, if any
6. API flows implemented
7. Tests added
8. Test results
9. Known limitations
10. Remaining manual configuration required in the Shipmozo panel
11. Security review
12. Final recommendation for production readiness
