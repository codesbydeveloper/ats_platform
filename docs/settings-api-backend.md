# Settings API — backend requirements

The Settings page (`/settings`) loads and saves configuration via the ATS API (`NEXT_PUBLIC_API_URL`).

All routes require `Authorization: Bearer <token>`.

## GET /api/settings

Returns a **key-value list**:

```json
{
  "settings": [
    { "key": "site_name", "value": "ATS" },
    { "key": "openai_api_key", "value": "" },
    { "key": "openai_api_key_set", "value": "1" },
    { "key": "smtp_host", "value": "smtp.gmail.com" },
    { "key": "smtp_port", "value": "587" },
    { "key": "smtp_username", "value": "noreply@school.edu" },
    { "key": "smtp_password", "value": "" },
    { "key": "smtp_password_set", "value": "1" },
    { "key": "smtp_encryption", "value": "tls" },
    { "key": "smtp_from_email", "value": "noreply@school.edu" },
    { "key": "smtp_from_name", "value": "ATS Teachers" }
  ]
}
```

The frontend also accepts the same array under `data.settings`.

### Keys used by the UI

| Key | Purpose |
|-----|---------|
| `openai_api_key` | OpenAI API key |
| `openai_api_key_set` | `"1"` when a key is stored but not returned |
| `smtp_host` | SMTP host |
| `smtp_port` | Port (string, e.g. `"587"`) |
| `smtp_username` | SMTP user |
| `smtp_password` | SMTP password (may be empty when `smtp_password_set` is set) |
| `smtp_password_set` | `"1"` when password is stored |
| `smtp_encryption` | `tls`, `ssl`, or `none` |
| `smtp_from_email` | From address |
| `smtp_from_name` | From display name |
| `login_logo_url` | Login panel logo (`/file.png` or HTTPS URL) |
| `favicon_url` | Browser favicon |
| `login_heading` | Login panel title |
| `login_description` | Login panel subtitle |
| `copyright_name` | Footer copyright name |
| `copyright_year` | Footer year (e.g. `2026`) |
| `site_name` | Browser tab / site name |

Any other keys are preserved for future use.

## POST /api/settings

Save one or more settings. **Same shape as GET** — only include rows that change:

```json
{
  "settings": [
    { "key": "openai_api_key", "value": "sk-…" },
    { "key": "smtp_host", "value": "smtp.gmail.com" },
    { "key": "smtp_port", "value": "587" },
    { "key": "smtp_username", "value": "user" },
    { "key": "smtp_password", "value": "secret" },
    { "key": "smtp_encryption", "value": "tls" },
    { "key": "smtp_from_email", "value": "noreply@school.edu" },
    { "key": "smtp_from_name", "value": "ATS Teachers" }
  ]
}
```

- Omit `smtp_password` from the array to keep the existing password on the server.
- Response: `{ "settings": [ … ] }` with updated values (same as GET).

`PATCH` with the same body is also fine if your API prefers it.

## POST /api/settings/image

Upload a branding image (login logo or favicon) as **multipart/form-data** on the same settings API.

| Field | Type | Description |
|-------|------|-------------|
| `file` | binary (required) | Image file (PNG, JPG, WebP, GIF, ICO) |
| `key` | string (required) | Setting key: `login_logo_url` or `favicon_url` |

Example (curl):

```bash
curl -X POST "http://localhost:8000/api/settings/image" \
  -H "Authorization: Bearer TOKEN" \
  -F "file=@/path/to/logo.png" \
  -F "key=login_logo_url"
```

The frontend also accepts `POST /api/settings` with the same multipart fields.

Success response — any of these work:

```json
{
  "url": "/uploads/settings/logo-abc123.png"
}
```

```json
{
  "settings": [
    { "key": "login_logo_url", "value": "/uploads/settings/logo-abc123.png" }
  ]
}
```

```json
{
  "message": "Uploaded",
  "data": { "path": "/uploads/settings/logo-abc123.png" }
}
```

If the body is only `{ "message": "OK" }`, the frontend calls **GET /api/settings** after upload to read the saved path.

## POST /api/smtp/test

Send a test message using **saved** SMTP settings.

```json
{
  "email": "someone@example.com"
}
```

Success:

```json
{
  "message": "Test email sent successfully."
}
```
