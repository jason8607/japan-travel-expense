-- Opt-in flag for the daily cashback-alert cron.
-- Defaults to true so existing subscribers automatically receive cashback alerts.
-- Set to false when the user disables the cashback warning in notification settings.
alter table public.push_subscriptions
  add column if not exists cashback_alert_enabled boolean not null default true;
