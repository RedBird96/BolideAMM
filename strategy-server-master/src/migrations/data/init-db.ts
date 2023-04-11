/* eslint-disable max-len */

// Dumped via command:
// pg_dump --schema-only --schema public --format plain --host localhost --port 5433 --username staging --exclude-table '*migrations*' --exclude-table '*typeorm_metadata*' --dbname staging_strategy_server > schema.sql
// after that
// 1) Comment config changes at the beginning
// 2) Add IF NOT EXISTS to 'CREATE SCHEMA IF NOT EXISTS public;'
// 3) Remove 'SET default_table_access_method = heap;'

export const PUBLIC_SCHEMA_DUMP = (owner: string) => `
--
-- PostgreSQL database dump
--

-- Dumped from database version 13.2 (Ubuntu 13.2-1.pgdg18.04+1)
-- Dumped by pg_dump version 14.2 (Ubuntu 14.2-1.pgdg20.04+1+b1)

-- SET statement_timeout = 0;
-- SET lock_timeout = 0;
-- SET idle_in_transaction_session_timeout = 0;
-- SET client_encoding = 'UTF8';
-- SET standard_conforming_strings = on;
-- SELECT pg_catalog.set_config('search_path', '', false);
-- SET check_function_bodies = false;
-- SET xmloption = content;
-- SET client_min_messages = warning;
-- SET row_security = off;

--
-- Name: public; Type: SCHEMA; Schema: -; Owner: postgres
--

CREATE SCHEMA IF NOT EXISTS public;

ALTER SCHEMA public OWNER TO "${owner}";

--
-- Name: SCHEMA public; Type: COMMENT; Schema: -; Owner: postgres
--

COMMENT ON SCHEMA public IS 'standard public schema';


--
-- Name: accounts_role_enum; Type: TYPE; Schema: public; Owner: staging
--

CREATE TYPE public.accounts_role_enum AS ENUM (
    'ADMIN'
);


ALTER TYPE public.accounts_role_enum OWNER TO "${owner}";

--
-- Name: operations_run_type_enum; Type: TYPE; Schema: public; Owner: staging
--

CREATE TYPE public.operations_run_type_enum AS ENUM (
    'API',
    'JOB'
);


ALTER TYPE public.operations_run_type_enum OWNER TO "${owner}";

--
-- Name: operations_status_enum; Type: TYPE; Schema: public; Owner: staging
--

CREATE TYPE public.operations_status_enum AS ENUM (
    'PENDING',
    'IN_PROGRESS',
    'SUCCESS',
    'FAILED',
    'FAILED_SHUTDOWN'
);


ALTER TYPE public.operations_status_enum OWNER TO "${owner}";

--
-- Name: operations_type_enum; Type: TYPE; Schema: public; Owner: staging
--

CREATE TYPE public.operations_type_enum AS ENUM (
    'STRATEGY_RUN',
    'CLAIM_RUN'
);


ALTER TYPE public.operations_type_enum OWNER TO "${owner}";

SET default_tablespace = '';

--
-- Name: accounts; Type: TABLE; Schema: public; Owner: staging
--

CREATE TABLE public.accounts (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL,
    name character varying,
    email character varying NOT NULL,
    role public.accounts_role_enum NOT NULL,
    password character varying,
    is_active boolean DEFAULT true NOT NULL,
    telegram_id character varying
);


ALTER TABLE public.accounts OWNER TO "${owner}";

--
-- Name: claim-log; Type: TABLE; Schema: public; Owner: staging
--

CREATE TABLE public."claim-log" (
    id integer NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL,
    uid character varying,
    earn_blid numeric,
    price_blid numeric,
    earn_usd numeric,
    wallet character varying,
    last_tx_block_number integer DEFAULT 0
);


ALTER TABLE public."claim-log" OWNER TO "${owner}";

--
-- Name: claim-log_id_seq; Type: SEQUENCE; Schema: public; Owner: staging
--

CREATE SEQUENCE public."claim-log_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public."claim-log_id_seq" OWNER TO "${owner}";

--
-- Name: claim-log_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: staging
--

ALTER SEQUENCE public."claim-log_id_seq" OWNED BY public."claim-log".id;


--
-- Name: farm-stat; Type: TABLE; Schema: public; Owner: staging
--

CREATE TABLE public."farm-stat" (
    id integer NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL,
    token1 character varying NOT NULL,
    token2 character varying NOT NULL,
    market character varying NOT NULL,
    pair character varying NOT NULL,
    lp_address character varying NOT NULL,
    apr numeric,
    pool_liquidity_usd numeric,
    pool_weight numeric,
    lp_price numeric,
    token1_liquidity numeric,
    token1_price numeric,
    token2_liquidity numeric,
    token2_price numeric,
    total_supply numeric
);


ALTER TABLE public."farm-stat" OWNER TO "${owner}";

--
-- Name: farm-stat_id_seq; Type: SEQUENCE; Schema: public; Owner: staging
--

CREATE SEQUENCE public."farm-stat_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public."farm-stat_id_seq" OWNER TO "${owner}";

--
-- Name: farm-stat_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: staging
--

ALTER SEQUENCE public."farm-stat_id_seq" OWNED BY public."farm-stat".id;


--
-- Name: operations; Type: TABLE; Schema: public; Owner: staging
--

CREATE TABLE public.operations (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL,
    status public.operations_status_enum DEFAULT 'PENDING'::public.operations_status_enum NOT NULL,
    chain_id integer,
    pid integer,
    bull_job_id character varying,
    type public.operations_type_enum,
    run_type public.operations_run_type_enum,
    meta jsonb DEFAULT '{}'::jsonb
);


ALTER TABLE public.operations OWNER TO "${owner}";

--
-- Name: settings; Type: TABLE; Schema: public; Owner: staging
--

CREATE TABLE public.settings (
    id integer NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL,
    target_group_id character varying,
    admin_telegram_id character varying
);


ALTER TABLE public.settings OWNER TO "${owner}";

--
-- Name: settings_id_seq; Type: SEQUENCE; Schema: public; Owner: staging
--

CREATE SEQUENCE public.settings_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.settings_id_seq OWNER TO "${owner}";

--
-- Name: settings_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: staging
--

ALTER SEQUENCE public.settings_id_seq OWNED BY public.settings.id;


--
-- Name: transactions; Type: TABLE; Schema: public; Owner: staging
--

CREATE TABLE public.transactions (
    id integer NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL,
    uid character varying,
    meta jsonb DEFAULT '{}'::jsonb,
    method character varying,
    func character varying,
    hash character varying,
    transaction_raw jsonb DEFAULT '{}'::jsonb
);


ALTER TABLE public.transactions OWNER TO "${owner}";

--
-- Name: transactions_id_seq; Type: SEQUENCE; Schema: public; Owner: staging
--

CREATE SEQUENCE public.transactions_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.transactions_id_seq OWNER TO "${owner}";

--
-- Name: transactions_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: staging
--

ALTER SEQUENCE public.transactions_id_seq OWNED BY public.transactions.id;


--
-- Name: claim-log id; Type: DEFAULT; Schema: public; Owner: staging
--

ALTER TABLE ONLY public."claim-log" ALTER COLUMN id SET DEFAULT nextval('public."claim-log_id_seq"'::regclass);


--
-- Name: farm-stat id; Type: DEFAULT; Schema: public; Owner: staging
--

ALTER TABLE ONLY public."farm-stat" ALTER COLUMN id SET DEFAULT nextval('public."farm-stat_id_seq"'::regclass);


--
-- Name: settings id; Type: DEFAULT; Schema: public; Owner: staging
--

ALTER TABLE ONLY public.settings ALTER COLUMN id SET DEFAULT nextval('public.settings_id_seq'::regclass);


--
-- Name: transactions id; Type: DEFAULT; Schema: public; Owner: staging
--

ALTER TABLE ONLY public.transactions ALTER COLUMN id SET DEFAULT nextval('public.transactions_id_seq'::regclass);


--
-- Name: settings PK_0669fe20e252eb692bf4d344975; Type: CONSTRAINT; Schema: public; Owner: staging
--

ALTER TABLE ONLY public.settings
    ADD CONSTRAINT "PK_0669fe20e252eb692bf4d344975" PRIMARY KEY (id);


--
-- Name: farm-stat PK_274c26ae389ab00be9f28cf3781; Type: CONSTRAINT; Schema: public; Owner: staging
--

ALTER TABLE ONLY public."farm-stat"
    ADD CONSTRAINT "PK_274c26ae389ab00be9f28cf3781" PRIMARY KEY (id);


--
-- Name: accounts PK_5a7a02c20412299d198e097a8fe; Type: CONSTRAINT; Schema: public; Owner: staging
--

ALTER TABLE ONLY public.accounts
    ADD CONSTRAINT "PK_5a7a02c20412299d198e097a8fe" PRIMARY KEY (id);


--
-- Name: operations PK_7b62d84d6f9912b975987165856; Type: CONSTRAINT; Schema: public; Owner: staging
--

ALTER TABLE ONLY public.operations
    ADD CONSTRAINT "PK_7b62d84d6f9912b975987165856" PRIMARY KEY (id);


--
-- Name: transactions PK_a219afd8dd77ed80f5a862f1db9; Type: CONSTRAINT; Schema: public; Owner: staging
--

ALTER TABLE ONLY public.transactions
    ADD CONSTRAINT "PK_a219afd8dd77ed80f5a862f1db9" PRIMARY KEY (id);


--
-- Name: claim-log PK_ab8662c03df0c55a67231c505a7; Type: CONSTRAINT; Schema: public; Owner: staging
--

ALTER TABLE ONLY public."claim-log"
    ADD CONSTRAINT "PK_ab8662c03df0c55a67231c505a7" PRIMARY KEY (id);


--
-- Name: accounts UQ_3ffa9ce30e56b6d2abf0a465f5f; Type: CONSTRAINT; Schema: public; Owner: staging
--

ALTER TABLE ONLY public.accounts
    ADD CONSTRAINT "UQ_3ffa9ce30e56b6d2abf0a465f5f" UNIQUE (telegram_id);


--
-- Name: settings UQ_7e9be3d950df3f9ce204e8015ad; Type: CONSTRAINT; Schema: public; Owner: staging
--

ALTER TABLE ONLY public.settings
    ADD CONSTRAINT "UQ_7e9be3d950df3f9ce204e8015ad" UNIQUE (target_group_id);


--
-- Name: settings UQ_cd9ff04c2adb75f08e53863e9e6; Type: CONSTRAINT; Schema: public; Owner: staging
--

ALTER TABLE ONLY public.settings
    ADD CONSTRAINT "UQ_cd9ff04c2adb75f08e53863e9e6" UNIQUE (admin_telegram_id);


--
-- Name: accounts UQ_ee66de6cdc53993296d1ceb8aa0; Type: CONSTRAINT; Schema: public; Owner: staging
--

ALTER TABLE ONLY public.accounts
    ADD CONSTRAINT "UQ_ee66de6cdc53993296d1ceb8aa0" UNIQUE (email);


--
-- PostgreSQL database dump complete
--
`;
