-- Run before restarting the management API. Old sessions intentionally stay NULL.
BEGIN;
DO $migration$
BEGIN
    IF to_regclass('public.edge_remote_session') IS NULL THEN
        RAISE EXCEPTION USING
            ERRCODE = '42P01',
            MESSAGE = 'Missing prerequisite table: public.edge_remote_session',
            HINT = 'Run 1.create_edge_cloud_management.sql successfully first. If it failed, fix its platform base schema prerequisites; see script/2.0.0/README.md.';
    END IF;
END
$migration$;
ALTER TABLE public.edge_remote_session ADD COLUMN IF NOT EXISTS recording jsonb;
COMMENT ON COLUMN public.edge_remote_session.recording IS 'Bounded redacted terminal recording; NULL means unavailable';
COMMIT;
