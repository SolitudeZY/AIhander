-- public.formula_param_names definition

-- Drop table

-- DROP TABLE public.formula_param_names;

CREATE TABLE public.formula_param_names (
	id serial4 NOT NULL,
	formula_id int4 NOT NULL,
	param1_name varchar(20) NULL,
	param2_name varchar(20) NULL,
	param3_name varchar(20) NULL,
	param4_name varchar(20) NULL,
	CONSTRAINT formula_param_names_formula_id_key UNIQUE (formula_id),
	CONSTRAINT formula_param_names_pkey PRIMARY KEY (id)
);
COMMENT ON TABLE public.formula_param_names IS '公式计算参数名';


-- public.formula_param_names foreign keys

ALTER TABLE public.formula_param_names ADD CONSTRAINT fk_formula_param_names__formula FOREIGN KEY (formula_id) REFERENCES public.formula(id) ON DELETE RESTRICT ON UPDATE CASCADE;