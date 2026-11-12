-- Allows the event types offered by the New Event form:
--   annual_performance, tv_show, event
-- The older types (recital, workshop, competition) stay allowed so existing events keep working.
-- Run once in the Supabase SQL Editor. Safe to run again.

ALTER TABLE events DROP CONSTRAINT IF EXISTS events_type_check;

ALTER TABLE events ADD CONSTRAINT events_type_check
  CHECK (type IN ('annual_performance', 'tv_show', 'event', 'recital', 'workshop', 'competition'));
