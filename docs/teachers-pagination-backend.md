# Teachers list pagination — backend requirements

The frontend loads teachers with server-side pagination:

```http
GET /api/teachers?page=1&limit=200
Authorization: Bearer <token>
```

## Required response shape

Return the current page of rows plus a **total** count (all matching teachers, not just this page):

```json
{
  "data": [ /* up to `limit` teacher objects */ ],
  "total": 8000,
  "page": 1,
  "limit": 200
}
```

Aliases the frontend also understands: `teachers`, `items`, `results`, and `total` / `totalCount` / `count` on the root or under `data`.

## What to configure on the backend

| Item | Recommendation |
|------|----------------|
| **Max `limit`** | Allow at least **200** (frontend default). If you cap at 50/100, raise the cap or document the max. |
| **`total`** | Must be accurate for page count (e.g. 8000 ÷ 200 = 40 pages). |
| **`page`** | 1-based page index (frontend sends `page=1` for first page). |
| **Performance** | Index common sort/filter columns; avoid loading all 8000 rows in memory. |
| **Timeouts** | `limit=200` responses should complete within API timeout (consider DB query tuning). |

## Optional (recommended for 8000+ records)

Search and filters in the UI currently apply **only to the current page** unless the API supports query params, for example:

- `search` — name, email, mobile, subject, city
- `state`, `city`, `status`, `subject`, etc.

Then return filtered `total` and paginate the filtered set.

## No change required if

- `GET /api/teachers?page=&limit=` already works with `limit=200`
- Response includes correct `total`
- No hard cap below 200 on `limit`
