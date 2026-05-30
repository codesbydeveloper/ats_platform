import type { SiteBranding } from "@/lib/site-branding";

export type SmtpEncryption = "tls" | "ssl" | "none";

/** One row in GET/POST `{ "settings": [ … ] }`. */
export type SettingEntry = {
  key: string;
  value: string;
};

export type SettingsPayload = {
  settings: SettingEntry[];
};

/** Keys used in the `settings` array (server key-value store). */
export const SETTING_KEYS = {
  OPENAI_API_KEY: "openai_api_key",
  OPENAI_API_KEY_SET: "openai_api_key_set",
  SMTP_HOST: "smtp_host",
  SMTP_PORT: "smtp_port",
  SMTP_USERNAME: "smtp_username",
  SMTP_PASSWORD: "smtp_password",
  SMTP_PASSWORD_SET: "smtp_password_set",
  SMTP_ENCRYPTION: "smtp_encryption",
  SMTP_FROM_EMAIL: "smtp_from_email",
  SMTP_FROM_NAME: "smtp_from_name",
  SITE_NAME: "site_name",
  LOGIN_LOGO_URL: "login_logo_url",
  FAVICON_URL: "favicon_url",
  LOGIN_HEADING: "login_heading",
  LOGIN_DESCRIPTION: "login_description",
  COPYRIGHT_NAME: "copyright_name",
  COPYRIGHT_YEAR: "copyright_year",
} as const;

export type { SiteBranding } from "@/lib/site-branding";

export type SmtpSettings = {
  host: string;
  port: number;
  username: string;
  password: string;
  encryption: SmtpEncryption;
  fromEmail: string;
  fromName: string;
  /** Server has a password stored (value may be omitted in GET). */
  passwordConfigured: boolean;
};

export type AppSettings = {
  openaiApiKey: string;
  /** Server has an API key stored (value may be omitted in GET). */
  openaiApiKeyConfigured: boolean;
  smtp: SmtpSettings;
  branding: SiteBranding;
  /** Extra keys from API not mapped to known forms. */
  extra: SettingEntry[];
};

export type UpdateAppSettingsInput = {
  openaiApiKey?: string;
  branding?: Partial<SiteBranding>;
  smtp?: Partial<{
    host: string;
    port: number;
    username: string;
    password: string;
    encryption: SmtpEncryption;
    fromEmail: string;
    fromName: string;
  }>;
  /** Additional `{ key, value }` rows to include in the same save request. */
  extra?: SettingEntry[];
};

export type SendTestEmailInput = {
  email: string;
};
