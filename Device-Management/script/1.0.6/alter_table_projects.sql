ALTER TABLE public.projects ADD create_by int4 NULL;
COMMENT ON COLUMN public.projects.create_by IS '创建人ID';