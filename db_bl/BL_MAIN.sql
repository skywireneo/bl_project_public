--
-- PostgreSQL database dump
--

\restrict hCOal4agfRNePfLPPxxTkU6eHSSXMsiBcacRicI9maQ8RjRJ38T0u2vLQHi5eUU

-- Dumped from database version 17.11 (Debian 17.11-1.pgdg13+2)
-- Dumped by pg_dump version 17.10

-- Started on 2026-09-12 16:43:29 UTC

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- TOC entry 313 (class 1255 OID 56463)
-- Name: increment_notification_channel_stat(integer, integer); Type: FUNCTION; Schema: public; Owner: admin
--

CREATE FUNCTION public.increment_notification_channel_stat(p_channel_id integer, p_group_id integer) RETURNS void
    LANGUAGE plpgsql
    AS $$
BEGIN
    INSERT INTO notification_channel_stats (channel_id, group_id, notifications_sent, last_sent_at)
    VALUES (p_channel_id, p_group_id, 1, NOW())
    ON CONFLICT (channel_id, group_id) 
    DO UPDATE SET 
        notifications_sent = notification_channel_stats.notifications_sent + 1,
        last_sent_at = NOW();
END;
$$;


ALTER FUNCTION public.increment_notification_channel_stat(p_channel_id integer, p_group_id integer) OWNER TO admin;

SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- TOC entry 281 (class 1259 OID 34709)
-- Name: action_telemetry; Type: TABLE; Schema: public; Owner: admin
--

CREATE TABLE public.action_telemetry (
    id bigint NOT NULL,
    module character varying(100) NOT NULL,
    action character varying(100) NOT NULL,
    os character varying(50),
    browser character varying(50),
    browser_version character varying(50),
    device_type character varying(20),
    screen_resolution character varying(20),
    connection_type character varying(20),
    ip_hash character varying(64),
    created_at timestamp with time zone DEFAULT now(),
    language character varying(20),
    timezone character varying(50)
);


ALTER TABLE public.action_telemetry OWNER TO admin;

--
-- TOC entry 280 (class 1259 OID 34708)
-- Name: action_telemetry_id_seq; Type: SEQUENCE; Schema: public; Owner: admin
--

ALTER TABLE public.action_telemetry ALTER COLUMN id ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME public.action_telemetry_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- TOC entry 275 (class 1259 OID 34653)
-- Name: admin_user_data; Type: TABLE; Schema: public; Owner: admin
--

CREATE TABLE public.admin_user_data (
    id integer NOT NULL,
    user_id integer NOT NULL,
    is_active boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT now(),
    deactivated_at timestamp with time zone,
    secondary_password_hash character varying(150),
    secondary_password_set_at timestamp with time zone,
    must_change_password boolean DEFAULT false
);


ALTER TABLE public.admin_user_data OWNER TO admin;

--
-- TOC entry 274 (class 1259 OID 34652)
-- Name: admin_user_data_id_seq; Type: SEQUENCE; Schema: public; Owner: admin
--

CREATE SEQUENCE public.admin_user_data_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.admin_user_data_id_seq OWNER TO admin;

--
-- TOC entry 4217 (class 0 OID 0)
-- Dependencies: 274
-- Name: admin_user_data_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: admin
--

ALTER SEQUENCE public.admin_user_data_id_seq OWNED BY public.admin_user_data.id;


--
-- TOC entry 252 (class 1259 OID 18034)
-- Name: antivirus_scans; Type: TABLE; Schema: public; Owner: admin
--

CREATE TABLE public.antivirus_scans (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    file_table character varying(50) DEFAULT 'files'::character varying,
    file_size bigint DEFAULT 0,
    file_hash character varying(64),
    mimetype character varying(200),
    status character varying(50) DEFAULT 'pending'::character varying NOT NULL,
    is_infected boolean DEFAULT false,
    verdict character varying(100),
    confidence integer DEFAULT 0,
    threats jsonb DEFAULT '[]'::jsonb,
    threat_count integer DEFAULT 0,
    scan_details jsonb DEFAULT '{}'::jsonb,
    triggered_rules text[] DEFAULT ARRAY[]::text[],
    chains jsonb DEFAULT '[]'::jsonb,
    scan_engine character varying(100) DEFAULT 'internal'::character varying,
    scan_version character varying(50),
    scanned_at timestamp without time zone DEFAULT now(),
    created_at timestamp without time zone DEFAULT now(),
    scan_seed character varying(100),
    scan_duration_ms integer DEFAULT 0,
    file_id uuid
);


ALTER TABLE public.antivirus_scans OWNER TO admin;

--
-- TOC entry 254 (class 1259 OID 34393)
-- Name: critical_actions; Type: TABLE; Schema: public; Owner: admin
--

CREATE TABLE public.critical_actions (
    id integer NOT NULL,
    id_name character varying(30) NOT NULL,
    title character varying(50) NOT NULL,
    description text NOT NULL,
    category character varying(20) NOT NULL,
    severity integer NOT NULL,
    "confirmText" character varying(30),
    consequences jsonb,
    icon character varying(50) NOT NULL,
    "lastExecuted" timestamp without time zone,
    "executedBy" bigint,
    "executionCount" integer DEFAULT 0 NOT NULL,
    value character varying(255),
    active boolean DEFAULT true NOT NULL,
    need_extra_confirmation boolean DEFAULT true NOT NULL,
    need_value boolean DEFAULT false NOT NULL,
    "logText" text
);


ALTER TABLE public.critical_actions OWNER TO admin;

--
-- TOC entry 255 (class 1259 OID 34404)
-- Name: critical_actions_history; Type: TABLE; Schema: public; Owner: admin
--

CREATE TABLE public.critical_actions_history (
    uuid text NOT NULL,
    critical_action_id integer NOT NULL,
    "user" bigint NOT NULL,
    datetime timestamp without time zone NOT NULL,
    status integer NOT NULL,
    action_text character varying(100) NOT NULL
);


ALTER TABLE public.critical_actions_history OWNER TO admin;

--
-- TOC entry 270 (class 1259 OID 34553)
-- Name: donation_access_attempts; Type: TABLE; Schema: public; Owner: admin
--

CREATE TABLE public.donation_access_attempts (
    attempt_id integer NOT NULL,
    email_hesh text,
    email_encrypted text,
    email_iv text,
    email_auth_tag text,
    method character varying(20),
    success boolean NOT NULL,
    failure_reason character varying(50),
    ip_address inet NOT NULL,
    user_agent text,
    created_at timestamp without time zone DEFAULT (now() AT TIME ZONE 'UTC'::text)
);


ALTER TABLE public.donation_access_attempts OWNER TO admin;

--
-- TOC entry 4222 (class 0 OID 0)
-- Dependencies: 270
-- Name: TABLE donation_access_attempts; Type: COMMENT; Schema: public; Owner: admin
--

COMMENT ON TABLE public.donation_access_attempts IS 'Попытки доступа к плюшкам (антифрод)';


--
-- TOC entry 4223 (class 0 OID 0)
-- Dependencies: 270
-- Name: COLUMN donation_access_attempts.method; Type: COMMENT; Schema: public; Owner: admin
--

COMMENT ON COLUMN public.donation_access_attempts.method IS 'Способ входа: token или code';


--
-- TOC entry 4224 (class 0 OID 0)
-- Dependencies: 270
-- Name: COLUMN donation_access_attempts.failure_reason; Type: COMMENT; Schema: public; Owner: admin
--

COMMENT ON COLUMN public.donation_access_attempts.failure_reason IS 'Причина неудачи: invalid_token, invalid_code, rate_limited, expired';


--
-- TOC entry 269 (class 1259 OID 34552)
-- Name: donation_access_attempts_attempt_id_seq; Type: SEQUENCE; Schema: public; Owner: admin
--

CREATE SEQUENCE public.donation_access_attempts_attempt_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.donation_access_attempts_attempt_id_seq OWNER TO admin;

--
-- TOC entry 4226 (class 0 OID 0)
-- Dependencies: 269
-- Name: donation_access_attempts_attempt_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: admin
--

ALTER SEQUENCE public.donation_access_attempts_attempt_id_seq OWNED BY public.donation_access_attempts.attempt_id;


--
-- TOC entry 264 (class 1259 OID 34480)
-- Name: donation_activations; Type: TABLE; Schema: public; Owner: admin
--

CREATE TABLE public.donation_activations (
    activation_id integer NOT NULL,
    email_hesh text NOT NULL,
    email_encrypted text NOT NULL,
    email_iv text NOT NULL,
    email_auth_tag text NOT NULL,
    request_id integer,
    package_id integer,
    checks_granted integer NOT NULL,
    checks_remaining integer NOT NULL,
    activated_at timestamp without time zone DEFAULT (now() AT TIME ZONE 'UTC'::text) NOT NULL,
    expires_at timestamp without time zone NOT NULL,
    is_active boolean DEFAULT true,
    created_at timestamp without time zone DEFAULT (now() AT TIME ZONE 'UTC'::text),
    updated_at timestamp without time zone DEFAULT (now() AT TIME ZONE 'UTC'::text)
);


ALTER TABLE public.donation_activations OWNER TO admin;

--
-- TOC entry 4228 (class 0 OID 0)
-- Dependencies: 264
-- Name: TABLE donation_activations; Type: COMMENT; Schema: public; Owner: admin
--

COMMENT ON TABLE public.donation_activations IS 'Активации плюшек для донатеров';


--
-- TOC entry 4229 (class 0 OID 0)
-- Dependencies: 264
-- Name: COLUMN donation_activations.checks_granted; Type: COMMENT; Schema: public; Owner: admin
--

COMMENT ON COLUMN public.donation_activations.checks_granted IS 'Всего начислено проверок';


--
-- TOC entry 4230 (class 0 OID 0)
-- Dependencies: 264
-- Name: COLUMN donation_activations.checks_remaining; Type: COMMENT; Schema: public; Owner: admin
--

COMMENT ON COLUMN public.donation_activations.checks_remaining IS 'Остаток проверок';


--
-- TOC entry 4231 (class 0 OID 0)
-- Dependencies: 264
-- Name: COLUMN donation_activations.expires_at; Type: COMMENT; Schema: public; Owner: admin
--

COMMENT ON COLUMN public.donation_activations.expires_at IS 'Дата истечения (включительно)';


--
-- TOC entry 4232 (class 0 OID 0)
-- Dependencies: 264
-- Name: COLUMN donation_activations.is_active; Type: COMMENT; Schema: public; Owner: admin
--

COMMENT ON COLUMN public.donation_activations.is_active IS 'Активна ли активация (false после истечения)';


--
-- TOC entry 263 (class 1259 OID 34479)
-- Name: donation_activations_activation_id_seq; Type: SEQUENCE; Schema: public; Owner: admin
--

CREATE SEQUENCE public.donation_activations_activation_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.donation_activations_activation_id_seq OWNER TO admin;

--
-- TOC entry 4234 (class 0 OID 0)
-- Dependencies: 263
-- Name: donation_activations_activation_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: admin
--

ALTER SEQUENCE public.donation_activations_activation_id_seq OWNED BY public.donation_activations.activation_id;


--
-- TOC entry 266 (class 1259 OID 34507)
-- Name: donation_active_perks; Type: TABLE; Schema: public; Owner: admin
--

CREATE TABLE public.donation_active_perks (
    active_perk_id integer NOT NULL,
    email_hesh text NOT NULL,
    email_encrypted text NOT NULL,
    email_iv text NOT NULL,
    email_auth_tag text NOT NULL,
    activation_id integer NOT NULL,
    perk_id integer NOT NULL,
    activated_at timestamp without time zone DEFAULT (now() AT TIME ZONE 'UTC'::text) NOT NULL,
    expires_at timestamp without time zone NOT NULL,
    is_active boolean DEFAULT true,
    created_at timestamp without time zone DEFAULT (now() AT TIME ZONE 'UTC'::text)
);


ALTER TABLE public.donation_active_perks OWNER TO admin;

--
-- TOC entry 4236 (class 0 OID 0)
-- Dependencies: 266
-- Name: TABLE donation_active_perks; Type: COMMENT; Schema: public; Owner: admin
--

COMMENT ON TABLE public.donation_active_perks IS 'Активные плюшки донатеров';


--
-- TOC entry 4237 (class 0 OID 0)
-- Dependencies: 266
-- Name: COLUMN donation_active_perks.expires_at; Type: COMMENT; Schema: public; Owner: admin
--

COMMENT ON COLUMN public.donation_active_perks.expires_at IS 'Дата истечения плюшки';


--
-- TOC entry 4238 (class 0 OID 0)
-- Dependencies: 266
-- Name: COLUMN donation_active_perks.is_active; Type: COMMENT; Schema: public; Owner: admin
--

COMMENT ON COLUMN public.donation_active_perks.is_active IS 'Активна ли плюшка';


--
-- TOC entry 265 (class 1259 OID 34506)
-- Name: donation_active_perks_active_perk_id_seq; Type: SEQUENCE; Schema: public; Owner: admin
--

CREATE SEQUENCE public.donation_active_perks_active_perk_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.donation_active_perks_active_perk_id_seq OWNER TO admin;

--
-- TOC entry 4240 (class 0 OID 0)
-- Dependencies: 265
-- Name: donation_active_perks_active_perk_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: admin
--

ALTER SEQUENCE public.donation_active_perks_active_perk_id_seq OWNED BY public.donation_active_perks.active_perk_id;


--
-- TOC entry 268 (class 1259 OID 34534)
-- Name: donation_check_log; Type: TABLE; Schema: public; Owner: admin
--

CREATE TABLE public.donation_check_log (
    log_id integer NOT NULL,
    email_hesh text NOT NULL,
    email_encrypted text NOT NULL,
    email_iv text NOT NULL,
    email_auth_tag text NOT NULL,
    activation_id integer,
    operation character varying(20) NOT NULL,
    amount integer NOT NULL,
    balance_after integer NOT NULL,
    incident_id character varying(50),
    admin_login character varying(100),
    comment text,
    created_at timestamp without time zone DEFAULT (now() AT TIME ZONE 'UTC'::text)
);


ALTER TABLE public.donation_check_log OWNER TO admin;

--
-- TOC entry 4242 (class 0 OID 0)
-- Dependencies: 268
-- Name: TABLE donation_check_log; Type: COMMENT; Schema: public; Owner: admin
--

COMMENT ON TABLE public.donation_check_log IS 'История операций с проверками';


--
-- TOC entry 4243 (class 0 OID 0)
-- Dependencies: 268
-- Name: COLUMN donation_check_log.operation; Type: COMMENT; Schema: public; Owner: admin
--

COMMENT ON COLUMN public.donation_check_log.operation IS 'Тип: grant (начисление), spend (списание), expire (сгорание), adjust (корректировка)';


--
-- TOC entry 4244 (class 0 OID 0)
-- Dependencies: 268
-- Name: COLUMN donation_check_log.amount; Type: COMMENT; Schema: public; Owner: admin
--

COMMENT ON COLUMN public.donation_check_log.amount IS 'Количество: положительное для grant, отрицательное для spend/expire';


--
-- TOC entry 4245 (class 0 OID 0)
-- Dependencies: 268
-- Name: COLUMN donation_check_log.balance_after; Type: COMMENT; Schema: public; Owner: admin
--

COMMENT ON COLUMN public.donation_check_log.balance_after IS 'Баланс после операции';


--
-- TOC entry 267 (class 1259 OID 34533)
-- Name: donation_check_log_log_id_seq; Type: SEQUENCE; Schema: public; Owner: admin
--

CREATE SEQUENCE public.donation_check_log_log_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.donation_check_log_log_id_seq OWNER TO admin;

--
-- TOC entry 4247 (class 0 OID 0)
-- Dependencies: 267
-- Name: donation_check_log_log_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: admin
--

ALTER SEQUENCE public.donation_check_log_log_id_seq OWNED BY public.donation_check_log.log_id;


--
-- TOC entry 260 (class 1259 OID 34441)
-- Name: donation_package_perks; Type: TABLE; Schema: public; Owner: admin
--

CREATE TABLE public.donation_package_perks (
    package_id integer NOT NULL,
    perk_id integer NOT NULL
);


ALTER TABLE public.donation_package_perks OWNER TO admin;

--
-- TOC entry 4249 (class 0 OID 0)
-- Dependencies: 260
-- Name: TABLE donation_package_perks; Type: COMMENT; Schema: public; Owner: admin
--

COMMENT ON TABLE public.donation_package_perks IS 'Связь пакетов и плюшек (many-to-many)';


--
-- TOC entry 259 (class 1259 OID 34427)
-- Name: donation_packages; Type: TABLE; Schema: public; Owner: admin
--

CREATE TABLE public.donation_packages (
    package_id integer NOT NULL,
    code_name character varying(50) NOT NULL,
    display_name character varying(100) NOT NULL,
    description text,
    min_amount numeric(10,2) NOT NULL,
    max_amount numeric(10,2),
    checks_granted integer NOT NULL,
    duration_days integer NOT NULL,
    is_active boolean DEFAULT true,
    sort_order integer DEFAULT 0,
    icon character varying(50),
    color character varying(20),
    created_at timestamp without time zone DEFAULT (now() AT TIME ZONE 'UTC'::text),
    updated_at timestamp without time zone DEFAULT (now() AT TIME ZONE 'UTC'::text)
);


ALTER TABLE public.donation_packages OWNER TO admin;

--
-- TOC entry 4251 (class 0 OID 0)
-- Dependencies: 259
-- Name: TABLE donation_packages; Type: COMMENT; Schema: public; Owner: admin
--

COMMENT ON TABLE public.donation_packages IS 'Пакеты донатов: сумма → проверки + срок';


--
-- TOC entry 4252 (class 0 OID 0)
-- Dependencies: 259
-- Name: COLUMN donation_packages.min_amount; Type: COMMENT; Schema: public; Owner: admin
--

COMMENT ON COLUMN public.donation_packages.min_amount IS 'Минимальная сумма для активации пакета';


--
-- TOC entry 4253 (class 0 OID 0)
-- Dependencies: 259
-- Name: COLUMN donation_packages.max_amount; Type: COMMENT; Schema: public; Owner: admin
--

COMMENT ON COLUMN public.donation_packages.max_amount IS 'Максимальная сумма (NULL = без ограничения)';


--
-- TOC entry 4254 (class 0 OID 0)
-- Dependencies: 259
-- Name: COLUMN donation_packages.checks_granted; Type: COMMENT; Schema: public; Owner: admin
--

COMMENT ON COLUMN public.donation_packages.checks_granted IS 'Количество проверок в пакете';


--
-- TOC entry 4255 (class 0 OID 0)
-- Dependencies: 259
-- Name: COLUMN donation_packages.duration_days; Type: COMMENT; Schema: public; Owner: admin
--

COMMENT ON COLUMN public.donation_packages.duration_days IS 'Срок действия в днях';


--
-- TOC entry 258 (class 1259 OID 34426)
-- Name: donation_packages_package_id_seq; Type: SEQUENCE; Schema: public; Owner: admin
--

CREATE SEQUENCE public.donation_packages_package_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.donation_packages_package_id_seq OWNER TO admin;

--
-- TOC entry 4257 (class 0 OID 0)
-- Dependencies: 258
-- Name: donation_packages_package_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: admin
--

ALTER SEQUENCE public.donation_packages_package_id_seq OWNED BY public.donation_packages.package_id;


--
-- TOC entry 257 (class 1259 OID 34412)
-- Name: donation_perks; Type: TABLE; Schema: public; Owner: admin
--

CREATE TABLE public.donation_perks (
    perk_id integer NOT NULL,
    code_name character varying(50) NOT NULL,
    display_name character varying(100) NOT NULL,
    description text,
    icon character varying(50),
    color character varying(20),
    sort_order integer DEFAULT 0,
    is_active boolean DEFAULT true,
    created_at timestamp without time zone DEFAULT (now() AT TIME ZONE 'UTC'::text),
    updated_at timestamp without time zone DEFAULT (now() AT TIME ZONE 'UTC'::text)
);


ALTER TABLE public.donation_perks OWNER TO admin;

--
-- TOC entry 4259 (class 0 OID 0)
-- Dependencies: 257
-- Name: TABLE donation_perks; Type: COMMENT; Schema: public; Owner: admin
--

COMMENT ON TABLE public.donation_perks IS 'Справочник плюшек для донатеров';


--
-- TOC entry 4260 (class 0 OID 0)
-- Dependencies: 257
-- Name: COLUMN donation_perks.code_name; Type: COMMENT; Schema: public; Owner: admin
--

COMMENT ON COLUMN public.donation_perks.code_name IS 'Уникальный код плюшки (pro_checks, remove_limits, ...)';


--
-- TOC entry 4261 (class 0 OID 0)
-- Dependencies: 257
-- Name: COLUMN donation_perks.display_name; Type: COMMENT; Schema: public; Owner: admin
--

COMMENT ON COLUMN public.donation_perks.display_name IS 'Отображаемое название';


--
-- TOC entry 4262 (class 0 OID 0)
-- Dependencies: 257
-- Name: COLUMN donation_perks.description; Type: COMMENT; Schema: public; Owner: admin
--

COMMENT ON COLUMN public.donation_perks.description IS 'Описание для пользователя';


--
-- TOC entry 4263 (class 0 OID 0)
-- Dependencies: 257
-- Name: COLUMN donation_perks.icon; Type: COMMENT; Schema: public; Owner: admin
--

COMMENT ON COLUMN public.donation_perks.icon IS 'FontAwesome иконка (fa-magnifying-glass)';


--
-- TOC entry 4264 (class 0 OID 0)
-- Dependencies: 257
-- Name: COLUMN donation_perks.color; Type: COMMENT; Schema: public; Owner: admin
--

COMMENT ON COLUMN public.donation_perks.color IS 'Цвет для UI (#6366f1)';


--
-- TOC entry 4265 (class 0 OID 0)
-- Dependencies: 257
-- Name: COLUMN donation_perks.is_active; Type: COMMENT; Schema: public; Owner: admin
--

COMMENT ON COLUMN public.donation_perks.is_active IS 'Доступна ли плюшка для выдачи';


--
-- TOC entry 256 (class 1259 OID 34411)
-- Name: donation_perks_perk_id_seq; Type: SEQUENCE; Schema: public; Owner: admin
--

CREATE SEQUENCE public.donation_perks_perk_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.donation_perks_perk_id_seq OWNER TO admin;

--
-- TOC entry 4267 (class 0 OID 0)
-- Dependencies: 256
-- Name: donation_perks_perk_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: admin
--

ALTER SEQUENCE public.donation_perks_perk_id_seq OWNED BY public.donation_perks.perk_id;


--
-- TOC entry 262 (class 1259 OID 34457)
-- Name: donation_requests; Type: TABLE; Schema: public; Owner: admin
--

CREATE TABLE public.donation_requests (
    request_id integer NOT NULL,
    email_hesh text NOT NULL,
    email_encrypted text NOT NULL,
    email_iv text NOT NULL,
    email_auth_tag text NOT NULL,
    status character varying(20) DEFAULT 'pending'::character varying NOT NULL,
    actual_amount numeric(10,2),
    package_id integer,
    processed_by character varying(100),
    processed_at timestamp without time zone,
    rejection_reason text,
    email_sent boolean DEFAULT false,
    email_sent_at timestamp without time zone,
    email_sent_by character varying(100),
    access_token_hash character varying(255),
    access_code_hash character varying(255),
    ip_address inet,
    user_agent text,
    notes text,
    requested_at timestamp without time zone DEFAULT (now() AT TIME ZONE 'UTC'::text),
    created_at timestamp without time zone DEFAULT (now() AT TIME ZONE 'UTC'::text),
    updated_at timestamp without time zone DEFAULT (now() AT TIME ZONE 'UTC'::text)
);


ALTER TABLE public.donation_requests OWNER TO admin;

--
-- TOC entry 4269 (class 0 OID 0)
-- Dependencies: 262
-- Name: TABLE donation_requests; Type: COMMENT; Schema: public; Owner: admin
--

COMMENT ON TABLE public.donation_requests IS 'Заявки на донат от пользователей';


--
-- TOC entry 4270 (class 0 OID 0)
-- Dependencies: 262
-- Name: COLUMN donation_requests.email_hesh; Type: COMMENT; Schema: public; Owner: admin
--

COMMENT ON COLUMN public.donation_requests.email_hesh IS 'SHA-256 хеш email для поиска';


--
-- TOC entry 4271 (class 0 OID 0)
-- Dependencies: 262
-- Name: COLUMN donation_requests.email_encrypted; Type: COMMENT; Schema: public; Owner: admin
--

COMMENT ON COLUMN public.donation_requests.email_encrypted IS 'Зашифрованный email (AES-256-GCM)';


--
-- TOC entry 4272 (class 0 OID 0)
-- Dependencies: 262
-- Name: COLUMN donation_requests.email_iv; Type: COMMENT; Schema: public; Owner: admin
--

COMMENT ON COLUMN public.donation_requests.email_iv IS 'Вектор инициализации шифрования';


--
-- TOC entry 4273 (class 0 OID 0)
-- Dependencies: 262
-- Name: COLUMN donation_requests.email_auth_tag; Type: COMMENT; Schema: public; Owner: admin
--

COMMENT ON COLUMN public.donation_requests.email_auth_tag IS 'Тег аутентификации шифрования';


--
-- TOC entry 4274 (class 0 OID 0)
-- Dependencies: 262
-- Name: COLUMN donation_requests.status; Type: COMMENT; Schema: public; Owner: admin
--

COMMENT ON COLUMN public.donation_requests.status IS 'Статус: pending, approved, rejected';


--
-- TOC entry 4275 (class 0 OID 0)
-- Dependencies: 262
-- Name: COLUMN donation_requests.actual_amount; Type: COMMENT; Schema: public; Owner: admin
--

COMMENT ON COLUMN public.donation_requests.actual_amount IS 'Фактическая сумма с донатной платформы';


--
-- TOC entry 4276 (class 0 OID 0)
-- Dependencies: 262
-- Name: COLUMN donation_requests.access_token_hash; Type: COMMENT; Schema: public; Owner: admin
--

COMMENT ON COLUMN public.donation_requests.access_token_hash IS 'SHA-256 хеш токена доступа';


--
-- TOC entry 4277 (class 0 OID 0)
-- Dependencies: 262
-- Name: COLUMN donation_requests.access_code_hash; Type: COMMENT; Schema: public; Owner: admin
--

COMMENT ON COLUMN public.donation_requests.access_code_hash IS 'bcrypt хеш кодового слова';


--
-- TOC entry 261 (class 1259 OID 34456)
-- Name: donation_requests_request_id_seq; Type: SEQUENCE; Schema: public; Owner: admin
--

CREATE SEQUENCE public.donation_requests_request_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.donation_requests_request_id_seq OWNER TO admin;

--
-- TOC entry 4279 (class 0 OID 0)
-- Dependencies: 261
-- Name: donation_requests_request_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: admin
--

ALTER SEQUENCE public.donation_requests_request_id_seq OWNED BY public.donation_requests.request_id;


--
-- TOC entry 271 (class 1259 OID 34566)
-- Name: donation_settings; Type: TABLE; Schema: public; Owner: admin
--

CREATE TABLE public.donation_settings (
    setting_key character varying(50) NOT NULL,
    setting_value jsonb NOT NULL,
    description text,
    updated_by character varying(100),
    updated_at timestamp without time zone DEFAULT (now() AT TIME ZONE 'UTC'::text)
);


ALTER TABLE public.donation_settings OWNER TO admin;

--
-- TOC entry 4281 (class 0 OID 0)
-- Dependencies: 271
-- Name: TABLE donation_settings; Type: COMMENT; Schema: public; Owner: admin
--

COMMENT ON TABLE public.donation_settings IS 'Глобальные настройки системы донатов';


--
-- TOC entry 248 (class 1259 OID 18006)
-- Name: file_settings; Type: TABLE; Schema: public; Owner: admin
--

CREATE TABLE public.file_settings (
    id integer NOT NULL,
    category character varying(50) NOT NULL,
    max_size_mb integer NOT NULL,
    allowed_extensions text[] NOT NULL,
    allowed_mime_types text[] NOT NULL,
    is_active boolean DEFAULT true,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now(),
    updated_by bigint
);


ALTER TABLE public.file_settings OWNER TO admin;

--
-- TOC entry 249 (class 1259 OID 18016)
-- Name: file_settings_id_seq; Type: SEQUENCE; Schema: public; Owner: admin
--

ALTER TABLE public.file_settings ALTER COLUMN id ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME public.file_settings_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- TOC entry 250 (class 1259 OID 18017)
-- Name: files; Type: TABLE; Schema: public; Owner: admin
--

CREATE TABLE public.files (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    module character varying(20) NOT NULL,
    record_id character varying(100) NOT NULL,
    file_name text NOT NULL,
    created_at timestamp without time zone,
    file_size bigint,
    mimetype text,
    sort_order integer,
    updated_at timestamp without time zone,
    user_added_id bigint,
    antivirus_scan_id uuid,
    "VR_ORDER" bigint
);


ALTER TABLE public.files OWNER TO admin;

--
-- TOC entry 251 (class 1259 OID 18025)
-- Name: files_single; Type: TABLE; Schema: public; Owner: admin
--

CREATE TABLE public.files_single (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    code_name character varying(20) NOT NULL,
    name character varying(20) NOT NULL,
    descr text NOT NULL,
    type character varying(10) NOT NULL,
    attached boolean NOT NULL,
    can_delete boolean NOT NULL,
    file_name text,
    max_size_mb integer NOT NULL,
    updated_at timestamp without time zone,
    antivirus_scan_id uuid,
    forder integer DEFAULT 0 NOT NULL
);


ALTER TABLE public.files_single OWNER TO admin;

--
-- TOC entry 246 (class 1259 OID 17984)
-- Name: incident_change_history; Type: TABLE; Schema: public; Owner: admin
--

CREATE TABLE public.incident_change_history (
    record_id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id bigint NOT NULL,
    action character varying(100) NOT NULL,
    date_time timestamp without time zone NOT NULL,
    incident_id character varying(15) NOT NULL
);


ALTER TABLE public.incident_change_history OWNER TO admin;

--
-- TOC entry 247 (class 1259 OID 17991)
-- Name: incident_conditions_statuses; Type: TABLE; Schema: public; Owner: admin
--

CREATE TABLE public.incident_conditions_statuses (
    status_id integer NOT NULL,
    status_code_name character varying(40) NOT NULL,
    status_name character varying(30) NOT NULL,
    button_text character varying(30),
    descr text,
    button_color character varying(15),
    need_alert boolean DEFAULT false NOT NULL
);


ALTER TABLE public.incident_conditions_statuses OWNER TO admin;

--
-- TOC entry 239 (class 1259 OID 17935)
-- Name: incident_persone_connector; Type: TABLE; Schema: public; Owner: admin
--

CREATE TABLE public.incident_persone_connector (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    incident_id character varying(15) NOT NULL,
    person_id uuid NOT NULL,
    active boolean DEFAULT true NOT NULL
);


ALTER TABLE public.incident_persone_connector OWNER TO admin;

--
-- TOC entry 238 (class 1259 OID 17929)
-- Name: incident_persones; Type: TABLE; Schema: public; Owner: admin
--

CREATE TABLE public.incident_persones (
    person_id uuid DEFAULT gen_random_uuid() NOT NULL,
    birth_date date,
    post_id bigint NOT NULL,
    date_add timestamp without time zone NOT NULL
);


ALTER TABLE public.incident_persones OWNER TO admin;

--
-- TOC entry 236 (class 1259 OID 17916)
-- Name: incident_pvz; Type: TABLE; Schema: public; Owner: admin
--

CREATE TABLE public.incident_pvz (
    pvz_id uuid DEFAULT gen_random_uuid() NOT NULL,
    type_id bigint NOT NULL,
    addr_city character varying(50) NOT NULL,
    addr_street character varying(100) NOT NULL,
    addr_home character varying(10) NOT NULL,
    active boolean DEFAULT true NOT NULL,
    date_first_add timestamp without time zone NOT NULL,
    is_verified boolean DEFAULT false
);


ALTER TABLE public.incident_pvz OWNER TO admin;

--
-- TOC entry 237 (class 1259 OID 17923)
-- Name: incident_pvz_connector; Type: TABLE; Schema: public; Owner: admin
--

CREATE TABLE public.incident_pvz_connector (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    incident_id character varying(15) NOT NULL,
    pvz_id uuid NOT NULL,
    active boolean DEFAULT true NOT NULL
);


ALTER TABLE public.incident_pvz_connector OWNER TO admin;

--
-- TOC entry 231 (class 1259 OID 17881)
-- Name: incidents_data_dictionary; Type: TABLE; Schema: public; Owner: admin
--

CREATE TABLE public.incidents_data_dictionary (
    element_id bigint NOT NULL,
    type character varying(30) NOT NULL,
    name character varying(80) NOT NULL,
    active boolean DEFAULT true NOT NULL,
    ball integer DEFAULT 0 NOT NULL,
    create_at timestamp without time zone NOT NULL,
    created_by bigint NOT NULL,
    deleted boolean,
    deleted_at timestamp without time zone,
    deleted_by bigint,
    addon_data jsonb
);


ALTER TABLE public.incidents_data_dictionary OWNER TO admin;

--
-- TOC entry 232 (class 1259 OID 17888)
-- Name: incidents_data_dictionary_element_id_seq; Type: SEQUENCE; Schema: public; Owner: admin
--

ALTER TABLE public.incidents_data_dictionary ALTER COLUMN element_id ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME public.incidents_data_dictionary_element_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- TOC entry 233 (class 1259 OID 17889)
-- Name: incidents_main_info; Type: TABLE; Schema: public; Owner: admin
--

CREATE TABLE public.incidents_main_info (
    incident_id character varying(15) NOT NULL,
    type integer NOT NULL,
    date_add timestamp without time zone NOT NULL,
    user_add_email_id uuid,
    add_reason_id bigint NOT NULL,
    user_description text NOT NULL,
    active boolean DEFAULT true NOT NULL,
    user_add_tg_id uuid,
    deleted boolean DEFAULT false NOT NULL,
    deleted_reason text,
    condition_id integer DEFAULT 1 NOT NULL,
    interest_score bigint DEFAULT 0 NOT NULL,
    moderator_id bigint,
    views bigint DEFAULT 0,
    tg_post boolean DEFAULT false,
    rejection_reason text,
    admin_assessment jsonb DEFAULT '{}'::jsonb,
    parent_incident_id character varying(15),
    publish_on_success boolean DEFAULT false,
    partially_contested boolean DEFAULT false,
    contestation_creator_id text,
    ai_response_flag boolean DEFAULT false NOT NULL,
    ai_response jsonb,
    show_ai_response boolean DEFAULT false NOT NULL
);


ALTER TABLE public.incidents_main_info OWNER TO admin;

--
-- TOC entry 4295 (class 0 OID 0)
-- Dependencies: 233
-- Name: COLUMN incidents_main_info.parent_incident_id; Type: COMMENT; Schema: public; Owner: admin
--

COMMENT ON COLUMN public.incidents_main_info.parent_incident_id IS 'ID основного инцидента для оспариваний (type=2). NULL для обычных инцидентов.';


--
-- TOC entry 4296 (class 0 OID 0)
-- Dependencies: 233
-- Name: COLUMN incidents_main_info.publish_on_success; Type: COMMENT; Schema: public; Owner: admin
--

COMMENT ON COLUMN public.incidents_main_info.publish_on_success IS 'Флаг публикации оспаривания после успешного завершения (скрытие персональных данных).';


--
-- TOC entry 4297 (class 0 OID 0)
-- Dependencies: 233
-- Name: COLUMN incidents_main_info.contestation_creator_id; Type: COMMENT; Schema: public; Owner: admin
--

COMMENT ON COLUMN public.incidents_main_info.contestation_creator_id IS 'Создатель оспаривания: UUID персоны, null (сторонний свидетель), или -1 (не указывать).';


--
-- TOC entry 310 (class 1259 OID 56416)
-- Name: notification_admin_history; Type: TABLE; Schema: public; Owner: admin
--

CREATE TABLE public.notification_admin_history (
    id integer NOT NULL,
    actor_user_id integer,
    action_type character varying(50) NOT NULL,
    target_id integer,
    target_type character varying(20) NOT NULL,
    target_name character varying(255),
    old_value jsonb DEFAULT '{}'::jsonb,
    new_value jsonb DEFAULT '{}'::jsonb,
    created_at timestamp without time zone DEFAULT now(),
    CONSTRAINT notification_admin_history_action_type_check CHECK (((action_type)::text = ANY ((ARRAY['GROUP_CREATED'::character varying, 'GROUP_UPDATED'::character varying, 'GROUP_DELETED'::character varying, 'CHANNEL_TOGGLED'::character varying, 'GROUP_CHANNEL_ADDED'::character varying, 'GROUP_CHANNEL_REMOVED'::character varying, 'TEMPLATE_UPDATED'::character varying, 'DEFAULTS_UPDATED'::character varying, 'BROADCAST_SENT'::character varying])::text[]))),
    CONSTRAINT notification_admin_history_target_type_check CHECK (((target_type)::text = ANY ((ARRAY['group'::character varying, 'channel'::character varying, 'role'::character varying, 'broadcast'::character varying])::text[])))
);


ALTER TABLE public.notification_admin_history OWNER TO admin;

--
-- TOC entry 309 (class 1259 OID 56415)
-- Name: notification_admin_history_id_seq; Type: SEQUENCE; Schema: public; Owner: admin
--

CREATE SEQUENCE public.notification_admin_history_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.notification_admin_history_id_seq OWNER TO admin;

--
-- TOC entry 4300 (class 0 OID 0)
-- Dependencies: 309
-- Name: notification_admin_history_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: admin
--

ALTER SEQUENCE public.notification_admin_history_id_seq OWNED BY public.notification_admin_history.id;


--
-- TOC entry 308 (class 1259 OID 56395)
-- Name: notification_channel_stats; Type: TABLE; Schema: public; Owner: admin
--

CREATE TABLE public.notification_channel_stats (
    id integer NOT NULL,
    channel_id integer NOT NULL,
    group_id integer NOT NULL,
    notifications_sent integer DEFAULT 0,
    last_sent_at timestamp without time zone
);


ALTER TABLE public.notification_channel_stats OWNER TO admin;

--
-- TOC entry 307 (class 1259 OID 56394)
-- Name: notification_channel_stats_id_seq; Type: SEQUENCE; Schema: public; Owner: admin
--

CREATE SEQUENCE public.notification_channel_stats_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.notification_channel_stats_id_seq OWNER TO admin;

--
-- TOC entry 4303 (class 0 OID 0)
-- Dependencies: 307
-- Name: notification_channel_stats_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: admin
--

ALTER SEQUENCE public.notification_channel_stats_id_seq OWNED BY public.notification_channel_stats.id;


--
-- TOC entry 294 (class 1259 OID 56253)
-- Name: notification_channels; Type: TABLE; Schema: public; Owner: admin
--

CREATE TABLE public.notification_channels (
    id integer NOT NULL,
    code character varying(50) NOT NULL,
    name character varying(100) NOT NULL,
    description text,
    is_active boolean DEFAULT true,
    created_at timestamp without time zone DEFAULT now()
);


ALTER TABLE public.notification_channels OWNER TO admin;

--
-- TOC entry 293 (class 1259 OID 56252)
-- Name: notification_channels_id_seq; Type: SEQUENCE; Schema: public; Owner: admin
--

CREATE SEQUENCE public.notification_channels_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.notification_channels_id_seq OWNER TO admin;

--
-- TOC entry 4306 (class 0 OID 0)
-- Dependencies: 293
-- Name: notification_channels_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: admin
--

ALTER SEQUENCE public.notification_channels_id_seq OWNED BY public.notification_channels.id;


--
-- TOC entry 302 (class 1259 OID 56325)
-- Name: notification_default_role_settings; Type: TABLE; Schema: public; Owner: admin
--

CREATE TABLE public.notification_default_role_settings (
    id integer NOT NULL,
    role_code character varying(50) NOT NULL,
    group_id integer NOT NULL,
    channel_id integer NOT NULL,
    is_enabled boolean DEFAULT true,
    sound_enabled boolean DEFAULT true
);


ALTER TABLE public.notification_default_role_settings OWNER TO admin;

--
-- TOC entry 301 (class 1259 OID 56324)
-- Name: notification_default_role_settings_id_seq; Type: SEQUENCE; Schema: public; Owner: admin
--

CREATE SEQUENCE public.notification_default_role_settings_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.notification_default_role_settings_id_seq OWNER TO admin;

--
-- TOC entry 4309 (class 0 OID 0)
-- Dependencies: 301
-- Name: notification_default_role_settings_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: admin
--

ALTER SEQUENCE public.notification_default_role_settings_id_seq OWNED BY public.notification_default_role_settings.id;


--
-- TOC entry 298 (class 1259 OID 56286)
-- Name: notification_group_channels; Type: TABLE; Schema: public; Owner: admin
--

CREATE TABLE public.notification_group_channels (
    id integer NOT NULL,
    group_id integer NOT NULL,
    channel_id integer NOT NULL,
    is_enabled boolean DEFAULT true,
    is_locked_for_user boolean DEFAULT false
);


ALTER TABLE public.notification_group_channels OWNER TO admin;

--
-- TOC entry 297 (class 1259 OID 56285)
-- Name: notification_group_channels_id_seq; Type: SEQUENCE; Schema: public; Owner: admin
--

CREATE SEQUENCE public.notification_group_channels_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.notification_group_channels_id_seq OWNER TO admin;

--
-- TOC entry 4312 (class 0 OID 0)
-- Dependencies: 297
-- Name: notification_group_channels_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: admin
--

ALTER SEQUENCE public.notification_group_channels_id_seq OWNED BY public.notification_group_channels.id;


--
-- TOC entry 296 (class 1259 OID 56266)
-- Name: notification_groups; Type: TABLE; Schema: public; Owner: admin
--

CREATE TABLE public.notification_groups (
    id integer NOT NULL,
    code character varying(100) NOT NULL,
    name character varying(255) NOT NULL,
    description text,
    type character varying(20) NOT NULL,
    priority character varying(20) DEFAULT 'normal'::character varying,
    is_system boolean DEFAULT false,
    is_critical boolean DEFAULT false,
    icon character varying(50) DEFAULT 'fa-bell'::character varying,
    color character varying(20) DEFAULT '#6366f1'::character varying,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now(),
    CONSTRAINT notification_groups_priority_check CHECK (((priority)::text = ANY ((ARRAY['low'::character varying, 'normal'::character varying, 'high'::character varying, 'critical'::character varying])::text[]))),
    CONSTRAINT notification_groups_type_check CHECK (((type)::text = ANY ((ARRAY['user'::character varying, 'staff'::character varying])::text[])))
);


ALTER TABLE public.notification_groups OWNER TO admin;

--
-- TOC entry 295 (class 1259 OID 56265)
-- Name: notification_groups_id_seq; Type: SEQUENCE; Schema: public; Owner: admin
--

CREATE SEQUENCE public.notification_groups_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.notification_groups_id_seq OWNER TO admin;

--
-- TOC entry 4315 (class 0 OID 0)
-- Dependencies: 295
-- Name: notification_groups_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: admin
--

ALTER SEQUENCE public.notification_groups_id_seq OWNED BY public.notification_groups.id;


--
-- TOC entry 300 (class 1259 OID 56307)
-- Name: notification_templates; Type: TABLE; Schema: public; Owner: admin
--

CREATE TABLE public.notification_templates (
    id integer NOT NULL,
    group_id integer NOT NULL,
    channel_code character varying(50) NOT NULL,
    title_template text NOT NULL,
    body_template text NOT NULL,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now()
);


ALTER TABLE public.notification_templates OWNER TO admin;

--
-- TOC entry 299 (class 1259 OID 56306)
-- Name: notification_templates_id_seq; Type: SEQUENCE; Schema: public; Owner: admin
--

CREATE SEQUENCE public.notification_templates_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.notification_templates_id_seq OWNER TO admin;

--
-- TOC entry 4318 (class 0 OID 0)
-- Dependencies: 299
-- Name: notification_templates_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: admin
--

ALTER SEQUENCE public.notification_templates_id_seq OWNED BY public.notification_templates.id;


--
-- TOC entry 304 (class 1259 OID 56346)
-- Name: notification_user_settings; Type: TABLE; Schema: public; Owner: admin
--

CREATE TABLE public.notification_user_settings (
    id integer NOT NULL,
    user_id integer NOT NULL,
    group_id integer NOT NULL,
    channel_id integer NOT NULL,
    is_enabled boolean DEFAULT true,
    sound_enabled boolean DEFAULT true,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now()
);


ALTER TABLE public.notification_user_settings OWNER TO admin;

--
-- TOC entry 312 (class 1259 OID 56438)
-- Name: notification_user_settings_history; Type: TABLE; Schema: public; Owner: admin
--

CREATE TABLE public.notification_user_settings_history (
    id integer NOT NULL,
    user_id integer NOT NULL,
    group_id integer,
    channel_id integer,
    group_code character varying(100),
    channel_code character varying(50),
    old_is_enabled boolean,
    new_is_enabled boolean,
    old_sound_enabled boolean,
    new_sound_enabled boolean,
    changed_at timestamp without time zone DEFAULT now()
);


ALTER TABLE public.notification_user_settings_history OWNER TO admin;

--
-- TOC entry 311 (class 1259 OID 56437)
-- Name: notification_user_settings_history_id_seq; Type: SEQUENCE; Schema: public; Owner: admin
--

CREATE SEQUENCE public.notification_user_settings_history_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.notification_user_settings_history_id_seq OWNER TO admin;

--
-- TOC entry 4322 (class 0 OID 0)
-- Dependencies: 311
-- Name: notification_user_settings_history_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: admin
--

ALTER SEQUENCE public.notification_user_settings_history_id_seq OWNED BY public.notification_user_settings_history.id;


--
-- TOC entry 303 (class 1259 OID 56345)
-- Name: notification_user_settings_id_seq; Type: SEQUENCE; Schema: public; Owner: admin
--

CREATE SEQUENCE public.notification_user_settings_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.notification_user_settings_id_seq OWNER TO admin;

--
-- TOC entry 4324 (class 0 OID 0)
-- Dependencies: 303
-- Name: notification_user_settings_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: admin
--

ALTER SEQUENCE public.notification_user_settings_id_seq OWNED BY public.notification_user_settings.id;


--
-- TOC entry 306 (class 1259 OID 56370)
-- Name: notifications; Type: TABLE; Schema: public; Owner: admin
--

CREATE TABLE public.notifications (
    id integer NOT NULL,
    user_id integer NOT NULL,
    group_id integer,
    group_code character varying(100),
    type character varying(20) NOT NULL,
    title character varying(500) NOT NULL,
    body text,
    payload jsonb DEFAULT '{}'::jsonb,
    priority character varying(20) DEFAULT 'normal'::character varying,
    is_read boolean DEFAULT false,
    read_at timestamp without time zone,
    created_at timestamp without time zone DEFAULT now(),
    deleted_at timestamp without time zone,
    channel_code character varying(50),
    CONSTRAINT notifications_type_check CHECK (((type)::text = ANY ((ARRAY['user'::character varying, 'staff'::character varying])::text[])))
);


ALTER TABLE public.notifications OWNER TO admin;

--
-- TOC entry 305 (class 1259 OID 56369)
-- Name: notifications_id_seq; Type: SEQUENCE; Schema: public; Owner: admin
--

CREATE SEQUENCE public.notifications_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.notifications_id_seq OWNER TO admin;

--
-- TOC entry 4327 (class 0 OID 0)
-- Dependencies: 305
-- Name: notifications_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: admin
--

ALTER SEQUENCE public.notifications_id_seq OWNED BY public.notifications.id;


--
-- TOC entry 283 (class 1259 OID 34720)
-- Name: password_change_history; Type: TABLE; Schema: public; Owner: admin
--

CREATE TABLE public.password_change_history (
    id bigint NOT NULL,
    user_id bigint NOT NULL,
    actor_user_id bigint,
    change_type character varying(25) NOT NULL,
    reason text,
    created_at timestamp with time zone DEFAULT now()
);


ALTER TABLE public.password_change_history OWNER TO admin;

--
-- TOC entry 282 (class 1259 OID 34719)
-- Name: password_change_history_id_seq; Type: SEQUENCE; Schema: public; Owner: admin
--

CREATE SEQUENCE public.password_change_history_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.password_change_history_id_seq OWNER TO admin;

--
-- TOC entry 4330 (class 0 OID 0)
-- Dependencies: 282
-- Name: password_change_history_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: admin
--

ALTER SEQUENCE public.password_change_history_id_seq OWNED BY public.password_change_history.id;


--
-- TOC entry 287 (class 1259 OID 56162)
-- Name: permissions; Type: TABLE; Schema: public; Owner: admin
--

CREATE TABLE public.permissions (
    id integer NOT NULL,
    code character varying(50) NOT NULL,
    description text NOT NULL,
    category character varying(50) NOT NULL
);


ALTER TABLE public.permissions OWNER TO admin;

--
-- TOC entry 286 (class 1259 OID 56161)
-- Name: permissions_id_seq; Type: SEQUENCE; Schema: public; Owner: admin
--

CREATE SEQUENCE public.permissions_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.permissions_id_seq OWNER TO admin;

--
-- TOC entry 4333 (class 0 OID 0)
-- Dependencies: 286
-- Name: permissions_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: admin
--

ALTER SEQUENCE public.permissions_id_seq OWNED BY public.permissions.id;


--
-- TOC entry 243 (class 1259 OID 17963)
-- Name: persone_name_connector; Type: TABLE; Schema: public; Owner: admin
--

CREATE TABLE public.persone_name_connector (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    person_id uuid NOT NULL,
    name_id uuid NOT NULL
);


ALTER TABLE public.persone_name_connector OWNER TO admin;

--
-- TOC entry 242 (class 1259 OID 17955)
-- Name: persone_names; Type: TABLE; Schema: public; Owner: admin
--

CREATE TABLE public.persone_names (
    name_id uuid DEFAULT gen_random_uuid() NOT NULL,
    name_hesh text NOT NULL,
    name_encrypted text NOT NULL,
    name_iv text NOT NULL,
    name_auth_tag text NOT NULL,
    name_phonetic_tokens text[] NOT NULL,
    date_add timestamp without time zone NOT NULL
);


ALTER TABLE public.persone_names OWNER TO admin;

--
-- TOC entry 240 (class 1259 OID 17941)
-- Name: persone_phone_connector; Type: TABLE; Schema: public; Owner: admin
--

CREATE TABLE public.persone_phone_connector (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    person_id uuid NOT NULL,
    phone_id uuid NOT NULL
);


ALTER TABLE public.persone_phone_connector OWNER TO admin;

--
-- TOC entry 241 (class 1259 OID 17947)
-- Name: persone_phones; Type: TABLE; Schema: public; Owner: admin
--

CREATE TABLE public.persone_phones (
    phone_id uuid DEFAULT gen_random_uuid() NOT NULL,
    phone_hesh text NOT NULL,
    phone_encrypted text NOT NULL,
    phone_iv text NOT NULL,
    phone_auth_tag text NOT NULL,
    phone_last_six character varying(7) NOT NULL,
    date_add timestamp without time zone NOT NULL
);


ALTER TABLE public.persone_phones OWNER TO admin;

--
-- TOC entry 244 (class 1259 OID 17969)
-- Name: persone_telegramm_accaunt_connector; Type: TABLE; Schema: public; Owner: admin
--

CREATE TABLE public.persone_telegramm_accaunt_connector (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    person_id uuid NOT NULL,
    telegramm_accaunt_id uuid NOT NULL
);


ALTER TABLE public.persone_telegramm_accaunt_connector OWNER TO admin;

--
-- TOC entry 245 (class 1259 OID 17975)
-- Name: persone_telegramm_accaunts; Type: TABLE; Schema: public; Owner: admin
--

CREATE TABLE public.persone_telegramm_accaunts (
    tg_id uuid DEFAULT gen_random_uuid() NOT NULL,
    tg_username_hesh text NOT NULL,
    tg_username_encrypted text NOT NULL,
    tg_username_iv text NOT NULL,
    tg_username_auth_tag text NOT NULL,
    tg_id_hesh text,
    tg_id_encrypted text,
    tg_id_iv text,
    tg_id_auth_tag text,
    date_add timestamp without time zone NOT NULL
);


ALTER TABLE public.persone_telegramm_accaunts OWNER TO admin;

--
-- TOC entry 223 (class 1259 OID 17841)
-- Name: policy; Type: TABLE; Schema: public; Owner: admin
--

CREATE TABLE public.policy (
    id integer NOT NULL,
    text text NOT NULL,
    type character varying(50) NOT NULL,
    name character varying(150) NOT NULL,
    version character varying(11) NOT NULL,
    created_at timestamp without time zone,
    updated_at timestamp without time zone
);


ALTER TABLE public.policy OWNER TO admin;

--
-- TOC entry 224 (class 1259 OID 17848)
-- Name: policy_versions; Type: TABLE; Schema: public; Owner: admin
--

CREATE TABLE public.policy_versions (
    id bigint NOT NULL,
    type character varying(50) NOT NULL,
    old_version character varying(11) NOT NULL,
    new_version character varying(11) NOT NULL,
    user_id bigint NOT NULL,
    updated_at timestamp without time zone NOT NULL,
    clear_old_version_text text NOT NULL,
    clear_new_version_text text NOT NULL,
    diff_html text NOT NULL,
    change text NOT NULL
);


ALTER TABLE public.policy_versions OWNER TO admin;

--
-- TOC entry 225 (class 1259 OID 17855)
-- Name: policy_versions_id_seq; Type: SEQUENCE; Schema: public; Owner: admin
--

ALTER TABLE public.policy_versions ALTER COLUMN id ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME public.policy_versions_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- TOC entry 273 (class 1259 OID 34632)
-- Name: rate_limits; Type: TABLE; Schema: public; Owner: admin
--

CREATE TABLE public.rate_limits (
    key character varying(255) NOT NULL,
    points integer DEFAULT 0 NOT NULL,
    expire bigint NOT NULL
);


ALTER TABLE public.rate_limits OWNER TO admin;

--
-- TOC entry 288 (class 1259 OID 56172)
-- Name: role_permissions; Type: TABLE; Schema: public; Owner: admin
--

CREATE TABLE public.role_permissions (
    status_code character varying(30) NOT NULL,
    permission_code character varying(50) NOT NULL,
    is_default boolean DEFAULT false NOT NULL
);


ALTER TABLE public.role_permissions OWNER TO admin;

--
-- TOC entry 272 (class 1259 OID 34575)
-- Name: search_history; Type: TABLE; Schema: public; Owner: admin
--

CREATE TABLE public.search_history (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_email character varying(255) NOT NULL,
    user_id integer,
    search_type character varying(20) NOT NULL,
    search_params jsonb NOT NULL,
    result_status character varying(20) NOT NULL,
    result_summary jsonb,
    request_ip inet,
    device_id character varying(100),
    execution_time_ms integer,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT search_history_result_status_check CHECK (((result_status)::text = ANY ((ARRAY['found'::character varying, 'not_found'::character varying, 'error'::character varying, 'rate_limited'::character varying])::text[]))),
    CONSTRAINT search_history_search_type_check CHECK (((search_type)::text = ANY ((ARRAY['person'::character varying, 'pvz'::character varying])::text[])))
);


ALTER TABLE public.search_history OWNER TO admin;

--
-- TOC entry 4346 (class 0 OID 0)
-- Dependencies: 272
-- Name: TABLE search_history; Type: COMMENT; Schema: public; Owner: admin
--

COMMENT ON TABLE public.search_history IS 'История поисковых запросов пользователей';


--
-- TOC entry 4347 (class 0 OID 0)
-- Dependencies: 272
-- Name: COLUMN search_history.user_email; Type: COMMENT; Schema: public; Owner: admin
--

COMMENT ON COLUMN public.search_history.user_email IS 'Email пользователя, выполнившего запрос';


--
-- TOC entry 4348 (class 0 OID 0)
-- Dependencies: 272
-- Name: COLUMN search_history.user_id; Type: COMMENT; Schema: public; Owner: admin
--

COMMENT ON COLUMN public.search_history.user_id IS 'ID пользователя (если авторизован)';


--
-- TOC entry 4349 (class 0 OID 0)
-- Dependencies: 272
-- Name: COLUMN search_history.search_type; Type: COMMENT; Schema: public; Owner: admin
--

COMMENT ON COLUMN public.search_history.search_type IS 'Тип поиска: person (человек) или pvz (пункт выдачи)';


--
-- TOC entry 4350 (class 0 OID 0)
-- Dependencies: 272
-- Name: COLUMN search_history.search_params; Type: COMMENT; Schema: public; Owner: admin
--

COMMENT ON COLUMN public.search_history.search_params IS 'Параметры поиска в формате JSON';


--
-- TOC entry 4351 (class 0 OID 0)
-- Dependencies: 272
-- Name: COLUMN search_history.result_status; Type: COMMENT; Schema: public; Owner: admin
--

COMMENT ON COLUMN public.search_history.result_status IS 'Статус результата: found (найдено), not_found (не найдено), error (ошибка), rate_limited (превышен лимит)';


--
-- TOC entry 4352 (class 0 OID 0)
-- Dependencies: 272
-- Name: COLUMN search_history.result_summary; Type: COMMENT; Schema: public; Owner: admin
--

COMMENT ON COLUMN public.search_history.result_summary IS 'Краткая сводка результатов в формате JSON';


--
-- TOC entry 4353 (class 0 OID 0)
-- Dependencies: 272
-- Name: COLUMN search_history.request_ip; Type: COMMENT; Schema: public; Owner: admin
--

COMMENT ON COLUMN public.search_history.request_ip IS 'IP адрес, с которого выполнен запрос';


--
-- TOC entry 4354 (class 0 OID 0)
-- Dependencies: 272
-- Name: COLUMN search_history.device_id; Type: COMMENT; Schema: public; Owner: admin
--

COMMENT ON COLUMN public.search_history.device_id IS 'Уникальный идентификатор устройства';


--
-- TOC entry 4355 (class 0 OID 0)
-- Dependencies: 272
-- Name: COLUMN search_history.execution_time_ms; Type: COMMENT; Schema: public; Owner: admin
--

COMMENT ON COLUMN public.search_history.execution_time_ms IS 'Время выполнения запроса в миллисекундах';


--
-- TOC entry 4356 (class 0 OID 0)
-- Dependencies: 272
-- Name: COLUMN search_history.created_at; Type: COMMENT; Schema: public; Owner: admin
--

COMMENT ON COLUMN public.search_history.created_at IS 'Дата и время выполнения запроса';


--
-- TOC entry 228 (class 1259 OID 17866)
-- Name: settings; Type: TABLE; Schema: public; Owner: admin
--

CREATE TABLE public.settings (
    setting_id integer NOT NULL,
    name character varying(120) NOT NULL,
    descr text NOT NULL,
    name_text character varying(120) NOT NULL,
    type character varying(30) NOT NULL,
    higher_security boolean NOT NULL,
    "group" character varying(50) NOT NULL,
    dependence_name character varying(120),
    active boolean NOT NULL,
    value character varying(300)[]
);


ALTER TABLE public.settings OWNER TO admin;

--
-- TOC entry 229 (class 1259 OID 17873)
-- Name: settings_history; Type: TABLE; Schema: public; Owner: admin
--

CREATE TABLE public.settings_history (
    id bigint NOT NULL,
    setting_name character varying(120) NOT NULL,
    user_id bigint NOT NULL,
    changed_at timestamp without time zone NOT NULL,
    old_value character varying(300)[] NOT NULL,
    new_value character varying(300)[] NOT NULL,
    setting_id integer NOT NULL
);


ALTER TABLE public.settings_history OWNER TO admin;

--
-- TOC entry 230 (class 1259 OID 17880)
-- Name: settings_history_id_seq; Type: SEQUENCE; Schema: public; Owner: admin
--

ALTER TABLE public.settings_history ALTER COLUMN id ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME public.settings_history_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- TOC entry 253 (class 1259 OID 26198)
-- Name: stats_records; Type: TABLE; Schema: public; Owner: admin
--

CREATE TABLE public.stats_records (
    section text NOT NULL,
    metric_type text NOT NULL,
    entity_id text NOT NULL,
    time_bucket timestamp without time zone NOT NULL,
    bucket_type text NOT NULL,
    count bigint DEFAULT 0,
    unique_count bigint DEFAULT 0,
    updated_at timestamp without time zone DEFAULT (now() AT TIME ZONE 'UTC'::text)
);


ALTER TABLE public.stats_records OWNER TO admin;

--
-- TOC entry 285 (class 1259 OID 56130)
-- Name: system_scheduled_tasks; Type: TABLE; Schema: public; Owner: admin
--

CREATE TABLE public.system_scheduled_tasks (
    id integer NOT NULL,
    task_type character varying(50) NOT NULL,
    scheduled_at timestamp with time zone NOT NULL,
    expected_open_at timestamp with time zone,
    message text,
    status character varying(20) DEFAULT 'scheduled'::character varying,
    created_by integer,
    created_at timestamp with time zone DEFAULT now()
);


ALTER TABLE public.system_scheduled_tasks OWNER TO admin;

--
-- TOC entry 284 (class 1259 OID 56129)
-- Name: system_scheduled_tasks_id_seq; Type: SEQUENCE; Schema: public; Owner: admin
--

CREATE SEQUENCE public.system_scheduled_tasks_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.system_scheduled_tasks_id_seq OWNER TO admin;

--
-- TOC entry 4363 (class 0 OID 0)
-- Dependencies: 284
-- Name: system_scheduled_tasks_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: admin
--

ALTER SEQUENCE public.system_scheduled_tasks_id_seq OWNED BY public.system_scheduled_tasks.id;


--
-- TOC entry 226 (class 1259 OID 17857)
-- Name: system_versions; Type: TABLE; Schema: public; Owner: admin
--

CREATE TABLE public.system_versions (
    version_id bigint NOT NULL,
    version character varying(50) NOT NULL,
    title character varying(255) NOT NULL,
    description text,
    changes_jsonb jsonb NOT NULL,
    change_type character varying(50),
    is_major boolean,
    is_active boolean,
    created_at timestamp without time zone,
    updated_at timestamp without time zone,
    created_by bigint NOT NULL,
    updated_by bigint,
    internal_notes text
);


ALTER TABLE public.system_versions OWNER TO admin;

--
-- TOC entry 227 (class 1259 OID 17864)
-- Name: system_versions_version_id_seq; Type: SEQUENCE; Schema: public; Owner: admin
--

ALTER TABLE public.system_versions ALTER COLUMN version_id ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME public.system_versions_version_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- TOC entry 220 (class 1259 OID 17830)
-- Name: user_auth_logins; Type: TABLE; Schema: public; Owner: admin
--

CREATE TABLE public.user_auth_logins (
    user_auth_login_id bigint NOT NULL,
    user_id bigint NOT NULL,
    device_id bigint,
    ip_address text,
    method text,
    system text,
    status text,
    fail_reason text,
    attempt_time timestamp without time zone,
    language text,
    timezone text,
    user_agent text,
    platform text,
    ip_address_encrypted text,
    ip_address_iv text,
    ip_address_auth_tag text
);


ALTER TABLE public.user_auth_logins OWNER TO admin;

--
-- TOC entry 221 (class 1259 OID 17837)
-- Name: user_auth_logins_user_auth_login_id_seq; Type: SEQUENCE; Schema: public; Owner: admin
--

ALTER TABLE public.user_auth_logins ALTER COLUMN user_auth_login_id ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME public.user_auth_logins_user_auth_login_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- TOC entry 279 (class 1259 OID 34686)
-- Name: user_devices; Type: TABLE; Schema: public; Owner: admin
--

CREATE TABLE public.user_devices (
    id bigint NOT NULL,
    user_id bigint NOT NULL,
    device_fingerprint text,
    device_name text DEFAULT 'Неизвестное устройство'::text,
    os text DEFAULT 'Unknown'::text,
    browser text DEFAULT 'Unknown'::text,
    model text DEFAULT 'Unknown'::text,
    is_mobile boolean DEFAULT false,
    ip_last text,
    login_count integer DEFAULT 1,
    created_at timestamp with time zone DEFAULT now(),
    last_login_at timestamp with time zone DEFAULT now(),
    is_deleted boolean DEFAULT false,
    ip_last_encrypted text,
    ip_last_iv text,
    ip_last_auth_tag text,
    is_trusted boolean DEFAULT false NOT NULL,
    custom_name character varying(255)
);


ALTER TABLE public.user_devices OWNER TO admin;

--
-- TOC entry 278 (class 1259 OID 34685)
-- Name: user_devices_id_seq; Type: SEQUENCE; Schema: public; Owner: admin
--

ALTER TABLE public.user_devices ALTER COLUMN id ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME public.user_devices_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- TOC entry 291 (class 1259 OID 56186)
-- Name: user_permission_history; Type: TABLE; Schema: public; Owner: admin
--

CREATE TABLE public.user_permission_history (
    id integer NOT NULL,
    actor_user_id bigint,
    target_user_id bigint NOT NULL,
    action_type character varying(30) NOT NULL,
    permission_code character varying(50),
    old_state character varying(20),
    new_state character varying(20),
    reason text,
    created_at timestamp without time zone DEFAULT (now() AT TIME ZONE 'UTC'::text) NOT NULL
);


ALTER TABLE public.user_permission_history OWNER TO admin;

--
-- TOC entry 290 (class 1259 OID 56185)
-- Name: user_permission_history_id_seq; Type: SEQUENCE; Schema: public; Owner: admin
--

CREATE SEQUENCE public.user_permission_history_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.user_permission_history_id_seq OWNER TO admin;

--
-- TOC entry 4372 (class 0 OID 0)
-- Dependencies: 290
-- Name: user_permission_history_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: admin
--

ALTER SEQUENCE public.user_permission_history_id_seq OWNED BY public.user_permission_history.id;


--
-- TOC entry 289 (class 1259 OID 56178)
-- Name: user_permission_overrides; Type: TABLE; Schema: public; Owner: admin
--

CREATE TABLE public.user_permission_overrides (
    user_id bigint NOT NULL,
    permission_code character varying(50) NOT NULL,
    is_granted boolean NOT NULL
);


ALTER TABLE public.user_permission_overrides OWNER TO admin;

--
-- TOC entry 219 (class 1259 OID 17822)
-- Name: user_refresh_tokens; Type: TABLE; Schema: public; Owner: admin
--

CREATE TABLE public.user_refresh_tokens (
    token_id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id bigint NOT NULL,
    token_hash text NOT NULL,
    created_at timestamp without time zone,
    expires_at timestamp without time zone NOT NULL,
    revoked boolean,
    revoked_at timestamp without time zone,
    last_used timestamp without time zone,
    device_id bigint NOT NULL
);


ALTER TABLE public.user_refresh_tokens OWNER TO admin;

--
-- TOC entry 277 (class 1259 OID 34671)
-- Name: user_role_history; Type: TABLE; Schema: public; Owner: admin
--

CREATE TABLE public.user_role_history (
    id integer NOT NULL,
    actor_user_id integer,
    target_user_id integer NOT NULL,
    old_status_id integer,
    requested_status_id integer,
    action_status character varying(20) NOT NULL,
    fail_reason text,
    created_at timestamp with time zone DEFAULT now()
);


ALTER TABLE public.user_role_history OWNER TO admin;

--
-- TOC entry 276 (class 1259 OID 34670)
-- Name: user_role_history_id_seq; Type: SEQUENCE; Schema: public; Owner: admin
--

CREATE SEQUENCE public.user_role_history_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.user_role_history_id_seq OWNER TO admin;

--
-- TOC entry 4377 (class 0 OID 0)
-- Dependencies: 276
-- Name: user_role_history_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: admin
--

ALTER SEQUENCE public.user_role_history_id_seq OWNED BY public.user_role_history.id;


--
-- TOC entry 292 (class 1259 OID 56218)
-- Name: user_security_settings; Type: TABLE; Schema: public; Owner: admin
--

CREATE TABLE public.user_security_settings (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    seed_public_key character varying,
    totp_secret_encrypted character varying,
    totp_iv character varying,
    totp_auth_tag character varying,
    totp_enabled boolean DEFAULT false,
    mfa_mode character varying,
    backup_codes_encrypted text,
    backup_codes_iv character varying,
    backup_codes_auth_tag character varying,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    user_id bigint NOT NULL
);


ALTER TABLE public.user_security_settings OWNER TO admin;

--
-- TOC entry 218 (class 1259 OID 17815)
-- Name: user_statuses; Type: TABLE; Schema: public; Owner: admin
--

CREATE TABLE public.user_statuses (
    status_id integer NOT NULL,
    code_name character varying(50) NOT NULL,
    name character varying(50) NOT NULL,
    descr text,
    is_staff boolean DEFAULT false NOT NULL,
    active boolean DEFAULT true NOT NULL
);


ALTER TABLE public.user_statuses OWNER TO admin;

--
-- TOC entry 217 (class 1259 OID 17810)
-- Name: users; Type: TABLE; Schema: public; Owner: admin
--

CREATE TABLE public.users (
    user_id bigint NOT NULL,
    login character varying(50) NOT NULL,
    pass character varying(150) NOT NULL,
    status integer NOT NULL,
    reg_date timestamp without time zone NOT NULL,
    must_change_password boolean DEFAULT false
);


ALTER TABLE public.users OWNER TO admin;

--
-- TOC entry 234 (class 1259 OID 17896)
-- Name: users_emails; Type: TABLE; Schema: public; Owner: admin
--

CREATE TABLE public.users_emails (
    email_id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id bigint,
    email_hesh text NOT NULL,
    email_encrypted text NOT NULL,
    email_iv text NOT NULL,
    email_auth_tag text NOT NULL,
    is_confirm boolean DEFAULT false NOT NULL,
    first_add timestamp without time zone NOT NULL
);


ALTER TABLE public.users_emails OWNER TO admin;

--
-- TOC entry 235 (class 1259 OID 17907)
-- Name: users_tgs; Type: TABLE; Schema: public; Owner: admin
--

CREATE TABLE public.users_tgs (
    tg_id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id bigint,
    tg_hesh text NOT NULL,
    tg_encrypted text NOT NULL,
    tg_iv text NOT NULL,
    tg_auth_tag text NOT NULL,
    first_add timestamp without time zone NOT NULL
);


ALTER TABLE public.users_tgs OWNER TO admin;

--
-- TOC entry 222 (class 1259 OID 17838)
-- Name: users_user_id_seq; Type: SEQUENCE; Schema: public; Owner: admin
--

ALTER TABLE public.users ALTER COLUMN user_id ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME public.users_user_id_seq
    START WITH 2
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- TOC entry 3655 (class 2604 OID 34656)
-- Name: admin_user_data id; Type: DEFAULT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.admin_user_data ALTER COLUMN id SET DEFAULT nextval('public.admin_user_data_id_seq'::regclass);


--
-- TOC entry 3649 (class 2604 OID 34556)
-- Name: donation_access_attempts attempt_id; Type: DEFAULT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.donation_access_attempts ALTER COLUMN attempt_id SET DEFAULT nextval('public.donation_access_attempts_attempt_id_seq'::regclass);


--
-- TOC entry 3638 (class 2604 OID 34483)
-- Name: donation_activations activation_id; Type: DEFAULT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.donation_activations ALTER COLUMN activation_id SET DEFAULT nextval('public.donation_activations_activation_id_seq'::regclass);


--
-- TOC entry 3643 (class 2604 OID 34510)
-- Name: donation_active_perks active_perk_id; Type: DEFAULT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.donation_active_perks ALTER COLUMN active_perk_id SET DEFAULT nextval('public.donation_active_perks_active_perk_id_seq'::regclass);


--
-- TOC entry 3647 (class 2604 OID 34537)
-- Name: donation_check_log log_id; Type: DEFAULT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.donation_check_log ALTER COLUMN log_id SET DEFAULT nextval('public.donation_check_log_log_id_seq'::regclass);


--
-- TOC entry 3627 (class 2604 OID 34430)
-- Name: donation_packages package_id; Type: DEFAULT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.donation_packages ALTER COLUMN package_id SET DEFAULT nextval('public.donation_packages_package_id_seq'::regclass);


--
-- TOC entry 3622 (class 2604 OID 34415)
-- Name: donation_perks perk_id; Type: DEFAULT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.donation_perks ALTER COLUMN perk_id SET DEFAULT nextval('public.donation_perks_perk_id_seq'::regclass);


--
-- TOC entry 3632 (class 2604 OID 34460)
-- Name: donation_requests request_id; Type: DEFAULT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.donation_requests ALTER COLUMN request_id SET DEFAULT nextval('public.donation_requests_request_id_seq'::regclass);


--
-- TOC entry 3717 (class 2604 OID 56419)
-- Name: notification_admin_history id; Type: DEFAULT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.notification_admin_history ALTER COLUMN id SET DEFAULT nextval('public.notification_admin_history_id_seq'::regclass);


--
-- TOC entry 3715 (class 2604 OID 56398)
-- Name: notification_channel_stats id; Type: DEFAULT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.notification_channel_stats ALTER COLUMN id SET DEFAULT nextval('public.notification_channel_stats_id_seq'::regclass);


--
-- TOC entry 3685 (class 2604 OID 56256)
-- Name: notification_channels id; Type: DEFAULT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.notification_channels ALTER COLUMN id SET DEFAULT nextval('public.notification_channels_id_seq'::regclass);


--
-- TOC entry 3702 (class 2604 OID 56328)
-- Name: notification_default_role_settings id; Type: DEFAULT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.notification_default_role_settings ALTER COLUMN id SET DEFAULT nextval('public.notification_default_role_settings_id_seq'::regclass);


--
-- TOC entry 3696 (class 2604 OID 56289)
-- Name: notification_group_channels id; Type: DEFAULT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.notification_group_channels ALTER COLUMN id SET DEFAULT nextval('public.notification_group_channels_id_seq'::regclass);


--
-- TOC entry 3688 (class 2604 OID 56269)
-- Name: notification_groups id; Type: DEFAULT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.notification_groups ALTER COLUMN id SET DEFAULT nextval('public.notification_groups_id_seq'::regclass);


--
-- TOC entry 3699 (class 2604 OID 56310)
-- Name: notification_templates id; Type: DEFAULT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.notification_templates ALTER COLUMN id SET DEFAULT nextval('public.notification_templates_id_seq'::regclass);


--
-- TOC entry 3705 (class 2604 OID 56349)
-- Name: notification_user_settings id; Type: DEFAULT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.notification_user_settings ALTER COLUMN id SET DEFAULT nextval('public.notification_user_settings_id_seq'::regclass);


--
-- TOC entry 3721 (class 2604 OID 56441)
-- Name: notification_user_settings_history id; Type: DEFAULT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.notification_user_settings_history ALTER COLUMN id SET DEFAULT nextval('public.notification_user_settings_history_id_seq'::regclass);


--
-- TOC entry 3710 (class 2604 OID 56373)
-- Name: notifications id; Type: DEFAULT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.notifications ALTER COLUMN id SET DEFAULT nextval('public.notifications_id_seq'::regclass);


--
-- TOC entry 3672 (class 2604 OID 34723)
-- Name: password_change_history id; Type: DEFAULT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.password_change_history ALTER COLUMN id SET DEFAULT nextval('public.password_change_history_id_seq'::regclass);


--
-- TOC entry 3677 (class 2604 OID 56165)
-- Name: permissions id; Type: DEFAULT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.permissions ALTER COLUMN id SET DEFAULT nextval('public.permissions_id_seq'::regclass);


--
-- TOC entry 3674 (class 2604 OID 56133)
-- Name: system_scheduled_tasks id; Type: DEFAULT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.system_scheduled_tasks ALTER COLUMN id SET DEFAULT nextval('public.system_scheduled_tasks_id_seq'::regclass);


--
-- TOC entry 3679 (class 2604 OID 56189)
-- Name: user_permission_history id; Type: DEFAULT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.user_permission_history ALTER COLUMN id SET DEFAULT nextval('public.user_permission_history_id_seq'::regclass);


--
-- TOC entry 3659 (class 2604 OID 34674)
-- Name: user_role_history id; Type: DEFAULT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.user_role_history ALTER COLUMN id SET DEFAULT nextval('public.user_role_history_id_seq'::regclass);


--
-- TOC entry 4175 (class 0 OID 34709)
-- Dependencies: 281
-- Data for Name: action_telemetry; Type: TABLE DATA; Schema: public; Owner: admin
--

INSERT INTO public.action_telemetry OVERRIDING SYSTEM VALUE VALUES (3, 'incidentCreate', 'submit', 'Windows', 'Yandex Browser', '26.8.0.0', 'desktop', '1920x1200', '4g', '245c0ffc0f6a0215471542b9add1fa5331647f4af18c431f039c66dbee92732e', '2026-08-24 22:54:04.378542+00', NULL, NULL);
INSERT INTO public.action_telemetry OVERRIDING SYSTEM VALUE VALUES (4, 'incidentCreate', 'submit', 'Windows', 'Yandex Browser', '26.8.0.0', 'desktop', '1920x1200', '4g', '10d12798fa42d272cc240b7aebe4a5c616d5095b2df008e1be3f28b814158632', '2026-08-24 22:58:20.568706+00', 'ru', 'Europe/Moscow');
INSERT INTO public.action_telemetry OVERRIDING SYSTEM VALUE VALUES (5, 'incidentCreate', 'submit', 'Windows', 'Google Chrome', '151', 'desktop', '1920x1080', '4g', '10d12798fa42d272cc240b7aebe4a5c616d5095b2df008e1be3f28b814158632', '2026-08-24 22:59:18.534097+00', 'ru-RU', 'Europe/Moscow');


--
-- TOC entry 4169 (class 0 OID 34653)
-- Dependencies: 275
-- Data for Name: admin_user_data; Type: TABLE DATA; Schema: public; Owner: admin
--

INSERT INTO public.admin_user_data VALUES (2, 8, false, '2026-08-24 16:17:45.953039+00', '2026-08-24 17:17:03.942797+00', NULL, NULL, false);
INSERT INTO public.admin_user_data VALUES (7, 9, true, '2026-08-27 19:57:33.461991+00', NULL, '$2b$10$Nffej6zFCoLCBSYbQ3hfEerQO90AxVDiUIvJtWdxTK8ZA/sEJXLVG', '2026-08-27 19:57:33.461991+00', false);
INSERT INTO public.admin_user_data VALUES (4, 1, true, '2026-08-27 19:43:17.253743+00', NULL, '$2b$10$x8WzFP7e0PabHB3U9U0mFOIAEReYbSgBkbrV3jk6CJyxja3bl2izK', '2026-09-11 18:48:09.03874+00', false);
INSERT INTO public.admin_user_data VALUES (1, 7, true, '2026-08-24 15:58:45.409686+00', NULL, '$2b$10$V77bVD0jLxCE5L6/tqwcMOw1QfBP/oEu6h3AHOqOt1l8cdQ/aH4C2', '2026-09-12 13:30:43.613918+00', false);


--
-- TOC entry 4146 (class 0 OID 18034)
-- Dependencies: 252
-- Data for Name: antivirus_scans; Type: TABLE DATA; Schema: public; Owner: admin
--

INSERT INTO public.antivirus_scans VALUES ('c0a60c57-a31d-4248-9661-ca322e5c3c5c', 'files', 568518, '80f91921578eedf5cfb2e80485a428359636cda69a58bba33594e4b7774b009c', 'image/jpeg', 'clean', false, 'CLEAN', 95, '[]', 0, '{"score": 5, "timedOut": false, "explanations": [], "scoreBreakdown": {}}', '{}', '[]', 'internal', '1.0.0', '2026-08-20 19:32:23.755', '2026-08-20 19:32:23.755', '1787254343755', 49, '64d7adac-c4a4-468b-9fd5-5700bde8bd69');
INSERT INTO public.antivirus_scans VALUES ('709737b3-04ec-4fbf-a671-c3182a02f3b2', 'files', 344783, '2dce8a94e07e8bf774398838540751b8a7d4cf9dba40754bed7a58cc01b4daad', 'image/jpeg', 'clean', false, 'CLEAN', 95, '[]', 0, '{"score": 10, "timedOut": false, "explanations": [], "scoreBreakdown": {}}', '{}', '[]', 'internal', '1.0.0', '2026-08-20 19:32:24.533', '2026-08-20 19:32:24.533', '1787254344533', 36, '6b4f98b3-056a-4228-8f84-e1a7aab61a0f');
INSERT INTO public.antivirus_scans VALUES ('de0d2a65-a67c-4093-abc1-7214799f1dea', 'files_single', 154840, 'ef0c2bf7120ba0b0925a8fe4191c1cf0f0137651b7d0825b5b4b7e7a00cc36a2', 'image/png', 'clean', false, 'CLEAN', 95, '[]', 0, '{"score": 10, "timedOut": false, "explanations": [], "scoreBreakdown": {}}', '{}', '[]', 'internal', '1.0.0', '2026-08-22 16:06:26.814', '2026-08-22 16:06:26.814', '1787414786814', 54, '53f78db9-f876-49a1-8662-cad49d8ce4a0');
INSERT INTO public.antivirus_scans VALUES ('935002cf-7d2b-48af-bd50-79a7e1e2b96b', 'files', 50828, 'f7881fb72785cfcbc133513e11606388bc226954b465493e9d5692ca82f975c0', 'image/jpeg', 'clean', false, 'CLEAN', 95, '[]', 0, '{"score": 10, "timedOut": false, "explanations": [], "scoreBreakdown": {}}', '{}', '[]', 'internal', '1.0.0', '2026-08-22 19:38:38.932', '2026-08-22 19:38:38.932', '1787427518932', 25, '7250744c-dec6-4fca-865c-5d85477acbfa');
INSERT INTO public.antivirus_scans VALUES ('49857d6f-dac0-4b13-bb29-723928a9b574', 'files', 149941, '04931623f888c518e80667657401bdbad232fbb9a27dfb9d4aeb1de67960fa12', 'image/jpeg', 'clean', false, 'CLEAN', 95, '[]', 0, '{"score": 10, "timedOut": false, "explanations": [], "scoreBreakdown": {}}', '{}', '[]', 'internal', '1.0.0', '2026-08-22 19:38:43.998', '2026-08-22 19:38:43.998', '1787427523998', 33, 'bc8259d6-8452-4487-9ff3-c63d61a53028');
INSERT INTO public.antivirus_scans VALUES ('331359fb-5d2d-46c3-8bed-78118e56ecb6', 'files', 159760, 'd6544080b0793e243b06b86a060e86d6b228027b55c35fecf647b2aee798a5a5', 'image/jpeg', 'clean', false, 'CLEAN', 95, '[]', 0, '{"score": 10, "timedOut": false, "explanations": [], "scoreBreakdown": {}}', '{}', '[]', 'internal', '1.0.0', '2026-08-22 19:38:47.499', '2026-08-22 19:38:47.499', '1787427527499', 25, '941717a3-cf02-47af-8b80-4f3d7a03ef46');
INSERT INTO public.antivirus_scans VALUES ('8eea5b54-25e0-4b3c-af17-33bdeb5c8593', 'files', 159643, '3a4a54fe411fca6360765397891a696b26e8e431fe78fb8e06c5f1ac138c510a', 'image/jpeg', 'clean', false, 'CLEAN', 95, '[]', 0, '{"score": 10, "timedOut": false, "explanations": [], "scoreBreakdown": {}}', '{}', '[]', 'internal', '1.0.0', '2026-08-22 19:38:50.779', '2026-08-22 19:38:50.779', '1787427530779', 29, '79a1510b-7b6b-492f-a3c5-090898886bbe');
INSERT INTO public.antivirus_scans VALUES ('86303e95-e8f5-4b36-aaf7-7ee00dfadc9b', 'files', 151653, '0d509a5cc0699925fe9f77785d3f1fae41109ce6d9c1351d4865a489c3dbc11b', 'image/jpeg', 'clean', false, 'CLEAN', 95, '[]', 0, '{"score": 10, "timedOut": false, "explanations": [], "scoreBreakdown": {}}', '{}', '[]', 'internal', '1.0.0', '2026-08-22 19:38:54.116', '2026-08-22 19:38:54.116', '1787427534116', 22, 'bcf3b0d0-64ae-4572-b30c-9dd745fb264f');
INSERT INTO public.antivirus_scans VALUES ('77fc1f52-8dea-4fcc-babf-ef3d86367c56', 'files', 157513, '256d40de3dad2b140471175fc27da9976f100ce413e5835940ceeb418965f11c', 'image/jpeg', 'clean', false, 'CLEAN', 95, '[]', 0, '{"score": 10, "timedOut": false, "explanations": [], "scoreBreakdown": {}}', '{}', '[]', 'internal', '1.0.0', '2026-08-22 19:38:57.78', '2026-08-22 19:38:57.78', '1787427537780', 31, 'f3152bd6-c279-4349-b9cf-dee11faeeb83');
INSERT INTO public.antivirus_scans VALUES ('1b43ad56-8eee-47b8-83fa-372c93666784', 'files', 164673, '5b395d87b372e4a36e7a7fc10762b80b97536b7cfd904cf5019c43a5fbca21b6', 'image/jpeg', 'clean', false, 'CLEAN', 95, '[]', 0, '{"score": 5, "timedOut": false, "explanations": [], "scoreBreakdown": {}}', '{}', '[]', 'internal', '1.0.0', '2026-08-22 19:39:01.729', '2026-08-22 19:39:01.729', '1787427541729', 25, '5f1155c9-5743-4057-a710-f3af13b83529');
INSERT INTO public.antivirus_scans VALUES ('10ebcf76-af6d-44c7-9c75-774fbcc34db7', 'files', 157160, '9d4c1c8912c6d7eb668dd6b622e21e45256c74833b7bdab1dd4a0cc99b3fddca', 'image/jpeg', 'clean', false, 'CLEAN', 95, '[]', 0, '{"score": 10, "timedOut": false, "explanations": [], "scoreBreakdown": {}}', '{}', '[]', 'internal', '1.0.0', '2026-08-22 19:39:05.743', '2026-08-22 19:39:05.743', '1787427545743', 25, '92455d4b-4cb9-44bf-978c-4f21447cf902');
INSERT INTO public.antivirus_scans VALUES ('5f314c40-036c-42a3-80ae-53ed0bb50374', 'files', 266978, '017ad3714cda0005df0dde775d9e21abc6d4669e26e766708f8fd2da0ba8edd0', 'image/png', 'clean', false, 'CLEAN', 95, '[]', 0, '{"score": 10, "timedOut": false, "explanations": [], "scoreBreakdown": {}}', '{}', '[]', 'internal', '1.0.0', '2026-09-02 20:13:49.692', '2026-09-02 20:13:49.692', '1788380029692', 41, '7250744c-dec6-4fca-865c-5d85477acbfa');
INSERT INTO public.antivirus_scans VALUES ('26675865-0b42-4f4b-b7de-4a7efd44c40f', 'files', 1292313, '4a67b8895ebff6c6e8fc8655e88b3a0e7f2612f96109fb97a4672a367063ae73', 'image/png', 'clean', false, 'CLEAN', 95, '[]', 0, '{"score": 10, "timedOut": false, "explanations": [], "scoreBreakdown": {}}', '{}', '[]', 'internal', '1.0.0', '2026-09-02 20:14:14.644', '2026-09-02 20:14:14.644', '1788380054644', 128, '941717a3-cf02-47af-8b80-4f3d7a03ef46');
INSERT INTO public.antivirus_scans VALUES ('28371256-0231-4079-9d18-6b11909431b3', 'files', 1288078, '65d1a80657665494f1b29178f64d0039f0b3d5145c969ef464bdaab75325ee6e', 'image/png', 'clean', false, 'CLEAN', 95, '[]', 0, '{"score": 10, "timedOut": false, "explanations": [], "scoreBreakdown": {}}', '{}', '[]', 'internal', '1.0.0', '2026-09-02 20:14:27.619', '2026-09-02 20:14:27.619', '1788380067619', 63, '79a1510b-7b6b-492f-a3c5-090898886bbe');
INSERT INTO public.antivirus_scans VALUES ('2b17cb11-344f-45a0-90f1-bb2c71a416ce', 'files', 1214672, '5f8dd7e368d9b91d30ba46638de10e7729638e919e79c37519edc9010b2ef794', 'image/png', 'clean', false, 'CLEAN', 95, '[]', 0, '{"score": 5, "timedOut": false, "explanations": [], "scoreBreakdown": {}}', '{}', '[]', 'internal', '1.0.0', '2026-09-02 20:14:50.501', '2026-09-02 20:14:50.501', '1788380090501', 50, 'bcf3b0d0-64ae-4572-b30c-9dd745fb264f');
INSERT INTO public.antivirus_scans VALUES ('d0f9c0fd-31a9-4ac3-a0a9-1cb3eeabd57c', 'files', 1272061, '7f7b8ae672ecde7bd3ab25a31857ef863517cfa791191c44c14ce88620c49988', 'image/png', 'clean', false, 'CLEAN', 95, '[]', 0, '{"score": 5, "timedOut": false, "explanations": [], "scoreBreakdown": {}}', '{}', '[]', 'internal', '1.0.0', '2026-09-02 20:15:07.174', '2026-09-02 20:15:07.174', '1788380107174', 60, 'f3152bd6-c279-4349-b9cf-dee11faeeb83');
INSERT INTO public.antivirus_scans VALUES ('c790f055-8a25-427d-82d5-36a3db71834b', 'files', 1315449, '4512ca5ef083ab37fde2615514e2d271c55964fc442b023861bbc6dddd57d8a9', 'image/png', 'clean', false, 'CLEAN', 95, '[]', 0, '{"score": 10, "timedOut": false, "explanations": [], "scoreBreakdown": {}}', '{}', '[]', 'internal', '1.0.0', '2026-09-02 20:15:23.234', '2026-09-02 20:15:23.234', '1788380123234', 61, '5f1155c9-5743-4057-a710-f3af13b83529');
INSERT INTO public.antivirus_scans VALUES ('b87d3278-ac3f-4dad-a487-4f678575ef0a', 'files', 1269598, 'ece2fff12c8de61ea282b35c9388940a9b65d0b1718398f277bd06063b457c1c', 'image/png', 'clean', false, 'CLEAN', 95, '[]', 0, '{"score": 5, "timedOut": false, "explanations": [], "scoreBreakdown": {}}', '{}', '[]', 'internal', '1.0.0', '2026-09-02 20:15:34.552', '2026-09-02 20:15:34.552', '1788380134551', 53, '92455d4b-4cb9-44bf-978c-4f21447cf902');


--
-- TOC entry 4148 (class 0 OID 34393)
-- Dependencies: 254
-- Data for Name: critical_actions; Type: TABLE DATA; Schema: public; Owner: admin
--

INSERT INTO public.critical_actions VALUES (1, 'closeSite', 'Закрыть сайт на технические работы немедленно', 'Перевод сайта в режим технического обслуживания немедленно, все несохранённые данные будут потеряны!', 'security', 2, 'закрыть сайт', '["Сайт будет недоступен для обычных пользователей", "Только администраторы и разработчики смогут войти"]', 'fa-solid fa-tools', '2026-09-07 17:20:23.091753', 1, 14, 'false', true, true, true, 'Изменил статус технических работ сайта');
INSERT INTO public.critical_actions VALUES (5, 'setTimeWindow', 'Временное окно доступа', 'Включить или выключить ограничение доступа к системе по времени (например, только в рабочие часы).', 'security', 1, 'включить', '["Доступ к системе будет ограничен вне заданного временного интервала"]', 'fa-solid fa-clock', '2026-08-28 19:48:02.129801', 1, 2, 'false', true, false, true, 'Изменил статус временного окна доступа');
INSERT INTO public.critical_actions VALUES (3, 'deleteWm', 'Удалить вотермарк копии', 'Удаляет копии файлов с вотермарками', 'security', 2, 'Удалить', '["Все файлы с вотермарками будут удалены", "Оригиналы останутся нетронутыми"]', 'fa-solid fa-tools', '2026-08-13 16:48:18.215056', 1, 3, NULL, true, true, false, 'Удалил вотермарки у всех файлов');
INSERT INTO public.critical_actions VALUES (2, 'addWm', 'Добавить вотермарк копии если нет', 'Создаёт копии файлов с вотермарками если их нет', 'security', 1, 'Добавить', '["Все файлы оригиналы будут продублированы файлами с вотермарками", "Оригиналы останутся нетронутыми"]', 'fa-solid fa-tools', '2026-08-13 16:48:55.502348', 1, 3, NULL, true, true, false, 'Добавил вотермарки ко всем файлам');
INSERT INTO public.critical_actions VALUES (4, 'setGeoMode', 'Режим Гео-блокировки', 'Управление политикой доступа по странам. "rf_only" блокирует всё кроме РФ, "block_list" блокирует только указанные страны.', 'security', 1, 'изменить', '["Изменятся правила доступа для иностранных IP-адресов", "Может повлиять на легитимных пользователей из других стран"]', 'fa-solid fa-globe', '2026-08-28 19:59:44.62402', 1, 5, 'rf_only', true, false, true, 'Изменил режим гео-блокировки');
INSERT INTO public.critical_actions VALUES (6, 'setRateLimitGuest', 'Лимит запросов для гостей', 'Максимальное количество запросов в секунду для неавторизованных пользователей (защита от флуда).', 'system', 0, 'изменить', '["Слишком низкое значение может привести к ложным блокировкам легитимных пользователей"]', 'fa-solid fa-gauge-high', '2026-08-28 20:28:02.228533', 1, 6, '50', true, false, true, 'Изменил лимит запросов в секунду для гостей');
INSERT INTO public.critical_actions VALUES (11, 'untrustAllDevices', 'Снять доверие со всех устройств', 'Принудительно устанавливает is_trusted = false для всех активных устройств всех пользователей в системе.', 'security', 2, 'недоверие', '["Все устройства потеряют статус доверенных", "Пользователи получат принудительный выход из системы и запрос на повторную авторизацию или подтверждение устройства при следующем входе."]', 'fa-solid fa-shield-virus', NULL, NULL, 0, NULL, true, true, false, 'Глобальное снятие доверия со всех устройств в системе');
INSERT INTO public.critical_actions VALUES (8, 'exitAll', 'Закрыть все сессии', 'Закрыть все сессии пользователей (выйти из аккаунтов)', 'security', 2, 'выйти', '["Все пользователи выйдут из своих аккаунтов"]', 'fa-solid fa-tools', '2026-09-06 19:47:54.302957', 1, 3, NULL, true, true, false, 'Закрыт все сессии пользователй');
INSERT INTO public.critical_actions VALUES (7, 'setBlockedCountries', 'Список заблокированных стран', 'Список двухбуквенных кодов стран (ISO), доступ к которым будет закрыт. Работает только если "Режим Гео-блокировки" установлен в "block_list". Пример: US, CN, DE', 'security', 1, 'изменить', '["Пользователи из указанных стран потеряют доступ к сайту (ошибка 451)"]', 'fa-solid fa-earth-americas', '2026-08-28 19:59:25.879792', 1, 5, 'CN,KP,IR,BR,IN', true, false, true, 'Изменил список заблокированных стран');
INSERT INTO public.critical_actions VALUES (9, 'reloadAll', 'Перезагрузить у всех', 'Перезагрузить все открытые окна сайта в браузерах пользователей', 'security', 2, 'перезагрузка', '["У всех пользователей будет перезагружено окно", "Несохранённые данные будут утеряны"]', 'fa-solid fa-tools', '2026-09-07 19:46:47.047118', 1, 11, NULL, true, true, false, 'Перезагрузил все браузеры пользователей');
INSERT INTO public.critical_actions VALUES (10, 'lockdownMode', 'ПАНИКА - закрыть вход', 'ПАНИКА - закрыть возможность входа кроме главного админа/разработчика', 'security', 2, 'паника', '["Вход будет недоступен для обычных пользователей", "Только главные администраторы и разработчики смогут войти", "Несохранённые данные будут утеряны"]', 'fa-solid fa-tools', '2026-09-07 19:47:22.531571', 1, 2, NULL, true, true, false, 'Изменил статус входа на сайте');


--
-- TOC entry 4149 (class 0 OID 34404)
-- Dependencies: 255
-- Data for Name: critical_actions_history; Type: TABLE DATA; Schema: public; Owner: admin
--

INSERT INTO public.critical_actions_history VALUES ('c261bba0-7f7c-4302-9ce0-1d6f707971cb', 5, 1, '2026-08-28 18:42:48.722203', 1, 'admin: Разблокировал доступ к действию "Временное окно доступа"');
INSERT INTO public.critical_actions_history VALUES ('1847e0d7-a009-4f1a-96cb-fcd3627c733a', 5, 1, '2026-08-28 18:42:52.818215', 1, 'admin: Заблокировал доступ к действию "Временное окно доступа"');
INSERT INTO public.critical_actions_history VALUES ('4335948e-9ca2-4cf8-ac9d-ed4e12f054aa', 4, 1, '2026-08-28 18:42:57.650681', 1, 'admin: Разблокировал доступ к действию "Режим Гео-блокировки"');
INSERT INTO public.critical_actions_history VALUES ('23fb99aa-6925-43cb-9213-c9d01c1c3bc3', 6, 1, '2026-08-28 18:44:24.522764', 1, 'admin: Разблокировал доступ к действию "Лимит запросов для гостей"');
INSERT INTO public.critical_actions_history VALUES ('75760a17-e556-4f2c-9036-6ba6b675c7b2', 6, 1, '2026-08-28 18:44:26.504541', 1, 'admin: Заблокировал доступ к действию "Лимит запросов для гостей"');
INSERT INTO public.critical_actions_history VALUES ('6a171b50-b92e-41a1-8057-451edbd60826', 6, 1, '2026-08-28 18:44:28.922852', 1, 'admin: Разблокировал доступ к действию "Лимит запросов для гостей"');
INSERT INTO public.critical_actions_history VALUES ('fc45a1d9-7903-41be-a6c4-54733394d8a1', 6, 1, '2026-08-28 18:44:29.688751', 1, 'admin: Заблокировал доступ к действию "Лимит запросов для гостей"');
INSERT INTO public.critical_actions_history VALUES ('579be8d5-4ae6-486e-9b11-675f4a80c7f8', 4, 1, '2026-08-28 18:46:20.131839', 1, 'admin: Изменил режим гео-блокировки | Новое значение: true');
INSERT INTO public.critical_actions_history VALUES ('5df81533-c025-4f6c-b19c-3a9f5973c228', 4, 1, '2026-08-28 18:46:24.257616', 1, 'admin: Разблокировал доступ к действию "Режим Гео-блокировки"');
INSERT INTO public.critical_actions_history VALUES ('86fccbc5-0408-4e76-abdc-cdb11fa9ee1e', 4, 1, '2026-08-28 18:46:36.071148', 1, 'admin: Изменил режим гео-блокировки | Новое значение: false');
INSERT INTO public.critical_actions_history VALUES ('cec89312-61ef-4d47-a6e3-07ecd95bbbaa', 6, 1, '2026-08-28 18:52:27.076586', 1, 'admin: Разблокировал доступ к действию "Лимит запросов для гостей"');
INSERT INTO public.critical_actions_history VALUES ('8f761e4f-327e-4b71-8bad-ef2d1fdbba62', 6, 1, '2026-08-28 18:52:33.449157', 1, 'admin: Изменил лимит запросов в секунду для гостей | Новое значение: true');
INSERT INTO public.critical_actions_history VALUES ('1c0f07fd-734c-49b1-bbd6-9cc595b96c2a', 4, 1, '2026-08-28 19:03:24.09352', 1, 'admin: Разблокировал доступ к действию "Режим Гео-блокировки"');
INSERT INTO public.critical_actions_history VALUES ('142a9b12-1b3c-4b18-b3c1-755f7d302836', 4, 1, '2026-08-28 19:03:28.853762', 1, 'admin: Заблокировал доступ к действию "Режим Гео-блокировки"');
INSERT INTO public.critical_actions_history VALUES ('e2a60754-6b65-474e-b423-5e32f64ff6ae', 5, 1, '2026-08-28 19:04:57.221005', 1, 'admin: Разблокировал доступ к действию "Временное окно доступа"');
INSERT INTO public.critical_actions_history VALUES ('b9038041-0d6d-4e93-8f2b-8bcde02c501a', 4, 1, '2026-08-28 19:05:01.830846', 1, 'admin: Разблокировал доступ к действию "Режим Гео-блокировки"');
INSERT INTO public.critical_actions_history VALUES ('a3db3e58-7b83-4f35-b86a-86e23845b670', 6, 1, '2026-08-28 19:05:06.777276', 1, 'admin: Разблокировал доступ к действию "Лимит запросов для гостей"');
INSERT INTO public.critical_actions_history VALUES ('d6ae7843-e4b4-4984-bee3-80991e64c6fd', 5, 1, '2026-08-28 19:05:12.745315', 1, 'admin: Заблокировал доступ к действию "Временное окно доступа"');
INSERT INTO public.critical_actions_history VALUES ('6b2c36c1-b6ba-4b22-bdb0-18e645e6abcb', 4, 1, '2026-08-28 19:05:14.095931', 1, 'admin: Заблокировал доступ к действию "Режим Гео-блокировки"');
INSERT INTO public.critical_actions_history VALUES ('a1f587c8-5e4e-4b05-ac03-9a9a35b8ac34', 6, 1, '2026-08-28 19:05:16.048303', 1, 'admin: Заблокировал доступ к действию "Лимит запросов для гостей"');
INSERT INTO public.critical_actions_history VALUES ('5bf75034-179e-4c8e-9550-f4ad8cb09f3e', 4, 1, '2026-08-28 19:09:22.841838', 1, 'admin: Разблокировал доступ к действию "Режим Гео-блокировки"');
INSERT INTO public.critical_actions_history VALUES ('f84443ae-5aaa-4f87-8ad8-5278951e19a5', 4, 1, '2026-08-28 19:09:25.252661', 1, 'admin: Заблокировал доступ к действию "Режим Гео-блокировки"');
INSERT INTO public.critical_actions_history VALUES ('4def113e-fc6f-4b06-bf34-5edd72f84950', 5, 1, '2026-08-28 19:16:32.768856', 1, 'admin: Разблокировал доступ к действию "Временное окно доступа"');
INSERT INTO public.critical_actions_history VALUES ('83fe7fc0-a5e1-48b4-ac7b-c821958577c1', 5, 1, '2026-08-28 19:16:34.886848', 1, 'admin: Заблокировал доступ к действию "Временное окно доступа"');
INSERT INTO public.critical_actions_history VALUES ('bc383f7a-46b6-40f4-9ed2-08710751bbb5', 7, 1, '2026-08-28 19:18:01.857832', 1, 'admin: Разблокировал доступ к действию "Список заблокированных стран"');
INSERT INTO public.critical_actions_history VALUES ('9f27ecf3-5cfc-40b5-bfab-a4aab54ef909', 7, 1, '2026-08-28 19:18:20.038295', 1, 'admin: Изменил список заблокированных стран | Новое значение: US,CN');
INSERT INTO public.critical_actions_history VALUES ('1cf21a3b-b6ad-4566-b41a-aea9facb8a95', 7, 1, '2026-08-28 19:26:41.478274', 1, 'admin: Разблокировал доступ к действию "Список заблокированных стран"');
INSERT INTO public.critical_actions_history VALUES ('615a0b15-7e93-4dcf-b75d-8d7f1b6b0c23', 7, 1, '2026-08-28 19:26:49.108621', 1, 'admin: Изменил список заблокированных стран | Новое значение: US,CN');
INSERT INTO public.critical_actions_history VALUES ('efddbdb6-a920-4662-b8ae-838bf055609f', 7, 1, '2026-08-28 19:36:19.992132', 1, 'admin: Разблокировал доступ к действию "Список заблокированных стран"');
INSERT INTO public.critical_actions_history VALUES ('5f4facda-af98-417d-86a1-994a522db7ec', 7, 1, '2026-08-28 19:36:28.711735', 1, 'admin: Изменил список заблокированных стран | Новое значение: US,CN');
INSERT INTO public.critical_actions_history VALUES ('50a38390-d6d6-4c59-8046-780528d7df7a', 5, 1, '2026-08-28 19:36:31.976622', 1, 'admin: Разблокировал доступ к действию "Временное окно доступа"');
INSERT INTO public.critical_actions_history VALUES ('765105b3-fa9c-4f56-86b9-4f51e3639d1b', 5, 1, '2026-08-28 19:36:34.302579', 1, 'admin: Изменил статус временного окна доступа | Новое значение: false');
INSERT INTO public.critical_actions_history VALUES ('5ecfa657-0cd0-4e8c-ae79-51f421a13889', 4, 1, '2026-08-28 19:36:38.493856', 1, 'admin: Разблокировал доступ к действию "Режим Гео-блокировки"');
INSERT INTO public.critical_actions_history VALUES ('41d15125-ab5e-468a-aa5b-ad85bff7eb16', 4, 1, '2026-08-28 19:36:40.985642', 1, 'admin: Изменил режим гео-блокировки | Новое значение: false');
INSERT INTO public.critical_actions_history VALUES ('1891af1d-d558-4ad3-b23b-6d6b32be7f09', 5, 1, '2026-08-28 19:47:58.961465', 1, 'admin: Разблокировал доступ к действию "Временное окно доступа"');
INSERT INTO public.critical_actions_history VALUES ('f32e0932-e3ea-4bd6-a65d-6b8da3609712', 5, 1, '2026-08-28 19:48:02.129801', 1, 'admin: Изменил статус временного окна доступа | Новое значение: false');
INSERT INTO public.critical_actions_history VALUES ('e10c2482-ff94-450d-9b02-1107586d2fdd', 4, 1, '2026-08-28 19:48:17.921976', 1, 'admin: Разблокировал доступ к действию "Режим Гео-блокировки"');
INSERT INTO public.critical_actions_history VALUES ('4947f074-c5af-4809-969b-e3e48c3547ae', 4, 1, '2026-08-28 19:48:19.822452', 1, 'admin: Изменил режим гео-блокировки | Новое значение: false');
INSERT INTO public.critical_actions_history VALUES ('adfb2488-797e-4c8a-869f-4e1ce446883f', 7, 1, '2026-08-28 19:48:23.965019', 1, 'admin: Разблокировал доступ к действию "Список заблокированных стран"');
INSERT INTO public.critical_actions_history VALUES ('33b30165-ea75-413f-8e85-f6aea688b332', 7, 1, '2026-08-28 19:48:31.09032', 1, 'admin: Изменил список заблокированных стран | Новое значение: US,CN');
INSERT INTO public.critical_actions_history VALUES ('5dd42d63-a23f-4f1a-b144-745e30d902df', 6, 1, '2026-08-28 19:48:36.054982', 1, 'admin: Разблокировал доступ к действию "Лимит запросов для гостей"');
INSERT INTO public.critical_actions_history VALUES ('8d5468eb-10aa-4e0f-9617-803ce4b4b2f0', 6, 1, '2026-08-28 19:48:43.921405', 1, 'admin: Изменил лимит запросов в секунду для гостей | Новое значение: true');
INSERT INTO public.critical_actions_history VALUES ('92be530e-7781-442f-9758-2ac5f05f715e', 6, 1, '2026-08-28 19:48:47.657724', 1, 'admin: Разблокировал доступ к действию "Лимит запросов для гостей"');
INSERT INTO public.critical_actions_history VALUES ('646f0e70-9052-4489-ad9e-feb3a1b5be25', 6, 1, '2026-08-28 19:49:21.685317', 1, 'admin: Изменил лимит запросов в секунду для гостей | Новое значение: 30');
INSERT INTO public.critical_actions_history VALUES ('1fd36e63-0d26-43ab-9fd5-d7350b6e294b', 7, 1, '2026-08-28 19:59:17.397524', 1, 'admin: Разблокировал доступ к действию "Список заблокированных стран"');
INSERT INTO public.critical_actions_history VALUES ('e91bf793-b8ce-4646-b114-eaefea9a2293', 7, 1, '2026-08-28 19:59:25.879792', 1, 'admin: Изменил список заблокированных стран | Новое значение: CN,KP,IR,BR,IN');
INSERT INTO public.critical_actions_history VALUES ('8fcbd604-4841-4e8d-8043-4df8d06a8219', 4, 1, '2026-08-28 19:59:30.475583', 1, 'admin: Разблокировал доступ к действию "Режим Гео-блокировки"');
INSERT INTO public.critical_actions_history VALUES ('29cf6f50-11e0-4516-a9a3-41b4ec2be6c6', 4, 1, '2026-08-28 19:59:44.62402', 1, 'admin: Изменил режим гео-блокировки | Новое значение: rf_only');
INSERT INTO public.critical_actions_history VALUES ('645c228a-96f5-4c7b-af85-d26bdf5805eb', 4, 1, '2026-08-28 19:59:49.336771', 1, 'admin: Разблокировал доступ к действию "Режим Гео-блокировки"');
INSERT INTO public.critical_actions_history VALUES ('4e991453-3776-449a-9f17-ee709e2a4440', 4, 1, '2026-08-28 19:59:51.212865', 1, 'admin: Заблокировал доступ к действию "Режим Гео-блокировки"');
INSERT INTO public.critical_actions_history VALUES ('bd6dd184-80c2-4425-be85-9e625ff4456c', 5, 1, '2026-08-28 20:00:02.770766', 1, 'admin: Разблокировал доступ к действию "Временное окно доступа"');
INSERT INTO public.critical_actions_history VALUES ('7daa2b0f-7241-4330-a255-2ed38ff32c58', 7, 1, '2026-08-28 20:10:20.066632', 1, 'admin: Разблокировал доступ к действию "Список заблокированных стран"');
INSERT INTO public.critical_actions_history VALUES ('061e2b97-d7f2-4a9f-a017-4aa29f8a0f33', 7, 1, '2026-08-28 20:10:21.870681', 1, 'admin: Заблокировал доступ к действию "Список заблокированных стран"');
INSERT INTO public.critical_actions_history VALUES ('d366fbca-9484-4cda-b8ef-354eded8b365', 5, 1, '2026-08-28 20:10:23.738152', 1, 'admin: Разблокировал доступ к действию "Временное окно доступа"');
INSERT INTO public.critical_actions_history VALUES ('bee0d81d-235c-488a-bd92-bedd7991d890', 5, 1, '2026-08-28 20:10:24.702881', 1, 'admin: Заблокировал доступ к действию "Временное окно доступа"');
INSERT INTO public.critical_actions_history VALUES ('205fa3d6-7a6d-4978-bb64-b48d9d58304f', 4, 1, '2026-08-28 20:10:26.034493', 1, 'admin: Разблокировал доступ к действию "Режим Гео-блокировки"');
INSERT INTO public.critical_actions_history VALUES ('df66e156-c26a-412f-a7e8-efcef71d7c09', 4, 1, '2026-08-28 20:10:28.829998', 1, 'admin: Заблокировал доступ к действию "Режим Гео-блокировки"');
INSERT INTO public.critical_actions_history VALUES ('06ff7f45-a337-497d-93e0-f00cf7979449', 7, 1, '2026-08-28 20:16:25.405223', 1, 'admin: Разблокировал доступ к действию "Список заблокированных стран"');
INSERT INTO public.critical_actions_history VALUES ('5e11184e-9cb2-4ff1-910d-c50aa1c5cbf9', 7, 1, '2026-08-28 20:16:30.033844', 1, 'admin: Заблокировал доступ к действию "Список заблокированных стран"');
INSERT INTO public.critical_actions_history VALUES ('3dfcc990-8621-4397-8329-5174fc66711a', 5, 1, '2026-08-28 20:16:31.969537', 1, 'admin: Разблокировал доступ к действию "Временное окно доступа"');
INSERT INTO public.critical_actions_history VALUES ('f275defd-e24b-46f6-af94-f2e09a2b5469', 5, 1, '2026-08-28 20:16:34.007631', 1, 'admin: Заблокировал доступ к действию "Временное окно доступа"');
INSERT INTO public.critical_actions_history VALUES ('af8136ae-2163-4fc2-b4d8-c247b985c8dd', 6, 1, '2026-08-28 20:22:43.60887', 1, 'admin: Разблокировал доступ к действию "Лимит запросов для гостей"');
INSERT INTO public.critical_actions_history VALUES ('1677d4ed-3f99-4d4a-96b5-fdd73274cd48', 6, 1, '2026-08-28 20:22:54.739079', 1, 'admin: Изменил лимит запросов в секунду для гостей | Новое значение: 5');
INSERT INTO public.critical_actions_history VALUES ('7b6a2bd2-f9f5-4e9c-8ebb-6515d0ed4f67', 6, 1, '2026-08-28 20:23:44.861965', 1, 'admin: Разблокировал доступ к действию "Лимит запросов для гостей"');
INSERT INTO public.critical_actions_history VALUES ('2b36a070-50aa-4959-8c57-d1f06084912d', 6, 1, '2026-08-28 20:23:54.554917', 1, 'admin: Изменил лимит запросов в секунду для гостей | Новое значение: 1');
INSERT INTO public.critical_actions_history VALUES ('0bcda0c5-edab-4abc-8469-c5efea963802', 6, 1, '2026-08-28 20:27:46.785168', 1, 'admin: Разблокировал доступ к действию "Лимит запросов для гостей"');
INSERT INTO public.critical_actions_history VALUES ('a389def6-612b-4fdd-82ad-c348a73a0bd1', 6, 1, '2026-08-28 20:28:02.228533', 1, 'admin: Изменил лимит запросов в секунду для гостей | Новое значение: 50');
INSERT INTO public.critical_actions_history VALUES ('2d6e038a-8acf-4f5c-b9e1-ee73d65fa30d', 7, 1, '2026-09-05 19:20:30.253374', 1, 'admin: Разблокировал доступ к действию "Список заблокированных стран"');
INSERT INTO public.critical_actions_history VALUES ('76de657f-0a75-4b39-95e2-6c8803d57603', 7, 1, '2026-09-05 19:20:32.611132', 1, 'admin: Заблокировал доступ к действию "Список заблокированных стран"');
INSERT INTO public.critical_actions_history VALUES ('4abe9359-51ce-44dd-a7d0-fc86e8c2b394', 4, 1, '2026-09-05 19:20:46.564054', 1, 'admin: Разблокировал доступ к действию "Режим Гео-блокировки"');
INSERT INTO public.critical_actions_history VALUES ('6e31d99d-674b-42d0-bfad-16763d757233', 4, 1, '2026-09-05 19:20:49.390556', 1, 'admin: Заблокировал доступ к действию "Режим Гео-блокировки"');
INSERT INTO public.critical_actions_history VALUES ('5ac3f477-d6a6-4620-89fb-e25496d33eff', 9, 1, '2026-09-06 19:33:55.843424', 1, 'admin: Разблокировал доступ к действию "Перезагрузить у всех"');
INSERT INTO public.critical_actions_history VALUES ('f81bf353-d81b-4c22-b62d-2d4d27535ef7', 9, 1, '2026-09-06 19:34:11.738623', 1, 'admin: Перезагрузил все браузеры пользователей');
INSERT INTO public.critical_actions_history VALUES ('f5bc5a95-e2ca-4625-abd0-984cd7d5b320', 9, 1, '2026-09-06 19:34:45.236756', 1, 'admin: Разблокировал доступ к действию "Перезагрузить у всех"');
INSERT INTO public.critical_actions_history VALUES ('62df19a8-d243-4e2f-8c4d-45d10514859e', 9, 1, '2026-09-06 19:34:50.405592', 1, 'admin: Перезагрузил все браузеры пользователей');
INSERT INTO public.critical_actions_history VALUES ('d7ddece2-cc5b-472e-9a4c-0ca08ff0be0b', 8, 1, '2026-09-06 19:35:07.472591', 1, 'admin: Разблокировал доступ к действию "Закрыть все сессии"');
INSERT INTO public.critical_actions_history VALUES ('735ef611-a893-437b-a749-a5289cecbcd7', 8, 1, '2026-09-06 19:35:13.957542', 1, 'admin: Закрыт все сессии пользователй');
INSERT INTO public.critical_actions_history VALUES ('e22e02e0-aeee-401a-822f-74f2cf980e5e', 9, 1, '2026-09-06 19:35:41.100058', 1, 'admin: Разблокировал доступ к действию "Перезагрузить у всех"');
INSERT INTO public.critical_actions_history VALUES ('a7e5c130-6d7f-4f15-889d-2de3945f562e', 9, 1, '2026-09-06 19:35:46.298627', 1, 'admin: Перезагрузил все браузеры пользователей');
INSERT INTO public.critical_actions_history VALUES ('e71bde16-1f28-4175-b82e-5d8c4f205618', 9, 1, '2026-09-06 19:36:18.989321', 1, 'admin: Разблокировал доступ к действию "Перезагрузить у всех"');
INSERT INTO public.critical_actions_history VALUES ('a711a1bc-4dc7-4a50-a11c-98b7f9a57c61', 9, 1, '2026-09-06 19:36:28.223078', 1, 'admin: Перезагрузил все браузеры пользователей');
INSERT INTO public.critical_actions_history VALUES ('657ab195-4f26-44bb-9e58-a9fbbf123d26', 9, 1, '2026-09-06 19:37:16.349231', 1, 'admin: Разблокировал доступ к действию "Перезагрузить у всех"');
INSERT INTO public.critical_actions_history VALUES ('4d86a7cb-6853-4f09-a920-d680b90fd2b6', 9, 1, '2026-09-06 19:37:20.971747', 1, 'admin: Перезагрузил все браузеры пользователей');
INSERT INTO public.critical_actions_history VALUES ('f0607a3e-f1ae-4366-927b-8f6f6c39dd52', 9, 1, '2026-09-06 19:40:33.564253', 1, 'admin: Разблокировал доступ к действию "Перезагрузить у всех"');
INSERT INTO public.critical_actions_history VALUES ('59a47aa3-c222-4247-a6b8-4e88e5de62c8', 9, 1, '2026-09-06 19:40:39.084407', 1, 'admin: Перезагрузил все браузеры пользователей');
INSERT INTO public.critical_actions_history VALUES ('319730ec-7db2-47e0-bdf6-c50fa4608679', 8, 1, '2026-09-06 19:40:58.128948', 1, 'admin: Разблокировал доступ к действию "Закрыть все сессии"');
INSERT INTO public.critical_actions_history VALUES ('927e5ecc-00ec-46c0-90cf-e3ffe98364aa', 8, 1, '2026-09-06 19:41:04.725879', 1, 'admin: Закрыт все сессии пользователй');
INSERT INTO public.critical_actions_history VALUES ('64c4dff6-0ebc-43de-bc3a-3a878eb3cdad', 9, 1, '2026-09-06 19:43:51.24622', 1, 'admin: Разблокировал доступ к действию "Перезагрузить у всех"');
INSERT INTO public.critical_actions_history VALUES ('47d3dde7-3b81-44bb-b4c5-fed7ade52a2f', 9, 1, '2026-09-06 19:43:56.973345', 1, 'admin: Перезагрузил все браузеры пользователей');
INSERT INTO public.critical_actions_history VALUES ('52a24cff-74e5-4f53-92a8-a6370fed69b4', 9, 1, '2026-09-06 19:47:22.216329', 1, 'admin: Разблокировал доступ к действию "Перезагрузить у всех"');
INSERT INTO public.critical_actions_history VALUES ('d7a0c6b5-0d31-4f74-907f-dd665aa17041', 9, 1, '2026-09-06 19:47:28.283626', 1, 'admin: Перезагрузил все браузеры пользователей');
INSERT INTO public.critical_actions_history VALUES ('81218380-6650-4c9c-836d-ec2ef24cc439', 8, 1, '2026-09-06 19:47:49.141872', 1, 'admin: Разблокировал доступ к действию "Закрыть все сессии"');
INSERT INTO public.critical_actions_history VALUES ('08af27e4-423b-4856-8fc4-f44deb0978aa', 8, 1, '2026-09-06 19:47:54.302957', 1, 'admin: Закрыт все сессии пользователй');
INSERT INTO public.critical_actions_history VALUES ('2b6045a7-7aeb-4775-ab67-d96d448f6f0d', 9, 1, '2026-09-06 20:03:01.672289', 1, 'admin: Разблокировал доступ к действию "Перезагрузить у всех"');
INSERT INTO public.critical_actions_history VALUES ('ffab359d-9103-443f-bc46-238259464512', 9, 1, '2026-09-06 20:03:06.704174', 1, 'admin: Перезагрузил все браузеры пользователей');
INSERT INTO public.critical_actions_history VALUES ('9f120851-648a-4e49-bfbe-03231bae8983', 1, 1, '2026-09-07 14:51:52.158443', 1, 'admin: Разблокировал доступ к действию "Закрыть сайт на технические работы"');
INSERT INTO public.critical_actions_history VALUES ('7d65d8fb-7982-4fb8-8f8e-56bfdd5bb68f', 1, 1, '2026-09-07 14:52:01.185742', 1, 'admin: Изменил статус технических работ сайта | Новое значение: true');
INSERT INTO public.critical_actions_history VALUES ('f309877b-a51c-46ba-a994-e59ffa3be977', 1, 1, '2026-09-07 14:52:35.979712', 1, 'admin: Разблокировал доступ к действию "Закрыть сайт на технические работы"');
INSERT INTO public.critical_actions_history VALUES ('2b266b06-46b7-47a4-b4f5-601685e3ffa3', 1, 1, '2026-09-07 14:52:37.884729', 1, 'admin: Изменил статус технических работ сайта | Новое значение: false');
INSERT INTO public.critical_actions_history VALUES ('ebda8979-fe23-4a51-b5dd-779fde6e2d84', 1, 1, '2026-09-07 16:01:16.329834', 1, 'admin: Разблокировал доступ к действию "Закрыть сайт на технические работы немедленно"');
INSERT INTO public.critical_actions_history VALUES ('5d9d6089-f9ba-4960-a93f-c828059c700c', 1, 1, '2026-09-07 16:01:17.897448', 1, 'admin: Заблокировал доступ к действию "Закрыть сайт на технические работы немедленно"');
INSERT INTO public.critical_actions_history VALUES ('66755f8e-5b6a-4e32-86fa-8913f7e3202b', 1, 1, '2026-09-07 16:01:19.304507', 1, 'admin: Разблокировал доступ к действию "Закрыть сайт на технические работы немедленно"');
INSERT INTO public.critical_actions_history VALUES ('eca433fd-0b00-406e-8193-01abacba62ba', 1, 1, '2026-09-07 16:01:20.266725', 1, 'admin: Заблокировал доступ к действию "Закрыть сайт на технические работы немедленно"');
INSERT INTO public.critical_actions_history VALUES ('0f28a0bd-8823-4e60-9621-5642c747ed77', 1, 0, '2026-09-07 16:21:00.074753', 1, 'Система: Автоматическое закрытие сайта по расписанию. Причина: тр');
INSERT INTO public.critical_actions_history VALUES ('877ed23f-282d-4b44-90ea-4bdad527c849', 1, 1, '2026-09-07 16:21:30.097093', 1, 'admin: Разблокировал доступ к действию "Закрыть сайт на технические работы немедленно"');
INSERT INTO public.critical_actions_history VALUES ('21e0aab2-9fb1-41ab-9ceb-8d55aec37387', 1, 1, '2026-09-07 16:21:32.423829', 1, 'admin: Заблокировал доступ к действию "Закрыть сайт на технические работы немедленно"');
INSERT INTO public.critical_actions_history VALUES ('164ed6f9-84ed-4456-b17b-2a745bfe20d8', 1, 1, '2026-09-07 16:21:35.564043', 1, 'admin: Разблокировал доступ к действию "Закрыть сайт на технические работы немедленно"');
INSERT INTO public.critical_actions_history VALUES ('0df8df68-9189-4190-b509-7cb71297c755', 1, 1, '2026-09-07 16:21:40.208319', 1, 'admin: Изменил статус технических работ сайта | Новое значение: true');
INSERT INTO public.critical_actions_history VALUES ('2792bbb3-bd21-468b-96ed-8dc9f3d68210', 1, 1, '2026-09-07 16:21:53.516346', 1, 'admin: Разблокировал доступ к действию "Закрыть сайт на технические работы немедленно"');
INSERT INTO public.critical_actions_history VALUES ('6468e526-cba0-4726-bbbb-89f0a7eae4bd', 1, 1, '2026-09-07 16:21:55.439656', 1, 'admin: Изменил статус технических работ сайта | Новое значение: false');
INSERT INTO public.critical_actions_history VALUES ('fc5e7274-c8d4-4978-b28e-570b2a148ad7', 1, 0, '2026-09-07 16:26:00.089647', 1, 'Система: Автоматическое закрытие сайта по расписанию. Причина: тр');
INSERT INTO public.critical_actions_history VALUES ('1a1ee33a-412d-4ed3-afd5-cf6db963899c', 1, 1, '2026-09-07 16:28:16.330552', 1, 'admin: Разблокировал доступ к действию "Закрыть сайт на технические работы немедленно"');
INSERT INTO public.critical_actions_history VALUES ('7895e244-54c7-4617-974d-161f92aad978', 1, 1, '2026-09-07 16:28:21.289092', 1, 'admin: Изменил статус технических работ сайта | Новое значение: true');
INSERT INTO public.critical_actions_history VALUES ('9a999635-84e0-4df2-9d0d-712b82305794', 1, 1, '2026-09-07 16:28:34.128928', 1, 'admin: Разблокировал доступ к действию "Закрыть сайт на технические работы немедленно"');
INSERT INTO public.critical_actions_history VALUES ('6ae8c1d3-4716-4aba-bfe1-94c27aa389c9', 1, 1, '2026-09-07 16:28:36.036765', 1, 'admin: Изменил статус технических работ сайта | Новое значение: false');
INSERT INTO public.critical_actions_history VALUES ('3484279c-77f4-4f12-bd8d-4df8d9b9a3fe', 1, 0, '2026-09-07 16:31:00.131033', 1, 'Система: Автоматическое закрытие сайта по расписанию. Причина: тр');
INSERT INTO public.critical_actions_history VALUES ('835b2fbb-9c58-4ea4-bec6-7bdadbf6f26e', 1, 1, '2026-09-07 16:51:23.670511', 1, 'admin: Разблокировал доступ к действию "Закрыть сайт на технические работы немедленно"');
INSERT INTO public.critical_actions_history VALUES ('c25dec49-5648-440b-ae0d-0aa68ab6c984', 1, 1, '2026-09-07 16:51:25.293898', 1, 'admin: Изменил статус технических работ сайта | Новое значение: false');
INSERT INTO public.critical_actions_history VALUES ('0137d3e1-9e40-462c-964f-2d28006d8a63', 1, 0, '2026-09-07 17:20:00.060726', 1, 'Система: Автоматическое закрытие сайта по расписанию. Причина: Тех работы');
INSERT INTO public.critical_actions_history VALUES ('160cc09b-157a-4ddd-ad07-47b53bf864d8', 1, 1, '2026-09-07 17:20:21.342615', 1, 'admin: Разблокировал доступ к действию "Закрыть сайт на технические работы немедленно"');
INSERT INTO public.critical_actions_history VALUES ('711fad8e-571e-4c56-89c0-490a903f4fdd', 1, 1, '2026-09-07 17:20:23.091753', 1, 'admin: Изменил статус технических работ сайта | Новое значение: false');
INSERT INTO public.critical_actions_history VALUES ('feab6875-2ff4-4fe4-a548-e166a24f0969', 9, 1, '2026-09-07 18:30:09.207023', 1, 'admin: Разблокировал доступ к действию "Перезагрузить у всех"');
INSERT INTO public.critical_actions_history VALUES ('12162162-c378-4669-ae48-99959aee1e0e', 9, 1, '2026-09-07 18:30:15.095788', 1, 'admin: Перезагрузил все браузеры пользователей');
INSERT INTO public.critical_actions_history VALUES ('d1c4f177-2140-4375-bf20-a86926e19bf1', 3, 1, '2026-09-07 18:39:46.687201', 1, 'admin: Разблокировал доступ к действию "Удалить вотермарк копии"');
INSERT INTO public.critical_actions_history VALUES ('c03c81ae-d60f-4b2a-a91e-8b12a2618882', 3, 1, '2026-09-07 18:39:48.965401', 1, 'admin: Заблокировал доступ к действию "Удалить вотермарк копии"');
INSERT INTO public.critical_actions_history VALUES ('2698b4e5-c700-421c-b181-c8dca715db82', 10, 1, '2026-09-07 19:13:48.298628', 1, 'admin: Разблокировал доступ к действию "ПАНИКА - закрыть вход"');
INSERT INTO public.critical_actions_history VALUES ('943da246-fe1a-4247-b59e-7906378b4bbc', 10, 1, '2026-09-07 19:17:03.957681', 1, 'admin: Разблокировал доступ к действию "ПАНИКА - закрыть вход"');
INSERT INTO public.critical_actions_history VALUES ('fad774b6-ca29-4082-90b1-379438c5e3b9', 10, 1, '2026-09-07 19:17:09.041119', 1, 'admin: Изменил статус входа на сайте');
INSERT INTO public.critical_actions_history VALUES ('748e063c-c33e-407f-bb87-770d4d305095', 9, 1, '2026-09-07 19:46:41.684917', 1, 'admin: Разблокировал доступ к действию "Перезагрузить у всех"');
INSERT INTO public.critical_actions_history VALUES ('2a04ea50-8b57-4703-b54c-ce197839276e', 9, 1, '2026-09-07 19:46:47.047118', 1, 'admin: Перезагрузил все браузеры пользователей');
INSERT INTO public.critical_actions_history VALUES ('e0ec4bda-0173-4b43-b6c0-ffe0c5cf41ed', 10, 1, '2026-09-07 19:47:13.102771', 1, 'admin: Разблокировал доступ к действию "ПАНИКА - закрыть вход"');
INSERT INTO public.critical_actions_history VALUES ('0dd35237-d13b-465b-865b-a73e53615ac1', 10, 1, '2026-09-07 19:47:22.531571', 1, 'admin: Изменил статус входа на сайте');
INSERT INTO public.critical_actions_history VALUES ('e8baa03b-a852-4b55-85d4-26f2f321acb5', 11, 1, '2026-09-10 15:54:05.711268', 1, 'admin: Разблокировал доступ к действию "Снять доверие со всех устройств"');


--
-- TOC entry 4164 (class 0 OID 34553)
-- Dependencies: 270
-- Data for Name: donation_access_attempts; Type: TABLE DATA; Schema: public; Owner: admin
--



--
-- TOC entry 4158 (class 0 OID 34480)
-- Dependencies: 264
-- Data for Name: donation_activations; Type: TABLE DATA; Schema: public; Owner: admin
--

INSERT INTO public.donation_activations VALUES (1, '336c3ab88af2af11c0620ddfc1c9e4440a8ff2cb3d58b11d6a743b30699bec4e20b5fa2773ebdb724a11078adb30382ec4996df83dc2cf91dd719706d5853384', '6f6cc1750080706d425ee5dca654', '16f80023a2feb88a471d2e8b666f9935', '7d2bc520a1fdef69853dcb5f176d685c', 1, 2, 100, 100, '2026-08-10 20:51:36.465', '2026-10-09 23:59:59', true, '2026-08-10 20:51:36.457207', '2026-08-10 20:51:36.457207');


--
-- TOC entry 4160 (class 0 OID 34507)
-- Dependencies: 266
-- Data for Name: donation_active_perks; Type: TABLE DATA; Schema: public; Owner: admin
--

INSERT INTO public.donation_active_perks VALUES (1, '336c3ab88af2af11c0620ddfc1c9e4440a8ff2cb3d58b11d6a743b30699bec4e20b5fa2773ebdb724a11078adb30382ec4996df83dc2cf91dd719706d5853384', '6f6cc1750080706d425ee5dca654', '16f80023a2feb88a471d2e8b666f9935', '7d2bc520a1fdef69853dcb5f176d685c', 1, 1, '2026-08-10 20:51:36.457207', '2026-10-09 23:59:59', true, '2026-08-10 20:51:36.457207');
INSERT INTO public.donation_active_perks VALUES (2, '336c3ab88af2af11c0620ddfc1c9e4440a8ff2cb3d58b11d6a743b30699bec4e20b5fa2773ebdb724a11078adb30382ec4996df83dc2cf91dd719706d5853384', '6f6cc1750080706d425ee5dca654', '16f80023a2feb88a471d2e8b666f9935', '7d2bc520a1fdef69853dcb5f176d685c', 1, 2, '2026-08-10 20:51:36.457207', '2026-10-09 23:59:59', true, '2026-08-10 20:51:36.457207');


--
-- TOC entry 4162 (class 0 OID 34534)
-- Dependencies: 268
-- Data for Name: donation_check_log; Type: TABLE DATA; Schema: public; Owner: admin
--

INSERT INTO public.donation_check_log VALUES (1, '336c3ab88af2af11c0620ddfc1c9e4440a8ff2cb3d58b11d6a743b30699bec4e20b5fa2773ebdb724a11078adb30382ec4996df83dc2cf91dd719706d5853384', '6f6cc1750080706d425ee5dca654', '16f80023a2feb88a471d2e8b666f9935', '7d2bc520a1fdef69853dcb5f176d685c', 1, 'grant', 100, 100, NULL, NULL, 'Одобрение заявки #1, пакет "Про", сумма 1200₽', '2026-08-10 20:51:36.457207');


--
-- TOC entry 4154 (class 0 OID 34441)
-- Dependencies: 260
-- Data for Name: donation_package_perks; Type: TABLE DATA; Schema: public; Owner: admin
--

INSERT INTO public.donation_package_perks VALUES (1, 1);
INSERT INTO public.donation_package_perks VALUES (2, 1);
INSERT INTO public.donation_package_perks VALUES (2, 2);
INSERT INTO public.donation_package_perks VALUES (3, 1);
INSERT INTO public.donation_package_perks VALUES (3, 2);
INSERT INTO public.donation_package_perks VALUES (3, 3);
INSERT INTO public.donation_package_perks VALUES (3, 4);
INSERT INTO public.donation_package_perks VALUES (4, 1);
INSERT INTO public.donation_package_perks VALUES (4, 2);
INSERT INTO public.donation_package_perks VALUES (4, 3);
INSERT INTO public.donation_package_perks VALUES (4, 4);
INSERT INTO public.donation_package_perks VALUES (4, 5);
INSERT INTO public.donation_package_perks VALUES (4, 6);


--
-- TOC entry 4153 (class 0 OID 34427)
-- Dependencies: 259
-- Data for Name: donation_packages; Type: TABLE DATA; Schema: public; Owner: admin
--

INSERT INTO public.donation_packages VALUES (1, 'basic', 'Базовый', 'Стартовый пакет для знакомства', 300.00, 999.00, 30, 30, true, 1, 'fa-seedling', '#10b981', '2026-08-10 20:00:06.619809', '2026-08-10 20:00:06.619809');
INSERT INTO public.donation_packages VALUES (2, 'pro', 'Про', 'Оптимальный выбор для активных', 1000.00, 2999.00, 100, 60, true, 2, 'fa-crown', '#8b5cf6', '2026-08-10 20:00:06.619809', '2026-08-10 20:00:06.619809');
INSERT INTO public.donation_packages VALUES (3, 'premium', 'Премиум', 'Максимум возможностей', 3000.00, 4999.00, 350, 90, true, 3, 'fa-gem', '#f59e0b', '2026-08-10 20:00:06.619809', '2026-08-10 20:00:06.619809');
INSERT INTO public.donation_packages VALUES (4, 'vip', 'VIP', 'Для настоящих supporters', 5000.00, NULL, 700, 180, true, 4, 'fa-star', '#ef4444', '2026-08-10 20:00:06.619809', '2026-08-10 20:00:06.619809');


--
-- TOC entry 4151 (class 0 OID 34412)
-- Dependencies: 257
-- Data for Name: donation_perks; Type: TABLE DATA; Schema: public; Owner: admin
--

INSERT INTO public.donation_perks VALUES (1, 'pro_checks', 'Про-проверки', 'Доступ к про-проверкам в чёрном списке', 'fa-magnifying-glass', '#6366f1', 1, true, '2026-08-10 20:00:00.364281', '2026-08-10 20:00:00.364281');
INSERT INTO public.donation_perks VALUES (2, 'remove_limits', 'Без лимитов', 'Снятие ограничений на частоту проверок', 'fa-unlock', '#10b981', 2, true, '2026-08-10 20:00:00.364281', '2026-08-10 20:00:00.364281');
INSERT INTO public.donation_perks VALUES (3, 'priority_review', 'Приоритет', 'Приоритетное рассмотрение инцидентов', 'fa-bolt', '#f59e0b', 3, true, '2026-08-10 20:00:00.364281', '2026-08-10 20:00:00.364281');
INSERT INTO public.donation_perks VALUES (4, 'extended_history', 'История+', 'Расширенная история проверок и инцидентов', 'fa-clock-rotate-left', '#8b5cf6', 4, true, '2026-08-10 20:00:00.364281', '2026-08-10 20:00:00.364281');
INSERT INTO public.donation_perks VALUES (5, 'support_badge', 'Значок Supporter', 'Значок поддержки в интерфейсе', 'fa-star', '#eab308', 5, true, '2026-08-10 20:00:00.364281', '2026-08-10 20:00:00.364281');
INSERT INTO public.donation_perks VALUES (6, 'early_access', 'Ранний доступ', 'Доступ к новым функциям до официального релиза', 'fa-rocket', '#ef4444', 6, true, '2026-08-10 20:00:00.364281', '2026-08-10 20:00:00.364281');


--
-- TOC entry 4156 (class 0 OID 34457)
-- Dependencies: 262
-- Data for Name: donation_requests; Type: TABLE DATA; Schema: public; Owner: admin
--

INSERT INTO public.donation_requests VALUES (1, '336c3ab88af2af11c0620ddfc1c9e4440a8ff2cb3d58b11d6a743b30699bec4e20b5fa2773ebdb724a11078adb30382ec4996df83dc2cf91dd719706d5853384', '6f6cc1750080706d425ee5dca654', '16f80023a2feb88a471d2e8b666f9935', '7d2bc520a1fdef69853dcb5f176d685c', 'approved', 1200.00, 2, 'admin', '2026-08-10 20:51:36.457207', NULL, true, '2026-08-10 20:52:01.035951', 'admin', 'c5d86ecc2735651262da2ad7bd355fd35d84a92fb473574749a71398c7798c49', '$2b$10$MFxB84gBQs3/FV1FQBCd3OTduMzrkCO2zfQUeoOavSjtH6b80G8Ny', '172.18.0.1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/148.0.0.0 YaBrowser/26.6.0.0 Safari/537.36', NULL, '2026-08-10 20:51:14.094189', '2026-08-10 20:51:14.094189', '2026-08-10 20:52:01.035951');


--
-- TOC entry 4165 (class 0 OID 34566)
-- Dependencies: 271
-- Data for Name: donation_settings; Type: TABLE DATA; Schema: public; Owner: admin
--

INSERT INTO public.donation_settings VALUES ('min_donation_amount', '300', 'Минимальная сумма доната в рублях', NULL, '2026-08-10 20:00:57.666878');
INSERT INTO public.donation_settings VALUES ('support_email', '"support@blacklistpvz.ru"', 'Email поддержки для писем', NULL, '2026-08-10 20:00:57.666878');
INSERT INTO public.donation_settings VALUES ('access_attempts_limit', '5', 'Максимум неудачных попыток доступа', NULL, '2026-08-10 20:00:57.666878');
INSERT INTO public.donation_settings VALUES ('access_lockout_minutes', '15', 'Время блокировки после лимита попыток', NULL, '2026-08-10 20:00:57.666878');
INSERT INTO public.donation_settings VALUES ('perks_expiry_time', '"23:59"', 'Время истечения плюшек в конце дня', NULL, '2026-08-10 20:00:57.666878');
INSERT INTO public.donation_settings VALUES ('email_template', '{"body": "...", "subject": "Ваш донат подтверждён!"}', 'Шаблон письма донатеру', NULL, '2026-08-10 20:00:57.666878');


--
-- TOC entry 4142 (class 0 OID 18006)
-- Dependencies: 248
-- Data for Name: file_settings; Type: TABLE DATA; Schema: public; Owner: admin
--



--
-- TOC entry 4144 (class 0 OID 18017)
-- Dependencies: 250
-- Data for Name: files; Type: TABLE DATA; Schema: public; Owner: admin
--

INSERT INTO public.files VALUES ('208aaad4-8bce-4129-ba61-64103f709416', 'incident_evidence', '09082026-QHEBN', '1786296261207_39a62967b541b2cb60a01a085389f50c.jpg', '2026-08-09 17:24:21.575146', 516714, 'image/jpeg', 2, '2026-08-09 18:49:37.42926', 1, '3e0ad261-5ebb-4077-aed4-01f692f1e02b', NULL);
INSERT INTO public.files VALUES ('941717a3-cf02-47af-8b80-4f3d7a03ef46', 'incident_evidence', '14012026-JDIDM', '1787427527390_2b22cf958d0d6433c0652de94cf186d6.png', '2026-08-22 19:38:47.49739', 1292313, 'image/png', 3, '2026-09-02 20:14:14.658729', 1, '26675865-0b42-4f4b-b7de-4a7efd44c40f', NULL);
INSERT INTO public.files VALUES ('bc8259d6-8452-4487-9ff3-c63d61a53028', 'incident_evidence', '14012026-JDIDM', '1787427523751_4f48819fb325d52d2d1791d06c267698.jpg', '2026-08-22 19:38:43.976678', 149941, 'image/jpeg', 2, '2026-08-22 19:38:44.365768', 1, '49857d6f-dac0-4b13-bb29-723928a9b574', NULL);
INSERT INTO public.files VALUES ('79a1510b-7b6b-492f-a3c5-090898886bbe', 'incident_evidence', '14012026-JDIDM', '1787427530663_e7c3947ce721ca41a0ee335f840e3ddb.png', '2026-08-22 19:38:50.777106', 1288078, 'image/png', 4, '2026-09-02 20:14:27.624844', 1, '28371256-0231-4079-9d18-6b11909431b3', NULL);
INSERT INTO public.files VALUES ('bcf3b0d0-64ae-4572-b30c-9dd745fb264f', 'incident_evidence', '14012026-JDIDM', '1787427534012_fe8620145f01afdf4b45ebb7f7869789.png', '2026-08-22 19:38:54.114809', 1214672, 'image/png', 5, '2026-09-02 20:14:50.506622', 1, '2b17cb11-344f-45a0-90f1-bb2c71a416ce', NULL);
INSERT INTO public.files VALUES ('ad50d367-985c-4ad3-9a57-6d0013567115', 'incident_evidence', '12082026-BXRIT', '1786536182935_6a016f27959dcc6df90c28dbe57abc06.jpg', '2026-08-12 12:03:08.763709', 568518, 'image/jpeg', 1, '2026-08-12 12:10:25.18158', NULL, '789d9960-42d6-4a0c-8c3e-3a3bc070eb22', NULL);
INSERT INTO public.files VALUES ('f3152bd6-c279-4349-b9cf-dee11faeeb83', 'incident_evidence', '14012026-JDIDM', '1787427537292_d91bd3f8d4d4205d94449f6545b37a73.png', '2026-08-22 19:38:57.722876', 1272061, 'image/png', 6, '2026-09-02 20:15:07.18557', 1, 'd0f9c0fd-31a9-4ac3-a0a9-1cb3eeabd57c', NULL);
INSERT INTO public.files VALUES ('be2b661c-0814-43fc-8aba-c414a258c49d', 'incident_evidence', '12082026-BXRIT', '1786536182874_1f1df1c7a081a2d415bec31aa550c867.mp3', '2026-08-12 12:03:04.198739', 8736853, 'audio/mpeg', 2, '2026-08-12 12:10:25.185222', NULL, 'a30e3243-58d6-47cb-a883-b89efb540bc9', NULL);
INSERT INTO public.files VALUES ('5f1155c9-5743-4057-a710-f3af13b83529', 'incident_evidence', '14012026-JDIDM', '1787427541318_017816af05f68f4df0d72ded48cb9644.png', '2026-08-22 19:39:01.676123', 1315449, 'image/png', 7, '2026-09-02 20:15:23.241686', 1, 'c790f055-8a25-427d-82d5-36a3db71834b', NULL);
INSERT INTO public.files VALUES ('92455d4b-4cb9-44bf-978c-4f21447cf902', 'incident_evidence', '14012026-JDIDM', '1787427545209_a382a4a1d39073406e2eaef97f6b757c.png', '2026-08-22 19:39:05.681459', 1269598, 'image/png', 8, '2026-09-02 20:15:34.55695', 1, 'b87d3278-ac3f-4dad-a487-4f678575ef0a', NULL);
INSERT INTO public.files VALUES ('7250744c-dec6-4fca-865c-5d85477acbfa', 'incident_evidence', '14012026-JDIDM', '1787427518739_81d52cee2dc1e2718fe8ee876948502d.png', '2026-08-22 19:38:38.927883', 266978, 'image/png', 1, '2026-09-02 20:13:49.700205', 1, '5f314c40-036c-42a3-80ae-53ed0bb50374', NULL);
INSERT INTO public.files VALUES ('5f30007c-46a2-430b-a04f-fb44ebcda9e6', 'incident_evidence', '09082026-QHEBN', '1786295800489_c5d3ef639c49f9417206196760419bea.png', '2026-08-09 17:16:40.622301', 21038, 'image/png', 1, '2026-08-09 17:56:14.984169', 1, '0d6e9c4e-d706-4a42-9e59-ba80dab079c6', NULL);
INSERT INTO public.files VALUES ('866a2e23-fa56-4ad9-a3f6-b32e1f94a7fc', 'incident_evidence', '09082026-QHEBN', '1786296300122_f251362afcf4a9a2d19905081f03432a.mp4', '2026-08-09 17:25:00.816657', 10878295, 'video/mp4', 3, '2026-08-09 17:56:15.000684', 1, '7a8190d9-e82d-44b6-9a55-af75d8dbd93d', NULL);
INSERT INTO public.files VALUES ('66131dcb-97c8-4dca-90e5-0c767ce17fcc', 'incident_evidence', '09082026-QHEBN', '1786296275614_8bd6eaa86428e14b0fc45c4299d95fac.mp3', '2026-08-09 17:24:36.893334', 8736853, 'audio/mpeg', 4, '2026-08-09 17:56:15.004761', 1, '66f0222c-4c4e-489a-b349-244311b6e065', NULL);
INSERT INTO public.files VALUES ('e1a8ed44-1069-4b5d-ae2e-0ca345145d34', 'incident_evidence', '09082026-QHEBN', '1786296927385_0b9c6949b6d205894505853141df6194.pdf', '2026-08-09 17:35:27.748158', 153758, 'application/pdf', 5, '2026-08-09 17:56:15.007862', 1, '566047c2-6d3d-4512-856c-66c402a49e5f', NULL);
INSERT INTO public.files VALUES ('075e97b3-6bb1-475d-aee7-cd3cf32fa62e', 'incident_evidence', '09082026-QHEBN', '1786296937644_c292df74d28cd3bc7a1b20b46d8e80a1.docx', '2026-08-09 17:35:37.842429', 41529, 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 6, '2026-08-09 17:56:15.014865', 1, '5498868f-5914-4e78-ad51-edd1ac5be978', NULL);
INSERT INTO public.files VALUES ('276f8d45-d6d1-4611-9494-a6671e9b129f', 'incident_evidence', '09082026-QHEBN', '1786296942717_55b90b07b2efe2565dee1b80fcd5de51.png', '2026-08-09 17:35:43.22368', 295179, 'image/png', 7, '2026-08-09 17:56:15.019061', 1, 'beef45b0-4f95-444c-ad12-bc8e004dd765', NULL);
INSERT INTO public.files VALUES ('3b62fda6-b80f-4eaa-9c50-e5cccb8a4796', 'incident_evidence', '10082026-UBYSC', '1786395446094_57d68f5b50b92674865f14345b2ae0cc.jpg', '2026-08-10 20:57:26.532017', 75262, 'image/jpeg', 1, '2026-08-10 20:57:27.118782', 1, '2ef8b038-91b6-407c-9bea-7b6f92febc69', NULL);
INSERT INTO public.files VALUES ('9becdf80-cb6c-47e5-b714-83b12df18e08', 'incident_evidence', '10082026-UBYSC', '1786395446105_e8eb45d6b00c67834889aead08e70e8d.jpg', '2026-08-10 20:57:26.911642', 190187, 'image/jpeg', 2, '2026-08-10 20:57:27.1227', 1, 'b8f8356f-031c-425b-b701-b9b07bd117be', NULL);
INSERT INTO public.files VALUES ('193e1ef6-578d-44f9-8e1c-821aafe5e796', 'incident_evidence', '10082026-UBYSC', '1786395463427_989897e98750b330d01273602e9033cc.mp3', '2026-08-10 20:57:44.727451', 8736853, 'audio/mpeg', 3, '2026-08-10 20:57:53.560467', 1, '5bf043c4-f339-4d24-9d92-2682d19b5e8c', NULL);
INSERT INTO public.files VALUES ('89a59fa1-94a9-43ce-aa11-f30de61041e7', 'incident_evidence', '12082026-BXRIT', '1786536646653_387ff4a3120a98df05c67a287d3b67e4.jpg', '2026-08-12 12:10:46.848546', 344783, 'image/jpeg', 3, '2026-08-12 12:10:47.230423', NULL, 'a68f1a7b-50c7-4ee1-907d-47de89fed922', NULL);
INSERT INTO public.files VALUES ('c68aa50a-8fb5-473d-a1bf-eed7763bc7c1', 'incident_evidence', '10082026-UBYSC', '1786395476927_864d9643b7fd0ecfc6a00728b112a2e4.mp4', '2026-08-10 20:57:59.323262', 10878295, 'video/mp4', 4, '2026-08-10 20:58:02.91046', 1, 'a843ffb5-6af1-40dd-86a7-cb43e0beac6d', NULL);
INSERT INTO public.files VALUES ('953c6a52-94f5-4870-a6bf-b62b18a22f58', 'incident_evidence', '12082026-BXRIT', '1786536652402_280ce72706eda48ca53aabbdd2acba5d.mp4', '2026-08-12 12:10:52.896777', 10878295, 'video/mp4', 4, '2026-08-12 12:10:55.63048', NULL, '7fadd7e3-da43-4cb7-8738-6f744cbb7eb0', NULL);
INSERT INTO public.files VALUES ('0d7de0a5-44d9-4a43-a071-3ba24a805ab6', 'incident_evidence', '12082026-JMJNY', '1786541258301_02fbae55ee76118032af5270015b0a4b.jpg', '2026-08-12 13:27:38.931701', 568518, 'image/jpeg', 1, '2026-08-12 13:27:40.090989', NULL, 'c864d9a6-a7c3-4251-b23a-e6baca75ab1f', NULL);
INSERT INTO public.files VALUES ('e805ae1b-a4a1-47dc-aa65-118dc59d3b88', 'incident_evidence', '12082026-JMJNY', '1786541258325_5c7a35c6f44b46dece8e4b324d4cea1d.jpg', '2026-08-12 13:27:39.843784', 344783, 'image/jpeg', 2, '2026-08-12 13:27:40.093848', NULL, 'b1a02fb0-ec92-44d5-87fc-24f91a3174ce', NULL);
INSERT INTO public.files VALUES ('a379c14d-c765-45c8-9813-f4247ea4aaa7', 'incident_evidence', '12082026-JCSBY', '1786561467488_44174ecfb7843f98f062b97662e18a01.jpg', '2026-08-12 19:04:29.855841', 568518, 'image/jpeg', 1, '2026-08-12 19:04:35.49737', 1, '17f9a38c-e91b-4df7-aeda-e768695954e2', NULL);
INSERT INTO public.files VALUES ('9038607e-8246-4d3b-becc-c78603332427', 'incident_evidence', '12082026-JCSBY', '1786561467498_991053c5a5d31e57df51e37e8602ef2d.mp3', '2026-08-12 19:04:31.131299', 8736853, 'audio/mpeg', 2, '2026-08-12 19:04:35.499623', 1, '3c5c1905-051a-4ebb-9392-851f656f6648', NULL);
INSERT INTO public.files VALUES ('3345cdc0-fe54-4353-b5c6-2ded75ed82cf', 'incident_evidence', '12082026-JCSBY', '1786561478261_61b97f518eafce39038772b801b92fb4.mp4', '2026-08-12 19:04:38.849187', 10878295, 'video/mp4', 3, '2026-08-12 19:04:42.123536', 1, '1df33638-4497-4f51-8206-9d915d47eb69', NULL);
INSERT INTO public.files VALUES ('6663b883-008a-4c43-b9aa-6c84a7cb4eb3', 'incident_evidence', '13082026-NGYZC', '1786639432459_6199b5f609ff723741334af881133d48.jpg', '2026-08-13 16:43:54.47426', 344783, 'image/jpeg', 2, '2026-08-13 16:43:54.875402', NULL, '70411a83-d9a5-42d3-b632-a99885bd6b98', NULL);
INSERT INTO public.files VALUES ('611f4665-5d4a-4744-a131-e7004abc4be9', 'incident_evidence', '13082026-NGYZC', '1786639476317_733884efd44979b07a1b9dc92339a1f3.mp4', '2026-08-13 16:44:37.789229', 10878295, 'video/mp4', 4, '2026-08-13 16:44:45.566203', NULL, '37f94614-f6d6-4ff4-8ed1-f93ecb04be8e', NULL);
INSERT INTO public.files VALUES ('ae31cbe0-ee3b-4220-be91-0cca6558e334', 'incident_evidence', '13082026-NGYZC', '1786639432412_b568a1ce5f95d6195a968e728aa3392f.png', '2026-08-13 16:43:53.151118', 3594456, 'image/png', 1, '2026-08-16 16:50:07.611657', NULL, '366407d9-1d59-419f-9a29-e4a7cb39aa12', NULL);
INSERT INTO public.files VALUES ('00e66b36-ff3c-4179-8954-809a18616a40', 'incident_evidence', '13082026-NGYZC', '1786897913288_0ec0d64a49b900df92e42a9779dfa232.mp4', '2026-08-16 16:31:56.248901', 81062642, 'video/mp4', 5, '2026-08-16 16:32:18.055239', 1, '9b04db20-dafa-4d69-b71f-c807765309e0', NULL);
INSERT INTO public.files VALUES ('b9fd76a3-d50a-4d6f-bdb6-aa388d4d3bec', 'incident_evidence', '13082026-NGYZC', '1786639438229_3ea69efc5e5fc6b47ad0c1a2af2bdbb0.mp3', '2026-08-13 16:43:59.75055', 8736853, 'audio/mpeg', 3, '2026-08-16 16:54:02.466347', NULL, '2ed2a534-863a-40fa-b353-a2e14c3218fb', NULL);
INSERT INTO public.files VALUES ('c9b7ea9d-0024-49b0-a9c0-22b063355cb1', 'incident_evidence', '17082026-TPEIY', '1787000306297_8702a87462e47f2b9a561d1758e6264d.png', '2026-08-17 20:58:35.864613', 4105451, 'image/png', 1, '2026-08-17 20:59:15.762197', NULL, 'eb9a1b5a-9237-40cb-9051-e9018d23b467', NULL);
INSERT INTO public.files VALUES ('abafd7a0-0d27-4bb2-aa81-99aad7ffce54', 'incident_evidence', '17082026-TPEIY', '1787000306147_19f9209a357430f6b26c0464cd5fd01f.mp3', '2026-08-17 20:58:28.590864', 8736853, 'audio/mpeg', 2, '2026-08-17 20:58:41.447825', NULL, '275374c6-9201-41f7-86d5-325a6f942d25', NULL);
INSERT INTO public.files VALUES ('64d7adac-c4a4-468b-9fd5-5700bde8bd69', 'incident_evidence', '20082026-LVSHI', '1787254343429_31a8d45ec3fc8ec0900e032b36457247.jpg', '2026-08-20 19:32:23.751194', 568518, 'image/jpeg', 1, '2026-08-20 19:32:24.68316', NULL, 'c0a60c57-a31d-4248-9661-ca322e5c3c5c', NULL);
INSERT INTO public.files VALUES ('6b4f98b3-056a-4228-8f84-e1a7aab61a0f', 'incident_evidence', '20082026-LVSHI', '1787254343438_ef46553538b6a277f6f721a9bbc4acbb.jpg', '2026-08-20 19:32:24.531142', 344783, 'image/jpeg', 2, '2026-08-20 19:32:24.685719', NULL, '709737b3-04ec-4fbf-a671-c3182a02f3b2', NULL);


--
-- TOC entry 4145 (class 0 OID 18025)
-- Dependencies: 251
-- Data for Name: files_single; Type: TABLE DATA; Schema: public; Owner: admin
--

INSERT INTO public.files_single VALUES ('7747ac08-953b-4324-878c-44376fee586b', 'watermark_audio', 'Вотермарка аудио', 'Вотермарка аудио', 'audio', true, true, '1786366764046_e48f0c6f8f2fd8092ceabff711501322.mp3', 30, '2026-08-10 12:59:24.275225', 'd177f8f6-d7a2-47b7-ab7c-b4bfb6a4f909', 2);
INSERT INTO public.files_single VALUES ('3520379c-ad41-4d06-ab70-f1878916d161', 'logo', 'Лого', 'Лого', 'image', true, false, '1786561335617_75180b323ba925f3669ee496fb25a95b.png', 5, '2026-08-12 19:02:15.756937', 'bbc66d68-3667-4476-a08b-688072e5526f', 3);
INSERT INTO public.files_single VALUES ('ec139dc2-628c-438b-9ce1-30a095eddec2', 'test', 'Тест', 'Тест', 'image', false, true, '', 100, '2026-08-12 19:50:07.333564', NULL, 0);
INSERT INTO public.files_single VALUES ('53f78db9-f876-49a1-8662-cad49d8ce4a0', 'watermark', 'Вотермарка', 'Вотермарка', 'image', true, true, '1786561346175_90996c4b284f85d38d454a8f159ae502.png', 20, '2026-08-22 16:06:26.821866', 'de0d2a65-a67c-4093-abc1-7214799f1dea', 1);


--
-- TOC entry 4140 (class 0 OID 17984)
-- Dependencies: 246
-- Data for Name: incident_change_history; Type: TABLE DATA; Schema: public; Owner: admin
--

INSERT INTO public.incident_change_history VALUES ('61c802a7-e7d4-4e5b-8886-3c57dff2ca0f', -1, 'Создал инцидент', '2026-08-20 19:32:00.984782', '20082026-LVSHI');
INSERT INTO public.incident_change_history VALUES ('bf0c4ac3-8b40-46fd-9072-f3b4670b7e44', 1, 'Изменил состояние с "Новый инцидент" на "В процессе оработки"', '2026-08-20 19:33:09.978218', '20082026-LVSHI');
INSERT INTO public.incident_change_history VALUES ('2412dd15-341c-4877-bfc3-3b9fa329b632', 1, 'Изменил состояние с "В процессе оработки" на "Обработано"', '2026-08-20 20:06:48.68185', '20082026-LVSHI');
INSERT INTO public.incident_change_history VALUES ('eaf4acee-84f0-4928-a55c-d68367ee5206', -1, 'Создал инцидент', '2026-08-20 20:16:42.948716', '20082026-YPRMO');
INSERT INTO public.incident_change_history VALUES ('13038d74-0c7f-42bc-a5f1-ad0f47645b54', -1, 'Создано оспаривание', '2026-08-20 20:16:58.736246', 'D-20082026-001');
INSERT INTO public.incident_change_history VALUES ('7b47593f-1b5f-4fc5-bc78-3a46d6590ce5', -1, 'Создано оспаривание D-20082026-001', '2026-08-20 20:16:58.736246', '20082026-LVSHI');
INSERT INTO public.incident_change_history VALUES ('c838b719-9369-4806-b473-df9df16481e3', 1, 'Статус изменен на: В обработке', '2026-08-20 20:32:50.674944', 'D-20082026-001');
INSERT INTO public.incident_change_history VALUES ('7a8c2ce9-d219-441b-949f-bb9c2284b0d5', 1, 'Статус изменен на: Оспорено частично', '2026-08-20 20:33:22.151642', 'D-20082026-001');
INSERT INTO public.incident_change_history VALUES ('2d0d02a7-2606-44a0-9871-3f06a724e0b2', 1, 'Установлена метка частичного оспаривания', '2026-08-20 20:33:22.151642', '20082026-LVSHI');
INSERT INTO public.incident_change_history VALUES ('f4a9ca43-22cc-4399-a819-efa4f79e9723', 1, 'Статус изменен на: В обработке', '2026-08-20 20:55:53.981783', 'D-20082026-001');
INSERT INTO public.incident_change_history VALUES ('5417af55-ecb7-469f-a253-fe927b5940ab', 1, 'Статус изменен на: В обработке', '2026-08-20 21:01:54.523006', 'D-20082026-001');
INSERT INTO public.incident_change_history VALUES ('60a1166f-23cf-47ae-b215-e60db40be197', 1, 'Статус изменен на: В обработке', '2026-08-20 21:03:44.773241', 'D-20082026-001');
INSERT INTO public.incident_change_history VALUES ('75a8f9ec-bfdc-44e2-855b-0f89f71b1f85', 1, 'Статус изменен на: Отклонено', '2026-08-20 21:06:20.691954', 'D-20082026-001');
INSERT INTO public.incident_change_history VALUES ('99cd2e7e-f686-400f-b5b0-171d06834fef', -1, 'Создано оспаривание', '2026-08-21 12:53:31.607117', 'D-21082026-001');
INSERT INTO public.incident_change_history VALUES ('5a1fe6ff-9e4a-4242-841c-476e1355b31b', -1, 'Создано оспаривание D-21082026-001', '2026-08-21 12:53:31.607117', '20082026-LVSHI');
INSERT INTO public.incident_change_history VALUES ('f9a8ab33-e52f-4736-9d2a-eacc816d7632', 1, 'Статус изменен на: В обработке', '2026-08-21 12:54:16.020073', 'D-21082026-001');
INSERT INTO public.incident_change_history VALUES ('1f0212c0-cde5-47de-9101-ef62fc7c59df', 1, 'Статус изменен на: Оспорено частично', '2026-08-21 12:54:22.851973', 'D-21082026-001');
INSERT INTO public.incident_change_history VALUES ('6303b054-628f-4980-844f-6da2b9c123eb', 1, 'Установлена метка частичного оспаривания', '2026-08-21 12:54:22.851973', '20082026-LVSHI');
INSERT INTO public.incident_change_history VALUES ('32613679-af6f-4015-874c-26790ffb8ff3', 1, 'Изменил состояние с "Новый инцидент" на "В процессе оработки"', '2026-08-22 15:30:01.380146', '20082026-YPRMO');
INSERT INTO public.incident_change_history VALUES ('1cb620ba-6ee2-4bca-a507-7802375e53dd', -1, 'Импортирован инцидент', '2026-08-22 19:38:35.46212', '14012026-JDIDM');
INSERT INTO public.incident_change_history VALUES ('80bd1b0c-6f64-4e85-919b-adf25ab65f4e', 1, 'Изменил состояние на "Отклонён". Причина: 123', '2026-08-22 20:47:32.810796', '20082026-YPRMO');
INSERT INTO public.incident_change_history VALUES ('c4a7634e-f695-4006-b2c5-b1edd51cbe35', -1, 'Создал инцидент', '2026-08-24 22:40:06.064795', '24082026-GYDRV');
INSERT INTO public.incident_change_history VALUES ('0580849a-4d28-412e-a393-d39c9b573bba', -1, 'Создал инцидент', '2026-08-24 22:48:35.205462', '24082026-VEECR');
INSERT INTO public.incident_change_history VALUES ('0901e487-c070-44e4-93f0-b20bb9402136', -1, 'Создал инцидент', '2026-08-24 22:54:04.326632', '24082026-PLPSY');
INSERT INTO public.incident_change_history VALUES ('d528156a-7f69-4dd0-98a3-8319eed4e36a', -1, 'Создал инцидент', '2026-08-24 22:58:20.484544', '24082026-EZXTN');
INSERT INTO public.incident_change_history VALUES ('b6de091b-65f9-448d-a547-78f35e7e21dd', -1, 'Создал инцидент', '2026-08-24 22:59:17.956268', '24082026-AHAYH');
INSERT INTO public.incident_change_history VALUES ('32ca6869-3e7d-4090-99a3-5fe161a8c4b0', 1, 'Изменил состояние на "Отклонён". Причина: Недостаточно доказательств', '2026-09-05 18:58:55.916919', '24082026-AHAYH');


--
-- TOC entry 4141 (class 0 OID 17991)
-- Dependencies: 247
-- Data for Name: incident_conditions_statuses; Type: TABLE DATA; Schema: public; Owner: admin
--

INSERT INTO public.incident_conditions_statuses VALUES (1, 'new', 'Новый инцидент', NULL, NULL, NULL, false);
INSERT INTO public.incident_conditions_statuses VALUES (2, 'in_progress', 'В процессе оработки', 'Взять в работу', NULL, 'neutral', false);
INSERT INTO public.incident_conditions_statuses VALUES (3, 'resolved', 'Обработано', 'Опубликовать', 'Вы точно готовы принять этот инцидент и опубликовать его?', 'success', true);
INSERT INTO public.incident_conditions_statuses VALUES (4, 'closed', 'Закрыт', 'Закрыть', 'Вы точно готовы закрыть инцидент? Это значит что вопрос решён, данные по инциденту будут удалены!', 'danger', true);
INSERT INTO public.incident_conditions_statuses VALUES (5, 'rejected', 'Отклонён', 'Отклонить', 'Вы точно хотите отклонить инцидент?', 'warning', true);
INSERT INTO public.incident_conditions_statuses VALUES (6, 'withdrawn', 'Отозван', 'Отозвать', 'Вы уверены, что хотите отозвать инцидент? После отзыва восстановление невозможно. Инцидент будет скрыт из публичного доступа.', 'warning', true);
INSERT INTO public.incident_conditions_statuses VALUES (7, 'contestation_new', 'Новое оспаривание', NULL, NULL, NULL, false);
INSERT INTO public.incident_conditions_statuses VALUES (8, 'contestation_in_progress', 'В обработке', 'Взять в работу', NULL, 'neutral', false);
INSERT INTO public.incident_conditions_statuses VALUES (9, 'contestation_rejected', 'Отклонено', 'Отклонить', 'Вы точно хотите отклонить оспаривание?', 'warning', true);
INSERT INTO public.incident_conditions_statuses VALUES (10, 'contested_full', 'Оспорено полностью', 'Оспорить полностью', 'Вы точно готовы отметить оспаривание как полностью удовлетворённое? Основной инцидент будет закрыт.', 'success', true);
INSERT INTO public.incident_conditions_statuses VALUES (11, 'contested_partial', 'Оспорено частично', 'Оспорить частично', 'Вы точно готовы отметить оспаривание как частично удовлетворённое? Перед этим необходимо удалить/изменить информацию, которую оспорили.', 'danger', true);
INSERT INTO public.incident_conditions_statuses VALUES (12, 'contestation_withdrawn', 'Отозвано', 'Отозвать', 'Вы уверены, что хотите отозвать оспаривание? После отзыва восстановление невозможно.', 'warning', true);


--
-- TOC entry 4133 (class 0 OID 17935)
-- Dependencies: 239
-- Data for Name: incident_persone_connector; Type: TABLE DATA; Schema: public; Owner: admin
--

INSERT INTO public.incident_persone_connector VALUES ('ae8c56a6-3533-4016-b63b-19d470f79f32', '20082026-LVSHI', 'e15eecbe-601a-4358-af2c-a51050963408', true);
INSERT INTO public.incident_persone_connector VALUES ('b999e0cb-397b-41dd-993e-0a880dff49ba', '14012026-JDIDM', '0e42f6a2-fde8-497c-ad00-ac699aa29a1b', true);
INSERT INTO public.incident_persone_connector VALUES ('96749002-e8b2-4b88-a184-40b71117723c', '20082026-YPRMO', '1cde019e-cade-44fd-871f-30de2f6fda93', false);
INSERT INTO public.incident_persone_connector VALUES ('3ed1b30e-613d-4b6e-a564-9862bac53145', '24082026-GYDRV', 'ad101311-edc2-4bd9-afc8-de4f46a4afa2', false);
INSERT INTO public.incident_persone_connector VALUES ('c34e6842-f613-4e58-a7a2-e92c73617a11', '24082026-VEECR', '46b1ff58-1c2d-46cb-885f-4ed8b3073046', false);
INSERT INTO public.incident_persone_connector VALUES ('0c872a64-ad18-4685-a1e6-ff55ceacf530', '24082026-PLPSY', '0313b43a-2b8e-4116-9165-41e1198f41e3', false);
INSERT INTO public.incident_persone_connector VALUES ('e57e8dd8-b09d-49f0-8d30-90f7547715da', '24082026-EZXTN', '1e55b83a-9778-4455-8610-87892b5a9950', false);
INSERT INTO public.incident_persone_connector VALUES ('a570ba59-f26d-46ba-9dc6-4b0fb5208d53', '24082026-AHAYH', '8abe5036-ad3e-4c43-8b17-2e218715e414', false);


--
-- TOC entry 4132 (class 0 OID 17929)
-- Dependencies: 238
-- Data for Name: incident_persones; Type: TABLE DATA; Schema: public; Owner: admin
--

INSERT INTO public.incident_persones VALUES ('e15eecbe-601a-4358-af2c-a51050963408', NULL, 9, '2026-08-20 19:32:00.984782');
INSERT INTO public.incident_persones VALUES ('1cde019e-cade-44fd-871f-30de2f6fda93', NULL, 9, '2026-08-20 20:16:42.948716');
INSERT INTO public.incident_persones VALUES ('0e42f6a2-fde8-497c-ad00-ac699aa29a1b', NULL, 9, '2026-08-22 19:38:35.46212');
INSERT INTO public.incident_persones VALUES ('ad101311-edc2-4bd9-afc8-de4f46a4afa2', NULL, 9, '2026-08-24 22:40:06.064795');
INSERT INTO public.incident_persones VALUES ('46b1ff58-1c2d-46cb-885f-4ed8b3073046', NULL, 2, '2026-08-24 22:48:35.205462');
INSERT INTO public.incident_persones VALUES ('0313b43a-2b8e-4116-9165-41e1198f41e3', NULL, 9, '2026-08-24 22:54:04.326632');
INSERT INTO public.incident_persones VALUES ('1e55b83a-9778-4455-8610-87892b5a9950', NULL, 9, '2026-08-24 22:58:20.484544');
INSERT INTO public.incident_persones VALUES ('8abe5036-ad3e-4c43-8b17-2e218715e414', NULL, 9, '2026-08-24 22:59:17.956268');


--
-- TOC entry 4130 (class 0 OID 17916)
-- Dependencies: 236
-- Data for Name: incident_pvz; Type: TABLE DATA; Schema: public; Owner: admin
--

INSERT INTO public.incident_pvz VALUES ('e81e35e4-a0d2-4ccb-b61c-7320141e1906', 13, 'вфавыпвр', 'ыфапварп', '25', true, '2026-08-20 19:32:00.984782', true);
INSERT INTO public.incident_pvz VALUES ('dd3bf235-6a01-4dc9-97ed-a81f75efd964', 13, 'московская область', 'сиреневая', '5б', true, '2026-08-22 19:38:35.46212', true);


--
-- TOC entry 4131 (class 0 OID 17923)
-- Dependencies: 237
-- Data for Name: incident_pvz_connector; Type: TABLE DATA; Schema: public; Owner: admin
--

INSERT INTO public.incident_pvz_connector VALUES ('ad91d5ce-0e34-47ab-814a-b5ccbbb34084', '14012026-JDIDM', 'dd3bf235-6a01-4dc9-97ed-a81f75efd964', true);
INSERT INTO public.incident_pvz_connector VALUES ('a81c9c82-58ed-4c39-84d3-52c3944b3e1d', '20082026-LVSHI', 'e81e35e4-a0d2-4ccb-b61c-7320141e1906', true);


--
-- TOC entry 4125 (class 0 OID 17881)
-- Dependencies: 231
-- Data for Name: incidents_data_dictionary; Type: TABLE DATA; Schema: public; Owner: admin
--

INSERT INTO public.incidents_data_dictionary OVERRIDING SYSTEM VALUE VALUES (1, 'posts', 'adm22', true, 0, '2026-08-02 18:25:12.762325', 1, true, '2026-08-02 18:28:57.307617', 1, NULL);
INSERT INTO public.incidents_data_dictionary OVERRIDING SYSTEM VALUE VALUES (3, 'posts', '123', false, 1, '2026-08-02 18:49:50.709977', 1, true, '2026-08-02 18:52:08.391684', 1, NULL);
INSERT INTO public.incidents_data_dictionary OVERRIDING SYSTEM VALUE VALUES (5, 'pvz_type', '666', true, 0, '2026-08-02 18:53:23.050387', 1, true, '2026-08-02 18:53:29.826752', 1, NULL);
INSERT INTO public.incidents_data_dictionary OVERRIDING SYSTEM VALUE VALUES (4, 'reasons', '555', true, 0, '2026-08-02 18:53:19.810798', 1, true, '2026-08-02 18:53:32.488657', 1, NULL);
INSERT INTO public.incidents_data_dictionary OVERRIDING SYSTEM VALUE VALUES (7, 'pvz_type', '123', true, 0, '2026-08-03 20:19:03.13353', 1, false, NULL, NULL, NULL);
INSERT INTO public.incidents_data_dictionary OVERRIDING SYSTEM VALUE VALUES (8, 'pvz_type', 'Ozon', true, 0, '2026-08-03 21:45:02.453184', 1, false, NULL, NULL, NULL);
INSERT INTO public.incidents_data_dictionary OVERRIDING SYSTEM VALUE VALUES (11, 'pvz_type', 'Яндекс Маркет', true, 0, '2026-08-12 15:39:30.875314', 1, false, NULL, NULL, NULL);
INSERT INTO public.incidents_data_dictionary OVERRIDING SYSTEM VALUE VALUES (12, 'pvz_type', 'Другое', true, 0, '2026-08-12 16:22:59.690582', 1, false, NULL, NULL, NULL);
INSERT INTO public.incidents_data_dictionary OVERRIDING SYSTEM VALUE VALUES (13, 'pvz_type', 'Другой', true, 0, '2026-08-12 16:26:21.160974', 1, false, NULL, NULL, NULL);
INSERT INTO public.incidents_data_dictionary OVERRIDING SYSTEM VALUE VALUES (2, 'posts', 'adm223', true, 1, '2026-08-02 18:30:33.986451', 1, false, NULL, NULL, '{"onPvz": false}');
INSERT INTO public.incidents_data_dictionary OVERRIDING SYSTEM VALUE VALUES (6, 'reasons', 'Другое', true, 5, '2026-08-03 16:39:09.859581', 1, false, NULL, NULL, '{"onPvz": false}');
INSERT INTO public.incidents_data_dictionary OVERRIDING SYSTEM VALUE VALUES (10, 'reasons', 'Невыплата', true, 0, '2026-08-12 15:39:24.522975', 1, false, NULL, NULL, '{"onPvz": true, "description": "Привет"}');
INSERT INTO public.incidents_data_dictionary OVERRIDING SYSTEM VALUE VALUES (14, 'reasons', '123', true, 0, '2026-08-17 13:58:37.973682', 1, false, NULL, NULL, '{"onPvz": true, "description": "ыавпарпвар"}');
INSERT INTO public.incidents_data_dictionary OVERRIDING SYSTEM VALUE VALUES (9, 'posts', 'Оператор ПВЗ', true, 0, '2026-08-12 15:39:18.271603', 1, false, NULL, NULL, '{"onPvz": false}');


--
-- TOC entry 4127 (class 0 OID 17889)
-- Dependencies: 233
-- Data for Name: incidents_main_info; Type: TABLE DATA; Schema: public; Owner: admin
--

INSERT INTO public.incidents_main_info VALUES ('24082026-VEECR', 1, '2026-08-24 22:48:35.205462', 'd5f612d4-51df-46c8-babf-a8824fc8045c', 6, 'впыарвпорапвыар', false, 'e828fff8-9d9f-4f65-aed9-a527cfdefe00', false, NULL, 1, 0, NULL, 1, false, NULL, '{}', NULL, false, false, NULL, false, NULL, false);
INSERT INTO public.incidents_main_info VALUES ('24082026-AHAYH', 1, '2026-08-24 22:59:17.956268', '77824e52-71a9-4be8-b027-350612b4e6eb', 6, 'ыфавпаврпвыавфаыпва', false, NULL, false, NULL, 5, 0, NULL, 6, false, 'Недостаточно доказательств', '{"verdict": "Недостаточно оснований", "evidence": "Неубедительно", "severity": "Низкая", "confidence": "Низкая", "checklist_pii": true, "internal_note": "Хрень какая-то", "checklist_toxic": true, "investigation_depth": "Поверхностная", "checklist_files_valid": true, "checklist_files_privacy": true}', NULL, false, false, NULL, false, NULL, false);
INSERT INTO public.incidents_main_info VALUES ('D-20082026-001', 2, '2026-08-20 20:16:58.736246', 'd5f612d4-51df-46c8-babf-a8824fc8045c', -1, 'ыавпарпаваывпаввасымвв', true, NULL, false, NULL, 9, 0, 1, 0, false, NULL, '{"status": true, "expertise": true, "check_contest_pii": true, "check_contest_toxic": true, "check_parent_updated": true, "check_contest_files_valid": true}', '20082026-LVSHI', true, false, '-1', false, NULL, false);
INSERT INTO public.incidents_main_info VALUES ('D-21082026-001', 2, '2026-08-21 12:53:31.607117', 'd5f612d4-51df-46c8-babf-a8824fc8045c', -1, 'фыфвмыыфвыфавывфав', true, NULL, false, NULL, 11, 0, 1, 0, false, NULL, '{"check_contest_pii": true, "check_contest_toxic": true, "check_parent_updated": true, "check_contest_files_valid": true}', '20082026-LVSHI', true, false, NULL, false, NULL, false);
INSERT INTO public.incidents_main_info VALUES ('20082026-YPRMO', 1, '2026-08-20 20:16:42.948716', 'd5f612d4-51df-46c8-babf-a8824fc8045c', 10, 'ьтмполгнгпрошгпнро', false, 'e828fff8-9d9f-4f65-aed9-a527cfdefe00', false, NULL, 5, 0, 1, 19, false, '123', '{"verdict": "Ложь / Клевета", "evidence": "Неубедительно", "severity": "Низкая", "confidence": "Низкая", "checklist_pii": false, "checklist_toxic": false, "investigation_depth": "Поверхностная", "checklist_files_valid": false, "checklist_files_privacy": false}', NULL, false, false, NULL, false, NULL, false);
INSERT INTO public.incidents_main_info VALUES ('20082026-LVSHI', 1, '2026-08-20 19:32:00.984782', 'd5f612d4-51df-46c8-babf-a8824fc8045c', 14, 'ыпяврчаопсворп ыпварпаопрпцефыврао уырквеоалророапл', true, 'e828fff8-9d9f-4f65-aed9-a527cfdefe00', false, NULL, 3, 1, 1, 90, true, NULL, '{"tg": false, "pvz": false, "status": false, "verdict": "Факт подтверждён", "evidence": "Требует уточнения", "severity": "Средняя", "expertise": false, "confidence": "Средняя", "checklist_pii": true, "checklist_toxic": true, "check_files_valid": false, "checklist_pvz_maps": true, "investigation_depth": "Стандартная", "checklist_files_valid": true, "checklist_files_privacy": true}', NULL, false, true, NULL, false, NULL, false);
INSERT INTO public.incidents_main_info VALUES ('24082026-PLPSY', 1, '2026-08-24 22:54:04.326632', 'd5f612d4-51df-46c8-babf-a8824fc8045c', 6, 'выпарппафывпарп', false, 'e828fff8-9d9f-4f65-aed9-a527cfdefe00', false, NULL, 1, 0, NULL, 1, false, NULL, '{}', NULL, false, false, NULL, false, NULL, false);
INSERT INTO public.incidents_main_info VALUES ('24082026-GYDRV', 1, '2026-08-24 22:40:06.064795', 'd5f612d4-51df-46c8-babf-a8824fc8045c', 6, 'fesgrfhfgdsfadgfdfsdg', false, 'e828fff8-9d9f-4f65-aed9-a527cfdefe00', false, NULL, 1, 0, NULL, 1, false, NULL, '{}', NULL, false, false, NULL, false, NULL, false);
INSERT INTO public.incidents_main_info VALUES ('24082026-EZXTN', 1, '2026-08-24 22:58:20.484544', 'd5f612d4-51df-46c8-babf-a8824fc8045c', 6, 'ыфавпапваывавпар', false, 'e828fff8-9d9f-4f65-aed9-a527cfdefe00', false, NULL, 1, 0, NULL, 1, false, NULL, '{}', NULL, false, false, NULL, false, NULL, false);
INSERT INTO public.incidents_main_info VALUES ('14012026-JDIDM', 1, '2026-08-22 19:38:35.46212', 'ffee6e5e-1a4d-4d62-8d50-603756c19912', 6, 'Вышел на замену 28 декабря по адресу Ул. Сиреневая 5б Яндекс маркет отработал и к концу смены попросил оплаты а менеджер сказал что в 22:00 придёт человек и скинет оплату, в свою очередь к 22:00 я оказался заблокированным и чат был очищен ник сменил на', true, NULL, false, NULL, 3, 1, 1, 45, false, NULL, '{"history": [{"result": "approved", "comment": "пгорллрпол", "user_id": "1", "timestamp": "2026-08-22T20:10:13.036Z", "user_login": "admin"}, {"result": "needs_changes", "comment": "нпроолрпол", "user_id": "1", "timestamp": "2026-08-22T20:10:29.699Z", "user_login": "admin"}, {"result": "approved", "comment": null, "user_id": "1", "timestamp": "2026-08-22T20:12:42.815Z", "user_login": "admin"}], "checklist_pii": true, "checklist_toxic": true, "check_ai_analysis": true}', NULL, false, false, NULL, true, '{"_meta": {"time_spent": "01:07", "used_ai_agent": "DeepSeek"}, "pii_types": ["Номер телефона (89932285695)", "Имя пользователя (@chakirovi)"], "blind_spots": ["Неизвестно, была ли фактически проведена проверка ПВЗ", "Неизвестно, получил ли менеджер отчёт о работе", "Отсутствуют данные о том, обращался ли заявитель в службу поддержки Яндекс Маркета"], "final_report": "**1. Суть инцидента**\nЗаявитель вышел на разовую замену в ПВЗ Яндекс Маркета 28 декабря. Отработал смену, но оплату не получил. Менеджер обещал перевести деньги после проверки в 22:00, однако к этому времени заявитель был заблокирован в мессенджере, чат очищен, никнейм менеджера изменён. Оплата так и не поступила.\n\n**2. Оценка доказательств**\nПредоставлено 8 скриншотов переписки, которые последовательно отражают: договорённость о выходе (1–4.jpg), прибытие на место и инструкции (5–6.jpg), просьбу об оплате и ответ менеджера (7.jpg), а также факт блокировки (8.jpg). Хронология не противоречива. Единственное расхождение — дублирование просьбы об уходе в 6 и 7.jpg, но это не влияет на суть. Доказательства достаточны для публикации.\n\n**3. Признаки манипуляции/фейка**\nПризнаков фабрикации не обнаружено. Переписка выглядит естественно, содержит бытовые детали (пароль, ключница). Менеджер использует манипулятивные тактики: обещание видеоотчёта для создания доверия, перекладывание ответственности на третье лицо, блокировка без объяснений. Это соответствует известной схеме «оплата после проверки — блокировка».\n\n**4. Рекомендация**\nРекомендовано к публикации в ЧС. Инцидент соответствует всем критериям: есть доказательства, хронология ясна, нарушены нормы взаимодействия (неоплата, блокировка), значимость для сообщества высокая — предупреждение о недобросовестном операторе ПВЗ.\n\n**5. Теги для поиска**\n#ЯндексМаркет #ПВЗ #Неоплата #Замена #Блокировка #Мошенничество\n\n**6. Значимость для сообщества**\nИнцидент демонстрирует риск при работе через замены без официального договора. Публикация поможет другим исполнителям быть внимательнее к условиям оплаты и проверять контрагентов.", "pii_detected": true, "user_sentiment": "Конструктивный (заявитель вежливо задаёт вопросы, уточняет детали, не переходит на оскорбления; просьба об оплате выражена корректно)", "fraud_indicators": ["Блокировка сразу после смены", "Очистка чата", "Смена ника", "Обещание оплаты без конкретного срока и гарантий"], "executive_summary": "Замена в ПВЗ: отработал, оплату не получил, менеджер заблокировал и очистил чат. Доказательства — скриншоты. Рекомендовано к публикации.", "intent_assessment": "Умышленное действие (блокировка и очистка чата сразу после окончания смены, смена ника — признаки намеренного уклонения от оплаты)", "pvz_training_need": "Да: обучение сотрудников ПВЗ корректному оформлению замен и оплате, недопустимость блокировки исполнителей без урегулирования финансовых вопросов", "mitigating_factors": ["Заявитель сам предложил уйти раньше (20:40), что могло повлиять на решение менеджера", "Отсутствие прямых угроз или оскорблений с обеих сторон"], "precedent_category": "Неоплата за выполненную работу (замена сотрудника ПВЗ)", "aggravating_factors": ["Блокировка и очистка чата сразу после смены", "Смена никнейма менеджером", "Отсутствие подтверждения оплаты в течение длительного времени", "Использование обвинительных формулировок в адрес заявителя"], "ai_confidence_score": "Высокая (>80%) (доказательства в виде скриншотов переписки, логика событий последовательна, заявитель предоставил 8 файлов, что позволяет восстановить хронологию)", "decision_complexity": "Рутинное", "key_evidence_anchor": "Скриншот (7.jpg), где менеджер пишет: «После смены, придет человек проверит все и скину», а затем «В районе 10» — это прямое обещание оплаты, которое не выполнено (от этого факта зависит 80% решения)", "verifiability_score": "Средняя (есть скриншоты, но нет видеофиксации работы, чека о приёме товара, подтверждения от ПВЗ; личность менеджера не верифицирована)", "claim_evidence_match": "Подтверждено (скриншоты переписки подтверждают договорённость об оплате после проверки в 22:00, факт блокировки и очистки чата косвенно подтверждается скринами; отсутствие оплаты не опровергнуто)", "manipulation_tactics": ["Создание ложного доверия (обещание видеоотчёта)", "Перекладывание ответственности на третье лицо («человек проверит»)"], "objective_facts_only": ["Заявитель вышел на смену 28.12", "Отработал до 20:40", "Менеджер обещал оплату после проверки в 22:00", "После 22:00 заявитель заблокирован", "Оплата не произведена"], "physical_safety_risk": {"reason": null, "detected": false}, "missing_files_request": null, "platform_process_flaw": "Нет", "pre_closure_checklist": ["Проверить, обращался ли заявитель в официальную поддержку Яндекс Маркета", "Уточнить, было ли направлено уведомление менеджеру ПВЗ"], "pvz_employee_behavior": "Непрофессиональное (не даёт чётких гарантий, использует подозрительные формулировки, блокирует после смены)", "threat_types_detected": [], "copy_paste_probability": "Низкая (переписка выглядит как живой диалог, содержит специфические детали (адрес, пароль, ключница), что нехарактерно для шаблонных жалоб)", "normalized_description": "Исполнитель вышел на замену 28 декабря по адресу ул. Сиреневая, 5б (Яндекс Маркет). Отработал смену, по окончании попросил оплату. Менеджер сообщил, что в 22:00 придет проверяющий и переведет оплату. К 22:00 исполнитель оказался заблокирован в мессенджере, чат был очищен, а никнейм менеджера изменен.", "user_cooperation_level": "Конструктивный (заявитель выполняет все указания, приходит вовремя, уточняет детали, оставляет контакт для оплаты)", "clarification_questions": ["Была ли проведена фактическая проверка ПВЗ после смены?", "Предоставлял ли заявитель видеоотчёт о работе?", "Обращался ли заявитель в службу поддержки Яндекс Маркета и каков результат?"], "evidence_contradictions": ["В скриншоте 6.jpg заявитель спрашивает про ранний уход в 19:27, а в 7.jpg эта же просьба дублируется — возможно, скриншоты сделаны с разных устройств или в разное время, но это не меняет сути"], "strongest_defense_point": "Заявитель сам попросил уйти раньше (в 20:40), что могло нарушить внутренний регламент ПВЗ и дать менеджеру формальный повод не оплачивать смену; также оплата была обещана после проверки, а не сразу по окончании работы", "suggested_neutral_reply": "Уважаемый пользователь, благодарим за предоставленные материалы. Ваш инцидент зарегистрирован под номером 14012026-JDIDM. На основании анализа доказательств (скриншоты переписки) установлено, что имеются признаки нарушения договорённостей со стороны оператора ПВЗ. Платформа не принимает мер воздействия, но инцидент будет опубликован в системе чёрного списка для информирования сообщества. Для уточнения деталей просим ответить: обращались ли вы в официальную поддержку Яндекс Маркета? Была ли проведена проверка ПВЗ после смены? Дополнительные вопросы могут быть направлены вам позднее.", "known_scam_pattern_match": "Схема «Обещание оплаты после проверки с последующей блокировкой»", "timeline_inconsistencies": ["Заявитель пишет «Я тут потихоньку собираюсь» в 19:27, но просит оплату до проверки — это нарушает оговорённый порядок, но не отменяет факта обещания оплаты"], "image_tampering_suspicion": ["Время на скриншотах соответствует заявленной хронологии (с 14:08 до 20:40), визуальных признаков монтажа не обнаружено"], "ui_ux_confusion_indicator": "Нет", "repeat_behavior_indicators": ["Пользователь упоминает, что выходил на замены ранее («знаю допы; авито, алик», «опыт больше года»), что может указывать на системность, но не является прямым признаком рецидива"], "estimated_resolution_effort": "Низкие (1-2 вопроса) (ситуация ясна, требуется лишь уточнение факта получения оплаты и проверка личности менеджера)", "recommended_moderator_action": "Опубликовать (инцидент содержит достаточные доказательства, хронология последовательна, нарушены нормы взаимодействия, значим для сообщества)", "employee_communication_quality": "Пассивно-агрессивная (менеджер даёт обещания, но не предоставляет гарантий, переводит ответственность на «человека», который придёт; фраза «А как нам понять что вы ничего не украл» носит обвинительный подтекст)", "recommended_communication_tone": "Нейтрально-деловой (инцидент не содержит агрессии, требует фактологической проверки и чёткого разъяснения позиции платформы)"}', false);


--
-- TOC entry 4204 (class 0 OID 56416)
-- Dependencies: 310
-- Data for Name: notification_admin_history; Type: TABLE DATA; Schema: public; Owner: admin
--

INSERT INTO public.notification_admin_history VALUES (1, 1, 'CHANNEL_TOGGLED', 2, 'channel', 'Email', '{"is_active": true}', '{"is_active": false}', '2026-09-12 15:52:10.407141');
INSERT INTO public.notification_admin_history VALUES (2, 1, 'CHANNEL_TOGGLED', 4, 'channel', 'Push', '{"is_active": true}', '{"is_active": false}', '2026-09-12 15:52:11.653441');
INSERT INTO public.notification_admin_history VALUES (3, 1, 'CHANNEL_TOGGLED', 3, 'channel', 'Telegram', '{"is_active": true}', '{"is_active": false}', '2026-09-12 15:52:14.294278');
INSERT INTO public.notification_admin_history VALUES (4, 1, 'CHANNEL_TOGGLED', 3, 'channel', 'Telegram', '{"is_active": false}', '{"is_active": true}', '2026-09-12 15:52:15.723742');
INSERT INTO public.notification_admin_history VALUES (5, 1, 'CHANNEL_TOGGLED', 4, 'channel', 'Push', '{"is_active": false}', '{"is_active": true}', '2026-09-12 15:52:40.370024');
INSERT INTO public.notification_admin_history VALUES (6, 1, 'CHANNEL_TOGGLED', 2, 'channel', 'Email', '{"is_active": false}', '{"is_active": true}', '2026-09-12 15:52:41.375157');
INSERT INTO public.notification_admin_history VALUES (7, 1, 'BROADCAST_SENT', NULL, 'broadcast', 'Broadcast: фывцуа', '{}', '{"group_code": "system_broadcast", "sent_count": 4, "target_type": "all"}', '2026-09-12 15:54:48.813605');
INSERT INTO public.notification_admin_history VALUES (8, 1, 'CHANNEL_TOGGLED', 2, 'channel', 'Email', '{"is_active": true}', '{"is_active": false}', '2026-09-12 15:58:43.189013');
INSERT INTO public.notification_admin_history VALUES (9, 1, 'CHANNEL_TOGGLED', 2, 'channel', 'Email', '{"is_active": false}', '{"is_active": true}', '2026-09-12 15:58:47.101078');
INSERT INTO public.notification_admin_history VALUES (10, 1, 'CHANNEL_TOGGLED', 3, 'channel', 'Telegram', '{"is_active": true}', '{"is_active": false}', '2026-09-12 15:59:00.736851');
INSERT INTO public.notification_admin_history VALUES (11, 1, 'CHANNEL_TOGGLED', 3, 'channel', 'Telegram', '{"is_active": false}', '{"is_active": true}', '2026-09-12 15:59:02.113583');
INSERT INTO public.notification_admin_history VALUES (12, 1, 'CHANNEL_TOGGLED', 4, 'channel', 'Push', '{"is_active": true}', '{"is_active": false}', '2026-09-12 15:59:03.140001');
INSERT INTO public.notification_admin_history VALUES (13, 1, 'CHANNEL_TOGGLED', 4, 'channel', 'Push', '{"is_active": false}', '{"is_active": true}', '2026-09-12 15:59:29.373179');
INSERT INTO public.notification_admin_history VALUES (14, NULL, 'GROUP_UPDATED', 10, 'group', 'Ответ на оспаривание', '{"name": "Ответ на оспаривание", "priority": "normal", "description": "1", "is_critical": false}', '{"name": "Ответ на оспаривание", "priority": "normal", "description": "1", "is_critical": false}', '2026-09-12 15:59:38.726974');
INSERT INTO public.notification_admin_history VALUES (15, 1, 'CHANNEL_TOGGLED', 3, 'channel', 'Telegram', '{"is_active": true}', '{"is_active": false}', '2026-09-12 16:01:08.616409');
INSERT INTO public.notification_admin_history VALUES (16, 1, 'GROUP_UPDATED', 8, 'group', 'Новый инцидент', '{"name": "Новый инцидент", "priority": "normal", "description": null, "is_critical": false}', '{"name": "Новый инцидент", "priority": "normal", "description": null, "is_critical": false}', '2026-09-12 16:03:44.055794');
INSERT INTO public.notification_admin_history VALUES (17, 1, 'GROUP_CHANNEL_ADDED', 8, 'group', 'Новый инцидент', '{}', '{"channels": [{"channel_id": 1, "is_enabled": true, "is_locked_for_user": false}, {"channel_id": 2, "is_enabled": false, "is_locked_for_user": false}, {"channel_id": 3, "is_enabled": true, "is_locked_for_user": false}, {"channel_id": 4, "is_enabled": true, "is_locked_for_user": false}]}', '2026-09-12 16:03:44.133067');
INSERT INTO public.notification_admin_history VALUES (18, 1, 'CHANNEL_TOGGLED', 4, 'channel', 'Push', '{"is_active": true}', '{"is_active": false}', '2026-09-12 16:04:45.605455');
INSERT INTO public.notification_admin_history VALUES (19, 1, 'CHANNEL_TOGGLED', 4, 'channel', 'Push', '{"is_active": false}', '{"is_active": true}', '2026-09-12 16:11:11.862835');
INSERT INTO public.notification_admin_history VALUES (20, 1, 'CHANNEL_TOGGLED', 4, 'channel', 'Push', '{"is_active": true}', '{"is_active": false}', '2026-09-12 16:11:17.16478');
INSERT INTO public.notification_admin_history VALUES (21, 1, 'CHANNEL_TOGGLED', 2, 'channel', 'Email', '{"is_active": true}', '{"is_active": false}', '2026-09-12 16:14:35.31042');
INSERT INTO public.notification_admin_history VALUES (22, 1, 'CHANNEL_TOGGLED', 2, 'channel', 'Email', '{"is_active": false}', '{"is_active": true}', '2026-09-12 16:14:40.238741');
INSERT INTO public.notification_admin_history VALUES (23, 1, 'CHANNEL_TOGGLED', 4, 'channel', 'Push', '{"is_active": false}', '{"is_active": true}', '2026-09-12 16:14:49.076436');


--
-- TOC entry 4202 (class 0 OID 56395)
-- Dependencies: 308
-- Data for Name: notification_channel_stats; Type: TABLE DATA; Schema: public; Owner: admin
--



--
-- TOC entry 4188 (class 0 OID 56253)
-- Dependencies: 294
-- Data for Name: notification_channels; Type: TABLE DATA; Schema: public; Owner: admin
--

INSERT INTO public.notification_channels VALUES (1, 'web', 'Веб-сайт', 'Уведомления в интерфейсе сайта', true, '2026-09-12 12:51:44.65876');
INSERT INTO public.notification_channels VALUES (3, 'telegram', 'Telegram', 'Уведомления в Telegram-бот', false, '2026-09-12 12:51:44.65876');
INSERT INTO public.notification_channels VALUES (2, 'email', 'Email', 'Уведомления на почту', true, '2026-09-12 12:51:44.65876');
INSERT INTO public.notification_channels VALUES (4, 'push', 'Push', 'Push-уведомления браузера', true, '2026-09-12 12:51:44.65876');


--
-- TOC entry 4196 (class 0 OID 56325)
-- Dependencies: 302
-- Data for Name: notification_default_role_settings; Type: TABLE DATA; Schema: public; Owner: admin
--

INSERT INTO public.notification_default_role_settings VALUES (12, 'DELETED_NO_RET', 10, 1, false, true);
INSERT INTO public.notification_default_role_settings VALUES (13, 'DELETED_NO_RET', 8, 1, false, true);
INSERT INTO public.notification_default_role_settings VALUES (14, 'DELETED_NO_RET', 9, 1, false, true);
INSERT INTO public.notification_default_role_settings VALUES (15, 'DELETED_NO_RET', 6, 1, false, true);
INSERT INTO public.notification_default_role_settings VALUES (16, 'DELETED_NO_RET', 7, 1, false, true);
INSERT INTO public.notification_default_role_settings VALUES (17, 'DELETED_NO_RET', 11, 1, false, true);
INSERT INTO public.notification_default_role_settings VALUES (18, 'DELETED_NO_RET', 2, 1, false, true);
INSERT INTO public.notification_default_role_settings VALUES (19, 'DELETED_NO_RET', 1, 1, false, true);
INSERT INTO public.notification_default_role_settings VALUES (20, 'DELETED_NO_RET', 5, 1, false, true);
INSERT INTO public.notification_default_role_settings VALUES (21, 'DELETED_NO_RET', 4, 1, false, true);
INSERT INTO public.notification_default_role_settings VALUES (22, 'DELETED_NO_RET', 3, 1, false, true);
INSERT INTO public.notification_default_role_settings VALUES (37, 'TOP_LEVEL_ADMINISTRATOR', 10, 1, true, true);
INSERT INTO public.notification_default_role_settings VALUES (38, 'TOP_LEVEL_ADMINISTRATOR', 8, 1, true, true);
INSERT INTO public.notification_default_role_settings VALUES (39, 'TOP_LEVEL_ADMINISTRATOR', 9, 1, true, true);
INSERT INTO public.notification_default_role_settings VALUES (40, 'TOP_LEVEL_ADMINISTRATOR', 6, 1, true, true);
INSERT INTO public.notification_default_role_settings VALUES (41, 'TOP_LEVEL_ADMINISTRATOR', 7, 1, true, true);
INSERT INTO public.notification_default_role_settings VALUES (42, 'TOP_LEVEL_ADMINISTRATOR', 11, 1, true, true);
INSERT INTO public.notification_default_role_settings VALUES (43, 'TOP_LEVEL_ADMINISTRATOR', 2, 1, true, true);
INSERT INTO public.notification_default_role_settings VALUES (44, 'TOP_LEVEL_ADMINISTRATOR', 1, 1, true, true);
INSERT INTO public.notification_default_role_settings VALUES (45, 'TOP_LEVEL_ADMINISTRATOR', 5, 1, true, true);
INSERT INTO public.notification_default_role_settings VALUES (46, 'TOP_LEVEL_ADMINISTRATOR', 4, 1, true, true);
INSERT INTO public.notification_default_role_settings VALUES (47, 'TOP_LEVEL_ADMINISTRATOR', 3, 1, true, true);
INSERT INTO public.notification_default_role_settings VALUES (48, 'TOP_LEVEL_ADMINISTRATOR', 13, 1, true, true);
INSERT INTO public.notification_default_role_settings VALUES (49, 'TOP_LEVEL_ADMINISTRATOR', 12, 1, true, true);
INSERT INTO public.notification_default_role_settings VALUES (50, 'TOP_LEVEL_ADMINISTRATOR', 14, 1, true, true);
INSERT INTO public.notification_default_role_settings VALUES (51, 'DELETED_RET', 10, 1, true, true);
INSERT INTO public.notification_default_role_settings VALUES (52, 'DELETED_RET', 8, 1, true, true);
INSERT INTO public.notification_default_role_settings VALUES (53, 'DELETED_RET', 9, 1, true, true);
INSERT INTO public.notification_default_role_settings VALUES (54, 'DELETED_RET', 6, 1, true, true);
INSERT INTO public.notification_default_role_settings VALUES (55, 'DELETED_RET', 7, 1, true, true);
INSERT INTO public.notification_default_role_settings VALUES (56, 'DELETED_RET', 11, 1, true, true);
INSERT INTO public.notification_default_role_settings VALUES (57, 'DELETED_RET', 2, 1, false, true);
INSERT INTO public.notification_default_role_settings VALUES (58, 'DELETED_RET', 1, 1, true, true);
INSERT INTO public.notification_default_role_settings VALUES (59, 'DELETED_RET', 5, 1, true, true);
INSERT INTO public.notification_default_role_settings VALUES (60, 'DELETED_RET', 4, 1, true, true);
INSERT INTO public.notification_default_role_settings VALUES (61, 'DELETED_RET', 3, 1, true, true);


--
-- TOC entry 4192 (class 0 OID 56286)
-- Dependencies: 298
-- Data for Name: notification_group_channels; Type: TABLE DATA; Schema: public; Owner: admin
--

INSERT INTO public.notification_group_channels VALUES (1, 1, 1, true, true);
INSERT INTO public.notification_group_channels VALUES (2, 2, 1, true, true);
INSERT INTO public.notification_group_channels VALUES (3, 3, 1, true, true);
INSERT INTO public.notification_group_channels VALUES (4, 4, 1, true, true);
INSERT INTO public.notification_group_channels VALUES (5, 5, 1, true, true);
INSERT INTO public.notification_group_channels VALUES (6, 6, 1, true, false);
INSERT INTO public.notification_group_channels VALUES (7, 7, 1, true, false);
INSERT INTO public.notification_group_channels VALUES (9, 9, 1, true, false);
INSERT INTO public.notification_group_channels VALUES (12, 12, 1, true, false);
INSERT INTO public.notification_group_channels VALUES (13, 13, 1, true, false);
INSERT INTO public.notification_group_channels VALUES (14, 14, 1, true, false);
INSERT INTO public.notification_group_channels VALUES (11, 11, 1, true, true);
INSERT INTO public.notification_group_channels VALUES (21, 1, 2, true, false);
INSERT INTO public.notification_group_channels VALUES (22, 2, 2, true, false);
INSERT INTO public.notification_group_channels VALUES (23, 3, 2, true, false);
INSERT INTO public.notification_group_channels VALUES (24, 4, 2, true, false);
INSERT INTO public.notification_group_channels VALUES (25, 5, 2, true, false);
INSERT INTO public.notification_group_channels VALUES (26, 6, 2, true, false);
INSERT INTO public.notification_group_channels VALUES (27, 7, 2, true, false);
INSERT INTO public.notification_group_channels VALUES (29, 9, 2, true, false);
INSERT INTO public.notification_group_channels VALUES (30, 12, 2, true, false);
INSERT INTO public.notification_group_channels VALUES (31, 13, 2, true, false);
INSERT INTO public.notification_group_channels VALUES (32, 14, 2, true, false);
INSERT INTO public.notification_group_channels VALUES (33, 11, 2, true, false);
INSERT INTO public.notification_group_channels VALUES (35, 1, 3, true, false);
INSERT INTO public.notification_group_channels VALUES (36, 2, 3, true, false);
INSERT INTO public.notification_group_channels VALUES (37, 3, 3, true, false);
INSERT INTO public.notification_group_channels VALUES (38, 4, 3, true, false);
INSERT INTO public.notification_group_channels VALUES (39, 5, 3, true, false);
INSERT INTO public.notification_group_channels VALUES (40, 6, 3, true, false);
INSERT INTO public.notification_group_channels VALUES (41, 7, 3, true, false);
INSERT INTO public.notification_group_channels VALUES (43, 9, 3, true, false);
INSERT INTO public.notification_group_channels VALUES (44, 12, 3, true, false);
INSERT INTO public.notification_group_channels VALUES (45, 13, 3, true, false);
INSERT INTO public.notification_group_channels VALUES (46, 14, 3, true, false);
INSERT INTO public.notification_group_channels VALUES (47, 11, 3, true, false);
INSERT INTO public.notification_group_channels VALUES (49, 1, 4, true, false);
INSERT INTO public.notification_group_channels VALUES (50, 2, 4, true, false);
INSERT INTO public.notification_group_channels VALUES (51, 3, 4, true, false);
INSERT INTO public.notification_group_channels VALUES (52, 4, 4, true, false);
INSERT INTO public.notification_group_channels VALUES (53, 5, 4, true, false);
INSERT INTO public.notification_group_channels VALUES (54, 6, 4, true, false);
INSERT INTO public.notification_group_channels VALUES (55, 7, 4, true, false);
INSERT INTO public.notification_group_channels VALUES (57, 9, 4, true, false);
INSERT INTO public.notification_group_channels VALUES (58, 12, 4, true, false);
INSERT INTO public.notification_group_channels VALUES (59, 13, 4, true, false);
INSERT INTO public.notification_group_channels VALUES (60, 14, 4, true, false);
INSERT INTO public.notification_group_channels VALUES (61, 11, 4, true, false);
INSERT INTO public.notification_group_channels VALUES (10, 10, 1, true, false);
INSERT INTO public.notification_group_channels VALUES (34, 10, 2, false, false);
INSERT INTO public.notification_group_channels VALUES (48, 10, 3, false, false);
INSERT INTO public.notification_group_channels VALUES (62, 10, 4, false, false);
INSERT INTO public.notification_group_channels VALUES (8, 8, 1, true, false);
INSERT INTO public.notification_group_channels VALUES (28, 8, 2, false, false);
INSERT INTO public.notification_group_channels VALUES (42, 8, 3, true, false);
INSERT INTO public.notification_group_channels VALUES (56, 8, 4, true, false);


--
-- TOC entry 4190 (class 0 OID 56266)
-- Dependencies: 296
-- Data for Name: notification_groups; Type: TABLE DATA; Schema: public; Owner: admin
--

INSERT INTO public.notification_groups VALUES (1, 'system_password_changed', 'Смена пароля', NULL, 'user', 'high', true, false, 'fa-key', '#ef4444', '2026-09-12 12:52:20.664684', '2026-09-12 12:52:20.664684');
INSERT INTO public.notification_groups VALUES (2, 'system_new_device_login', 'Вход с нового устройства', NULL, 'user', 'high', true, false, 'fa-mobile-screen', '#10b981', '2026-09-12 12:52:20.664684', '2026-09-12 12:52:20.664684');
INSERT INTO public.notification_groups VALUES (3, 'system_session_revoked', 'Сессия завершена', NULL, 'user', 'high', true, false, 'fa-right-from-bracket', '#ef4444', '2026-09-12 12:52:20.664684', '2026-09-12 12:52:20.664684');
INSERT INTO public.notification_groups VALUES (4, 'system_role_changed', 'Роль изменена', NULL, 'user', 'high', true, false, 'fa-user-gear', '#8b5cf6', '2026-09-12 12:52:20.664684', '2026-09-12 12:52:20.664684');
INSERT INTO public.notification_groups VALUES (5, 'system_permissions_changed', 'Права изменены', NULL, 'user', 'high', true, false, 'fa-shield-halved', '#3b82f6', '2026-09-12 12:52:20.664684', '2026-09-12 12:52:20.664684');
INSERT INTO public.notification_groups VALUES (6, 'security_backup_code_used', 'Использован аварийный код', NULL, 'user', 'high', false, true, 'fa-life-ring', '#ef4444', '2026-09-12 12:52:20.664684', '2026-09-12 12:52:20.664684');
INSERT INTO public.notification_groups VALUES (7, 'security_totp_changed', 'Изменены настройки 2FA', NULL, 'user', 'high', false, true, 'fa-lock', '#ef4444', '2026-09-12 12:52:20.664684', '2026-09-12 12:52:20.664684');
INSERT INTO public.notification_groups VALUES (9, 'incident_status_changed', 'Статус инцидента изменён', NULL, 'user', 'normal', false, false, 'fa-arrows-rotate', '#3b82f6', '2026-09-12 12:52:27.33642', '2026-09-12 12:52:27.33642');
INSERT INTO public.notification_groups VALUES (12, 'staff_new_incident_assigned', 'Назначен новый инцидент', NULL, 'staff', 'normal', false, false, 'fa-file-circle-plus', '#f59e0b', '2026-09-12 12:52:27.33642', '2026-09-12 12:52:27.33642');
INSERT INTO public.notification_groups VALUES (13, 'staff_incident_escalated', 'Инцидент эскалирован', NULL, 'staff', 'high', false, false, 'fa-arrow-up-right-dots', '#ef4444', '2026-09-12 12:52:27.33642', '2026-09-12 12:52:27.33642');
INSERT INTO public.notification_groups VALUES (14, 'staff_user_reported', 'Жалоба на пользователя', NULL, 'staff', 'normal', false, false, 'fa-flag', '#f59e0b', '2026-09-12 12:52:27.33642', '2026-09-12 12:52:27.33642');
INSERT INTO public.notification_groups VALUES (11, 'system_broadcast', 'Системное объявление', NULL, 'user', 'normal', false, false, 'fa-bullhorn', '#6366f1', '2026-09-12 12:52:27.33642', '2026-09-12 15:04:05.483135');
INSERT INTO public.notification_groups VALUES (10, 'contestation_response', 'Ответ на оспаривание', '1', 'user', 'normal', false, false, 'fa-scale-balanced', '#a78bfa', '2026-09-12 12:52:27.33642', '2026-09-12 15:59:38.721219');
INSERT INTO public.notification_groups VALUES (8, 'incident_created', 'Новый инцидент', NULL, 'user', 'normal', false, false, 'fa-file-circle-exclamation', '#f59e0b', '2026-09-12 12:52:27.33642', '2026-09-12 16:03:44.047095');


--
-- TOC entry 4194 (class 0 OID 56307)
-- Dependencies: 300
-- Data for Name: notification_templates; Type: TABLE DATA; Schema: public; Owner: admin
--

INSERT INTO public.notification_templates VALUES (1, 1, 'web', 'Пароль изменён', 'Пароль вашего аккаунта был успешно изменён.', '2026-09-12 12:52:46.107513', '2026-09-12 12:52:46.107513');
INSERT INTO public.notification_templates VALUES (2, 2, 'web', 'Вход с нового устройства', 'Выполнен вход с нового устройства: {device_info}. IP: {ip}', '2026-09-12 12:52:46.107513', '2026-09-12 12:52:46.107513');
INSERT INTO public.notification_templates VALUES (3, 3, 'web', 'Сессия завершена', 'Ваша сессия была завершена. Причина: {reason}', '2026-09-12 12:52:46.107513', '2026-09-12 12:52:46.107513');
INSERT INTO public.notification_templates VALUES (4, 4, 'web', 'Ваша роль изменена', 'Ваша роль изменена с {old_role} на {new_role}', '2026-09-12 12:52:46.107513', '2026-09-12 12:52:46.107513');
INSERT INTO public.notification_templates VALUES (5, 5, 'web', 'Ваши права изменены', 'Ваши права доступа были изменены администратором', '2026-09-12 12:52:46.107513', '2026-09-12 12:52:46.107513');
INSERT INTO public.notification_templates VALUES (6, 6, 'web', 'Использован аварийный код', 'Использован аварийный код. Осталось: {remaining}', '2026-09-12 12:52:46.107513', '2026-09-12 12:52:46.107513');
INSERT INTO public.notification_templates VALUES (7, 7, 'web', 'Изменены настройки 2FA', 'Настройки двухфакторной аутентификации были изменены', '2026-09-12 12:52:46.107513', '2026-09-12 12:52:46.107513');
INSERT INTO public.notification_templates VALUES (8, 8, 'web', 'Новый инцидент #{incident_id}', 'Создан новый инцидент: {incident_title}', '2026-09-12 12:52:46.107513', '2026-09-12 12:52:46.107513');
INSERT INTO public.notification_templates VALUES (9, 9, 'web', 'Статус инцидента #{incident_id} изменён', 'Статус инцидента изменён на: {new_status}', '2026-09-12 12:52:46.107513', '2026-09-12 12:52:46.107513');
INSERT INTO public.notification_templates VALUES (10, 10, 'web', 'Ответ на оспаривание', 'Получен ответ на ваше оспаривание', '2026-09-12 12:52:46.107513', '2026-09-12 12:52:46.107513');
INSERT INTO public.notification_templates VALUES (12, 12, 'web', 'Вам назначен инцидент #{incident_id}', 'Вам назначен инцидент для рассмотрения: {incident_title}', '2026-09-12 12:52:46.107513', '2026-09-12 12:52:46.107513');
INSERT INTO public.notification_templates VALUES (13, 13, 'web', 'Инцидент #{incident_id} эскалирован', 'Инцидент требует вашего внимания', '2026-09-12 12:52:46.107513', '2026-09-12 12:52:46.107513');
INSERT INTO public.notification_templates VALUES (14, 14, 'web', 'Новая жалоба на пользователя', 'Поступила жалоба на пользователя {user_login}', '2026-09-12 12:52:46.107513', '2026-09-12 12:52:46.107513');
INSERT INTO public.notification_templates VALUES (11, 11, 'web', '{title}', '{body}', '2026-09-12 12:52:46.107513', '2026-09-12 14:50:00.915692');


--
-- TOC entry 4198 (class 0 OID 56346)
-- Dependencies: 304
-- Data for Name: notification_user_settings; Type: TABLE DATA; Schema: public; Owner: admin
--

INSERT INTO public.notification_user_settings VALUES (1, 1, 10, 1, true, true, '2026-09-12 13:45:57.875422', '2026-09-12 16:41:52.254065');
INSERT INTO public.notification_user_settings VALUES (2, 1, 8, 1, true, true, '2026-09-12 13:45:57.882217', '2026-09-12 16:41:52.267269');
INSERT INTO public.notification_user_settings VALUES (66, 1, 8, 4, true, true, '2026-09-12 16:41:49.74729', '2026-09-12 16:41:52.271486');
INSERT INTO public.notification_user_settings VALUES (3, 1, 9, 1, true, true, '2026-09-12 13:45:57.885007', '2026-09-12 16:41:52.274782');
INSERT INTO public.notification_user_settings VALUES (68, 1, 9, 2, true, true, '2026-09-12 16:41:49.760699', '2026-09-12 16:41:52.279224');
INSERT INTO public.notification_user_settings VALUES (69, 1, 9, 4, true, true, '2026-09-12 16:41:49.765329', '2026-09-12 16:41:52.28323');
INSERT INTO public.notification_user_settings VALUES (4, 1, 6, 1, true, true, '2026-09-12 13:45:57.88752', '2026-09-12 16:41:52.287293');
INSERT INTO public.notification_user_settings VALUES (71, 1, 6, 2, true, true, '2026-09-12 16:41:49.773259', '2026-09-12 16:41:52.290373');
INSERT INTO public.notification_user_settings VALUES (72, 1, 6, 4, true, true, '2026-09-12 16:41:49.776589', '2026-09-12 16:41:52.293389');
INSERT INTO public.notification_user_settings VALUES (5, 1, 7, 1, true, true, '2026-09-12 13:45:57.890183', '2026-09-12 16:41:52.296231');
INSERT INTO public.notification_user_settings VALUES (74, 1, 7, 2, true, true, '2026-09-12 16:41:49.783969', '2026-09-12 16:41:52.298841');
INSERT INTO public.notification_user_settings VALUES (75, 1, 7, 4, true, true, '2026-09-12 16:41:49.787283', '2026-09-12 16:41:52.302289');
INSERT INTO public.notification_user_settings VALUES (76, 1, 11, 2, true, true, '2026-09-12 16:41:49.790667', '2026-09-12 16:41:52.305623');
INSERT INTO public.notification_user_settings VALUES (77, 1, 11, 4, true, true, '2026-09-12 16:41:49.793941', '2026-09-12 16:41:52.308196');
INSERT INTO public.notification_user_settings VALUES (7, 1, 13, 1, true, true, '2026-09-12 13:45:57.900952', '2026-09-12 16:41:52.321354');
INSERT INTO public.notification_user_settings VALUES (79, 1, 13, 2, true, true, '2026-09-12 16:41:49.819886', '2026-09-12 16:41:52.323435');
INSERT INTO public.notification_user_settings VALUES (80, 1, 13, 4, true, true, '2026-09-12 16:41:49.822907', '2026-09-12 16:41:52.326196');
INSERT INTO public.notification_user_settings VALUES (8, 1, 12, 1, true, true, '2026-09-12 13:45:57.90327', '2026-09-12 16:41:52.328469');
INSERT INTO public.notification_user_settings VALUES (82, 1, 12, 2, true, true, '2026-09-12 16:41:49.827887', '2026-09-12 16:41:52.330983');
INSERT INTO public.notification_user_settings VALUES (83, 1, 12, 4, true, true, '2026-09-12 16:41:49.831829', '2026-09-12 16:41:52.334444');
INSERT INTO public.notification_user_settings VALUES (9, 1, 14, 1, true, true, '2026-09-12 13:45:57.905865', '2026-09-12 16:41:52.337825');
INSERT INTO public.notification_user_settings VALUES (85, 1, 14, 2, true, true, '2026-09-12 16:41:49.837698', '2026-09-12 16:41:52.340165');
INSERT INTO public.notification_user_settings VALUES (6, 1, 11, 1, true, true, '2026-09-12 13:45:57.89351', '2026-09-12 14:45:59.224053');
INSERT INTO public.notification_user_settings VALUES (86, 1, 14, 4, true, true, '2026-09-12 16:41:49.840165', '2026-09-12 16:41:52.343304');


--
-- TOC entry 4206 (class 0 OID 56438)
-- Dependencies: 312
-- Data for Name: notification_user_settings_history; Type: TABLE DATA; Schema: public; Owner: admin
--

INSERT INTO public.notification_user_settings_history VALUES (1, 1, 10, 1, 'contestation_response', 'web', true, false, true, true, '2026-09-12 16:41:49.730552');
INSERT INTO public.notification_user_settings_history VALUES (2, 1, 10, 1, 'contestation_response', 'web', false, true, true, true, '2026-09-12 16:41:52.262329');


--
-- TOC entry 4200 (class 0 OID 56370)
-- Dependencies: 306
-- Data for Name: notifications; Type: TABLE DATA; Schema: public; Owner: admin
--

INSERT INTO public.notifications VALUES (71, 9, 11, 'system_broadcast', 'user', 'фывцуа', 'фцвыука', '{"actor_id": "1", "is_broadcast": true}', 'normal', false, NULL, '2026-09-12 15:54:48.792617', NULL, NULL);
INSERT INTO public.notifications VALUES (73, 8, 11, 'system_broadcast', 'user', 'фывцуа', 'фцвыука', '{"actor_id": "1", "is_broadcast": true}', 'normal', false, NULL, '2026-09-12 15:54:48.804582', NULL, NULL);
INSERT INTO public.notifications VALUES (74, 7, 11, 'system_broadcast', 'user', 'фывцуа', 'фцвыука', '{"actor_id": "1", "is_broadcast": true}', 'normal', false, NULL, '2026-09-12 15:54:48.809927', NULL, NULL);
INSERT INTO public.notifications VALUES (72, 1, 11, 'system_broadcast', 'user', 'фывцуа', 'фцвыука', '{"actor_id": "1", "is_broadcast": true}', 'normal', true, '2026-09-12 16:20:46.077753', '2026-09-12 15:54:48.800759', NULL, NULL);
INSERT INTO public.notifications VALUES (3, 7, 4, 'system_role_changed', 'user', 'Ваша роль изменена', 'Ваша роль изменена с MODERATOR на ADMINISTRATOR', '{"new_role": "ADMINISTRATOR", "old_role": "MODERATOR"}', 'high', true, '2026-09-12 13:39:29.445409', '2026-09-12 13:32:37.136893', NULL, NULL);
INSERT INTO public.notifications VALUES (2, 7, 4, 'system_role_changed', 'user', 'Ваша роль изменена', 'Ваша роль изменена с ADMINISTRATOR на MODERATOR', '{"new_role": "MODERATOR", "old_role": "ADMINISTRATOR"}', 'high', true, '2026-09-12 13:39:29.81138', '2026-09-12 13:32:31.925701', NULL, NULL);
INSERT INTO public.notifications VALUES (1, 7, 4, 'system_role_changed', 'user', 'Ваша роль изменена', 'Ваша роль изменена с MODERATOR на ADMINISTRATOR', '{"new_role": "ADMINISTRATOR", "old_role": "MODERATOR"}', 'high', true, '2026-09-12 13:39:30.210086', '2026-09-12 13:32:08.810426', NULL, NULL);
INSERT INTO public.notifications VALUES (4, 7, 4, 'system_role_changed', 'user', 'Ваша роль изменена', 'Ваша роль изменена с ADMINISTRATOR на TOP_LEVEL_ADMINISTRATOR', '{"new_role": "TOP_LEVEL_ADMINISTRATOR", "old_role": "ADMINISTRATOR"}', 'high', true, '2026-09-12 13:39:33.025184', '2026-09-12 13:32:44.568361', NULL, NULL);
INSERT INTO public.notifications VALUES (6, 9, 11, 'system_broadcast', 'user', '123', '321', '{}', 'normal', false, NULL, '2026-09-12 13:51:21.421833', NULL, NULL);
INSERT INTO public.notifications VALUES (8, 8, 11, 'system_broadcast', 'user', '123', '321', '{}', 'normal', false, NULL, '2026-09-12 13:51:21.431329', NULL, NULL);
INSERT INTO public.notifications VALUES (10, 9, 11, 'system_broadcast', 'user', 'выап', 'фвыаувпр', '{}', 'normal', false, NULL, '2026-09-12 13:53:21.052538', NULL, NULL);
INSERT INTO public.notifications VALUES (12, 8, 11, 'system_broadcast', 'user', 'выап', 'фвыаувпр', '{}', 'normal', false, NULL, '2026-09-12 13:53:21.063227', NULL, NULL);
INSERT INTO public.notifications VALUES (13, 7, 11, 'system_broadcast', 'user', 'выап', 'фвыаувпр', '{}', 'normal', true, '2026-09-12 13:53:31.202466', '2026-09-12 13:53:21.06596', NULL, NULL);
INSERT INTO public.notifications VALUES (9, 7, 11, 'system_broadcast', 'user', '123', '321', '{}', 'normal', true, '2026-09-12 13:53:31.857904', '2026-09-12 13:51:21.434123', NULL, NULL);
INSERT INTO public.notifications VALUES (5, 7, 11, 'system_broadcast', 'user', '123', 'ыавпарав', '{}', 'normal', true, '2026-09-12 13:53:32.239837', '2026-09-12 13:50:07.305935', NULL, NULL);
INSERT INTO public.notifications VALUES (14, 9, 11, 'system_broadcast', 'user', 'шгнекнг', 'гнеенгне', '{}', 'normal', false, NULL, '2026-09-12 13:54:05.322538', NULL, NULL);
INSERT INTO public.notifications VALUES (16, 8, 11, 'system_broadcast', 'user', 'шгнекнг', 'гнеенгне', '{}', 'normal', false, NULL, '2026-09-12 13:54:05.346094', NULL, NULL);
INSERT INTO public.notifications VALUES (17, 7, 11, 'system_broadcast', 'user', 'шгнекнг', 'гнеенгне', '{}', 'normal', true, '2026-09-12 13:54:15.53523', '2026-09-12 13:54:05.350684', NULL, NULL);
INSERT INTO public.notifications VALUES (15, 1, 11, 'system_broadcast', 'user', 'шгнекнг', 'гнеенгне', '{}', 'normal', true, '2026-09-12 13:55:38.136076', '2026-09-12 13:54:05.328451', NULL, NULL);
INSERT INTO public.notifications VALUES (11, 1, 11, 'system_broadcast', 'user', 'выап', 'фвыаувпр', '{}', 'normal', true, '2026-09-12 13:55:39.642674', '2026-09-12 13:53:21.060124', NULL, NULL);
INSERT INTO public.notifications VALUES (7, 1, 11, 'system_broadcast', 'user', '123', '321', '{}', 'normal', true, '2026-09-12 13:55:41.529387', '2026-09-12 13:51:21.428548', NULL, NULL);
INSERT INTO public.notifications VALUES (18, 7, 11, 'system_broadcast', 'user', 'ыфвапавы', 'фвыавпавыапа', '{}', 'normal', true, '2026-09-12 13:56:04.001432', '2026-09-12 13:55:59.123624', NULL, NULL);
INSERT INTO public.notifications VALUES (19, 7, 11, 'system_broadcast', 'user', 'ыавпавыпар', 'фыварвпоравп', '{}', 'normal', true, '2026-09-12 14:01:25.750101', '2026-09-12 14:01:19.790757', NULL, NULL);
INSERT INTO public.notifications VALUES (20, 7, 11, 'system_broadcast', 'user', '123', '123', '{}', 'normal', true, '2026-09-12 14:04:35.690871', '2026-09-12 14:04:35.572527', NULL, NULL);
INSERT INTO public.notifications VALUES (22, 9, 11, 'system_broadcast', 'user', '123', '321', '{}', 'normal', false, NULL, '2026-09-12 14:05:39.302159', NULL, NULL);
INSERT INTO public.notifications VALUES (24, 8, 11, 'system_broadcast', 'user', '123', '321', '{}', 'normal', false, NULL, '2026-09-12 14:05:39.313829', NULL, NULL);
INSERT INTO public.notifications VALUES (23, 1, 11, 'system_broadcast', 'user', '123', '321', '{}', 'normal', true, '2026-09-12 14:05:45.643761', '2026-09-12 14:05:39.308999', NULL, NULL);
INSERT INTO public.notifications VALUES (26, 9, 11, 'system_broadcast', 'user', '123', '132', '{}', 'normal', false, NULL, '2026-09-12 14:07:09.176006', NULL, NULL);
INSERT INTO public.notifications VALUES (28, 8, 11, 'system_broadcast', 'user', '123', '132', '{}', 'normal', false, NULL, '2026-09-12 14:07:09.183218', NULL, NULL);
INSERT INTO public.notifications VALUES (29, 7, 11, 'system_broadcast', 'user', '123', '132', '{}', 'normal', true, '2026-09-12 14:08:38.844397', '2026-09-12 14:07:09.186724', NULL, NULL);
INSERT INTO public.notifications VALUES (25, 7, 11, 'system_broadcast', 'user', '123', '321', '{}', 'normal', true, '2026-09-12 14:08:39.378767', '2026-09-12 14:05:39.316851', NULL, NULL);
INSERT INTO public.notifications VALUES (21, 7, 11, 'system_broadcast', 'user', '123', '123', '{}', 'normal', true, '2026-09-12 14:08:39.854066', '2026-09-12 14:04:49.815363', NULL, NULL);
INSERT INTO public.notifications VALUES (27, 1, 11, 'system_broadcast', 'user', '123', '132', '{}', 'normal', true, '2026-09-12 14:08:56.330292', '2026-09-12 14:07:09.179877', NULL, NULL);
INSERT INTO public.notifications VALUES (30, 7, 11, 'system_broadcast', 'user', '123', '321', '{}', 'normal', true, '2026-09-12 14:10:32.435726', '2026-09-12 14:10:30.242218', NULL, NULL);
INSERT INTO public.notifications VALUES (31, 9, 11, 'system_broadcast', 'user', '123', '321', '{"actor_id": "1", "is_broadcast": true}', 'normal', false, NULL, '2026-09-12 14:26:02.825505', NULL, NULL);
INSERT INTO public.notifications VALUES (33, 8, 11, 'system_broadcast', 'user', '123', '321', '{"actor_id": "1", "is_broadcast": true}', 'normal', false, NULL, '2026-09-12 14:26:02.839392', NULL, NULL);
INSERT INTO public.notifications VALUES (34, 7, 11, 'system_broadcast', 'user', '123', '321', '{"actor_id": "1", "is_broadcast": true}', 'normal', true, '2026-09-12 14:26:07.847742', '2026-09-12 14:26:02.842816', NULL, NULL);
INSERT INTO public.notifications VALUES (35, 9, 10, 'contestation_response', 'user', '123', '321', '{"actor_id": "1", "is_broadcast": true}', 'normal', false, NULL, '2026-09-12 14:26:18.587184', NULL, NULL);
INSERT INTO public.notifications VALUES (37, 8, 10, 'contestation_response', 'user', '123', '321', '{"actor_id": "1", "is_broadcast": true}', 'normal', false, NULL, '2026-09-12 14:26:20.984648', NULL, NULL);
INSERT INTO public.notifications VALUES (38, 7, 10, 'contestation_response', 'user', '123', '321', '{"actor_id": "1", "is_broadcast": true}', 'normal', true, '2026-09-12 14:26:30.540959', '2026-09-12 14:26:21.145221', NULL, NULL);
INSERT INTO public.notifications VALUES (39, 9, 7, 'security_totp_changed', 'user', '132', '321', '{"actor_id": "1", "is_broadcast": true}', 'high', false, NULL, '2026-09-12 14:28:34.77164', NULL, NULL);
INSERT INTO public.notifications VALUES (41, 8, 7, 'security_totp_changed', 'user', '132', '321', '{"actor_id": "1", "is_broadcast": true}', 'high', false, NULL, '2026-09-12 14:28:34.778652', NULL, NULL);
INSERT INTO public.notifications VALUES (42, 7, 7, 'security_totp_changed', 'user', '132', '321', '{"actor_id": "1", "is_broadcast": true}', 'high', true, '2026-09-12 14:28:39.052552', '2026-09-12 14:28:34.781801', NULL, NULL);
INSERT INTO public.notifications VALUES (43, 9, 11, 'system_broadcast', 'user', '123', '569', '{"actor_id": "1", "is_broadcast": true}', 'normal', false, NULL, '2026-09-12 14:31:13.634976', NULL, NULL);
INSERT INTO public.notifications VALUES (32, 1, 11, 'system_broadcast', 'user', '123', '321', '{"actor_id": "1", "is_broadcast": true}', 'normal', true, '2026-09-12 14:31:17.552717', '2026-09-12 14:26:02.832122', NULL, NULL);
INSERT INTO public.notifications VALUES (36, 1, 10, 'contestation_response', 'user', '123', '321', '{"actor_id": "1", "is_broadcast": true}', 'normal', true, '2026-09-12 14:31:17.552717', '2026-09-12 14:26:20.876704', NULL, NULL);
INSERT INTO public.notifications VALUES (40, 1, 7, 'security_totp_changed', 'user', '132', '321', '{"actor_id": "1", "is_broadcast": true}', 'high', true, '2026-09-12 14:31:17.552717', '2026-09-12 14:28:34.775572', NULL, NULL);
INSERT INTO public.notifications VALUES (44, 1, 11, 'system_broadcast', 'user', '123', '569', '{"actor_id": "1", "is_broadcast": true}', 'normal', true, '2026-09-12 14:31:17.552717', '2026-09-12 14:31:13.641903', NULL, NULL);
INSERT INTO public.notifications VALUES (46, 9, 7, 'security_totp_changed', 'user', '123', '321', '{"actor_id": "1", "is_broadcast": true}', 'high', false, NULL, '2026-09-12 14:31:31.914619', NULL, NULL);
INSERT INTO public.notifications VALUES (48, 8, 7, 'security_totp_changed', 'user', '123', '321', '{"actor_id": "1", "is_broadcast": true}', 'high', false, NULL, '2026-09-12 14:31:31.920861', NULL, NULL);
INSERT INTO public.notifications VALUES (45, 7, 11, 'system_broadcast', 'user', '123', '569', '{"actor_id": "1", "is_broadcast": true}', 'normal', true, '2026-09-12 14:50:30.727393', '2026-09-12 14:31:13.646585', NULL, NULL);
INSERT INTO public.notifications VALUES (49, 7, 7, 'security_totp_changed', 'user', '123', '321', '{"actor_id": "1", "is_broadcast": true}', 'high', true, '2026-09-12 14:50:30.727393', '2026-09-12 14:31:31.923843', NULL, NULL);
INSERT INTO public.notifications VALUES (50, 7, 11, 'system_broadcast', 'user', 'вцыаупаывф', 'фвыавпааыв', '{"actor_id": "1", "is_broadcast": true}', 'normal', true, '2026-09-12 14:50:30.727393', '2026-09-12 14:44:55.69042', NULL, NULL);
INSERT INTO public.notifications VALUES (47, 1, 7, 'security_totp_changed', 'user', '123', '321', '{"actor_id": "1", "is_broadcast": true}', 'high', true, '2026-09-12 14:52:29.311467', '2026-09-12 14:31:31.917902', NULL, NULL);
INSERT INTO public.notifications VALUES (51, 7, 11, 'system_broadcast', 'user', 'фывмавы', 'выапи', '{"actor_id": "1", "is_broadcast": true}', 'normal', true, '2026-09-12 14:50:30.727393', '2026-09-12 14:45:10.471267', NULL, NULL);
INSERT INTO public.notifications VALUES (52, 7, 11, 'system_broadcast', 'user', 'ыйфцвуакув', 'цуакпкаувакп', '{"actor_id": "1", "is_broadcast": true}', 'normal', true, '2026-09-12 14:50:30.727393', '2026-09-12 14:45:52.965072', NULL, NULL);
INSERT INTO public.notifications VALUES (53, 7, 11, 'system_broadcast', 'user', 'фыва', 'фывап', '{"actor_id": "1", "is_broadcast": true}', 'normal', true, '2026-09-12 14:50:30.727393', '2026-09-12 14:46:11.98189', NULL, NULL);
INSERT INTO public.notifications VALUES (54, 9, 11, 'system_broadcast', 'user', '123', '321', '{"actor_id": "1", "is_broadcast": true}', 'normal', false, NULL, '2026-09-12 14:50:47.929754', NULL, NULL);
INSERT INTO public.notifications VALUES (63, 1, 2, 'system_new_device_login', 'user', 'Обновление', '123', '{"actor_id": "1", "is_broadcast": true}', 'high', true, '2026-09-12 16:20:44.340427', '2026-09-12 15:07:00.946039', NULL, NULL);
INSERT INTO public.notifications VALUES (56, 8, 11, 'system_broadcast', 'user', '123', '321', '{"actor_id": "1", "is_broadcast": true}', 'normal', false, NULL, '2026-09-12 14:50:47.948061', NULL, NULL);
INSERT INTO public.notifications VALUES (59, 1, 11, 'system_broadcast', 'user', '78654321', 'гнапрсимтропр', '{"actor_id": "1", "is_broadcast": true}', 'normal', true, '2026-09-12 16:20:44.747739', '2026-09-12 14:52:24.857088', NULL, NULL);
INSERT INTO public.notifications VALUES (57, 7, 11, 'system_broadcast', 'user', '123', '321', '{"actor_id": "1", "is_broadcast": true}', 'normal', true, '2026-09-12 14:50:50.664895', '2026-09-12 14:50:47.954743', NULL, NULL);
INSERT INTO public.notifications VALUES (58, 9, 11, 'system_broadcast', 'user', '78654321', 'гнапрсимтропр', '{"actor_id": "1", "is_broadcast": true}', 'normal', false, NULL, '2026-09-12 14:52:24.853137', NULL, NULL);
INSERT INTO public.notifications VALUES (68, 1, 14, 'staff_user_reported', 'staff', 'аперпав', 'уыавпераро', '{"actor_id": "1", "is_broadcast": true}', 'normal', true, '2026-09-12 16:42:24.333831', '2026-09-12 15:08:13.18159', NULL, NULL);
INSERT INTO public.notifications VALUES (60, 8, 11, 'system_broadcast', 'user', '78654321', 'гнапрсимтропр', '{"actor_id": "1", "is_broadcast": true}', 'normal', false, NULL, '2026-09-12 14:52:24.861198', NULL, NULL);
INSERT INTO public.notifications VALUES (55, 1, 11, 'system_broadcast', 'user', '123', '321', '{"actor_id": "1", "is_broadcast": true}', 'normal', true, '2026-09-12 14:52:29.311467', '2026-09-12 14:50:47.936099', NULL, NULL);
INSERT INTO public.notifications VALUES (61, 7, 11, 'system_broadcast', 'user', '78654321', 'гнапрсимтропр', '{"actor_id": "1", "is_broadcast": true}', 'normal', true, '2026-09-12 14:52:31.52534', '2026-09-12 14:52:24.867942', NULL, NULL);
INSERT INTO public.notifications VALUES (62, 9, 2, 'system_new_device_login', 'user', 'Обновление', '123', '{"actor_id": "1", "is_broadcast": true}', 'high', false, NULL, '2026-09-12 15:07:00.938066', NULL, NULL);
INSERT INTO public.notifications VALUES (64, 8, 2, 'system_new_device_login', 'user', 'Обновление', '123', '{"actor_id": "1", "is_broadcast": true}', 'high', false, NULL, '2026-09-12 15:07:00.95378', NULL, NULL);
INSERT INTO public.notifications VALUES (65, 7, 2, 'system_new_device_login', 'user', 'Обновление', '123', '{"actor_id": "1", "is_broadcast": true}', 'high', true, '2026-09-12 15:07:11.31189', '2026-09-12 15:07:00.959163', NULL, NULL);
INSERT INTO public.notifications VALUES (66, 7, 11, 'system_broadcast', 'user', 'ВНИМАНИЕ, сообщение от разраба', '123365485', '{"actor_id": "1", "is_broadcast": true}', 'normal', true, '2026-09-12 15:07:52.18909', '2026-09-12 15:07:47.629039', NULL, NULL);
INSERT INTO public.notifications VALUES (67, 9, 14, 'staff_user_reported', 'staff', 'аперпав', 'уыавпераро', '{"actor_id": "1", "is_broadcast": true}', 'normal', false, NULL, '2026-09-12 15:08:13.178365', NULL, NULL);
INSERT INTO public.notifications VALUES (69, 8, 14, 'staff_user_reported', 'staff', 'аперпав', 'уыавпераро', '{"actor_id": "1", "is_broadcast": true}', 'normal', false, NULL, '2026-09-12 15:08:13.184596', NULL, NULL);
INSERT INTO public.notifications VALUES (70, 7, 14, 'staff_user_reported', 'staff', 'аперпав', 'уыавпераро', '{"actor_id": "1", "is_broadcast": true}', 'normal', true, '2026-09-12 15:09:12.829025', '2026-09-12 15:08:13.187626', NULL, NULL);


--
-- TOC entry 4177 (class 0 OID 34720)
-- Dependencies: 283
-- Data for Name: password_change_history; Type: TABLE DATA; Schema: public; Owner: admin
--

INSERT INTO public.password_change_history VALUES (1, 7, 1, 'SECONDARY_REGEN', NULL, '2026-08-27 19:42:49.251444+00');
INSERT INTO public.password_change_history VALUES (2, 1, 1, 'SECONDARY_REGEN', NULL, '2026-08-27 19:43:17.253743+00');
INSERT INTO public.password_change_history VALUES (3, 1, 1, 'SECONDARY_REGEN', NULL, '2026-08-27 19:54:32.0305+00');
INSERT INTO public.password_change_history VALUES (4, 1, 1, 'SECONDARY_REGEN', NULL, '2026-08-27 19:56:32.323713+00');
INSERT INTO public.password_change_history VALUES (5, 9, 1, 'SECONDARY_REGEN', NULL, '2026-08-27 19:57:33.461991+00');
INSERT INTO public.password_change_history VALUES (6, 7, 1, 'AUTO_GENERATED', 'впарпоропрапвар', '2026-08-28 14:56:10.74903+00');
INSERT INTO public.password_change_history VALUES (7, 7, 1, 'AUTO_GENERATED', 'апврапварпавппвар', '2026-08-28 15:00:46.102036+00');
INSERT INTO public.password_change_history VALUES (8, 7, 1, 'SECONDARY_REGEN', NULL, '2026-08-28 15:02:44.302154+00');
INSERT INTO public.password_change_history VALUES (9, 7, 1, 'AUTO_GENERATED', 'uty4retrhgrtrh', '2026-08-28 15:05:08.862904+00');
INSERT INTO public.password_change_history VALUES (10, 7, 1, 'ADMIN_RESET', 'sfdgfhfgdfhgj', '2026-08-28 15:07:22.050911+00');
INSERT INTO public.password_change_history VALUES (11, 1, 1, 'SECONDARY_REGEN', NULL, '2026-08-28 15:16:07.256017+00');
INSERT INTO public.password_change_history VALUES (12, 7, 1, 'ADMIN_RESET', 'etrtyuyukyjtyrtytu', '2026-08-28 15:23:58.453136+00');
INSERT INTO public.password_change_history VALUES (13, 7, 1, 'SECONDARY_REGEN', NULL, '2026-08-28 15:25:32.35588+00');
INSERT INTO public.password_change_history VALUES (14, 7, 7, 'SELF_CHANGE', NULL, '2026-08-28 16:02:11.632836+00');
INSERT INTO public.password_change_history VALUES (15, 7, 7, 'SECONDARY_REGEN', NULL, '2026-08-28 16:46:11.157907+00');
INSERT INTO public.password_change_history VALUES (16, 7, 1, 'SECONDARY_REGEN', NULL, '2026-08-28 16:48:17.487126+00');
INSERT INTO public.password_change_history VALUES (17, 1, 1, 'SELF_CHANGE', NULL, '2026-09-06 20:17:11.436387+00');
INSERT INTO public.password_change_history VALUES (18, 1, 1, 'SELF_CHANGE', NULL, '2026-09-06 20:18:47.986407+00');
INSERT INTO public.password_change_history VALUES (20, 1, 1, 'SEED_DISABLED', 'Отключение и удаление сид-фразы', '2026-09-11 13:01:42.828173+00');
INSERT INTO public.password_change_history VALUES (21, 1, 1, 'SEED_GENERATED', 'Генерация новой сид-фразы', '2026-09-11 13:01:54.586413+00');
INSERT INTO public.password_change_history VALUES (22, 1, 1, 'SEED_DISABLED', 'Отключение и удаление сид-фразы', '2026-09-11 13:15:40.245237+00');
INSERT INTO public.password_change_history VALUES (23, 1, 1, 'SEED_GENERATED', 'Генерация новой сид-фразы', '2026-09-11 13:15:47.770605+00');
INSERT INTO public.password_change_history VALUES (24, 1, 1, 'SEED_GENERATED', 'Генерация новой сид-фразы', '2026-09-11 13:32:04.845796+00');
INSERT INTO public.password_change_history VALUES (25, 1, 1, 'TOTP_DISABLED', 'Отключение TOTP аутентификатора', '2026-09-11 14:00:13.291168+00');
INSERT INTO public.password_change_history VALUES (26, 1, 1, 'SEED_DISABLED', 'Отключение и удаление сид-фразы', '2026-09-11 14:00:24.308149+00');
INSERT INTO public.password_change_history VALUES (27, 1, 1, 'SEED_GENERATED', 'Генерация новой сид-фразы', '2026-09-11 14:00:46.547185+00');
INSERT INTO public.password_change_history VALUES (28, 1, 1, 'SEED_DISABLED', 'Отключение и удаление сид-фразы', '2026-09-11 18:13:19.73408+00');
INSERT INTO public.password_change_history VALUES (29, 1, 1, 'SEED_GENERATED', 'Генерация новой сид-фразы', '2026-09-11 18:16:20.462975+00');
INSERT INTO public.password_change_history VALUES (30, 1, 1, 'TOTP_ENABLED', 'Успешная привязка и включение TOTP', '2026-09-11 18:26:41.86487+00');
INSERT INTO public.password_change_history VALUES (31, 1, 1, 'TOTP_DISABLED', 'Отключение TOTP аутентификатора', '2026-09-11 18:28:23.988757+00');
INSERT INTO public.password_change_history VALUES (32, 1, 1, 'TOTP_ENABLED', 'Успешная привязка и включение TOTP', '2026-09-11 18:28:50.73457+00');
INSERT INTO public.password_change_history VALUES (33, 1, 1, 'TOTP_DISABLED', 'Отключение TOTP аутентификатора', '2026-09-11 18:32:13.763555+00');
INSERT INTO public.password_change_history VALUES (34, 1, 1, 'TOTP_ENABLED', 'Успешная привязка и включение TOTP', '2026-09-11 18:36:49.177744+00');
INSERT INTO public.password_change_history VALUES (35, 1, 1, 'BACKUP_CODES_GENERATED', 'Генерация или регенерация аварийных кодов', '2026-09-11 18:41:20.283031+00');
INSERT INTO public.password_change_history VALUES (36, 1, 1, 'TOTP_DISABLED', 'Отключение TOTP аутентификатора', '2026-09-11 18:42:19.999556+00');
INSERT INTO public.password_change_history VALUES (37, 1, 1, 'SEED_DISABLED', 'Отключение и удаление сид-фразы', '2026-09-11 18:42:29.173755+00');
INSERT INTO public.password_change_history VALUES (38, 1, 1, 'SELF_CHANGE', NULL, '2026-09-11 18:44:18.948142+00');
INSERT INTO public.password_change_history VALUES (39, 1, 1, 'SECONDARY_REGEN', NULL, '2026-09-11 18:44:50.069753+00');
INSERT INTO public.password_change_history VALUES (40, 1, 1, 'SECONDARY_REGEN', NULL, '2026-09-11 18:48:09.03874+00');
INSERT INTO public.password_change_history VALUES (41, 8, 1, 'AUTO_GENERATED', 'test', '2026-09-11 18:56:54.097955+00');
INSERT INTO public.password_change_history VALUES (42, 7, 1, 'SECONDARY_REGEN', NULL, '2026-09-12 13:30:43.613918+00');


--
-- TOC entry 4181 (class 0 OID 56162)
-- Dependencies: 287
-- Data for Name: permissions; Type: TABLE DATA; Schema: public; Owner: admin
--

INSERT INTO public.permissions VALUES (1, 'incident:create', 'Создание инцидентов', 'incidents');
INSERT INTO public.permissions VALUES (2, 'incident:edit', 'Редактирование инцидентов', 'incidents');
INSERT INTO public.permissions VALUES (3, 'incident:delete', 'Удаление инцидентов', 'incidents');
INSERT INTO public.permissions VALUES (4, 'incident:check', 'Проверка и модерация инцидентов', 'incidents');
INSERT INTO public.permissions VALUES (5, 'user:edit_status', 'Смена статусов пользователей', 'users');
INSERT INTO public.permissions VALUES (6, 'user:manage_permissions', 'Управление правами пользователей', 'users');
INSERT INTO public.permissions VALUES (7, 'settings:edit', 'Редактирование системных настроек', 'system');
INSERT INTO public.permissions VALUES (8, 'critical_action:execute', 'Выполнение критических действий', 'system');
INSERT INTO public.permissions VALUES (9, 'waf:manage', 'Управление WAF и списками доступа', 'system');


--
-- TOC entry 4137 (class 0 OID 17963)
-- Dependencies: 243
-- Data for Name: persone_name_connector; Type: TABLE DATA; Schema: public; Owner: admin
--

INSERT INTO public.persone_name_connector VALUES ('4b9b4bc9-3a66-4510-9dd6-d827028066a8', 'e15eecbe-601a-4358-af2c-a51050963408', '28a99874-b248-480d-a3fe-5a4a7f0b79d1');
INSERT INTO public.persone_name_connector VALUES ('cab1e66d-2e12-432c-88cf-d56864ab54d4', '1cde019e-cade-44fd-871f-30de2f6fda93', '66c90f27-3843-4d26-8f7f-5b2c037290dd');
INSERT INTO public.persone_name_connector VALUES ('483f5679-d737-4ac1-a1da-5dc7ce06f3b2', 'ad101311-edc2-4bd9-afc8-de4f46a4afa2', 'c39746bd-6231-45a7-a8e8-9619b9f7ad80');
INSERT INTO public.persone_name_connector VALUES ('cfd571b4-21ba-45cd-bf4a-24650e819692', '46b1ff58-1c2d-46cb-885f-4ed8b3073046', '32a3627f-f988-46cd-903e-baf26de85f7c');
INSERT INTO public.persone_name_connector VALUES ('daa42d6a-5723-407c-a37a-bc78c96f9acc', '0313b43a-2b8e-4116-9165-41e1198f41e3', '4496fe3f-f326-4b5e-ba82-4e240c34aec7');
INSERT INTO public.persone_name_connector VALUES ('9aa08386-df5e-4cb7-b476-8fbf3f303fea', '1e55b83a-9778-4455-8610-87892b5a9950', 'f287c884-c53e-4b96-bdbd-b4e28bfa08b0');
INSERT INTO public.persone_name_connector VALUES ('2807dc30-c6f2-43dc-9545-e826839fa162', '8abe5036-ad3e-4c43-8b17-2e218715e414', 'bcfe5c62-1e23-4010-918c-08ee9b7db0a9');


--
-- TOC entry 4136 (class 0 OID 17955)
-- Dependencies: 242
-- Data for Name: persone_names; Type: TABLE DATA; Schema: public; Owner: admin
--

INSERT INTO public.persone_names VALUES ('f287c884-c53e-4b96-bdbd-b4e28bfa08b0', 'a9dda92cf671561abbe2cb7aa65bd1854ac793a803ac4bc74fe9f452a30f6178', 'bbbabada3d8d6fc31c892338c7f234670ed1b28bb756773422cc39d5a7f96c86', 'f5f6d6c24394ad0b746fa971986cdae3', 'd5259ac8fd5ed6caf77a1e2bc4bd6cd3', '{FYFPPFFPRP}', '2026-08-24 22:58:20.484544');
INSERT INTO public.persone_names VALUES ('bcfe5c62-1e23-4010-918c-08ee9b7db0a9', '61da82f22d9c859543530dbb683bb114f3f58a0955fa7bfee137204326986eb2', '6948aa84fcf45aa324461083d3ec1e5344792e5d563ac43cfd97f0d402a4f1709b8c', 'ab333f6fa146cb9e014b0fec420e0919', 'f20618958888b9e80a2f4af26caf0148', '{FYFPRPFYPFRP}', '2026-08-24 22:59:17.956268');
INSERT INTO public.persone_names VALUES ('28a99874-b248-480d-a3fe-5a4a7f0b79d1', '9f5c5c204fc3228228b1e2903e8710ee383c02ab4ee458cb061494976b835b17', '8f0723cba99603f94bb76a701b7ebca809f6bcaee2f96b23d45b4ed8a43baa3467aac444a762a3f887b006700224071774b828aaae4ac852dc96a06139af', '7239dcabc624b8aa60ee8ab84dc3e598', '242bba36053da802e62cc34c20a606c8', '{PFYRPR,FRPRPLRKRF,FPL}', '2026-08-20 19:32:00.984782');
INSERT INTO public.persone_names VALUES ('66c90f27-3843-4d26-8f7f-5b2c037290dd', '8c96b685f3cb3e208684c5d68851a9cd6da5bc3f429c79b2ba0d5e387a2b38d0', '104d95872f320f79e40b45e5b75d753274507014f5446b2228a9', 'a9e92dc002d4cd118f190a7e7f4b550b', 'b71815a34e58fe1d09b52afc7c2ec816', '{ORTLRPLRP}', '2026-08-20 20:16:42.948716');
INSERT INTO public.persone_names VALUES ('c39746bd-6231-45a7-a8e8-9619b9f7ad80', 'e3cf8a6cda6c4c1928ec1df7cb41bfd606207701e034c7aaa9e49c78e6ec55fd', '56792f5fd7879270e807a371d5a049348d0f43', '9b9485333171d273b1a6834d10b69694', '434110aef36f2e4d22e8586905d25694', '{SKTRFTFKTSFFTKFK}', '2026-08-24 22:40:06.064795');
INSERT INTO public.persone_names VALUES ('32a3627f-f988-46cd-903e-baf26de85f7c', 'fab249666f1af8dbd67a2101dc7fe1c4608374b388f4389109706904d90bf586', 'd390a451ddb6c111248fe75448ac85e69d54d52faf1f686bc48205c4f532e842', '127d1cc222f4f74a458e2b831e9c5f75', '02618258fcd5cfe7a07eb35117e60577', '{FPRFPRPFPYRF}', '2026-08-24 22:48:35.205462');
INSERT INTO public.persone_names VALUES ('4496fe3f-f326-4b5e-ba82-4e240c34aec7', '2fa76c9284cad479cfb09d25401f684ddc05d908cd241ac99435a80b2a06c11c', '706cd6ec12b445e0a4b7145097455f0785d8815cf60a06a4856ec42403794160c6121668', '4fd4f87b6043158cb1d9377f4650621a', 'fd5eed56f7bc110672012cb2936d0427', '{FFPYRFPFFPFRP}', '2026-08-24 22:54:04.326632');


--
-- TOC entry 4134 (class 0 OID 17941)
-- Dependencies: 240
-- Data for Name: persone_phone_connector; Type: TABLE DATA; Schema: public; Owner: admin
--



--
-- TOC entry 4135 (class 0 OID 17947)
-- Dependencies: 241
-- Data for Name: persone_phones; Type: TABLE DATA; Schema: public; Owner: admin
--



--
-- TOC entry 4138 (class 0 OID 17969)
-- Dependencies: 244
-- Data for Name: persone_telegramm_accaunt_connector; Type: TABLE DATA; Schema: public; Owner: admin
--

INSERT INTO public.persone_telegramm_accaunt_connector VALUES ('0dc037e4-499d-4aca-b8a7-633476143a5e', '0e42f6a2-fde8-497c-ad00-ac699aa29a1b', '3addf55a-7780-4636-a4fc-7a96eae45651');


--
-- TOC entry 4139 (class 0 OID 17975)
-- Dependencies: 245
-- Data for Name: persone_telegramm_accaunts; Type: TABLE DATA; Schema: public; Owner: admin
--

INSERT INTO public.persone_telegramm_accaunts VALUES ('3addf55a-7780-4636-a4fc-7a96eae45651', 'eb24531432393b8a4702120c3ef54c0b80c12d35c4370e084e7d77c1fbc8627e15074daf5959090a1af026b2bfee4c9683dcc03ab1e51b717910bd835e0b6c66', '916b5ad6b1aed49d92', 'd158b9db83f16644bbd8b0a816cfd051', '51709a58f7254665f6634360d69d8153', NULL, NULL, NULL, NULL, '2026-08-22 19:38:35.46212');


--
-- TOC entry 4117 (class 0 OID 17841)
-- Dependencies: 223
-- Data for Name: policy; Type: TABLE DATA; Schema: public; Owner: admin
--

INSERT INTO public.policy VALUES (2, '456', 'user_agreement', 'Пользовательское соглашение', '0.0.3', '2026-07-01 07:42:39.724505', '2026-07-01 07:42:39.724505');
INSERT INTO public.policy VALUES (1, '<h1>123567 89</h1><p>jkhj ighjghj1</p><p><em>hijkhjkh</em></p><p>hikjhj</p><p>орлрлпро12345</p>', 'privacy', 'Политика конфиденциальности', '2.1.3', '2026-07-01 07:42:39.724505', '2026-09-03 23:52:29.21739');


--
-- TOC entry 4118 (class 0 OID 17848)
-- Dependencies: 224
-- Data for Name: policy_versions; Type: TABLE DATA; Schema: public; Owner: admin
--

INSERT INTO public.policy_versions OVERRIDING SYSTEM VALUE VALUES (1, 'privacy', '2.0.1', '2.0.2', 1, '2026-08-02 03:19:44.435496', '<h1>123567 8</h1>', '<h1>123567 89</h1>', '<div style="font-family: ''Courier New'', monospace; background-color: #f6f8fa; padding: 16px; border-radius: 6px; border: 1px solid #d0d7de; margin: 10px 0;">
<div style="padding: 8px 12px; background-color: #f6f8fa; border-bottom: 1px solid #d0d7de; margin-bottom: 12px; font-weight: bold; color: #24292f;">
        Изменения в политике
    </div>
  <div style="padding: 2px 8px; color: #24292f; background-color: #e6ffec; border-left: 3px solid #3fb950; margin: 1px 0; white-space: pre-wrap;">
                <span style="color: #3fb950; font-weight: bold;">+</span> &lt;h1&gt;123567 89&lt;/h1&gt;
            </div>
  <div style="padding: 2px 8px; color: #24292f; background-color: #ffeef0; border-left: 3px solid #f85149; margin: 1px 0; white-space: pre-wrap; text-decoration: line-through;">
                <span style="color: #f85149; font-weight: bold;">-</span> &lt;h1&gt;123567 8&lt;/h1&gt;
            </div>

  <div style="margin-top: 12px; padding: 8px 12px; background-color: #f6f8fa; border-top: 1px solid #d0d7de; border-radius: 0 0 6px 6px; display: flex; gap: 20px; font-size: 14px; color: #57606a;">
        <span><span style="color: #f85149;">●</span> Удалено: <strong>1</strong></span>
        <span><span style="color: #3fb950;">●</span> Добавлено: <strong>1</strong></span>
        <span><span style="color: #8b949e;">●</span> Без изменений: <strong>0</strong></span>
    </div>
</div>', '46512gh kjgh jb');
INSERT INTO public.policy_versions OVERRIDING SYSTEM VALUE VALUES (2, 'privacy', '2.0.2', '2.0.3', 1, '2026-08-02 03:25:22.488023', '<h1>123567 89</h1>', '<h1>123567 89</h1><p>jkhj ighjghj</p><p><em>hijkhjkh</em></p><p>hikjhj</p>', '<div style="font-family: ''Courier New'', monospace; background-color: #f6f8fa; padding: 16px; border-radius: 6px; border: 1px solid #d0d7de; margin: 10px 0;">
<div style="padding: 8px 12px; background-color: #f6f8fa; border-bottom: 1px solid #d0d7de; margin-bottom: 12px; font-weight: bold; color: #24292f;">
        Изменения в политике
    </div>
  <div style="padding: 2px 8px; color: #24292f; background-color: #e6ffec; border-left: 3px solid #3fb950; margin: 1px 0; white-space: pre-wrap;">
                <span style="color: #3fb950; font-weight: bold;">+</span> &lt;h1&gt;123567 89&lt;/h1&gt;&lt;p&gt;jkhj ighjghj&lt;/p&gt;&lt;p&gt;&lt;em&gt;hijkhjkh&lt;/em&gt;&lt;/p&gt;&lt;p&gt;hikjhj&lt;/p&gt;
            </div>
  <div style="padding: 2px 8px; color: #24292f; background-color: #ffeef0; border-left: 3px solid #f85149; margin: 1px 0; white-space: pre-wrap; text-decoration: line-through;">
                <span style="color: #f85149; font-weight: bold;">-</span> &lt;h1&gt;123567 89&lt;/h1&gt;
            </div>

  <div style="margin-top: 12px; padding: 8px 12px; background-color: #f6f8fa; border-top: 1px solid #d0d7de; border-radius: 0 0 6px 6px; display: flex; gap: 20px; font-size: 14px; color: #57606a;">
        <span><span style="color: #f85149;">●</span> Удалено: <strong>1</strong></span>
        <span><span style="color: #3fb950;">●</span> Добавлено: <strong>1</strong></span>
        <span><span style="color: #8b949e;">●</span> Без изменений: <strong>0</strong></span>
    </div>
</div>', 'yugfv gugfukf jyhfk uyfg  yjf fukhj');
INSERT INTO public.policy_versions OVERRIDING SYSTEM VALUE VALUES (3, 'privacy', '2.0.3', '2.0.4', 1, '2026-08-02 03:30:28.371354', '<h1>123567 89</h1><p>jkhj ighjghj</p><p><em>hijkhjkh</em></p><p>hikjhj</p>', '<h1>123567 89</h1><p>jkhj ighjghj1</p><p><em>hijkhjkh</em></p><p>hikjhj</p><p>орлрлпро</p>', '<div style="font-family: ''Courier New'', monospace; background-color: #f6f8fa; padding: 16px; border-radius: 6px; border: 1px solid #d0d7de; margin: 10px 0; font-size: 13px; line-height: 1.5;">
<div style="padding: 8px 12px; background-color: #f6f8fa; border-bottom: 1px solid #d0d7de; margin-bottom: 12px; font-weight: bold; color: #24292f; font-family: sans-serif;">
            Изменения в политике
        </div>
  <div style="padding: 4px 8px; color: #24292f; background-color: #ffffff; border-left: 3px solid #d0d7de; margin: 2px 0; white-space: pre-wrap; word-break: break-word;">&lt;h1&gt;123567 89&lt;/h1&gt;</div>
  <div style="padding: 4px 8px; color: #24292f; background-color: #e6ffec; border-left: 3px solid #3fb950; margin: 2px 0; white-space: pre-wrap; word-break: break-word;">
                    <span style="color: #3fb950; font-weight: bold; font-family: sans-serif;">+</span> &lt;p&gt;jkhj ighjghj1&lt;/p&gt;
                </div>
  <div style="padding: 4px 8px; color: #24292f; background-color: #ffeef0; border-left: 3px solid #f85149; margin: 2px 0; white-space: pre-wrap; word-break: break-word; text-decoration: line-through;">
                    <span style="color: #f85149; font-weight: bold; font-family: sans-serif;">-</span> &lt;p&gt;jkhj ighjghj&lt;/p&gt;
                </div>
  <div style="padding: 4px 8px; color: #24292f; background-color: #ffffff; border-left: 3px solid #d0d7de; margin: 2px 0; white-space: pre-wrap; word-break: break-word;">&lt;p&gt;&lt;em&gt;hijkhjkh&lt;/em&gt;&lt;/p&gt;</div>
  <div style="padding: 4px 8px; color: #24292f; background-color: #ffffff; border-left: 3px solid #d0d7de; margin: 2px 0; white-space: pre-wrap; word-break: break-word;">&lt;p&gt;hikjhj&lt;/p&gt;</div>
  <div style="padding: 4px 8px; color: #24292f; background-color: #e6ffec; border-left: 3px solid #3fb950; margin: 2px 0; white-space: pre-wrap; word-break: break-word;">
                    <span style="color: #3fb950; font-weight: bold; font-family: sans-serif;">+</span> &lt;p&gt;орлрлпро&lt;/p&gt;
                </div>

  <div style="margin-top: 12px; padding: 8px 12px; background-color: #f6f8fa; border-top: 1px solid #d0d7de; border-radius: 0 0 6px 6px; display: flex; gap: 20px; font-size: 13px; color: #57606a; font-family: sans-serif;">
            <span><span style="color: #f85149;">●</span> Удалено: <strong>1</strong></span>
            <span><span style="color: #3fb950;">●</span> Добавлено: <strong>2</strong></span>
            <span><span style="color: #8b949e;">●</span> Без изменений: <strong>3</strong></span>
        </div>
</div>', 'дгшп дшгплгп лгнплшплгнп  днгпг аг лшпр');
INSERT INTO public.policy_versions OVERRIDING SYSTEM VALUE VALUES (4, 'privacy', '2.0.4', '2.0.5', 1, '2026-09-03 23:13:44.661853', '<h1>123567 89</h1><p>jkhj ighjghj1</p><p><em>hijkhjkh</em></p><p>hikjhj</p><p>орлрлпро</p>', '<h1>123567 89</h1><p>jkhj ighjghj1</p><p><em>hijkhjkh</em></p><p>hikjhj</p><p>орлрлпро1</p>', '<div style="font-family: ''Courier New'', monospace; background-color: #f6f8fa; padding: 16px; border-radius: 6px; border: 1px solid #d0d7de; margin: 10px 0; font-size: 13px; line-height: 1.5;">
<div style="padding: 8px 12px; background-color: #f6f8fa; border-bottom: 1px solid #d0d7de; margin-bottom: 12px; font-weight: bold; color: #24292f; font-family: sans-serif;">
            Изменения в политике
        </div>
  <div style="padding: 4px 8px; color: #24292f; background-color: #ffffff; border-left: 3px solid #d0d7de; margin: 2px 0; white-space: pre-wrap; word-break: break-word;">&lt;h1&gt;123567 89&lt;/h1&gt;</div>
  <div style="padding: 4px 8px; color: #24292f; background-color: #ffffff; border-left: 3px solid #d0d7de; margin: 2px 0; white-space: pre-wrap; word-break: break-word;">&lt;p&gt;jkhj ighjghj1&lt;/p&gt;</div>
  <div style="padding: 4px 8px; color: #24292f; background-color: #ffffff; border-left: 3px solid #d0d7de; margin: 2px 0; white-space: pre-wrap; word-break: break-word;">&lt;p&gt;&lt;em&gt;hijkhjkh&lt;/em&gt;&lt;/p&gt;</div>
  <div style="padding: 4px 8px; color: #24292f; background-color: #ffffff; border-left: 3px solid #d0d7de; margin: 2px 0; white-space: pre-wrap; word-break: break-word;">&lt;p&gt;hikjhj&lt;/p&gt;</div>
  <div style="padding: 4px 8px; color: #24292f; background-color: #e6ffec; border-left: 3px solid #3fb950; margin: 2px 0; white-space: pre-wrap; word-break: break-word;">
                    <span style="color: #3fb950; font-weight: bold; font-family: sans-serif;">+</span> &lt;p&gt;орлрлпро1&lt;/p&gt;
                </div>
  <div style="padding: 4px 8px; color: #24292f; background-color: #ffeef0; border-left: 3px solid #f85149; margin: 2px 0; white-space: pre-wrap; word-break: break-word; text-decoration: line-through;">
                    <span style="color: #f85149; font-weight: bold; font-family: sans-serif;">-</span> &lt;p&gt;орлрлпро&lt;/p&gt;
                </div>

  <div style="margin-top: 12px; padding: 8px 12px; background-color: #f6f8fa; border-top: 1px solid #d0d7de; border-radius: 0 0 6px 6px; display: flex; gap: 20px; font-size: 13px; color: #57606a; font-family: sans-serif;">
            <span><span style="color: #f85149;">●</span> Удалено: <strong>1</strong></span>
            <span><span style="color: #3fb950;">●</span> Добавлено: <strong>1</strong></span>
            <span><span style="color: #8b949e;">●</span> Без изменений: <strong>4</strong></span>
        </div>
</div>', 'одлорапртполюлрпьбт');
INSERT INTO public.policy_versions OVERRIDING SYSTEM VALUE VALUES (5, 'privacy', '2.0.5', '2.1.0', 1, '2026-09-03 23:17:40.74985', '<h1>123567 89</h1><p>jkhj ighjghj1</p><p><em>hijkhjkh</em></p><p>hikjhj</p><p>орлрлпро1</p>', '<h1>123567 89</h1><p>jkhj ighjghj1</p><p><em>hijkhjkh</em></p><p>hikjhj</p><p>орлрлпро12</p>', '<div style="font-family: ''Courier New'', monospace; background-color: #f6f8fa; padding: 16px; border-radius: 6px; border: 1px solid #d0d7de; margin: 10px 0; font-size: 13px; line-height: 1.5;">
<div style="padding: 8px 12px; background-color: #f6f8fa; border-bottom: 1px solid #d0d7de; margin-bottom: 12px; font-weight: bold; color: #24292f; font-family: sans-serif;">
            Изменения в политике
        </div>
  <div style="padding: 4px 8px; color: #24292f; background-color: #ffffff; border-left: 3px solid #d0d7de; margin: 2px 0; white-space: pre-wrap; word-break: break-word;">&lt;h1&gt;123567 89&lt;/h1&gt;</div>
  <div style="padding: 4px 8px; color: #24292f; background-color: #ffffff; border-left: 3px solid #d0d7de; margin: 2px 0; white-space: pre-wrap; word-break: break-word;">&lt;p&gt;jkhj ighjghj1&lt;/p&gt;</div>
  <div style="padding: 4px 8px; color: #24292f; background-color: #ffffff; border-left: 3px solid #d0d7de; margin: 2px 0; white-space: pre-wrap; word-break: break-word;">&lt;p&gt;&lt;em&gt;hijkhjkh&lt;/em&gt;&lt;/p&gt;</div>
  <div style="padding: 4px 8px; color: #24292f; background-color: #ffffff; border-left: 3px solid #d0d7de; margin: 2px 0; white-space: pre-wrap; word-break: break-word;">&lt;p&gt;hikjhj&lt;/p&gt;</div>
  <div style="padding: 4px 8px; color: #24292f; background-color: #e6ffec; border-left: 3px solid #3fb950; margin: 2px 0; white-space: pre-wrap; word-break: break-word;">
                    <span style="color: #3fb950; font-weight: bold; font-family: sans-serif;">+</span> &lt;p&gt;орлрлпро12&lt;/p&gt;
                </div>
  <div style="padding: 4px 8px; color: #24292f; background-color: #ffeef0; border-left: 3px solid #f85149; margin: 2px 0; white-space: pre-wrap; word-break: break-word; text-decoration: line-through;">
                    <span style="color: #f85149; font-weight: bold; font-family: sans-serif;">-</span> &lt;p&gt;орлрлпро1&lt;/p&gt;
                </div>

  <div style="margin-top: 12px; padding: 8px 12px; background-color: #f6f8fa; border-top: 1px solid #d0d7de; border-radius: 0 0 6px 6px; display: flex; gap: 20px; font-size: 13px; color: #57606a; font-family: sans-serif;">
            <span><span style="color: #f85149;">●</span> Удалено: <strong>1</strong></span>
            <span><span style="color: #3fb950;">●</span> Добавлено: <strong>1</strong></span>
            <span><span style="color: #8b949e;">●</span> Без изменений: <strong>4</strong></span>
        </div>
</div>', 'олпропапьтрьбтрип');
INSERT INTO public.policy_versions OVERRIDING SYSTEM VALUE VALUES (6, 'privacy', '2.1.0', '2.1.1', 1, '2026-09-03 23:30:14.037205', '<h1>123567 89</h1><p>jkhj ighjghj1</p><p><em>hijkhjkh</em></p><p>hikjhj</p><p>орлрлпро12</p>', '<h1>123567 89</h1><p>jkhj ighjghj1</p><p><em>hijkhjkh</em></p><p>hikjhj</p><p>орлрлпро123</p>', '<div style="font-family: ''Courier New'', monospace; background-color: #f6f8fa; padding: 16px; border-radius: 6px; border: 1px solid #d0d7de; margin: 10px 0; font-size: 13px; line-height: 1.5;">
<div style="padding: 8px 12px; background-color: #f6f8fa; border-bottom: 1px solid #d0d7de; margin-bottom: 12px; font-weight: bold; color: #24292f; font-family: sans-serif;">
            Изменения в политике
        </div>
  <div style="padding: 4px 8px; color: #24292f; background-color: #ffffff; border-left: 3px solid #d0d7de; margin: 2px 0; white-space: pre-wrap; word-break: break-word;">&lt;h1&gt;123567 89&lt;/h1&gt;</div>
  <div style="padding: 4px 8px; color: #24292f; background-color: #ffffff; border-left: 3px solid #d0d7de; margin: 2px 0; white-space: pre-wrap; word-break: break-word;">&lt;p&gt;jkhj ighjghj1&lt;/p&gt;</div>
  <div style="padding: 4px 8px; color: #24292f; background-color: #ffffff; border-left: 3px solid #d0d7de; margin: 2px 0; white-space: pre-wrap; word-break: break-word;">&lt;p&gt;&lt;em&gt;hijkhjkh&lt;/em&gt;&lt;/p&gt;</div>
  <div style="padding: 4px 8px; color: #24292f; background-color: #ffffff; border-left: 3px solid #d0d7de; margin: 2px 0; white-space: pre-wrap; word-break: break-word;">&lt;p&gt;hikjhj&lt;/p&gt;</div>
  <div style="padding: 4px 8px; color: #24292f; background-color: #e6ffec; border-left: 3px solid #3fb950; margin: 2px 0; white-space: pre-wrap; word-break: break-word;">
                    <span style="color: #3fb950; font-weight: bold; font-family: sans-serif;">+</span> &lt;p&gt;орлрлпро123&lt;/p&gt;
                </div>
  <div style="padding: 4px 8px; color: #24292f; background-color: #ffeef0; border-left: 3px solid #f85149; margin: 2px 0; white-space: pre-wrap; word-break: break-word; text-decoration: line-through;">
                    <span style="color: #f85149; font-weight: bold; font-family: sans-serif;">-</span> &lt;p&gt;орлрлпро12&lt;/p&gt;
                </div>

  <div style="margin-top: 12px; padding: 8px 12px; background-color: #f6f8fa; border-top: 1px solid #d0d7de; border-radius: 0 0 6px 6px; display: flex; gap: 20px; font-size: 13px; color: #57606a; font-family: sans-serif;">
            <span><span style="color: #f85149;">●</span> Удалено: <strong>1</strong></span>
            <span><span style="color: #3fb950;">●</span> Добавлено: <strong>1</strong></span>
            <span><span style="color: #8b949e;">●</span> Без изменений: <strong>4</strong></span>
        </div>
</div>', 'дшнгеаьролрпарольртп');
INSERT INTO public.policy_versions OVERRIDING SYSTEM VALUE VALUES (7, 'privacy', '2.1.1', '2.1.2', 1, '2026-09-03 23:40:13.099024', '<h1>123567 89</h1><p>jkhj ighjghj1</p><p><em>hijkhjkh</em></p><p>hikjhj</p><p>орлрлпро123</p>', '<h1>123567 89</h1><p>jkhj ighjghj1</p><p><em>hijkhjkh</em></p><p>hikjhj</p><p>орлрлпро1234</p>', '<div style="font-family: ''Courier New'', monospace; background-color: #f6f8fa; padding: 16px; border-radius: 6px; border: 1px solid #d0d7de; margin: 10px 0; font-size: 13px; line-height: 1.5;">
<div style="padding: 8px 12px; background-color: #f6f8fa; border-bottom: 1px solid #d0d7de; margin-bottom: 12px; font-weight: bold; color: #24292f; font-family: sans-serif;">
            Изменения в политике
        </div>
  <div style="padding: 4px 8px; color: #24292f; background-color: #ffffff; border-left: 3px solid #d0d7de; margin: 2px 0; white-space: pre-wrap; word-break: break-word;">&lt;h1&gt;123567 89&lt;/h1&gt;</div>
  <div style="padding: 4px 8px; color: #24292f; background-color: #ffffff; border-left: 3px solid #d0d7de; margin: 2px 0; white-space: pre-wrap; word-break: break-word;">&lt;p&gt;jkhj ighjghj1&lt;/p&gt;</div>
  <div style="padding: 4px 8px; color: #24292f; background-color: #ffffff; border-left: 3px solid #d0d7de; margin: 2px 0; white-space: pre-wrap; word-break: break-word;">&lt;p&gt;&lt;em&gt;hijkhjkh&lt;/em&gt;&lt;/p&gt;</div>
  <div style="padding: 4px 8px; color: #24292f; background-color: #ffffff; border-left: 3px solid #d0d7de; margin: 2px 0; white-space: pre-wrap; word-break: break-word;">&lt;p&gt;hikjhj&lt;/p&gt;</div>
  <div style="padding: 4px 8px; color: #24292f; background-color: #e6ffec; border-left: 3px solid #3fb950; margin: 2px 0; white-space: pre-wrap; word-break: break-word;">
                    <span style="color: #3fb950; font-weight: bold; font-family: sans-serif;">+</span> &lt;p&gt;орлрлпро1234&lt;/p&gt;
                </div>
  <div style="padding: 4px 8px; color: #24292f; background-color: #ffeef0; border-left: 3px solid #f85149; margin: 2px 0; white-space: pre-wrap; word-break: break-word; text-decoration: line-through;">
                    <span style="color: #f85149; font-weight: bold; font-family: sans-serif;">-</span> &lt;p&gt;орлрлпро123&lt;/p&gt;
                </div>

  <div style="margin-top: 12px; padding: 8px 12px; background-color: #f6f8fa; border-top: 1px solid #d0d7de; border-radius: 0 0 6px 6px; display: flex; gap: 20px; font-size: 13px; color: #57606a; font-family: sans-serif;">
            <span><span style="color: #f85149;">●</span> Удалено: <strong>1</strong></span>
            <span><span style="color: #3fb950;">●</span> Добавлено: <strong>1</strong></span>
            <span><span style="color: #8b949e;">●</span> Без изменений: <strong>4</strong></span>
        </div>
</div>', 'лдшнгерпвролрпаиматьроим');
INSERT INTO public.policy_versions OVERRIDING SYSTEM VALUE VALUES (8, 'privacy', '2.1.2', '2.1.3', 1, '2026-09-03 23:52:29.21739', '<h1>123567 89</h1><p>jkhj ighjghj1</p><p><em>hijkhjkh</em></p><p>hikjhj</p><p>орлрлпро1234</p>', '<h1>123567 89</h1><p>jkhj ighjghj1</p><p><em>hijkhjkh</em></p><p>hikjhj</p><p>орлрлпро12345</p>', '<div style="font-family: ''Courier New'', monospace; background-color: #f6f8fa; padding: 16px; border-radius: 6px; border: 1px solid #d0d7de; margin: 10px 0; font-size: 13px; line-height: 1.5;">
<div style="padding: 8px 12px; background-color: #f6f8fa; border-bottom: 1px solid #d0d7de; margin-bottom: 12px; font-weight: bold; color: #24292f; font-family: sans-serif;">
            Изменения в политике
        </div>
  <div style="padding: 4px 8px; color: #24292f; background-color: #ffffff; border-left: 3px solid #d0d7de; margin: 2px 0; white-space: pre-wrap; word-break: break-word;">&lt;h1&gt;123567 89&lt;/h1&gt;</div>
  <div style="padding: 4px 8px; color: #24292f; background-color: #ffffff; border-left: 3px solid #d0d7de; margin: 2px 0; white-space: pre-wrap; word-break: break-word;">&lt;p&gt;jkhj ighjghj1&lt;/p&gt;</div>
  <div style="padding: 4px 8px; color: #24292f; background-color: #ffffff; border-left: 3px solid #d0d7de; margin: 2px 0; white-space: pre-wrap; word-break: break-word;">&lt;p&gt;&lt;em&gt;hijkhjkh&lt;/em&gt;&lt;/p&gt;</div>
  <div style="padding: 4px 8px; color: #24292f; background-color: #ffffff; border-left: 3px solid #d0d7de; margin: 2px 0; white-space: pre-wrap; word-break: break-word;">&lt;p&gt;hikjhj&lt;/p&gt;</div>
  <div style="padding: 4px 8px; color: #24292f; background-color: #e6ffec; border-left: 3px solid #3fb950; margin: 2px 0; white-space: pre-wrap; word-break: break-word;">
                    <span style="color: #3fb950; font-weight: bold; font-family: sans-serif;">+</span> &lt;p&gt;орлрлпро12345&lt;/p&gt;
                </div>
  <div style="padding: 4px 8px; color: #24292f; background-color: #ffeef0; border-left: 3px solid #f85149; margin: 2px 0; white-space: pre-wrap; word-break: break-word; text-decoration: line-through;">
                    <span style="color: #f85149; font-weight: bold; font-family: sans-serif;">-</span> &lt;p&gt;орлрлпро1234&lt;/p&gt;
                </div>

  <div style="margin-top: 12px; padding: 8px 12px; background-color: #f6f8fa; border-top: 1px solid #d0d7de; border-radius: 0 0 6px 6px; display: flex; gap: 20px; font-size: 13px; color: #57606a; font-family: sans-serif;">
            <span><span style="color: #f85149;">●</span> Удалено: <strong>1</strong></span>
            <span><span style="color: #3fb950;">●</span> Добавлено: <strong>1</strong></span>
            <span><span style="color: #8b949e;">●</span> Без изменений: <strong>4</strong></span>
        </div>
</div>', 'наьтиорлопмрьтироплрмипоаритмпраситамт');


--
-- TOC entry 4167 (class 0 OID 34632)
-- Dependencies: 273
-- Data for Name: rate_limits; Type: TABLE DATA; Schema: public; Owner: admin
--

INSERT INTO public.rate_limits VALUES ('rlflx:READ_SUBNET_PER_DAY:172.18.0.*', 63, 1789234539368);


--
-- TOC entry 4182 (class 0 OID 56172)
-- Dependencies: 288
-- Data for Name: role_permissions; Type: TABLE DATA; Schema: public; Owner: admin
--

INSERT INTO public.role_permissions VALUES ('MODERATOR', 'incident:create', true);
INSERT INTO public.role_permissions VALUES ('MODERATOR', 'incident:check', true);
INSERT INTO public.role_permissions VALUES ('MODERATOR', 'incident:edit', false);
INSERT INTO public.role_permissions VALUES ('MODERATOR', 'incident:delete', false);
INSERT INTO public.role_permissions VALUES ('USER', 'incident:create', false);
INSERT INTO public.role_permissions VALUES ('OPERATOR', 'incident:check', true);
INSERT INTO public.role_permissions VALUES ('OPERATOR', 'incident:create', true);
INSERT INTO public.role_permissions VALUES ('OPERATOR', 'incident:edit', false);
INSERT INTO public.role_permissions VALUES ('OPERATOR', 'user:edit_status', true);
INSERT INTO public.role_permissions VALUES ('ADMINISTRATOR', 'incident:create', true);
INSERT INTO public.role_permissions VALUES ('ADMINISTRATOR', 'incident:edit', true);
INSERT INTO public.role_permissions VALUES ('ADMINISTRATOR', 'incident:delete', false);
INSERT INTO public.role_permissions VALUES ('ADMINISTRATOR', 'incident:check', true);
INSERT INTO public.role_permissions VALUES ('ADMINISTRATOR', 'user:edit_status', true);
INSERT INTO public.role_permissions VALUES ('ADMINISTRATOR', 'settings:edit', true);
INSERT INTO public.role_permissions VALUES ('ADMINISTRATOR', 'critical_action:execute', true);
INSERT INTO public.role_permissions VALUES ('ADMINISTRATOR', 'waf:manage', true);
INSERT INTO public.role_permissions VALUES ('DEVELOPER', 'incident:create', true);
INSERT INTO public.role_permissions VALUES ('DEVELOPER', 'incident:edit', true);
INSERT INTO public.role_permissions VALUES ('DEVELOPER', 'incident:delete', true);
INSERT INTO public.role_permissions VALUES ('DEVELOPER', 'incident:check', true);
INSERT INTO public.role_permissions VALUES ('DEVELOPER', 'user:edit_status', true);
INSERT INTO public.role_permissions VALUES ('DEVELOPER', 'user:manage_permissions', true);
INSERT INTO public.role_permissions VALUES ('DEVELOPER', 'settings:edit', true);
INSERT INTO public.role_permissions VALUES ('DEVELOPER', 'critical_action:execute', true);
INSERT INTO public.role_permissions VALUES ('DEVELOPER', 'waf:manage', true);
INSERT INTO public.role_permissions VALUES ('TOP_LEVEL_ADMINISTRATOR', 'incident:check', true);
INSERT INTO public.role_permissions VALUES ('TOP_LEVEL_ADMINISTRATOR', 'incident:create', true);
INSERT INTO public.role_permissions VALUES ('TOP_LEVEL_ADMINISTRATOR', 'incident:delete', true);
INSERT INTO public.role_permissions VALUES ('TOP_LEVEL_ADMINISTRATOR', 'incident:edit', true);
INSERT INTO public.role_permissions VALUES ('TOP_LEVEL_ADMINISTRATOR', 'critical_action:execute', true);
INSERT INTO public.role_permissions VALUES ('TOP_LEVEL_ADMINISTRATOR', 'settings:edit', true);
INSERT INTO public.role_permissions VALUES ('TOP_LEVEL_ADMINISTRATOR', 'waf:manage', true);
INSERT INTO public.role_permissions VALUES ('TOP_LEVEL_ADMINISTRATOR', 'user:manage_permissions', true);
INSERT INTO public.role_permissions VALUES ('TOP_LEVEL_ADMINISTRATOR', 'user:edit_status', true);
INSERT INTO public.role_permissions VALUES ('TOP_LEVEL_DEVELOPER', 'incident:check', true);
INSERT INTO public.role_permissions VALUES ('TOP_LEVEL_DEVELOPER', 'incident:create', true);
INSERT INTO public.role_permissions VALUES ('TOP_LEVEL_DEVELOPER', 'incident:delete', true);
INSERT INTO public.role_permissions VALUES ('TOP_LEVEL_DEVELOPER', 'incident:edit', true);
INSERT INTO public.role_permissions VALUES ('TOP_LEVEL_DEVELOPER', 'critical_action:execute', true);
INSERT INTO public.role_permissions VALUES ('TOP_LEVEL_DEVELOPER', 'settings:edit', true);
INSERT INTO public.role_permissions VALUES ('TOP_LEVEL_DEVELOPER', 'waf:manage', true);
INSERT INTO public.role_permissions VALUES ('TOP_LEVEL_DEVELOPER', 'user:manage_permissions', true);
INSERT INTO public.role_permissions VALUES ('TOP_LEVEL_DEVELOPER', 'user:edit_status', true);


--
-- TOC entry 4166 (class 0 OID 34575)
-- Dependencies: 272
-- Data for Name: search_history; Type: TABLE DATA; Schema: public; Owner: admin
--

INSERT INTO public.search_history VALUES ('e0323db5-88da-434d-8d16-234e913b3dad', 'ivanov@mail.ru', NULL, 'person', '{"string": "wretryrrtuyio", "tokens_count": 1}', 'not_found', '{"mode": "pro", "exists": false, "truncated": false, "found_count": 0, "risk_levels": [], "total_groups": 0, "max_risk_level": null, "returned_groups": 0, "has_detailed_results": false}', '172.18.0.1', '65cdc5f5-9d53-4b81-87c9-80e872d036e2_g0vre7', 26, '2026-08-21 17:14:28.65764+00');
INSERT INTO public.search_history VALUES ('c108e26f-02ef-4a55-930c-153db52ee46c', 'ivanov@mail.ru', NULL, 'pvz', '{"city": "выавпа", "home": "45", "street": "выпарвп"}', 'not_found', '{"exists": false, "address": "выавпа, выпарвп, 45", "found_count": 0}', '172.18.0.1', '65cdc5f5-9d53-4b81-87c9-80e872d036e2_g0vre7', 20, '2026-08-21 17:45:05.462283+00');
INSERT INTO public.search_history VALUES ('159a490a-bfc6-4d19-8ab4-526c99abbd4f', 'ivanov@mail.ru', NULL, 'pvz', '{"city": "выавпа", "home": "45", "street": "выпарвп"}', 'not_found', '{"exists": false, "address": "выавпа, выпарвп, 45", "found_count": 0}', '172.18.0.1', '65cdc5f5-9d53-4b81-87c9-80e872d036e2_g0vre7', 8, '2026-08-21 17:49:51.918024+00');
INSERT INTO public.search_history VALUES ('60df7599-0327-4f13-8f98-07853d477200', 'ivanov@mail.ru', NULL, 'person', '{"string": "ыавправпывар", "tokens_count": 1}', 'not_found', '{"mode": "pro", "exists": false, "truncated": false, "found_count": 0, "risk_levels": [], "total_groups": 0, "max_risk_level": null, "returned_groups": 0, "has_detailed_results": false}', '172.18.0.1', '65cdc5f5-9d53-4b81-87c9-80e872d036e2_g0vre7', 31, '2026-08-21 17:50:06.161883+00');
INSERT INTO public.search_history VALUES ('53c51a30-285d-41ad-8353-0977bb2d2287', 'ivanov1@mail.ru', NULL, 'pvz', '{"city": "фаувпр", "home": "45", "street": "аупвыкарео"}', 'not_found', '{"exists": false, "address": "фаувпр, аупвыкарео, 45", "found_count": 0}', '172.18.0.1', '65cdc5f5-9d53-4b81-87c9-80e872d036e2_g0vre7', 4, '2026-08-21 17:50:26.745824+00');
INSERT INTO public.search_history VALUES ('1b56b698-77d5-4ac5-8f9b-38558c6fc696', 'ivanov2@mail.ru', NULL, 'pvz', '{"city": "ывапа", "home": "42", "street": "ыафвпыар"}', 'not_found', '{"exists": false, "address": "ывапа, ыафвпыар, 42", "found_count": 0}', '172.18.0.1', '65cdc5f5-9d53-4b81-87c9-80e872d036e2_g0vre7', 9, '2026-08-21 18:03:49.23817+00');
INSERT INTO public.search_history VALUES ('33176f53-31cf-4bb1-b9ac-ac225594541e', 'ivanov@mail.ru', NULL, 'pvz', '{"city": "ывавпар", "home": "45", "street": "пврао"}', 'not_found', '{"exists": false, "address": "ывавпар, пврао, 45", "found_count": 0}', '172.18.0.1', '65cdc5f5-9d53-4b81-87c9-80e872d036e2_g0vre7', 12, '2026-08-21 18:32:16.53305+00');
INSERT INTO public.search_history VALUES ('e901d66d-4d55-4c64-985a-60ddab67e16b', 'ivanov@mail.ru', NULL, 'pvz', '{"city": "ывавпар", "home": "45", "street": "пврао"}', 'not_found', '{"exists": false, "address": "ывавпар, пврао, 45", "found_count": 0}', '172.18.0.1', '65cdc5f5-9d53-4b81-87c9-80e872d036e2_g0vre7', 13, '2026-08-21 18:32:18.453792+00');
INSERT INTO public.search_history VALUES ('34c18a7e-bee5-4c77-ba82-a11d01976f0e', 'ivanov@mail.ru', NULL, 'pvz', '{"city": "ывавпар", "home": "45", "street": "пврао"}', 'not_found', '{"exists": false, "address": "ывавпар, пврао, 45", "found_count": 0}', '172.18.0.1', '65cdc5f5-9d53-4b81-87c9-80e872d036e2_g0vre7', 4, '2026-08-21 18:32:19.945694+00');
INSERT INTO public.search_history VALUES ('87f04c02-561b-4b8b-a30b-1952497008b1', 'ivanov@mail.ru', NULL, 'pvz', '{"city": "ывавпар", "home": "45", "street": "пврао"}', 'not_found', '{"exists": false, "address": "ывавпар, пврао, 45", "found_count": 0}', '172.18.0.1', '65cdc5f5-9d53-4b81-87c9-80e872d036e2_g0vre7', 2, '2026-08-21 18:32:21.044568+00');
INSERT INTO public.search_history VALUES ('2ba45a8e-4974-42df-99a6-0d53b7fe1fc8', 'ivanov@mail.ru', NULL, 'pvz', '{"city": "ывавпар", "home": "45", "street": "пврао"}', 'not_found', '{"exists": false, "address": "ывавпар, пврао, 45", "found_count": 0}', '172.18.0.1', '65cdc5f5-9d53-4b81-87c9-80e872d036e2_g0vre7', 3, '2026-08-21 18:32:22.275587+00');
INSERT INTO public.search_history VALUES ('30a82ce9-8519-498a-bcce-f3e6550b9c70', 'ivanov@mail.ru', NULL, 'person', '{"string": "xacsvdcbfv", "tokens_count": 1}', 'not_found', '{"mode": "pro", "exists": false, "truncated": false, "found_count": 0, "risk_levels": [], "total_groups": 0, "max_risk_level": null, "returned_groups": 0, "has_detailed_results": false}', '172.18.0.1', '65cdc5f5-9d53-4b81-87c9-80e872d036e2_g0vre7', 13, '2026-08-21 18:53:24.306806+00');
INSERT INTO public.search_history VALUES ('696af8e0-aaa8-4368-9ac1-79af90cea6a9', 'ivanov@mail.ru', NULL, 'person', '{"string": "ропраропа", "tokens_count": 1}', 'not_found', '{"mode": "pro", "exists": false, "truncated": false, "found_count": 0, "risk_levels": [], "total_groups": 0, "max_risk_level": null, "returned_groups": 0, "has_detailed_results": false}', '172.18.0.1', '65cdc5f5-9d53-4b81-87c9-80e872d036e2_g0vre7', 189, '2026-08-21 19:06:57.036411+00');
INSERT INTO public.search_history VALUES ('ae23782f-6789-4175-a4b2-c3349bda1a79', 'ivanov@mail.ru', NULL, 'person', '{"string": "ропраропа", "tokens_count": 1}', 'not_found', '{"mode": "pro", "exists": false, "truncated": false, "found_count": 0, "risk_levels": [], "total_groups": 0, "max_risk_level": null, "returned_groups": 0, "has_detailed_results": false}', '172.18.0.1', '65cdc5f5-9d53-4b81-87c9-80e872d036e2_g0vre7', 15, '2026-08-21 19:06:59.126621+00');
INSERT INTO public.search_history VALUES ('6d696c47-33e0-40db-b09a-66c237c8908f', 'ivanov@mail.ru', NULL, 'person', '{"string": "ропраропа", "tokens_count": 1}', 'not_found', '{"mode": "pro", "exists": false, "truncated": false, "found_count": 0, "risk_levels": [], "total_groups": 0, "max_risk_level": null, "returned_groups": 0, "has_detailed_results": false}', '172.18.0.1', '65cdc5f5-9d53-4b81-87c9-80e872d036e2_g0vre7', 10, '2026-08-21 19:07:00.301687+00');
INSERT INTO public.search_history VALUES ('445db6ae-a8bc-49c7-9197-e3ae1c359de5', 'ivanov@mail.ru', NULL, 'person', '{"string": "ропраропа", "tokens_count": 1}', 'not_found', '{"mode": "pro", "exists": false, "truncated": false, "found_count": 0, "risk_levels": [], "total_groups": 0, "max_risk_level": null, "returned_groups": 0, "has_detailed_results": false}', '172.18.0.1', '65cdc5f5-9d53-4b81-87c9-80e872d036e2_g0vre7', 4, '2026-08-21 19:07:01.36273+00');
INSERT INTO public.search_history VALUES ('2c9f79c7-f130-42da-b4b3-9ccee8348da4', 'ivanov@mail.ru', NULL, 'person', '{"string": "ропраропа", "tokens_count": 1}', 'not_found', '{"mode": "pro", "exists": false, "truncated": false, "found_count": 0, "risk_levels": [], "total_groups": 0, "max_risk_level": null, "returned_groups": 0, "has_detailed_results": false}', '172.18.0.1', '65cdc5f5-9d53-4b81-87c9-80e872d036e2_g0vre7', 27, '2026-08-21 19:07:03.347027+00');
INSERT INTO public.search_history VALUES ('574a105b-cb22-41e2-8d2c-dc878050279c', 'ivanov@mail.ru', NULL, 'person', '{"string": "ропраропа", "tokens_count": 1}', 'not_found', '{"mode": "pro", "exists": false, "truncated": false, "found_count": 0, "risk_levels": [], "total_groups": 0, "max_risk_level": null, "returned_groups": 0, "has_detailed_results": false}', '172.18.0.1', '65cdc5f5-9d53-4b81-87c9-80e872d036e2_g0vre7', 5, '2026-08-21 19:07:05.329095+00');
INSERT INTO public.search_history VALUES ('e6adabb9-08c9-4231-aa06-59209e750f29', 'ivanov@mail.ru', NULL, 'pvz', '{"city": "wfegdfhg", "home": "45", "street": "egrdhtfjyg"}', 'not_found', '{"exists": false, "address": "wfegdfhg, egrdhtfjyg, 45", "found_count": 0}', '172.18.0.1', '65cdc5f5-9d53-4b81-87c9-80e872d036e2_g0vre7', 22, '2026-08-21 19:07:15.496939+00');
INSERT INTO public.search_history VALUES ('3dfc41fe-8819-44fd-94a9-c15dc0fe8ea4', 'ivanov@mail.ru', NULL, 'person', '{"string": "@fghhhfdnb", "tokens_count": 1}', 'found', '{"mode": "pro", "exists": true, "truncated": false, "found_count": 1, "risk_levels": ["low"], "total_groups": 1, "max_risk_level": "low", "returned_groups": 1, "has_detailed_results": true}', '172.18.0.1', '65cdc5f5-9d53-4b81-87c9-80e872d036e2_9qt5nh', 26, '2026-08-22 16:11:28.268258+00');
INSERT INTO public.search_history VALUES ('fa50fa04-d3c7-430c-86e2-f9a1526c0d65', 'unknown', 1, 'person', '{"source": "pdf_export", "group_id": 1}', 'found', '{"type": "pdf_export", "expires_at": "2026-09-01T16:11:46.229Z", "report_type": "person", "verify_code": "BLP-FJD7-MRPS", "display_data": {"positions": ["Неизвестная должность(emp)"], "pvz_count": 1, "risk_level": "low", "as_employee": 1, "names_masked": [], "total_incidents": 1, "as_administration": 0, "reliability_score": 95, "last_incident_date": "2026-08-22T11:24:21.616Z", "first_incident_date": "2026-08-22T11:24:21.616Z", "total_violation_balls": 5}, "verify_count": 1, "data_fingerprint": "047ceb5eda603d57849623c30f9b1048620828db85965a5d12efbffa2af85a83", "requester_email_masked": "***"}', '172.18.0.1', '65cdc5f5-9d53-4b81-87c9-80e872d036e2_9qt5nh', 0, '2026-08-22 16:11:46.230982+00');
INSERT INTO public.search_history VALUES ('9765aa82-cbd5-4c0d-b74c-461afc3e4afb', 'ivanov@mail.ru', NULL, 'pvz', '{"city": "Московская Область", "home": "5б", "street": "Сиреневая"}', 'found', '{"mode": "pro", "exists": true, "found_count": 1, "risk_levels": ["low"], "max_risk_level": "low", "has_detailed_results": true}', '172.18.0.1', '65cdc5f5-9d53-4b81-87c9-80e872d036e2_9qt5nh', 30, '2026-08-22 16:13:38.459045+00');
INSERT INTO public.search_history VALUES ('ee973ff5-05e3-447f-8ab6-84dd74181f77', 'unknown', 1, 'pvz', '{"pvz_id": "a817ff0a-d2ba-415f-8834-46c2ec283dc6", "source": "pdf_export"}', 'found', '{"type": "pdf_export", "expires_at": "2026-09-01T16:14:11.203Z", "report_type": "pvz", "verify_code": "BLP-4U4M-DNLG", "display_data": {"type": "Другой", "risk_level": "low", "address_masked": "г. М***осковская Область, ул. С***иреневая, д. 5*б", "personnel_count": 1, "total_incidents": 1, "reliability_score": 95, "last_incident_date": "2026-08-22T11:24:21.616Z", "admin_fault_percent": 0, "total_violation_balls": 5, "employee_fault_percent": 100}, "verify_count": 1, "data_fingerprint": "950f521ed405d853eeb2a40921309984b469a8372f12d553a0f13dbd3d18b7f6", "requester_email_masked": "***"}', '172.18.0.1', '65cdc5f5-9d53-4b81-87c9-80e872d036e2_9qt5nh', 0, '2026-08-22 16:14:11.204135+00');


--
-- TOC entry 4122 (class 0 OID 17866)
-- Dependencies: 228
-- Data for Name: settings; Type: TABLE DATA; Schema: public; Owner: admin
--

INSERT INTO public.settings VALUES (3, 'use_watermarks', 'Используем ли мы вотерматки на файлах (сейчас только изображения)', 'Использование тотермарок', 'BOOL', false, 'security', NULL, true, '{true}');
INSERT INTO public.settings VALUES (4, 'center_watermark', 'Вотермарка по центру', 'Вотермарка по центру', 'BOOL', false, 'security', 'use_watermarks', true, '{false}');
INSERT INTO public.settings VALUES (6, 'delete_crit_act_logs', 'Насколько старые логик о критический действиях удалить (в днях). Тоесть будут удалены логи старше указанного числа', 'Старшинство логов крит действий', 'INTEGER', false, 'security', NULL, true, '{0}');
INSERT INTO public.settings VALUES (5, 'watermark_text', 'Текст вотермарки', 'Текст вотермарки', 'VARCHAR', false, 'main', NULL, true, '{BlackList}');
INSERT INTO public.settings VALUES (7, 'pdf_title_company', 'Название организации в ПДФ', 'Название в ПДФ', 'VARCHAR', false, 'main', NULL, true, '{adm223}');
INSERT INTO public.settings VALUES (1, 'main_admin', 'Главный администратор', 'Главный администратор', 'VARCHAR', false, 'main', NULL, true, '{admin}');
INSERT INTO public.settings VALUES (2, 'main_dev', 'Главный разработчик', 'Главный разработчик', 'VARCHAR', false, 'main', NULL, true, '{admin1013456}');
INSERT INTO public.settings VALUES (8, 'logging', 'Логирование вкючить/выключить', 'Логирование', 'BOOL', false, 'security', NULL, true, '{false}');
INSERT INTO public.settings VALUES (9, 'lockdown_mode', 'Закрыть вход на сайте (смогут войти только главные админы и разрабы)', 'Закрыть вход', 'BOOL', false, 'security', NULL, true, '{false}');


--
-- TOC entry 4123 (class 0 OID 17873)
-- Dependencies: 229
-- Data for Name: settings_history; Type: TABLE DATA; Schema: public; Owner: admin
--

INSERT INTO public.settings_history OVERRIDING SYSTEM VALUE VALUES (8, 'main_dev', 1, '2026-08-24 17:16:18.963234', '{admin101345}', '{admin1013456}', 2);
INSERT INTO public.settings_history OVERRIDING SYSTEM VALUE VALUES (9, 'logging', 1, '2026-09-06 17:18:46.34762', '{true}', '{false}', 8);
INSERT INTO public.settings_history OVERRIDING SYSTEM VALUE VALUES (10, 'logging', 1, '2026-09-06 17:18:57.541932', '{false}', '{true}', 8);
INSERT INTO public.settings_history OVERRIDING SYSTEM VALUE VALUES (11, 'logging', 1, '2026-09-06 18:59:17.576072', '{true}', '{false}', 8);
INSERT INTO public.settings_history OVERRIDING SYSTEM VALUE VALUES (12, 'lockdown_mode', 1, '2026-09-07 19:17:09.041119', '{false}', '{true}', 9);
INSERT INTO public.settings_history OVERRIDING SYSTEM VALUE VALUES (13, 'lockdown_mode', 1, '2026-09-07 19:41:50.146159', '{true}', '{false}', 9);
INSERT INTO public.settings_history OVERRIDING SYSTEM VALUE VALUES (14, 'lockdown_mode', 1, '2026-09-07 19:47:22.531571', '{false}', '{true}', 9);
INSERT INTO public.settings_history OVERRIDING SYSTEM VALUE VALUES (15, 'lockdown_mode', 1, '2026-09-07 19:48:05.528161', '{true}', '{false}', 9);


--
-- TOC entry 4147 (class 0 OID 26198)
-- Dependencies: 253
-- Data for Name: stats_records; Type: TABLE DATA; Schema: public; Owner: admin
--

INSERT INTO public.stats_records VALUES ('incidents', 'create', 'incidentList_view', '2026-08-20 19:00:00', 'hour', 1, 0, '2026-08-20 19:34:59.991733');
INSERT INTO public.stats_records VALUES ('incidents', 'view', '14012026-JDIDM', '2026-09-05 00:00:00', 'day', 4, 0, '2026-09-08 00:59:59.936374');
INSERT INTO public.stats_records VALUES ('incidents', 'view', '24082026-AHAYH', '2026-09-02 00:00:00', 'day', 1, 0, '2026-09-08 00:59:59.936374');
INSERT INTO public.stats_records VALUES ('incidents', 'create', 'incidentList_view', '2026-08-24 22:00:00', 'hour', 5, 0, '2026-08-24 23:00:00.031297');
INSERT INTO public.stats_records VALUES ('incidents', 'view', '14012026-JDIDM', '2026-09-02 00:00:00', 'day', 6, 0, '2026-09-08 00:59:59.936374');
INSERT INTO public.stats_records VALUES ('incidents', 'view', '24082026-AHAYH', '2026-09-05 00:00:00', 'day', 6, 0, '2026-09-08 00:59:59.936374');
INSERT INTO public.stats_records VALUES ('incidents', 'create', 'incidentList_view', '2026-08-20 00:00:00', 'day', 2, 0, '2026-09-08 00:59:59.936374');
INSERT INTO public.stats_records VALUES ('incidents', 'create', 'incidentList_view', '2026-08-22 00:00:00', 'day', 3, 0, '2026-09-08 00:59:59.936374');
INSERT INTO public.stats_records VALUES ('incidents', 'create', 'incidentList_view', '2026-08-24 00:00:00', 'day', 5, 0, '2026-09-08 00:59:59.936374');
INSERT INTO public.stats_records VALUES ('contestation', 'create', 'contestationList_view', '2026-08-21 00:00:00', 'day', 1, 0, '2026-09-08 00:59:59.936374');
INSERT INTO public.stats_records VALUES ('contestation', 'create', 'contestationList_view', '2026-08-22 00:00:00', 'day', 1, 0, '2026-09-08 00:59:59.936374');
INSERT INTO public.stats_records VALUES ('pvz', 'get', 'persone', '2026-08-21 00:00:00', 'day', 10, 0, '2026-09-08 00:59:59.936374');
INSERT INTO public.stats_records VALUES ('incidents', 'create', 'incidentList_view', '2026-08-20 20:00:00', 'hour', 1, 0, '2026-08-20 20:19:59.989002');
INSERT INTO public.stats_records VALUES ('pvz', 'get', 'persone', '2026-08-22 00:00:00', 'day', 1, 0, '2026-09-08 00:59:59.936374');
INSERT INTO public.stats_records VALUES ('pvz', 'get', 'pvz', '2026-08-21 00:00:00', 'day', 10, 0, '2026-09-08 00:59:59.936374');
INSERT INTO public.stats_records VALUES ('pvz', 'get', 'pvz', '2026-08-22 00:00:00', 'day', 1, 0, '2026-09-08 00:59:59.936374');
INSERT INTO public.stats_records VALUES ('incidents', 'view', '24082026-AHAYH', '2026-09-02 15:00:00', 'hour', 1, 0, '2026-09-07 21:00:00.024717');
INSERT INTO public.stats_records VALUES ('page', 'incidentList_view', 'incidentList', '2026-09-05 00:00:00', 'day', 5, 0, '2026-09-08 00:59:59.936374');
INSERT INTO public.stats_records VALUES ('incidents', 'view', '14012026-JDIDM', '2026-09-02 15:00:00', 'hour', 6, 0, '2026-09-07 21:00:00.024717');
INSERT INTO public.stats_records VALUES ('page', 'incidentList_view', 'incidentList', '2026-09-07 17:00:00', 'hour', 2, 0, '2026-09-12 16:00:00.016485');
INSERT INTO public.stats_records VALUES ('contestation', 'create', 'contestationList_view', '2026-08-21 12:00:00', 'hour', 1, 0, '2026-08-21 12:55:00.051021');
INSERT INTO public.stats_records VALUES ('pvz', 'get', 'pvz', '2026-08-21 17:00:00', 'hour', 3, 0, '2026-08-21 17:55:00.012074');
INSERT INTO public.stats_records VALUES ('pvz', 'get', 'persone', '2026-08-21 17:00:00', 'hour', 3, 0, '2026-08-21 17:55:00.012074');
INSERT INTO public.stats_records VALUES ('incidents', 'create', 'incidentList_view', '2026-08-22 19:00:00', 'hour', 1, 0, '2026-08-22 19:40:00.009802');
INSERT INTO public.stats_records VALUES ('incidents', 'view', '20082026-YPRMO', '2026-08-22 00:00:00', 'day', 14, 0, '2026-09-04 00:00:00.059407');
INSERT INTO public.stats_records VALUES ('pvz', 'get', 'pvz', '2026-08-21 19:00:00', 'hour', 1, 0, '2026-08-21 19:10:00.185553');
INSERT INTO public.stats_records VALUES ('pvz', 'get', 'pvz', '2026-08-21 18:00:00', 'hour', 6, 0, '2026-08-21 18:34:59.993963');
INSERT INTO public.stats_records VALUES ('pvz', 'get', 'persone', '2026-08-21 18:00:00', 'hour', 1, 0, '2026-08-21 18:54:59.973399');
INSERT INTO public.stats_records VALUES ('incidents', 'view', '24082026-AHAYH', '2026-08-24 00:00:00', 'day', 1, 0, '2026-09-04 00:00:00.059407');
INSERT INTO public.stats_records VALUES ('pvz', 'get', 'persone', '2026-08-21 19:00:00', 'hour', 6, 0, '2026-08-21 19:10:00.185553');
INSERT INTO public.stats_records VALUES ('incidents', 'view', '20082026-YPRMO', '2026-08-20 00:00:00', 'day', 4, 0, '2026-09-04 00:00:00.059407');
INSERT INTO public.stats_records VALUES ('incidents', 'view', '20082026-LVSHI', '2026-08-20 00:00:00', 'day', 33, 0, '2026-09-04 00:00:00.059407');
INSERT INTO public.stats_records VALUES ('incidents', 'view', '14012026-JDIDM', '2026-08-28 00:00:00', 'day', 2, 0, '2026-09-04 00:00:00.059407');
INSERT INTO public.stats_records VALUES ('page', 'incidentList_view', 'incidentList', '2026-09-07 17:00:00', 'minute', 1, 0, '2026-09-07 17:09:59.969558');
INSERT INTO public.stats_records VALUES ('incidents', 'view', '14012026-JDIDM', '2026-08-22 00:00:00', 'day', 19, 0, '2026-09-04 00:00:00.059407');
INSERT INTO public.stats_records VALUES ('incidents', 'view', '14012026-JDIDM', '2026-08-24 00:00:00', 'day', 2, 0, '2026-09-04 00:00:00.059407');
INSERT INTO public.stats_records VALUES ('incidents', 'view', '24082026-GYDRV', '2026-08-24 00:00:00', 'day', 1, 0, '2026-09-04 00:00:00.059407');
INSERT INTO public.stats_records VALUES ('incidents', 'view', '24082026-EZXTN', '2026-08-24 00:00:00', 'day', 1, 0, '2026-09-04 00:00:00.059407');
INSERT INTO public.stats_records VALUES ('incidents', 'view', '20082026-LVSHI', '2026-08-22 00:00:00', 'day', 16, 0, '2026-09-04 00:00:00.059407');
INSERT INTO public.stats_records VALUES ('incidents', 'view', '20082026-LVSHI', '2026-08-21 00:00:00', 'day', 24, 0, '2026-09-04 00:00:00.059407');
INSERT INTO public.stats_records VALUES ('incidents', 'view', '24082026-PLPSY', '2026-08-24 00:00:00', 'day', 1, 0, '2026-09-04 00:00:00.059407');
INSERT INTO public.stats_records VALUES ('incidents', 'view', '24082026-VEECR', '2026-08-24 00:00:00', 'day', 1, 0, '2026-09-04 00:00:00.059407');
INSERT INTO public.stats_records VALUES ('page', 'incidentList_view', 'incidentList', '2026-09-02 00:00:00', 'day', 5, 0, '2026-09-08 00:59:59.936374');
INSERT INTO public.stats_records VALUES ('incidents', 'create', 'incidentList_view', '2026-08-22 11:00:00', 'hour', 2, 0, '2026-08-22 11:24:59.990903');
INSERT INTO public.stats_records VALUES ('page', 'incidentList_view', 'incidentList', '2026-08-21 00:00:00', 'day', 1, 0, '2026-09-04 00:00:00.059407');
INSERT INTO public.stats_records VALUES ('page', 'incidentList_view', 'incidentList', '2026-08-28 00:00:00', 'day', 3, 0, '2026-09-04 00:00:00.059407');
INSERT INTO public.stats_records VALUES ('page', 'incidentList_view', 'incidentList', '2026-08-24 00:00:00', 'day', 5, 0, '2026-09-04 00:00:00.059407');
INSERT INTO public.stats_records VALUES ('page', 'incidentList_view', 'incidentList', '2026-08-20 00:00:00', 'day', 14, 0, '2026-09-04 00:00:00.059407');
INSERT INTO public.stats_records VALUES ('page', 'incidentList_view', 'incidentList', '2026-08-22 00:00:00', 'day', 16, 0, '2026-09-04 00:00:00.059407');
INSERT INTO public.stats_records VALUES ('page', 'incidentList_view', 'incidentList', '2026-09-07 17:13:00', 'minute', 1, 0, '2026-09-07 17:19:59.973571');
INSERT INTO public.stats_records VALUES ('page', 'incidentList_view', 'incidentList', '2026-09-02 15:00:00', 'hour', 5, 0, '2026-09-07 21:00:00.024717');
INSERT INTO public.stats_records VALUES ('incidents', 'view', '24082026-AHAYH', '2026-09-05 19:00:00', 'hour', 4, 0, '2026-09-07 21:00:00.024717');
INSERT INTO public.stats_records VALUES ('pvz', 'get', 'pvz', '2026-08-22 16:00:00', 'hour', 1, 0, '2026-08-22 16:14:59.98421');
INSERT INTO public.stats_records VALUES ('pvz', 'get', 'persone', '2026-08-22 16:00:00', 'hour', 1, 0, '2026-08-22 16:14:59.98421');
INSERT INTO public.stats_records VALUES ('incidents', 'view', '24082026-AHAYH', '2026-09-05 18:00:00', 'hour', 2, 0, '2026-09-07 21:00:00.024717');
INSERT INTO public.stats_records VALUES ('incidents', 'view', '14012026-JDIDM', '2026-09-05 18:00:00', 'hour', 4, 0, '2026-09-07 21:00:00.024717');
INSERT INTO public.stats_records VALUES ('page', 'incidentList_view', 'incidentList', '2026-09-05 18:00:00', 'hour', 2, 0, '2026-09-07 21:00:00.024717');
INSERT INTO public.stats_records VALUES ('page', 'incidentList_view', 'incidentList', '2026-09-05 19:00:00', 'hour', 3, 0, '2026-09-07 21:00:00.024717');
INSERT INTO public.stats_records VALUES ('contestation', 'create', 'contestationList_view', '2026-08-22 16:00:00', 'hour', 1, 0, '2026-08-22 16:34:59.985265');


--
-- TOC entry 4179 (class 0 OID 56130)
-- Dependencies: 285
-- Data for Name: system_scheduled_tasks; Type: TABLE DATA; Schema: public; Owner: admin
--

INSERT INTO public.system_scheduled_tasks VALUES (13, 'maintenance', '2026-10-07 07:00:00+00', NULL, 'ujgfhgchvbh', 'cancelled', 1, '2026-09-07 16:51:33.896961+00');
INSERT INTO public.system_scheduled_tasks VALUES (14, 'maintenance', '2026-10-10 07:00:00+00', '2026-10-11 07:00:00+00', 'цвфыуавпрпваывпар', 'cancelled', 1, '2026-09-07 17:14:35.578032+00');
INSERT INTO public.system_scheduled_tasks VALUES (15, 'maintenance', '2026-09-07 17:20:00+00', '2026-09-07 18:00:00+00', 'Тех работы', 'completed', 1, '2026-09-07 17:18:34.416567+00');
INSERT INTO public.system_scheduled_tasks VALUES (16, 'maintenance', '2027-12-21 07:00:00+00', NULL, 'esgrdfhgfh', 'cancelled', 1, '2026-09-07 17:27:14.739928+00');
INSERT INTO public.system_scheduled_tasks VALUES (17, 'maintenance', '2026-11-11 07:00:00+00', NULL, 'ролпррмиьолдлобрьтбр', 'cancelled', 1, '2026-09-07 17:41:03.070662+00');
INSERT INTO public.system_scheduled_tasks VALUES (18, 'maintenance', '2026-09-08 20:00:00+00', NULL, '123', 'cancelled', 1, '2026-09-07 18:39:14.306982+00');
INSERT INTO public.system_scheduled_tasks VALUES (19, 'maintenance', '2026-09-07 19:50:00+00', NULL, 'gjfhddghjgf', 'cancelled', 1, '2026-09-07 19:46:13.859019+00');


--
-- TOC entry 4120 (class 0 OID 17857)
-- Dependencies: 226
-- Data for Name: system_versions; Type: TABLE DATA; Schema: public; Owner: admin
--

INSERT INTO public.system_versions OVERRIDING SYSTEM VALUE VALUES (1, '1.2.3(DEMO)', 'ыфавыпарпуыв1', 'кпркые векновепров енвео', '{"fixes": [{"url": "", "title": "кпрарь", "description": "варпоррепевро"}], "features": [{"url": "", "title": "пачарвар", "description": "рыеарыокат"}], "security": [{"url": "", "title": "вепркорнрравт ыекапо варовп ыкаро", "description": ""}]}', 'update', true, true, '2026-08-02 04:44:44.326169', '2026-08-02 05:13:32.218859', 1, 1, 'ыорпва ыагрпдлфовар прф длвапрдлыв рплыво ');


--
-- TOC entry 4114 (class 0 OID 17830)
-- Dependencies: 220
-- Data for Name: user_auth_logins; Type: TABLE DATA; Schema: public; Owner: admin
--

INSERT INTO public.user_auth_logins OVERRIDING SYSTEM VALUE VALUES (285, 1, 14, '172.18.0.1', 'password', 'main', 'success', NULL, '2026-08-24 21:42:18.640052', 'ru', 'Europe/Moscow', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/150.0.0.0 YaBrowser/26.8.0.0 Safari/537.36', 'web', NULL, NULL, NULL);
INSERT INTO public.user_auth_logins OVERRIDING SYSTEM VALUE VALUES (286, 1, 13, '172.18.0.1', 'password', 'main', 'success', NULL, '2026-08-24 21:56:51.757876', 'ru-RU', 'Europe/Moscow', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/151.0.0.0 Safari/537.36', 'web', NULL, NULL, NULL);
INSERT INTO public.user_auth_logins OVERRIDING SYSTEM VALUE VALUES (287, 1, NULL, '172.18.0.1', 'password', 'main', 'fail', 'Неправильный пароль', '2026-08-24 21:56:58.729376', 'ru-RU', 'Europe/Moscow', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/151.0.0.0 Safari/537.36', 'web', NULL, NULL, NULL);
INSERT INTO public.user_auth_logins OVERRIDING SYSTEM VALUE VALUES (288, 1, 13, '172.18.0.1', 'password', 'main', 'success', NULL, '2026-08-24 21:57:01.421304', 'ru-RU', 'Europe/Moscow', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/151.0.0.0 Safari/537.36', 'web', NULL, NULL, NULL);
INSERT INTO public.user_auth_logins OVERRIDING SYSTEM VALUE VALUES (289, 1, 15, '172.18.0.1', 'password', 'main', 'success', NULL, '2026-08-24 22:05:30.297868', 'ru', 'Europe/Moscow', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/150.0.0.0 YaBrowser/26.8.0.0 Safari/537.36', 'web', NULL, NULL, NULL);
INSERT INTO public.user_auth_logins OVERRIDING SYSTEM VALUE VALUES (290, 1, 16, '172.18.0.1', 'password', 'main', 'success', NULL, '2026-08-24 22:08:09.82255', NULL, NULL, 'PostmanRuntime/7.56.1', 'web', NULL, NULL, NULL);
INSERT INTO public.user_auth_logins OVERRIDING SYSTEM VALUE VALUES (291, 1, 15, '172.18.0.1', 'password', 'main', 'success', NULL, '2026-08-27 11:30:23.366913', 'ru', 'Europe/Moscow', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/150.0.0.0 YaBrowser/26.8.0.0 Safari/537.36', 'web', NULL, NULL, NULL);
INSERT INTO public.user_auth_logins OVERRIDING SYSTEM VALUE VALUES (292, 1, 15, '172.18.0.1', 'password', 'main', 'success', NULL, '2026-08-27 18:52:13.342422', 'ru', 'Europe/Moscow', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/150.0.0.0 YaBrowser/26.8.0.0 Safari/537.36', 'web', NULL, NULL, NULL);
INSERT INTO public.user_auth_logins OVERRIDING SYSTEM VALUE VALUES (293, 1, 15, '172.18.0.1', 'password', 'main', 'success', NULL, '2026-08-27 19:29:42.970628', 'ru', 'Europe/Moscow', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/150.0.0.0 YaBrowser/26.8.0.0 Safari/537.36', 'web', NULL, NULL, NULL);
INSERT INTO public.user_auth_logins OVERRIDING SYSTEM VALUE VALUES (294, 1, 15, '172.18.0.1', 'password', 'main', 'success', NULL, '2026-08-27 19:40:51.363334', 'ru', 'Europe/Moscow', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/150.0.0.0 YaBrowser/26.8.0.0 Safari/537.36', 'web', NULL, NULL, NULL);
INSERT INTO public.user_auth_logins OVERRIDING SYSTEM VALUE VALUES (295, 1, NULL, '172.18.0.1', 'password', 'main', 'secondary_required', NULL, '2026-08-27 19:44:27.673667', 'ru', 'Europe/Moscow', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/150.0.0.0 YaBrowser/26.8.0.0 Safari/537.36', 'web', NULL, NULL, NULL);
INSERT INTO public.user_auth_logins OVERRIDING SYSTEM VALUE VALUES (296, 1, NULL, '172.18.0.1', 'password', 'main', 'secondary_required', NULL, '2026-08-27 19:44:52.587476', 'ru', 'Europe/Moscow', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/150.0.0.0 YaBrowser/26.8.0.0 Safari/537.36', 'web', NULL, NULL, NULL);
INSERT INTO public.user_auth_logins OVERRIDING SYSTEM VALUE VALUES (297, 1, 18, '172.18.0.1', 'password', 'main', 'success', NULL, '2026-08-27 19:46:11.145289', NULL, NULL, 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/150.0.0.0 YaBrowser/26.8.0.0 Safari/537.36', 'web', NULL, NULL, NULL);
INSERT INTO public.user_auth_logins OVERRIDING SYSTEM VALUE VALUES (298, 1, 17, '172.18.0.1', 'password', 'main', 'success', NULL, '2026-08-27 19:46:20.131559', 'ru', 'Europe/Moscow', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/150.0.0.0 YaBrowser/26.8.0.0 Safari/537.36', 'web', NULL, NULL, NULL);
INSERT INTO public.user_auth_logins OVERRIDING SYSTEM VALUE VALUES (299, 1, 17, '172.18.0.1', 'password', 'main', 'success', NULL, '2026-08-27 19:56:50.528412', 'ru', 'Europe/Moscow', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/150.0.0.0 YaBrowser/26.8.0.0 Safari/537.36', 'web', NULL, NULL, NULL);
INSERT INTO public.user_auth_logins OVERRIDING SYSTEM VALUE VALUES (300, 1, 17, '172.18.0.1', 'password', 'main', 'success', NULL, '2026-08-28 14:27:37.87352', 'ru', 'Europe/Moscow', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/150.0.0.0 YaBrowser/26.8.0.0 Safari/537.36', 'web', NULL, NULL, NULL);
INSERT INTO public.user_auth_logins OVERRIDING SYSTEM VALUE VALUES (301, 1, 17, '172.18.0.1', 'password', 'main', 'success', NULL, '2026-08-28 15:00:38.41258', 'ru', 'Europe/Moscow', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/150.0.0.0 YaBrowser/26.8.0.0 Safari/537.36', 'web', NULL, NULL, NULL);
INSERT INTO public.user_auth_logins OVERRIDING SYSTEM VALUE VALUES (302, 7, NULL, '172.18.0.1', 'password', 'main', 'secondary_required', NULL, '2026-08-28 15:01:07.402175', 'ru-RU', 'Europe/Moscow', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/150.0.0.0 YaBrowser/26.8.0.0 Safari/537.36', 'web', NULL, NULL, NULL);
INSERT INTO public.user_auth_logins OVERRIDING SYSTEM VALUE VALUES (303, 7, NULL, '172.18.0.1', 'password', 'main', 'secondary_required', NULL, '2026-08-28 15:03:01.90529', 'ru-RU', 'Europe/Moscow', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/150.0.0.0 YaBrowser/26.8.0.0 Safari/537.36', 'web', NULL, NULL, NULL);
INSERT INTO public.user_auth_logins OVERRIDING SYSTEM VALUE VALUES (304, 7, 20, '172.18.0.1', 'password', 'main', 'success', NULL, '2026-08-28 15:03:59.021007', NULL, NULL, 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/150.0.0.0 YaBrowser/26.8.0.0 Safari/537.36', 'web', NULL, NULL, NULL);
INSERT INTO public.user_auth_logins OVERRIDING SYSTEM VALUE VALUES (305, 7, 19, '172.18.0.1', 'password', 'main', 'success', NULL, '2026-08-28 15:04:44.119239', 'ru-RU', 'Europe/Moscow', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/150.0.0.0 YaBrowser/26.8.0.0 Safari/537.36', 'web', NULL, NULL, NULL);
INSERT INTO public.user_auth_logins OVERRIDING SYSTEM VALUE VALUES (306, 7, NULL, '172.18.0.1', 'password', 'main', 'fail', 'Неправильный пароль', '2026-08-28 15:05:20.605724', 'ru-RU', 'Europe/Moscow', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/150.0.0.0 YaBrowser/26.8.0.0 Safari/537.36', 'web', NULL, NULL, NULL);
INSERT INTO public.user_auth_logins OVERRIDING SYSTEM VALUE VALUES (307, 7, 19, '172.18.0.1', 'password', 'main', 'success', NULL, '2026-08-28 15:05:29.160724', 'ru-RU', 'Europe/Moscow', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/150.0.0.0 YaBrowser/26.8.0.0 Safari/537.36', 'web', NULL, NULL, NULL);
INSERT INTO public.user_auth_logins OVERRIDING SYSTEM VALUE VALUES (308, 7, 19, '172.18.0.1', 'password', 'main', 'success', NULL, '2026-08-28 15:07:40.472936', 'ru-RU', 'Europe/Moscow', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/150.0.0.0 YaBrowser/26.8.0.0 Safari/537.36', 'web', NULL, NULL, NULL);
INSERT INTO public.user_auth_logins OVERRIDING SYSTEM VALUE VALUES (309, 7, NULL, '172.18.0.1', 'password', 'main', 'fail', 'Неправильный пароль', '2026-08-28 15:07:57.186214', 'ru-RU', 'Europe/Moscow', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/150.0.0.0 YaBrowser/26.8.0.0 Safari/537.36', 'web', NULL, NULL, NULL);
INSERT INTO public.user_auth_logins OVERRIDING SYSTEM VALUE VALUES (310, 1, NULL, '172.18.0.1', 'password', 'main', 'secondary_required', NULL, '2026-08-28 15:17:01.318394', 'ru', 'Europe/Moscow', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/150.0.0.0 YaBrowser/26.8.0.0 Safari/537.36', 'web', NULL, NULL, NULL);
INSERT INTO public.user_auth_logins OVERRIDING SYSTEM VALUE VALUES (311, 1, 22, '172.18.0.1', 'password', 'main', 'success', NULL, '2026-08-28 15:17:10.346354', NULL, NULL, 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/150.0.0.0 YaBrowser/26.8.0.0 Safari/537.36', 'web', NULL, NULL, NULL);
INSERT INTO public.user_auth_logins OVERRIDING SYSTEM VALUE VALUES (312, 7, 19, '172.18.0.1', 'password', 'main', 'success', NULL, '2026-08-28 15:24:54.974533', 'ru-RU', 'Europe/Moscow', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/150.0.0.0 YaBrowser/26.8.0.0 Safari/537.36', 'web', NULL, NULL, NULL);
INSERT INTO public.user_auth_logins OVERRIDING SYSTEM VALUE VALUES (313, 7, NULL, '172.18.0.1', 'password', 'main', 'secondary_required', NULL, '2026-08-28 15:25:47.47973', 'ru-RU', 'Europe/Moscow', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/150.0.0.0 YaBrowser/26.8.0.0 Safari/537.36', 'web', NULL, NULL, NULL);
INSERT INTO public.user_auth_logins OVERRIDING SYSTEM VALUE VALUES (314, 7, 23, '172.18.0.1', 'password', 'main', 'success', NULL, '2026-08-28 15:25:50.143633', 'ru-RU', 'Europe/Moscow', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/150.0.0.0 YaBrowser/26.8.0.0 Safari/537.36', 'web', NULL, NULL, NULL);
INSERT INTO public.user_auth_logins OVERRIDING SYSTEM VALUE VALUES (315, 7, 23, '172.18.0.1', 'password', 'main', 'success', NULL, '2026-08-28 15:27:58.701284', 'ru-RU', 'Europe/Moscow', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/150.0.0.0 YaBrowser/26.8.0.0 Safari/537.36', 'web', NULL, NULL, NULL);
INSERT INTO public.user_auth_logins OVERRIDING SYSTEM VALUE VALUES (316, 7, 23, '172.18.0.1', 'password', 'main', 'success', NULL, '2026-08-28 15:28:26.395069', 'ru-RU', 'Europe/Moscow', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/150.0.0.0 YaBrowser/26.8.0.0 Safari/537.36', 'web', NULL, NULL, NULL);
INSERT INTO public.user_auth_logins OVERRIDING SYSTEM VALUE VALUES (317, 1, NULL, '172.18.0.1', 'password', 'main', 'secondary_required', NULL, '2026-08-28 15:44:21.775339', 'ru', 'Europe/Moscow', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/150.0.0.0 YaBrowser/26.8.0.0 Safari/537.36', 'web', NULL, NULL, NULL);
INSERT INTO public.user_auth_logins OVERRIDING SYSTEM VALUE VALUES (318, 1, 24, '172.18.0.1', 'password', 'main', 'success', NULL, '2026-08-28 15:45:09.4054', 'ru', 'Europe/Moscow', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/150.0.0.0 YaBrowser/26.8.0.0 Safari/537.36', 'web', NULL, NULL, NULL);
INSERT INTO public.user_auth_logins OVERRIDING SYSTEM VALUE VALUES (319, 7, NULL, '172.18.0.1', 'password', 'main', 'secondary_required', NULL, '2026-08-28 15:45:55.016993', 'ru-RU', 'Europe/Moscow', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/150.0.0.0 YaBrowser/26.8.0.0 Safari/537.36', 'web', NULL, NULL, NULL);
INSERT INTO public.user_auth_logins OVERRIDING SYSTEM VALUE VALUES (320, 7, 23, '172.18.0.1', 'password', 'main', 'success', NULL, '2026-08-28 15:46:10.587427', 'ru-RU', 'Europe/Moscow', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/150.0.0.0 YaBrowser/26.8.0.0 Safari/537.36', 'web', NULL, NULL, NULL);
INSERT INTO public.user_auth_logins OVERRIDING SYSTEM VALUE VALUES (321, 7, NULL, '172.18.0.1', 'password', 'main', 'secondary_required', NULL, '2026-08-28 15:48:46.935198', 'ru-RU', 'Europe/Moscow', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/150.0.0.0 YaBrowser/26.8.0.0 Safari/537.36', 'web', NULL, NULL, NULL);
INSERT INTO public.user_auth_logins OVERRIDING SYSTEM VALUE VALUES (322, 7, 26, '172.18.0.1', 'password', 'main', 'success', NULL, '2026-08-28 15:48:59.574191', 'ru-RU', 'Europe/Moscow', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/150.0.0.0 YaBrowser/26.8.0.0 Safari/537.36', 'web', NULL, NULL, NULL);
INSERT INTO public.user_auth_logins OVERRIDING SYSTEM VALUE VALUES (323, 1, NULL, '172.18.0.1', 'password', 'main', 'secondary_required', NULL, '2026-08-28 15:49:25.044909', 'ru', 'Europe/Moscow', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/150.0.0.0 YaBrowser/26.8.0.0 Safari/537.36', 'web', NULL, NULL, NULL);
INSERT INTO public.user_auth_logins OVERRIDING SYSTEM VALUE VALUES (324, 1, NULL, '172.18.0.1', 'password', 'main', 'secondary_required', NULL, '2026-08-28 15:49:59.779086', 'ru', 'Europe/Moscow', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/150.0.0.0 YaBrowser/26.8.0.0 Safari/537.36', 'web', NULL, NULL, NULL);
INSERT INTO public.user_auth_logins OVERRIDING SYSTEM VALUE VALUES (325, 1, 27, '172.18.0.1', 'password', 'main', 'success', NULL, '2026-08-28 15:50:01.638175', 'ru', 'Europe/Moscow', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/150.0.0.0 YaBrowser/26.8.0.0 Safari/537.36', 'web', NULL, NULL, NULL);
INSERT INTO public.user_auth_logins OVERRIDING SYSTEM VALUE VALUES (326, 7, 26, '172.18.0.1', 'password', 'main', 'success', NULL, '2026-08-28 15:54:55.54524', 'ru-RU', 'Europe/Moscow', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/150.0.0.0 YaBrowser/26.8.0.0 Safari/537.36', 'web', NULL, NULL, NULL);
INSERT INTO public.user_auth_logins OVERRIDING SYSTEM VALUE VALUES (327, 7, NULL, '172.18.0.1', 'password', 'main', 'fail', 'Неправильный пароль', '2026-08-28 15:55:02.698114', 'ru-RU', 'Europe/Moscow', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/150.0.0.0 YaBrowser/26.8.0.0 Safari/537.36', 'web', NULL, NULL, NULL);
INSERT INTO public.user_auth_logins OVERRIDING SYSTEM VALUE VALUES (328, 7, NULL, '172.18.0.1', 'password', 'main', 'secondary_required', NULL, '2026-08-28 15:55:23.332727', 'ru-RU', 'Europe/Moscow', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/150.0.0.0 YaBrowser/26.8.0.0 Safari/537.36', 'web', NULL, NULL, NULL);
INSERT INTO public.user_auth_logins OVERRIDING SYSTEM VALUE VALUES (333, 7, NULL, '172.18.0.1', 'password', 'main', 'secondary_required', NULL, '2026-08-28 16:01:23.966166', 'ru-RU', 'Europe/Moscow', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/150.0.0.0 YaBrowser/26.8.0.0 Safari/537.36', 'web', NULL, NULL, NULL);
INSERT INTO public.user_auth_logins OVERRIDING SYSTEM VALUE VALUES (335, 7, 26, '172.18.0.1', 'password', 'main', 'success', NULL, '2026-08-28 16:01:47.074956', 'ru-RU', 'Europe/Moscow', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/150.0.0.0 YaBrowser/26.8.0.0 Safari/537.36', 'web', NULL, NULL, NULL);
INSERT INTO public.user_auth_logins OVERRIDING SYSTEM VALUE VALUES (336, 7, 26, '172.18.0.1', 'password', 'main', 'success', NULL, '2026-08-28 16:02:31.456595', 'ru-RU', 'Europe/Moscow', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/150.0.0.0 YaBrowser/26.8.0.0 Safari/537.36', 'web', NULL, NULL, NULL);
INSERT INTO public.user_auth_logins OVERRIDING SYSTEM VALUE VALUES (337, 1, 27, '172.18.*.*', 'password', 'main', 'success', NULL, '2026-08-28 16:30:56.185081', 'ru', 'Europe/Moscow', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/150.0.0.0 YaBrowser/26.8.0.0 Safari/537.36', 'web', NULL, NULL, NULL);
INSERT INTO public.user_auth_logins OVERRIDING SYSTEM VALUE VALUES (338, 7, NULL, '172.18.*.*', 'password', 'main', 'secondary_required', NULL, '2026-08-28 16:31:32.803851', 'ru-RU', 'Europe/Moscow', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/150.0.0.0 YaBrowser/26.8.0.0 Safari/537.36', 'web', NULL, NULL, NULL);
INSERT INTO public.user_auth_logins OVERRIDING SYSTEM VALUE VALUES (339, 7, 26, '172.18.*.*', 'password', 'main', 'success', NULL, '2026-08-28 16:31:42.771355', 'ru-RU', 'Europe/Moscow', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/150.0.0.0 YaBrowser/26.8.0.0 Safari/537.36', 'web', NULL, NULL, NULL);
INSERT INTO public.user_auth_logins OVERRIDING SYSTEM VALUE VALUES (340, 7, 26, '172.18.*.*', 'password', 'main', 'success', NULL, '2026-08-28 16:43:49.985795', 'ru-RU', 'Europe/Moscow', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/150.0.0.0 YaBrowser/26.8.0.0 Safari/537.36', 'web', '9e77329fd83df0ae5a28', '40af106b4c0ffc2dc3e651691678c145', '1183036c25b32b262dcf28a2fb6e0146');
INSERT INTO public.user_auth_logins OVERRIDING SYSTEM VALUE VALUES (341, 7, NULL, '172.18.*.*', 'password', 'main', 'secondary_required', NULL, '2026-08-28 16:48:01.710792', 'ru-RU', 'Europe/Moscow', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/150.0.0.0 YaBrowser/26.8.0.0 Safari/537.36', 'web', '6671c2140299380b1842', 'b17fd73cc34df141649acd2cab07a0d2', 'fbd04c55fe2e8c6952ee20efebe76d8a');
INSERT INTO public.user_auth_logins OVERRIDING SYSTEM VALUE VALUES (342, 7, 26, '172.18.*.*', 'password', 'main', 'success', NULL, '2026-08-28 16:48:21.434009', 'ru-RU', 'Europe/Moscow', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/150.0.0.0 YaBrowser/26.8.0.0 Safari/537.36', 'web', '09eeb3b74959c898997a', '971575c895ee2a69e8b4caf5956bdd9a', '45c0d6ac8f2b423a853df53316aafb4d');
INSERT INTO public.user_auth_logins OVERRIDING SYSTEM VALUE VALUES (343, 1, 27, '172.18.*.*', 'password', 'main', 'success', NULL, '2026-08-28 18:21:51.739758', 'ru', 'Europe/Moscow', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/150.0.0.0 YaBrowser/26.8.0.0 Safari/537.36', 'web', '2f5c6517fc0417aabe9a', 'd527cbdd72db1fd5677a3578aedf3e31', '7dc0280df4e1ce4fc0101ffe2be1614f');
INSERT INTO public.user_auth_logins OVERRIDING SYSTEM VALUE VALUES (344, 1, 31, '172.18.*.*', 'password', 'main', 'success', NULL, '2026-09-01 04:42:02.284322', NULL, NULL, 'PostmanRuntime/7.56.1', 'web', '2f48b235892f8ed66f8e', 'd0371285a5afa03a26665b9d5c88db64', '1d6deaa60e79e0936158dd1d77e9ab1d');
INSERT INTO public.user_auth_logins OVERRIDING SYSTEM VALUE VALUES (345, 1, 32, '172.18.*.*', 'password', 'main', 'success', NULL, '2026-09-01 04:45:53.083164', NULL, NULL, 'PostmanRuntime/7.56.1', 'web', '079982d07f2511495f59', '0e9fec8c00f521f55a82ffcdeb28089c', '0d5216882b2e3e6b7f1090a5429a273c');
INSERT INTO public.user_auth_logins OVERRIDING SYSTEM VALUE VALUES (346, 1, 33, '172.18.*.*', 'password', 'main', 'success', NULL, '2026-09-01 04:54:59.940022', NULL, NULL, 'PostmanRuntime/7.56.1', 'web', '60eb91a3d420cf83008f', 'ae92d110112dec79a4054ddb1ee749ba', 'bb901ee16344f3a062c66ee727af2699');
INSERT INTO public.user_auth_logins OVERRIDING SYSTEM VALUE VALUES (347, 1, 34, '172.18.*.*', 'password', 'main', 'success', NULL, '2026-09-01 04:57:30.857523', NULL, NULL, 'PostmanRuntime/7.56.1', 'web', 'bd6c80db0040c1164e49', '06480fe1b791c2e06a59df5997f5eea6', '5437f84f92c80b17c65afaea81b8d296');
INSERT INTO public.user_auth_logins OVERRIDING SYSTEM VALUE VALUES (348, 1, 27, '172.18.*.*', 'password', 'main', 'success', NULL, '2026-09-01 06:20:02.548944', 'ru', 'Europe/Moscow', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/150.0.0.0 YaBrowser/26.8.0.0 Safari/537.36', 'web', '906bc7444aeec0f28a07', 'a291c93f50d0683e08555b9db1cedd3a', 'ea1539834f1f13eeeec12c993ce06a57');
INSERT INTO public.user_auth_logins OVERRIDING SYSTEM VALUE VALUES (349, 1, 36, '172.18.*.*', 'password', 'main', 'success', NULL, '2026-09-01 06:20:39.635379', NULL, NULL, 'PostmanRuntime/7.56.1', 'web', '8e7f8805fe6dfc182286', 'dd6c23f1f63b2ff92a259e2b9a55e124', 'eab5070edee0061145da5867ea0f78a7');
INSERT INTO public.user_auth_logins OVERRIDING SYSTEM VALUE VALUES (351, 1, 27, '172.18.*.*', 'password', 'main', 'success', NULL, '2026-09-01 06:21:43.571546', 'ru', 'Europe/Moscow', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/150.0.0.0 YaBrowser/26.8.0.0 Safari/537.36', 'web', 'df7a109c271c245072cd', '0634e082240ca7415a32a80fa0aeaf38', '0f709494ad454435617fe065b7185bbe');
INSERT INTO public.user_auth_logins OVERRIDING SYSTEM VALUE VALUES (352, 1, 27, '172.18.*.*', 'password', 'main', 'success', NULL, '2026-09-02 09:43:36.596483', 'ru', 'Europe/Moscow', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/150.0.0.0 YaBrowser/26.8.0.0 Safari/537.36', 'web', '7dbdda6ffc795c7656e5', '5f3dca538b07af53f8ff770525c0ae8e', 'd47606422160b4ac0cc94bec40ae99c0');
INSERT INTO public.user_auth_logins OVERRIDING SYSTEM VALUE VALUES (353, 1, 38, '172.18.*.*', 'password', 'main', 'success', NULL, '2026-09-02 14:14:04.881244', NULL, NULL, 'PostmanRuntime/2.4.3', 'web', 'f7db3d76bf919d6ac11f', '3319b50551d23a316bcf6b9ba16ea062', 'fa3d0fdef7a2f1ca8fb98d58aaff0b07');
INSERT INTO public.user_auth_logins OVERRIDING SYSTEM VALUE VALUES (354, 1, 40, '172.18.*.*', 'password', 'main', 'success', NULL, '2026-09-02 14:15:12.376726', NULL, NULL, 'PostmanRuntime/2.4.3', 'web', 'd092050facda8d1d2770', '8a7569284514e01aa56b2d5623372c72', 'cbdefcdc0ffe27b3ef314b3ff0b39e46');
INSERT INTO public.user_auth_logins OVERRIDING SYSTEM VALUE VALUES (355, 1, 42, '172.18.*.*', 'password', 'main', 'success', NULL, '2026-09-02 14:16:11.80754', NULL, NULL, 'PostmanRuntime/2.4.3', 'web', 'ebc6a57bd73b861e6993', 'e0a5d6859a5c5e2fdebddcafaeeb7fc2', '957557c281ad6961d6066ebb18ab258c');
INSERT INTO public.user_auth_logins OVERRIDING SYSTEM VALUE VALUES (356, 1, 44, '172.18.*.*', 'password', 'main', 'success', NULL, '2026-09-02 14:17:03.848289', NULL, NULL, 'PostmanRuntime/2.4.3', 'web', 'dcb7eac0b36851cd53d2', '48c163aa43041a029031b30bfabb916e', '9a3a99853cd2bd42aeb199dec2c639d9');
INSERT INTO public.user_auth_logins OVERRIDING SYSTEM VALUE VALUES (357, 1, 46, '172.18.*.*', 'password', 'main', 'success', NULL, '2026-09-02 15:01:40.819099', NULL, NULL, 'PostmanRuntime/2.4.3', 'web', 'c7f62e17f8d4e0e97a7b', 'a3066e4aff7155c3468a127c7890312e', '5c055c9f251bca8d3dad23b08c12a2fd');
INSERT INTO public.user_auth_logins OVERRIDING SYSTEM VALUE VALUES (358, 1, 48, '172.18.*.*', 'password', 'main', 'success', NULL, '2026-09-02 15:27:47.068493', NULL, NULL, 'PostmanRuntime/2.4.3', 'web', '65c153729b68ff4e49aa', 'ee8b905e6b82576cd6a016334aca50c0', 'bd94a5c97bd3365e5b1ffb0b599d703b');
INSERT INTO public.user_auth_logins OVERRIDING SYSTEM VALUE VALUES (359, 1, NULL, '172.18.*.*', 'password', 'main', 'secondary_required', NULL, '2026-09-02 15:58:56.708739', 'ru', 'Europe/Moscow', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/150.0.0.0 YaBrowser/26.8.0.0 Safari/537.36', 'web', '8d05faef8048dbed5bf2', '4031627f5c3ba8329c60a3a008d45256', '5672ede8a4853c94a23128baf36fef09');
INSERT INTO public.user_auth_logins OVERRIDING SYSTEM VALUE VALUES (360, 1, 49, '172.18.*.*', 'password', 'main', 'success', NULL, '2026-09-02 15:59:09.945656', 'ru', 'Europe/Moscow', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/150.0.0.0 YaBrowser/26.8.0.0 Safari/537.36', 'web', '05032300450e1f998598', '622f88d933a6009c4f3e7f25ca77a89e', 'bd78aa9c2e6eb44f0bc863c4d1351031');
INSERT INTO public.user_auth_logins OVERRIDING SYSTEM VALUE VALUES (361, 1, NULL, '172.18.*.*', 'password', 'main', 'secondary_required', NULL, '2026-09-02 20:12:37.867941', 'ru', 'Europe/Moscow', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/150.0.0.0 YaBrowser/26.8.0.0 Safari/537.36', 'web', 'f3f052cc0c5df454e17f', '38b942c2c30a9b10af70558c2511338c', 'e56b1472764c07d247205a0408e08e2b');
INSERT INTO public.user_auth_logins OVERRIDING SYSTEM VALUE VALUES (362, 1, 50, '172.18.*.*', 'password', 'main', 'success', NULL, '2026-09-02 20:13:10.02986', 'ru', 'Europe/Moscow', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/150.0.0.0 YaBrowser/26.8.0.0 Safari/537.36', 'web', 'c4bb850423689cde1c02', '1599ef24073d1087b4bc97d5df4cf738', 'd1371954839f700c51078bdfb82d4419');
INSERT INTO public.user_auth_logins OVERRIDING SYSTEM VALUE VALUES (363, 1, 49, '172.18.*.*', 'password', 'main', 'success', NULL, '2026-09-03 23:11:19.439396', 'ru', 'Europe/Moscow', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/150.0.0.0 YaBrowser/26.8.0.0 Safari/537.36', 'web', '628bcc1f913ff57b4b3d', '9e69bb97ced24040309f235310b02134', 'd50a1409609016c92525448a1ee51669');
INSERT INTO public.user_auth_logins OVERRIDING SYSTEM VALUE VALUES (364, 1, 49, '172.18.*.*', 'password', 'main', 'success', NULL, '2026-09-03 23:40:00.249792', 'ru', 'Europe/Moscow', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/150.0.0.0 YaBrowser/26.8.0.0 Safari/537.36', 'web', 'afd825c67650c9de1eb8', '6e4ee7af6ea4f7be6777d5d3cc94212c', 'fbd6a1a35bc38a47701c14bcefe585bb');
INSERT INTO public.user_auth_logins OVERRIDING SYSTEM VALUE VALUES (365, 1, 49, '172.18.*.*', 'password', 'main', 'success', NULL, '2026-09-05 18:58:19.400984', 'ru', 'Europe/Moscow', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/150.0.0.0 YaBrowser/26.8.0.0 Safari/537.36', 'web', '0234de65d2dd1088aa4d', 'dd191680a0180caed776a90663e0b552', '87cbe03e216b02ecf2c53da80dde6911');
INSERT INTO public.user_auth_logins OVERRIDING SYSTEM VALUE VALUES (366, 1, 52, '172.18.*.*', 'password', 'main', 'success', NULL, '2026-09-05 19:29:16.667076', NULL, NULL, 'PostmanRuntime/2.5.0', 'web', 'fd75a2626886c6018c3b', '914e54e50ce50fa88af41063df382133', '76bd130ab469f9753b258a1757c6a6f7');
INSERT INTO public.user_auth_logins OVERRIDING SYSTEM VALUE VALUES (367, 1, 49, '172.18.*.*', 'password', 'main', 'success', NULL, '2026-09-05 19:44:11.750854', 'ru', 'Europe/Moscow', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/150.0.0.0 YaBrowser/26.8.0.0 Safari/537.36', 'web', 'd4a1c8c0c5d2e1e954fe', 'cc9649b27da4863b706d8a0f2282668e', 'e8cb896df178dbcb288fda3a2c0c27bd');
INSERT INTO public.user_auth_logins OVERRIDING SYSTEM VALUE VALUES (368, 1, 53, '172.18.*.*', 'password', 'main', 'success', NULL, '2026-09-05 19:44:33.586259', NULL, NULL, 'PostmanRuntime/2.5.0', 'web', '7a68d96f162b7f546350', '2b75c4bad25e0dcf8c72c7f31942638d', 'b3e8c9e1051ba2ffcb7480929e032a04');
INSERT INTO public.user_auth_logins OVERRIDING SYSTEM VALUE VALUES (369, 1, 54, '172.18.*.*', 'password', 'main', 'success', NULL, '2026-09-05 19:44:45.84995', NULL, NULL, 'PostmanRuntime/2.5.0', 'web', '81cb71bbd767d2811c7f', '598cec4e7a163dfdb8e56592c3588f15', '3f34a8aea6a108fbd8173146ba7292a7');
INSERT INTO public.user_auth_logins OVERRIDING SYSTEM VALUE VALUES (370, 1, 55, '172.18.*.*', 'password', 'main', 'success', NULL, '2026-09-05 19:44:54.147598', NULL, NULL, 'PostmanRuntime/2.5.0', 'web', '58592c559deb155743e6', 'acaf5f316d1b39027931bcb75aa20735', '0508d57f966594229018fe6c480a3fba');
INSERT INTO public.user_auth_logins OVERRIDING SYSTEM VALUE VALUES (371, 1, 56, '172.18.*.*', 'password', 'main', 'success', NULL, '2026-09-05 19:47:56.763929', NULL, NULL, 'PostmanRuntime/2.5.0', 'web', '730de989232b40ed9788', 'be33968d88ae30a4e75aa18ba0dde3a9', '1cd34fda1927fa465924f4dc2c801e76');
INSERT INTO public.user_auth_logins OVERRIDING SYSTEM VALUE VALUES (372, 1, 49, '172.18.*.*', 'password', 'main', 'success', NULL, '2026-09-05 20:00:38.156085', 'ru', 'Europe/Moscow', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/150.0.0.0 YaBrowser/26.8.0.0 Safari/537.36', 'web', 'd602603f26e73bc8a131', '64f94c628e9e4db924d694170624752f', '8daddc1372c38655418950a5845b1521');
INSERT INTO public.user_auth_logins OVERRIDING SYSTEM VALUE VALUES (373, 1, 57, '172.18.*.*', 'password', 'main', 'success', NULL, '2026-09-05 20:29:38.858528', NULL, NULL, 'PostmanRuntime/2.5.0', 'web', 'cc556d6babe2960e809e', '5751db21fd92a722f9147ee2fa9cefb1', '28e4eee0cdbf8bec9ef81fd223067e86');
INSERT INTO public.user_auth_logins OVERRIDING SYSTEM VALUE VALUES (375, 1, 49, '172.18.*.*', 'password', 'main', 'success', NULL, '2026-09-05 20:30:37.519449', 'ru', 'Europe/Moscow', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/150.0.0.0 YaBrowser/26.8.0.0 Safari/537.36', 'web', '782fbad8790b2bf6aab2', '9bddd5baaab959b5e928aa9f742b1719', 'e12644614b6b4db43f8b35faf38f296b');
INSERT INTO public.user_auth_logins OVERRIDING SYSTEM VALUE VALUES (376, 1, 58, '172.18.*.*', 'password', 'main', 'success', NULL, '2026-09-05 20:31:06.121591', NULL, NULL, 'PostmanRuntime/2.5.0', 'web', 'c271e62276211ab14642', '7ee4c9691c9c4a4585a263fcc1dc0ecb', '3ea65656a905e0a8ccc847dbe6f2f986');
INSERT INTO public.user_auth_logins OVERRIDING SYSTEM VALUE VALUES (377, 1, 49, '172.18.*.*', 'password', 'main', 'success', NULL, '2026-09-06 17:04:27.612877', 'ru', 'Europe/Moscow', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/150.0.0.0 YaBrowser/26.8.0.0 Safari/537.36', 'web', '9cd9a3b3b937b27d2c63', '1082a08ede546a1395202e452305b829', '906a8a7910009865aceb0c7a30dc898a');
INSERT INTO public.user_auth_logins OVERRIDING SYSTEM VALUE VALUES (378, 1, 49, '172.18.*.*', 'password', 'main', 'success', NULL, '2026-09-06 18:18:46.284816', 'ru', 'Europe/Moscow', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/150.0.0.0 YaBrowser/26.8.0.0 Safari/537.36', 'web', '12f6fc5135c061c951bf', '7c918c4e991308c8960a751aa0541677', '61536de2aea8ff10328ec81245595b00');
INSERT INTO public.user_auth_logins OVERRIDING SYSTEM VALUE VALUES (379, 1, 49, '172.18.*.*', 'password', 'main', 'success', NULL, '2026-09-06 18:24:05.302745', 'ru', 'Europe/Moscow', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/150.0.0.0 YaBrowser/26.8.0.0 Safari/537.36', 'web', 'caa9877bc681ba597f32', 'f6cd0e23ab74e9ff6f3fe66620b83a96', '37d83867a73c7cba7d17c330cf7b437f');
INSERT INTO public.user_auth_logins OVERRIDING SYSTEM VALUE VALUES (380, 1, NULL, '172.18.*.*', 'password', 'main', 'secondary_required', NULL, '2026-09-06 18:24:33.285113', 'ru-RU', 'Europe/Moscow', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/152.0.0.0 Safari/537.36', 'web', '8308ebef98fbfc52ae34', 'd85502482bfd859611bb623b34f64729', '97ccc2a04520891097a05e2b8f22ed4e');
INSERT INTO public.user_auth_logins OVERRIDING SYSTEM VALUE VALUES (381, 1, 60, '172.18.*.*', 'secondary_password', 'main', 'success', NULL, '2026-09-06 18:26:18.936404', 'ru-RU', 'Europe/Moscow', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/152.0.0.0 Safari/537.36', 'web', '9d4f160f7567932ed6eb', 'c287d19c8a7f6886f1e625773e7d5cf6', 'efc824f88c399770a9901e98f166696d');
INSERT INTO public.user_auth_logins OVERRIDING SYSTEM VALUE VALUES (382, 1, 49, '172.18.*.*', 'password', 'main', 'success', NULL, '2026-09-06 18:26:44.355931', 'ru', 'Europe/Moscow', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/150.0.0.0 YaBrowser/26.8.0.0 Safari/537.36', 'web', 'cd79e2cff2268c92b6d6', 'fd780f6d8057a8c6c84cd1a0c1b93ef3', '11b20821a18acf8e95c73c6fdeb7f13d');
INSERT INTO public.user_auth_logins OVERRIDING SYSTEM VALUE VALUES (383, 1, 60, '172.18.*.*', 'password', 'main', 'success', NULL, '2026-09-06 18:26:47.055507', 'ru-RU', 'Europe/Moscow', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/152.0.0.0 Safari/537.36', 'web', '3cf49fb0120721107773', '978457b424a0168ccab5aa359478d0db', '62cd3078b2ed177ca515a1ae55764702');
INSERT INTO public.user_auth_logins OVERRIDING SYSTEM VALUE VALUES (385, 1, 60, '172.18.*.*', 'password', 'main', 'success', NULL, '2026-09-06 18:27:12.736214', 'ru-RU', 'Europe/Moscow', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/152.0.0.0 Safari/537.36', 'web', '9918c7b1e409bff6320f', '063fa3e6ab62761c28dcf0fb97402e3e', '73b63ae58bfafcac16b10d41f6afff8f');
INSERT INTO public.user_auth_logins OVERRIDING SYSTEM VALUE VALUES (386, 1, 49, '172.18.*.*', 'password', 'main', 'success', NULL, '2026-09-06 18:33:38.240892', 'ru', 'Europe/Moscow', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/150.0.0.0 YaBrowser/26.8.0.0 Safari/537.36', 'web', '47578b56e6ce95f8315b', 'ec233bcf830d7cc1012da0e2e78e4cda', '73f8c806b9dd9870a02b303c052c994f');
INSERT INTO public.user_auth_logins OVERRIDING SYSTEM VALUE VALUES (387, 1, 60, '172.18.*.*', 'password', 'main', 'success', NULL, '2026-09-06 18:33:41.73017', 'ru-RU', 'Europe/Moscow', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/152.0.0.0 Safari/537.36', 'web', 'b5a46c908f4adfdc0b6b', '83319cf60edf1e47d6711e085b5129c0', '0af95362b31cd7058df02a13a3610971');
INSERT INTO public.user_auth_logins OVERRIDING SYSTEM VALUE VALUES (389, 1, 60, '172.18.*.*', 'password', 'main', 'success', NULL, '2026-09-06 18:34:39.091669', 'ru-RU', 'Europe/Moscow', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/152.0.0.0 Safari/537.36', 'web', '7111259b5d71870179fa', 'b13b4353fbd2c992cf18a38c88785797', '6a01683c098b441af2e774eaaf8505cd');
INSERT INTO public.user_auth_logins OVERRIDING SYSTEM VALUE VALUES (391, 1, 60, '172.18.*.*', 'password', 'main', 'success', NULL, '2026-09-06 18:34:54.931205', 'ru-RU', 'Europe/Moscow', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/152.0.0.0 Safari/537.36', 'web', 'b446c71f2898e889e742', '604451236f4a353e123fef8178c1f368', 'fd6d36b96d68d0145748634ee97f0b69');
INSERT INTO public.user_auth_logins OVERRIDING SYSTEM VALUE VALUES (393, 1, 60, '172.18.*.*', 'password', 'main', 'success', NULL, '2026-09-06 18:35:09.781363', 'ru-RU', 'Europe/Moscow', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/152.0.0.0 Safari/537.36', 'web', '2aff05875d757b1fef71', '6379d59d54ef11bb4e445a96cfdbf98b', 'afc5e4cd9cdf89379f586455535112af');
INSERT INTO public.user_auth_logins OVERRIDING SYSTEM VALUE VALUES (396, 1, 49, '172.18.*.*', 'password', 'main', 'success', NULL, '2026-09-06 18:53:16.172864', 'ru', 'Europe/Moscow', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/150.0.0.0 YaBrowser/26.8.0.0 Safari/537.36', 'web', '491c471e83f932a628fd', '6a464a723749a0ee187206c569fa5c2a', '5b6a206c53a904783ca2d38e70d1ff5f');
INSERT INTO public.user_auth_logins OVERRIDING SYSTEM VALUE VALUES (397, 1, 60, '172.18.*.*', 'password', 'main', 'success', NULL, '2026-09-06 18:53:29.782858', 'ru-RU', 'Europe/Moscow', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/152.0.0.0 Safari/537.36', 'web', '7abd999180c0b5b1ceac', '398a208b65bf005398079073029c8ae0', '4b76c47908be5c1b293af02658e68222');
INSERT INTO public.user_auth_logins OVERRIDING SYSTEM VALUE VALUES (399, 1, 60, '172.18.*.*', 'password', 'main', 'success', NULL, '2026-09-06 18:53:55.573888', 'ru-RU', 'Europe/Moscow', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/152.0.0.0 Safari/537.36', 'web', 'a4be241a95504f6ec506', '9fe7acf3ceea704ac6645ad164794bb6', '7de058c9c818544bbb36ea4aa4b20588');
INSERT INTO public.user_auth_logins OVERRIDING SYSTEM VALUE VALUES (400, 1, 60, '172.18.*.*', 'password', 'main', 'success', NULL, '2026-09-06 18:54:26.370333', 'ru-RU', 'Europe/Moscow', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/152.0.0.0 Safari/537.36', 'web', 'fd5873651059cf421610', '59d26fcef7656b9a6bd75d617440222e', '87ec1c5afc477bcc22f1947839a21a92');
INSERT INTO public.user_auth_logins OVERRIDING SYSTEM VALUE VALUES (402, 1, 49, '172.18.*.*', 'password', 'main', 'success', NULL, '2026-09-06 18:54:50.392404', 'ru', 'Europe/Moscow', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/150.0.0.0 YaBrowser/26.8.0.0 Safari/537.36', 'web', '33c53c7bfe4c989cb41d', 'dfa634b117dfedd936079b8836bda7d7', 'fd0fd018158fcd2168e20c20cf0b0c0d');
INSERT INTO public.user_auth_logins OVERRIDING SYSTEM VALUE VALUES (404, 1, 60, '172.18.*.*', 'password', 'main', 'success', NULL, '2026-09-06 18:54:54.682347', 'ru-RU', 'Europe/Moscow', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/152.0.0.0 Safari/537.36', 'web', '9e4dcefe3259ec073c79', 'd35ae9a8c6e58f1cf2eeb96336442f7a', '001abc6026bb128a0a063d3f51021c59');
INSERT INTO public.user_auth_logins OVERRIDING SYSTEM VALUE VALUES (405, 1, 60, '172.18.*.*', 'password', 'main', 'success', NULL, '2026-09-06 19:00:21.07217', 'ru-RU', 'Europe/Moscow', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/152.0.0.0 Safari/537.36', 'web', '38d2d6452ddff421b336', 'b011731a4bf8df8e715651e7b6fac001', 'b03affd20243c1f74869357be6cc5ea2');
INSERT INTO public.user_auth_logins OVERRIDING SYSTEM VALUE VALUES (406, 1, 60, '172.18.*.*', 'password', 'main', 'success', NULL, '2026-09-06 19:13:12.502213', 'ru-RU', 'Europe/Moscow', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/152.0.0.0 Safari/537.36', 'web', 'fcc24a8b31806138d482', '9cd30712a0ceb4ee7e6abdd32265e9d1', '1b6f52133dc2128bfaf25a3ea6fc443b');
INSERT INTO public.user_auth_logins OVERRIDING SYSTEM VALUE VALUES (407, 1, 60, '172.18.*.*', 'password', 'main', 'success', NULL, '2026-09-06 19:13:26.899566', 'ru-RU', 'Europe/Moscow', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/152.0.0.0 Safari/537.36', 'web', '8e97620981320a7c16c5', '61e21e14fc93565e8d34388516237770', 'f8ed5537c3b7aeaee406811c80c452d6');
INSERT INTO public.user_auth_logins OVERRIDING SYSTEM VALUE VALUES (408, 1, 49, '172.18.*.*', 'password', 'main', 'success', NULL, '2026-09-06 19:13:42.492043', 'ru', 'Europe/Moscow', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/150.0.0.0 YaBrowser/26.8.0.0 Safari/537.36', 'web', '186d2b8edfc6f91ae7ae', 'd7c3cc37e1dc9c9391c0253f396fa482', '48b53ebe8eac4d41a2b2aa31f13e2e37');
INSERT INTO public.user_auth_logins OVERRIDING SYSTEM VALUE VALUES (409, 1, 60, '172.18.*.*', 'password', 'main', 'success', NULL, '2026-09-06 19:13:46.416787', 'ru-RU', 'Europe/Moscow', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/152.0.0.0 Safari/537.36', 'web', 'f0e085457df6fa499090', '0087057c3a5faac7381300aac31a5bcd', '53c8d7773b3c559873896c145f3e6e7b');
INSERT INTO public.user_auth_logins OVERRIDING SYSTEM VALUE VALUES (411, 1, 60, '172.18.*.*', 'password', 'main', 'success', NULL, '2026-09-06 19:34:26.325889', 'ru-RU', 'Europe/Moscow', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/152.0.0.0 Safari/537.36', 'web', '03abbd7fb788afe43e92', '51789525ef51bf70175c3da62e787b18', '0128182a59a4933bfb040d5aaa05eb2c');
INSERT INTO public.user_auth_logins OVERRIDING SYSTEM VALUE VALUES (412, 1, 49, '172.18.*.*', 'password', 'main', 'success', NULL, '2026-09-06 19:35:33.868822', 'ru', 'Europe/Moscow', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/150.0.0.0 YaBrowser/26.8.0.0 Safari/537.36', 'web', 'ebef8b22cb4a87dfd286', '4a94a0ed801261d7096e8ffc8a8b8265', '006c413f4842a38973b7e9d73e9be2d8');
INSERT INTO public.user_auth_logins OVERRIDING SYSTEM VALUE VALUES (413, 1, 60, '172.18.*.*', 'password', 'main', 'success', NULL, '2026-09-06 19:36:11.045593', 'ru-RU', 'Europe/Moscow', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/152.0.0.0 Safari/537.36', 'web', 'bc416d433de27b997fc4', '9c0d5be04670d27c0f09e93696d816b6', 'd9caf126af5e67521849faae89025758');
INSERT INTO public.user_auth_logins OVERRIDING SYSTEM VALUE VALUES (415, 1, 49, '172.18.*.*', 'password', 'main', 'success', NULL, '2026-09-06 19:37:36.352681', 'ru', 'Europe/Moscow', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/150.0.0.0 YaBrowser/26.8.0.0 Safari/537.36', 'web', 'f6b3c9a0c0009d816c25', '36420c01935b151075bd49bbfbecfada', '672e66117ac3eb8f40bb6c6f64d19e50');
INSERT INTO public.user_auth_logins OVERRIDING SYSTEM VALUE VALUES (417, 1, 60, '172.18.*.*', 'password', 'main', 'success', NULL, '2026-09-06 19:40:55.276717', 'ru-RU', 'Europe/Moscow', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/152.0.0.0 Safari/537.36', 'web', 'd8c3f3924f175e7adcdd', 'aacd5a8d367868b65868ddca8241c149', '70960df8110f1a06d94d17744e9abde4');
INSERT INTO public.user_auth_logins OVERRIDING SYSTEM VALUE VALUES (418, 1, 49, '172.18.*.*', 'password', 'main', 'success', NULL, '2026-09-06 19:41:21.300979', 'ru', 'Europe/Moscow', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/150.0.0.0 YaBrowser/26.8.0.0 Safari/537.36', 'web', '6985bd0efa3139f3c1b2', '0e92e5b1bddda2c13ec6f1ae4888d9e4', '8d57593e21abcd0df687c01c490533b7');
INSERT INTO public.user_auth_logins OVERRIDING SYSTEM VALUE VALUES (419, 1, 60, '172.18.*.*', 'password', 'main', 'success', NULL, '2026-09-06 19:41:45.28495', 'ru-RU', 'Europe/Moscow', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/152.0.0.0 Safari/537.36', 'web', '85b008b9e88569fb0e04', 'efd91b85c91de6085a008e7c75fc3012', '775a6a0fd0e0cfe2505e395b90161026');
INSERT INTO public.user_auth_logins OVERRIDING SYSTEM VALUE VALUES (420, 1, 60, '172.18.*.*', 'password', 'main', 'success', NULL, '2026-09-06 19:42:06.425107', 'ru-RU', 'Europe/Moscow', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/152.0.0.0 Safari/537.36', 'web', '611727fcf7ee0fc4e4cd', '5b3a632801a63f74316b1158bbe14893', '28b4ecc42c9f06935c75b7011743629f');
INSERT INTO public.user_auth_logins OVERRIDING SYSTEM VALUE VALUES (421, 1, 60, '172.18.*.*', 'password', 'main', 'success', NULL, '2026-09-06 19:42:31.161138', 'ru-RU', 'Europe/Moscow', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/152.0.0.0 Safari/537.36', 'web', '4d85857c1a5950e0c107', 'dec705e2dd8db45acae4369f279aa9cd', 'fab45619b77b4661f559ad1ae159fa1b');
INSERT INTO public.user_auth_logins OVERRIDING SYSTEM VALUE VALUES (422, 1, 49, '172.18.*.*', 'password', 'main', 'success', NULL, '2026-09-06 19:43:41.936563', 'ru', 'Europe/Moscow', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/150.0.0.0 YaBrowser/26.8.0.0 Safari/537.36', 'web', '2ca267197256704224c5', 'f11dadc637ba68d4c80d5745325da773', '9ab1368fd345cea961b3aecc87229325');
INSERT INTO public.user_auth_logins OVERRIDING SYSTEM VALUE VALUES (424, 1, 49, '172.18.*.*', 'password', 'main', 'success', NULL, '2026-09-06 19:47:03.978936', 'ru', 'Europe/Moscow', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/150.0.0.0 YaBrowser/26.8.0.0 Safari/537.36', 'web', '74df8ec0eee1fae9d2fe', 'b7b89933ef4ed3055f882553f4951ac3', '07af2e6711740723022966ab918179ce');
INSERT INTO public.user_auth_logins OVERRIDING SYSTEM VALUE VALUES (425, 1, 49, '172.18.*.*', 'password', 'main', 'success', NULL, '2026-09-06 19:48:09.282236', 'ru', 'Europe/Moscow', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/150.0.0.0 YaBrowser/26.8.0.0 Safari/537.36', 'web', 'f16881cba4f4ec89924b', '47433135a6d77cae9e58da2436710611', 'ce98f976f9ba4071546505b2dc6077a4');
INSERT INTO public.user_auth_logins OVERRIDING SYSTEM VALUE VALUES (427, 1, 49, '172.18.*.*', 'password', 'main', 'success', NULL, '2026-09-06 20:02:23.261053', 'ru', 'Europe/Moscow', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/150.0.0.0 YaBrowser/26.8.0.0 Safari/537.36', 'web', '56db3a4fa2ff2e84ee0a', '55554fa14cc147fba8380ae2ced7ed7b', 'fa4c95e8b30d0eb298d0efc6c36d9466');
INSERT INTO public.user_auth_logins OVERRIDING SYSTEM VALUE VALUES (428, 1, 60, '172.18.*.*', 'password', 'main', 'success', NULL, '2026-09-06 20:02:30.745499', 'ru-RU', 'Europe/Moscow', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/152.0.0.0 Safari/537.36', 'web', '01240ff9cc0144da1789', '97e3a6c4e2754a131988c39ecaa30c93', '7860cdf9179c54b9fb898afcab79e0f7');
INSERT INTO public.user_auth_logins OVERRIDING SYSTEM VALUE VALUES (430, 1, 49, '172.18.*.*', 'password', 'main', 'success', NULL, '2026-09-06 20:16:00.331808', 'ru', 'Europe/Moscow', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/150.0.0.0 YaBrowser/26.8.0.0 Safari/537.36', 'web', 'e93fd5499bc7684cf78a', '6b98526b888b0a352d624ade79b579e5', 'ae691a660ffa1cdc8d40671cd9b579fd');
INSERT INTO public.user_auth_logins OVERRIDING SYSTEM VALUE VALUES (431, 1, 60, '172.18.*.*', 'password', 'main', 'success', NULL, '2026-09-06 20:16:04.800542', 'ru-RU', 'Europe/Moscow', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/152.0.0.0 Safari/537.36', 'web', '9ac1ba8aef01d2ccd2a6', '9f1bb4ebc667c21cd3382ff4723ee906', '2beef21187e9f65498d91ebc0c271620');
INSERT INTO public.user_auth_logins OVERRIDING SYSTEM VALUE VALUES (432, 1, NULL, '172.18.*.*', 'password', 'main', 'secondary_required', NULL, '2026-09-06 20:16:32.605954', 'ru-RU', 'Europe/Moscow', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/152.0.0.0 Safari/537.36', 'web', 'b8200add75a0b90d05d6', 'f637c15541c3a1ed7a071ade629dfbe0', '23f759e02767368af426f4d70e0464f6');
INSERT INTO public.user_auth_logins OVERRIDING SYSTEM VALUE VALUES (433, 1, 60, '172.18.*.*', 'secondary_password', 'main', 'success', NULL, '2026-09-06 20:16:46.139668', 'ru-RU', 'Europe/Moscow', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/152.0.0.0 Safari/537.36', 'web', '5814228da4aa2a11a39f', 'de732cd961eb60d78ca549efd26858f8', '7057ce938a7b41279f75587c1904151f');
INSERT INTO public.user_auth_logins OVERRIDING SYSTEM VALUE VALUES (435, 1, 49, '172.18.*.*', 'password', 'main', 'success', NULL, '2026-09-06 20:17:20.089553', 'ru', 'Europe/Moscow', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/150.0.0.0 YaBrowser/26.8.0.0 Safari/537.36', 'web', '9841fe5823d9618248fa', '86838affa82427ab0a727def7fc19d57', 'f88d37efc644ec3a0c69306da6cc45a5');
INSERT INTO public.user_auth_logins OVERRIDING SYSTEM VALUE VALUES (436, 1, NULL, '172.18.*.*', 'password', 'main', 'secondary_required', NULL, '2026-09-06 20:17:43.199228', 'ru-RU', 'Europe/Moscow', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/152.0.0.0 Safari/537.36', 'web', '3c24688f8a02a65395a2', '561d0ee1d119029ccb00a0fcd55d4e0c', '56abb20fc7b965a64457ea3640c1a4c7');
INSERT INTO public.user_auth_logins OVERRIDING SYSTEM VALUE VALUES (437, 1, 60, '172.18.*.*', 'secondary_password', 'main', 'success', NULL, '2026-09-06 20:17:52.325938', 'ru-RU', 'Europe/Moscow', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/152.0.0.0 Safari/537.36', 'web', 'f3b3c311d9ba0cb484c6', 'da9b5c58a5d8c0eb32d7584f9e883c6f', '5339a395179e138d30ef845e141fa43a');
INSERT INTO public.user_auth_logins OVERRIDING SYSTEM VALUE VALUES (439, 1, NULL, '172.18.*.*', 'password', 'main', 'secondary_required', NULL, '2026-09-06 20:18:08.275582', 'ru-RU', 'Europe/Moscow', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/152.0.0.0 Safari/537.36', 'web', 'f2ee0f1aa9566de8c2e9', '40a89e865e90e82ac45d283675e5efcb', '63220f9e19d7b7d9863d5b18ef72a236');
INSERT INTO public.user_auth_logins OVERRIDING SYSTEM VALUE VALUES (440, 1, 61, '172.18.*.*', 'secondary_password', 'main', 'success', NULL, '2026-09-06 20:18:15.100479', 'ru-RU', 'Europe/Moscow', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/152.0.0.0 Safari/537.36', 'web', 'd7a801f863342716637f', 'fed2d2044eb14d6b7c567b62aa8f1720', '1085d9a9de79ac5cba425695fdfdd211');
INSERT INTO public.user_auth_logins OVERRIDING SYSTEM VALUE VALUES (441, 1, 49, '172.18.*.*', 'password', 'main', 'success', NULL, '2026-09-06 20:18:59.16173', 'ru', 'Europe/Moscow', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/150.0.0.0 YaBrowser/26.8.0.0 Safari/537.36', 'web', '046119fb79d483a3c569', 'cb29330d4227d4fb8f04239aab00c893', '2aac3660fad449b0276340d91fac462e');
INSERT INTO public.user_auth_logins OVERRIDING SYSTEM VALUE VALUES (442, 1, NULL, '172.18.*.*', 'password', 'main', 'secondary_required', NULL, '2026-09-06 20:19:03.443141', 'ru-RU', 'Europe/Moscow', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/152.0.0.0 Safari/537.36', 'web', '7179a1a291590071249d', 'f4e2ee14c51d6b5e346c7b7dc779b4ab', '5f705cd2a4001a49c17e825a1fb5b937');
INSERT INTO public.user_auth_logins OVERRIDING SYSTEM VALUE VALUES (443, 1, 60, '172.18.*.*', 'secondary_password', 'main', 'success', NULL, '2026-09-06 20:19:08.852454', 'ru-RU', 'Europe/Moscow', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/152.0.0.0 Safari/537.36', 'web', '3843b618f131f81d1def', 'ec97c183cae671dd8fbfd7b5edf04715', '45803920fa3f851afde0464bd1152dab');
INSERT INTO public.user_auth_logins OVERRIDING SYSTEM VALUE VALUES (445, 1, NULL, '172.18.*.*', 'password', 'main', 'secondary_required', NULL, '2026-09-06 20:19:15.005775', 'ru-RU', 'Europe/Moscow', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/152.0.0.0 Safari/537.36', 'web', 'b4dadcf34b40f26003e6', '309c71a594801f248389d7d59c4ce4f9', 'd285bc977d8dd57eef612341076f6bcd');
INSERT INTO public.user_auth_logins OVERRIDING SYSTEM VALUE VALUES (446, 1, 60, '172.18.*.*', 'secondary_password', 'main', 'success', NULL, '2026-09-06 20:19:17.215949', 'ru-RU', 'Europe/Moscow', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/152.0.0.0 Safari/537.36', 'web', 'b74620daa75e3b31a87c', 'bcbe432d712ff99533efdffa04622eec', '49e5791dd8b15781870be5cf3d1e720e');
INSERT INTO public.user_auth_logins OVERRIDING SYSTEM VALUE VALUES (448, 1, NULL, '172.18.*.*', 'password', 'main', 'secondary_required', NULL, '2026-09-06 20:20:05.019878', 'ru-RU', 'Europe/Moscow', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/152.0.0.0 Safari/537.36', 'web', '0ea7a31329db2da5c583', 'abeb643eb95237f46284196afd8631ba', '626f14e7f836a09eec6b96b2313c37ee');
INSERT INTO public.user_auth_logins OVERRIDING SYSTEM VALUE VALUES (449, 1, 62, '172.18.*.*', 'secondary_password', 'main', 'success', NULL, '2026-09-06 20:20:14.607765', 'ru-RU', 'Europe/Moscow', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/152.0.0.0 Safari/537.36', 'web', 'd00c500f80f53275754f', 'a08ff6b13d061f4805e958a82019f556', '4063354084ab3c16f5a56512c080d5a3');
INSERT INTO public.user_auth_logins OVERRIDING SYSTEM VALUE VALUES (450, 1, 62, '172.18.*.*', 'password', 'main', 'success', NULL, '2026-09-06 20:21:34.010025', 'ru-RU', 'Europe/Moscow', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/152.0.0.0 Safari/537.36', 'web', '50a940e3a082f0c7621d', '90d70f2e59e53bbc0e80dec7d1bdee41', '92a569dfa4afb27b0126c071f1a25cbf');
INSERT INTO public.user_auth_logins OVERRIDING SYSTEM VALUE VALUES (451, 1, 49, '172.18.*.*', 'password', 'main', 'success', NULL, '2026-09-07 14:49:40.425931', 'ru', 'Europe/Moscow', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/150.0.0.0 YaBrowser/26.8.0.0 Safari/537.36', 'web', '1de1276283f7fa356bcf', '91b273f2934e11bbf721b7e98e84f392', '8b194df6602da43842409a1ae2a0b350');
INSERT INTO public.user_auth_logins OVERRIDING SYSTEM VALUE VALUES (452, 7, 63, '172.18.*.*', 'password', 'main', 'success', NULL, '2026-09-07 14:50:33.137356', 'ru-RU', 'Europe/Moscow', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/150.0.0.0 YaBrowser/26.8.0.0 Safari/537.36', 'web', '7bbf0796055dc1a04e49', '2312022d4843eb0015498552dd7786c4', '5f0d4a0eb55e6c763eb9f27cf3392d0b');
INSERT INTO public.user_auth_logins OVERRIDING SYSTEM VALUE VALUES (453, 1, 49, '172.18.*.*', 'password', 'main', 'success', NULL, '2026-09-07 14:52:22.106275', 'ru', 'Europe/Moscow', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/150.0.0.0 YaBrowser/26.8.0.0 Safari/537.36', 'web', 'cda0803841ffafcdb341', '8075bc27cf4c4de7f5ddd50c28f65284', 'eba94b3de14573b37a8c782002ec8da3');
INSERT INTO public.user_auth_logins OVERRIDING SYSTEM VALUE VALUES (454, 7, 63, '172.18.*.*', 'password', 'main', 'success', NULL, '2026-09-07 14:52:57.805319', 'ru-RU', 'Europe/Moscow', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/150.0.0.0 YaBrowser/26.8.0.0 Safari/537.36', 'web', 'f7a0d7838617d00efba7', '30b5215a67711a2ecf5abebdd2449d7f', '91e7c0f9bc38649d3f8cea6d08e95e67');
INSERT INTO public.user_auth_logins OVERRIDING SYSTEM VALUE VALUES (455, 1, 49, '172.18.*.*', 'password', 'main', 'success', NULL, '2026-09-07 15:32:42.135796', 'ru', 'Europe/Moscow', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/150.0.0.0 YaBrowser/26.8.0.0 Safari/537.36', 'web', '9fce5631ec91259c1b6d', 'ec5ffe4b649099e14e5444f761cc7b32', 'f6fe53c43e16b36b634a26fcaf9b8c94');
INSERT INTO public.user_auth_logins OVERRIDING SYSTEM VALUE VALUES (456, 1, 49, '172.18.*.*', 'password', 'main', 'success', NULL, '2026-09-07 16:19:51.327309', 'ru', 'Europe/Moscow', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/150.0.0.0 YaBrowser/26.8.0.0 Safari/537.36', 'web', 'dc1a7e9c07a107fe04e7', '1383763f8c6ecb4f1d9fd4945c3b4326', 'b0fd2799c3d8eaeb9547b4e913d89f71');
INSERT INTO public.user_auth_logins OVERRIDING SYSTEM VALUE VALUES (457, 1, 49, '172.18.*.*', 'password', 'main', 'success', NULL, '2026-09-07 16:21:19.73519', 'ru', 'Europe/Moscow', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/150.0.0.0 YaBrowser/26.8.0.0 Safari/537.36', 'web', 'df4926212edca66bae1b', 'b250b8af3f669b0ff09f081ae65736ea', 'e703ad350733e64a28d83a118833a4ef');
INSERT INTO public.user_auth_logins OVERRIDING SYSTEM VALUE VALUES (458, 1, 49, '172.18.*.*', 'password', 'main', 'success', NULL, '2026-09-07 16:21:46.897266', 'ru', 'Europe/Moscow', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/150.0.0.0 YaBrowser/26.8.0.0 Safari/537.36', 'web', '1738fe93124ba33e444e', 'b2f1e712183edbf1120a44acc86331aa', '89493b15e1431aefca6731b71878b3fc');
INSERT INTO public.user_auth_logins OVERRIDING SYSTEM VALUE VALUES (459, 1, 49, '172.18.*.*', 'password', 'main', 'success', NULL, '2026-09-07 16:26:11.554704', 'ru', 'Europe/Moscow', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/150.0.0.0 YaBrowser/26.8.0.0 Safari/537.36', 'web', '54c6a309960098baadd3', 'e5fee07312527168ab9909631528c59a', '655b3dd5b9acfc2cc2bb23eb400e63ff');
INSERT INTO public.user_auth_logins OVERRIDING SYSTEM VALUE VALUES (460, 1, 49, '172.18.*.*', 'password', 'main', 'success', NULL, '2026-09-07 16:28:26.101676', 'ru', 'Europe/Moscow', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/150.0.0.0 YaBrowser/26.8.0.0 Safari/537.36', 'web', '0299243abfb6e0f70ac0', 'f6aea0abcc79523afe2e0bb29cde6055', '0764f84a36123f832b928a30601ede3c');
INSERT INTO public.user_auth_logins OVERRIDING SYSTEM VALUE VALUES (461, 1, 49, '172.18.*.*', 'password', 'main', 'success', NULL, '2026-09-07 16:50:41.216009', 'ru', 'Europe/Moscow', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/150.0.0.0 YaBrowser/26.8.0.0 Safari/537.36', 'web', '1620e3c8cdac14793dad', 'a2b7be3c318726300fc464a0c2973ef0', 'd797d238dcc89f3234fe4b0bb4809595');
INSERT INTO public.user_auth_logins OVERRIDING SYSTEM VALUE VALUES (462, 1, 49, '172.18.*.*', 'password', 'main', 'success', NULL, '2026-09-07 17:20:11.115758', 'ru', 'Europe/Moscow', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/150.0.0.0 YaBrowser/26.8.0.0 Safari/537.36', 'web', '14c0fcfd5aef10642c00', '1a28f3e2c4695cd987354c9caf163e35', '152da0a9a212236c8b663bb0bffcd0d0');
INSERT INTO public.user_auth_logins OVERRIDING SYSTEM VALUE VALUES (463, 1, 49, '172.18.*.*', 'password', 'main', 'success', NULL, '2026-09-07 18:29:17.595019', 'ru', 'Europe/Moscow', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/150.0.0.0 YaBrowser/26.8.0.0 Safari/537.36', 'web', '98ca8660d5e263c1aa11', '4ee1d93bdc47c887dcc7a55bb4a04f39', '5d70a235f3f764ebe9df00c9eea0fd96');
INSERT INTO public.user_auth_logins OVERRIDING SYSTEM VALUE VALUES (464, 1, 49, '172.18.*.*', 'password', 'main', 'success', NULL, '2026-09-07 19:06:39.536588', 'ru', 'Europe/Moscow', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/150.0.0.0 YaBrowser/26.8.0.0 Safari/537.36', 'web', 'f25006a23159d8eb6a17', 'c1ceea96d582e6feb2253db8022a54dd', 'af7e4bcf0824106a30dd32feed35f8fe');
INSERT INTO public.user_auth_logins OVERRIDING SYSTEM VALUE VALUES (465, 1, 49, '172.18.*.*', 'password', 'main', 'success', NULL, '2026-09-07 19:16:44.263686', 'ru', 'Europe/Moscow', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/150.0.0.0 YaBrowser/26.8.0.0 Safari/537.36', 'web', 'bcc71cf6ee5d2290597b', '255bd2b1ab2ef82f9df206b54f299ee2', '9d2995989da0dd4331dcd6f5eec8cb5d');
INSERT INTO public.user_auth_logins OVERRIDING SYSTEM VALUE VALUES (466, 1, 49, '172.18.*.*', 'password', 'main', 'success', NULL, '2026-09-07 19:17:33.660342', 'ru', 'Europe/Moscow', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/150.0.0.0 YaBrowser/26.8.0.0 Safari/537.36', 'web', '620ea11ba96921acad9e', '33d31ea6e618ba3b3d25cfa67418f5e9', 'c3481139c2ef8a04729673348d0de46e');
INSERT INTO public.user_auth_logins OVERRIDING SYSTEM VALUE VALUES (467, 7, 63, '172.18.*.*', 'password', 'main', 'success', NULL, '2026-09-07 19:41:54.876353', 'ru-RU', 'Europe/Moscow', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/150.0.0.0 YaBrowser/26.8.0.0 Safari/537.36', 'web', 'f4466c4f1ff9b365b5ea', '23119cc5f07216fd3d1381d576a97e46', '9e18a1f9e7c5a7257eadeccf02cf7423');
INSERT INTO public.user_auth_logins OVERRIDING SYSTEM VALUE VALUES (468, 1, 49, '172.18.*.*', 'password', 'main', 'success', NULL, '2026-09-07 19:47:47.609301', 'ru', 'Europe/Moscow', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/150.0.0.0 YaBrowser/26.8.0.0 Safari/537.36', 'web', 'af4617ca94df74dd3055', '6ae7d0dd80a45a4b8e1540d016de0631', '26baf0e291ff4359c7f82f57471a960f');
INSERT INTO public.user_auth_logins OVERRIDING SYSTEM VALUE VALUES (469, 7, 63, '172.18.*.*', 'password', 'main', 'success', NULL, '2026-09-07 19:48:07.496048', 'ru-RU', 'Europe/Moscow', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/150.0.0.0 YaBrowser/26.8.0.0 Safari/537.36', 'web', '326b93bcbce53adda173', 'b3cbdfb8213224c6b5eb7eb46cef83f7', 'e1f7d091236b0981636072a50ea0d50c');
INSERT INTO public.user_auth_logins OVERRIDING SYSTEM VALUE VALUES (470, 7, NULL, '172.18.*.*', 'password', 'main', 'fail', 'Неправильный пароль', '2026-09-07 19:49:08.42889', 'ru-RU', 'Europe/Moscow', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/150.0.0.0 YaBrowser/26.8.0.0 Safari/537.36', 'web', 'f64cdc63a14bc7a9d629', 'f48ca3b5fe5d1ddc975a19042ce799ee', '5a6d8ef5ca99c43678dbf0180f243c70');
INSERT INTO public.user_auth_logins OVERRIDING SYSTEM VALUE VALUES (471, 7, NULL, '172.18.*.*', 'password', 'main', 'fail', 'Неправильный пароль', '2026-09-07 19:49:09.111479', 'ru-RU', 'Europe/Moscow', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/150.0.0.0 YaBrowser/26.8.0.0 Safari/537.36', 'web', '15d3324b0284c999b977', '3ee8f74ab90f2fc27e41bfdb126390ca', 'cf10403b725597487c4b7a20b5715588');
INSERT INTO public.user_auth_logins OVERRIDING SYSTEM VALUE VALUES (472, 7, NULL, '172.18.*.*', 'password', 'main', 'fail', 'Неправильный пароль', '2026-09-07 19:49:09.665377', 'ru-RU', 'Europe/Moscow', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/150.0.0.0 YaBrowser/26.8.0.0 Safari/537.36', 'web', '672f46a44bc779eb1fe3', '08f0f476f354b568fc6e89d88490a99c', 'e10834f3805cc05b8ade94a2130706bc');
INSERT INTO public.user_auth_logins OVERRIDING SYSTEM VALUE VALUES (473, 7, NULL, '172.18.*.*', 'password', 'main', 'fail', 'Неправильный пароль', '2026-09-07 19:49:10.170982', 'ru-RU', 'Europe/Moscow', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/150.0.0.0 YaBrowser/26.8.0.0 Safari/537.36', 'web', '8f2e2a1461d32aa68f37', 'e5b8b71d89925e9c4b96a243218e46f2', 'a0793247e349ac0d1d24091c09830592');
INSERT INTO public.user_auth_logins OVERRIDING SYSTEM VALUE VALUES (474, 7, NULL, '172.18.*.*', 'password', 'main', 'fail', 'Неправильный пароль', '2026-09-07 19:49:10.652518', 'ru-RU', 'Europe/Moscow', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/150.0.0.0 YaBrowser/26.8.0.0 Safari/537.36', 'web', '33879fd38848e5ab2b3f', '3285f9bf72ee40cc68343741b8f1e7ea', '00c57cf0020dd1a6295f03c484617249');
INSERT INTO public.user_auth_logins OVERRIDING SYSTEM VALUE VALUES (475, 7, NULL, '172.18.*.*', 'password', 'main', 'fail', 'Неправильный пароль', '2026-09-07 19:49:23.611879', 'ru-RU', 'Europe/Moscow', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/150.0.0.0 YaBrowser/26.8.0.0 Safari/537.36', 'web', 'c6d92445ea4ae3676792', '104774c106a29527f767b448943a7120', '23c80b36e93e962c5fa23ef16159c1d5');
INSERT INTO public.user_auth_logins OVERRIDING SYSTEM VALUE VALUES (476, 1, 49, '172.18.*.*', 'password', 'main', 'success', NULL, '2026-09-07 21:07:27.949386', 'ru', 'Europe/Moscow', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/150.0.0.0 YaBrowser/26.8.0.0 Safari/537.36', 'web', 'f40ffe9309e9a3d9081e', '05c926bcde8836dfa4327123036a4d25', '8fa46da6f674659e916b0e6ef3987874');
INSERT INTO public.user_auth_logins OVERRIDING SYSTEM VALUE VALUES (477, 1, 64, '172.18.*.*', 'password', 'main', 'success', NULL, '2026-09-07 21:08:11.541577', NULL, NULL, 'PostmanRuntime/2.5.0', 'web', 'cf6a369e7302f745f5a6', 'a955144a054f99b77ef111eb2c2f232a', 'ce8449c919f9c5ff666586ace356eb9e');
INSERT INTO public.user_auth_logins OVERRIDING SYSTEM VALUE VALUES (478, 7, NULL, '172.18.*.*', 'password', 'main', 'fail', 'Неправильный пароль', '2026-09-07 21:48:22.928186', 'ru-RU', 'Europe/Moscow', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/150.0.0.0 YaBrowser/26.8.0.0 Safari/537.36', 'web', '0ba65977e4ac987d894a', '81615d34c12329b0353aa80a96a4d9eb', '7ad1f8c4fec19f57404adc6d2915bdf6');
INSERT INTO public.user_auth_logins OVERRIDING SYSTEM VALUE VALUES (479, 7, 63, '172.18.*.*', 'password', 'main', 'success', NULL, '2026-09-07 21:48:52.775843', 'ru-RU', 'Europe/Moscow', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/150.0.0.0 YaBrowser/26.8.0.0 Safari/537.36', 'web', 'd61e53f1c233bf3a7e56', '42e3bce430ae3b3398e89497e8740c2f', '53dedc346661587137bde3c369b3b65f');
INSERT INTO public.user_auth_logins OVERRIDING SYSTEM VALUE VALUES (480, 1, 49, '172.18.*.*', 'password', 'main', 'success', NULL, '2026-09-08 00:46:26.444529', 'ru', 'Europe/Moscow', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/150.0.0.0 YaBrowser/26.8.0.0 Safari/537.36', 'web', '45e2ed8b7d35ab48c51e', 'c516c730abcab34c659dc383c9d4c3c2', '52f02231de58a799d44efaef3d7f0539');
INSERT INTO public.user_auth_logins OVERRIDING SYSTEM VALUE VALUES (481, 1, 49, '172.18.*.*', 'password', 'main', 'success', NULL, '2026-09-09 13:47:30.601577', 'ru', 'Europe/Moscow', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/150.0.0.0 YaBrowser/26.8.0.0 Safari/537.36', 'web', '3f9dd29556739ac76384', '215d3f99db8313c8b56f61bac4f77f1e', 'cdbe5f9da92e27d5fb7d95e0d7112385');
INSERT INTO public.user_auth_logins OVERRIDING SYSTEM VALUE VALUES (482, 1, 49, '172.18.*.*', 'password', 'main', 'success', NULL, '2026-09-09 13:56:34.173704', 'ru', 'Europe/Moscow', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/150.0.0.0 YaBrowser/26.8.0.0 Safari/537.36', 'web', '41ea96895333bc36f75e', '4a11aa506707fa7082856c2e75102586', '3122964b1a61459a62377f43dfa54485');
INSERT INTO public.user_auth_logins OVERRIDING SYSTEM VALUE VALUES (483, 1, 49, '172.18.*.*', 'password', 'main', 'success', NULL, '2026-09-09 14:12:13.810871', 'ru', 'Europe/Moscow', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/150.0.0.0 YaBrowser/26.8.0.0 Safari/537.36', 'web', 'e5a80414b6bdc54a26ab', '1c0f6873c22098e2ac4b5104f8f17e43', 'f2f9d09c17e9a8f7f13bde5fb1431d70');
INSERT INTO public.user_auth_logins OVERRIDING SYSTEM VALUE VALUES (484, 1, 49, '172.18.*.*', 'password', 'main', 'success', NULL, '2026-09-09 14:34:52.77999', 'ru', 'Europe/Moscow', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/150.0.0.0 YaBrowser/26.8.0.0 Safari/537.36', 'web', '4570db3495f1f8455d5f', '79bacb8cf346a0db14bce30c9b911276', '5b3d435e9a1265bfdbb2660ae079d3db');
INSERT INTO public.user_auth_logins OVERRIDING SYSTEM VALUE VALUES (485, 1, 49, '172.18.*.*', 'password', 'main', 'success', NULL, '2026-09-09 14:41:13.566525', 'ru', 'Europe/Moscow', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/150.0.0.0 YaBrowser/26.8.0.0 Safari/537.36', 'web', 'cdc36586436eb277261a', 'b2b16ba3addc257267e6ad89f9237b67', '2794e5a88e98ab711adc1a55d54ad79b');
INSERT INTO public.user_auth_logins OVERRIDING SYSTEM VALUE VALUES (486, 1, 49, '172.18.*.*', 'password', 'main', 'success', NULL, '2026-09-09 14:47:18.251529', 'ru', 'Europe/Moscow', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/150.0.0.0 YaBrowser/26.8.0.0 Safari/537.36', 'web', '6abbfdc046ca6d4e2775', 'a9eeb30660ce957f1f4b6edb20f82a86', '7996a5887ca3e536a70abe8f7e657e7d');
INSERT INTO public.user_auth_logins OVERRIDING SYSTEM VALUE VALUES (487, 1, 49, '172.18.*.*', 'password', 'main', 'success', NULL, '2026-09-09 15:19:57.597913', 'ru', 'Europe/Moscow', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/150.0.0.0 YaBrowser/26.8.0.0 Safari/537.36', 'web', 'ef754b0d3fcff4433fb0', '9b9f890c90c8e79fd7b25782d9a3be91', '6348e9109710683a151eef8ddbfe1de4');
INSERT INTO public.user_auth_logins OVERRIDING SYSTEM VALUE VALUES (488, 7, 63, '172.18.*.*', 'password', 'main', 'success', NULL, '2026-09-09 15:20:52.375762', 'ru-RU', 'Europe/Moscow', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/150.0.0.0 YaBrowser/26.8.0.0 Safari/537.36', 'web', '6513953565662a438220', '9859fdfb8c61951dc51ef18dd9dfd634', '81d4ed965d024ba25554c9c7de062b2c');
INSERT INTO public.user_auth_logins OVERRIDING SYSTEM VALUE VALUES (489, 1, 49, '172.18.*.*', 'password', 'main', 'success', NULL, '2026-09-09 16:00:24.496035', 'ru', 'Europe/Moscow', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/150.0.0.0 YaBrowser/26.8.0.0 Safari/537.36', 'web', '175cd57f9717d932cbf9', '3f1e6fdc2f9b5c7df174468aa251d3e5', 'f295f6f783a6ae8a9f57c3be46afa04d');
INSERT INTO public.user_auth_logins OVERRIDING SYSTEM VALUE VALUES (490, 7, 63, '172.18.*.*', 'password', 'main', 'success', NULL, '2026-09-09 16:01:37.843386', 'ru-RU', 'Europe/Moscow', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/150.0.0.0 YaBrowser/26.8.0.0 Safari/537.36', 'web', '55f6c7b1c98bb4303d4f', '65082e2b925ff3b119c941a0440c0562', 'c354aa1c2ac193786358bbb4dfb2dc02');
INSERT INTO public.user_auth_logins OVERRIDING SYSTEM VALUE VALUES (491, 1, 49, '172.18.*.*', 'password', 'main', 'success', NULL, '2026-09-09 16:51:06.721101', 'ru', 'Europe/Moscow', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/150.0.0.0 YaBrowser/26.8.0.0 Safari/537.36', 'web', '38bbfd022d2fed5e2b84', 'f74d710e22165a9b26711f9e3cd88542', 'b92667d829735c038e470a4f23c0ad55');
INSERT INTO public.user_auth_logins OVERRIDING SYSTEM VALUE VALUES (492, 1, 49, '172.18.*.*', 'password', 'main', 'success', NULL, '2026-09-09 17:41:29.844038', 'ru', 'Europe/Moscow', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/150.0.0.0 YaBrowser/26.8.0.0 Safari/537.36', 'web', '5c3d3c44f23a7c1bae97', '474e8b15ef196a669c7b96b68e10482e', 'b8be2c3ddfa7eff3d4a8e596967ac17a');
INSERT INTO public.user_auth_logins OVERRIDING SYSTEM VALUE VALUES (493, 7, 63, '172.18.*.*', 'password', 'main', 'success', NULL, '2026-09-09 17:43:22.733557', 'ru-RU', 'Europe/Moscow', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/150.0.0.0 YaBrowser/26.8.0.0 Safari/537.36', 'web', '1a56896d4aee5c413a5d', '04bac1db21f8c0bc30bd5c3d11f4a542', 'c9242340d927efc565202ac990d995e7');
INSERT INTO public.user_auth_logins OVERRIDING SYSTEM VALUE VALUES (494, 1, NULL, '172.18.*.*', 'password', 'main', 'secondary_required', NULL, '2026-09-10 11:23:26.188011', 'ru', 'Europe/Moscow', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/150.0.0.0 YaBrowser/26.8.0.0 Safari/537.36', 'web', '68c52746ff6e86331aa8', 'eb355911136c49168079ab7dd8bd7ee7', '1805501fd7e9ad150c0272abcc23d54d');
INSERT INTO public.user_auth_logins OVERRIDING SYSTEM VALUE VALUES (495, 1, 49, '172.18.*.*', 'secondary_password', 'main', 'success', NULL, '2026-09-10 11:23:40.948057', 'ru', 'Europe/Moscow', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/150.0.0.0 YaBrowser/26.8.0.0 Safari/537.36', 'web', 'd84581e4a6a4e8295524', '54d783b280fcc4f5db48bb9c7dcda6ea', '4ed573e0f88ba8a99ab2a9bb7847415a');
INSERT INTO public.user_auth_logins OVERRIDING SYSTEM VALUE VALUES (496, 1, 49, '172.18.*.*', 'password', 'main', 'success', NULL, '2026-09-10 11:29:58.393388', 'ru', 'Europe/Moscow', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/150.0.0.0 YaBrowser/26.8.0.0 Safari/537.36', 'web', '038fbb98d016edbca039', '629d59591df65d2e012638b1051fae37', 'c7096e73026d886ae90561f6a87e4a07');
INSERT INTO public.user_auth_logins OVERRIDING SYSTEM VALUE VALUES (497, 1, 49, '172.18.*.*', 'password', 'main', 'success', NULL, '2026-09-10 12:31:22.585205', 'ru', 'Europe/Moscow', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/150.0.0.0 YaBrowser/26.8.0.0 Safari/537.36', 'web', 'd769f166558f1de679a5', '06001d56f457f336d2e968abcdb783c9', '3d48884618546ef7bc96cefd813ef537');
INSERT INTO public.user_auth_logins OVERRIDING SYSTEM VALUE VALUES (498, 1, 65, '172.18.*.*', 'device_code', 'main', 'success', NULL, '2026-09-10 12:45:30.437844', NULL, NULL, 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/150.0.0.0 YaBrowser/26.8.0.0 Safari/537.36', 'web', '2f10cfc268e3662a82b2', 'dc537b303da845ddad4ef76f6f417b65', '8b03ec1717e196e3c25d32bf43611c27');
INSERT INTO public.user_auth_logins OVERRIDING SYSTEM VALUE VALUES (499, 1, 66, '172.18.*.*', 'device_code', 'main', 'success', NULL, '2026-09-10 12:47:18.500264', NULL, NULL, 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/150.0.0.0 YaBrowser/26.8.0.0 Safari/537.36', 'web', '544d0f87e15eb9a59a82', '71bb95cd55c59b4f4bf62ccdf43c1ef5', '8b80f5a4a503c663023b891f331c7049');
INSERT INTO public.user_auth_logins OVERRIDING SYSTEM VALUE VALUES (501, 1, 49, '172.18.*.*', 'password', 'main', 'success', NULL, '2026-09-10 12:53:17.286019', 'ru', 'Europe/Moscow', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/150.0.0.0 YaBrowser/26.8.0.0 Safari/537.36', 'web', '04ef4685c822dd33a876', '4e4bcc84c3d089418eb6b2246d9e73ac', '880c766dfc7d577c18d7185a8ac1ecc8');
INSERT INTO public.user_auth_logins OVERRIDING SYSTEM VALUE VALUES (502, 1, 67, '172.18.*.*', 'device_code', 'main', 'success', NULL, '2026-09-10 12:54:18.931882', NULL, NULL, 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/150.0.0.0 YaBrowser/26.8.0.0 Safari/537.36', 'web', 'bbc50c6358bd771e885d', 'c2b8fc42322354976edcbeddc864ff30', '88cf31471330439fdb960b6821bc8e6f');
INSERT INTO public.user_auth_logins OVERRIDING SYSTEM VALUE VALUES (503, 1, 68, '172.18.*.*', 'device_code', 'main', 'success', NULL, '2026-09-10 12:59:35.110447', NULL, NULL, 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/150.0.0.0 YaBrowser/26.8.0.0 Safari/537.36', 'web', '19c054d3894f113b80af', '184a404932d6b428c6324625277d203b', '43b311eecaffd8bfe00ad72cecfbd43a');
INSERT INTO public.user_auth_logins OVERRIDING SYSTEM VALUE VALUES (504, 1, 49, '172.18.*.*', 'password', 'main', 'success', NULL, '2026-09-10 15:09:56.576201', 'ru', 'Europe/Moscow', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/150.0.0.0 YaBrowser/26.8.0.0 Safari/537.36', 'web', 'eb958f9ccca4b6073319', 'b10fa73b46032f51957374d466d1ff5b', '2a732d963721b9cec7e9b30db008fd66');
INSERT INTO public.user_auth_logins OVERRIDING SYSTEM VALUE VALUES (505, 1, 69, '172.18.*.*', 'device_code', 'main', 'success', NULL, '2026-09-10 15:56:15.389585', NULL, NULL, 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/150.0.0.0 YaBrowser/26.8.0.0 Safari/537.36', 'web', '73c25724205f6c0a9941', '3108a619c9a0079944ef8f64ce493f3a', '75bf4f49309541bef70592205eca8c4c');
INSERT INTO public.user_auth_logins OVERRIDING SYSTEM VALUE VALUES (506, 1, 49, '172.18.*.*', 'seed_phrase', 'main', 'success', NULL, '2026-09-10 16:00:52.882392', 'ru', 'Europe/Moscow', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/150.0.0.0 YaBrowser/26.8.0.0 Safari/537.36', 'web', '37be5275a2b4cb5dede1', '97d457b5a54b190ed9cb7605e79aa851', '0d6b68b7a9fb5ddd8487fd27aa3a6d74');
INSERT INTO public.user_auth_logins OVERRIDING SYSTEM VALUE VALUES (507, 1, 49, '172.18.*.*', 'seed_phrase', 'main', 'success', NULL, '2026-09-10 16:08:10.777326', 'ru', 'Europe/Moscow', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/150.0.0.0 YaBrowser/26.8.0.0 Safari/537.36', 'web', 'bcc878d4a2db82476838', 'b84ee0987e755772e040719317727e73', 'c25d43be78cf5343dfb850068a55d506');
INSERT INTO public.user_auth_logins OVERRIDING SYSTEM VALUE VALUES (508, 1, 49, '172.18.*.*', 'password', 'main', 'success', NULL, '2026-09-10 16:08:20.239815', 'ru', 'Europe/Moscow', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/150.0.0.0 YaBrowser/26.8.0.0 Safari/537.36', 'web', 'e2f2a47708b083f6c8c8', '5e34653808e549c5035b94256c05b0e9', '8b85244c8eede31312d47c92590f11a6');
INSERT INTO public.user_auth_logins OVERRIDING SYSTEM VALUE VALUES (509, 1, NULL, '172.18.*.*', 'password', 'main', 'secondary_required', NULL, '2026-09-10 16:22:06.674561', 'ru', 'Europe/Moscow', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/150.0.0.0 YaBrowser/26.8.0.0 Safari/537.36', 'web', '3e572b70d73948ad8ce3', '11625b9671ff97e9f8a1f1d86a142049', 'f9783dae8a060c2d8aaedad47296bf58');
INSERT INTO public.user_auth_logins OVERRIDING SYSTEM VALUE VALUES (510, 1, 49, '172.18.*.*', 'secondary_password', 'main', 'success', NULL, '2026-09-10 16:22:27.554827', 'ru', 'Europe/Moscow', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/150.0.0.0 YaBrowser/26.8.0.0 Safari/537.36', 'web', '660e6a3d3336b6b9e72d', '6ea2c7825a8410a60d5b0c9365ccc073', '171010f27570d15a7a49e2cacff77ab8');
INSERT INTO public.user_auth_logins OVERRIDING SYSTEM VALUE VALUES (511, 1, 49, '172.18.*.*', 'seed_phrase', 'main', 'success', NULL, '2026-09-10 16:32:12.687753', 'ru', 'Europe/Moscow', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/150.0.0.0 YaBrowser/26.8.0.0 Safari/537.36', 'web', '60970c9b728bc5be5de7', 'cef23eadde061a205c538bd009333479', '613c62224f200d803d249ba42c763d3d');
INSERT INTO public.user_auth_logins OVERRIDING SYSTEM VALUE VALUES (512, 1, 49, '172.18.*.*', 'password', 'main', 'success', NULL, '2026-09-10 16:32:34.326551', 'ru', 'Europe/Moscow', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/150.0.0.0 YaBrowser/26.8.0.0 Safari/537.36', 'web', 'd3865fee1c79fc372e4e', '8af2e014be3875c741ab740c67fe8c80', '6860b035bddaf8ab75fdb8726d1f861d');
INSERT INTO public.user_auth_logins OVERRIDING SYSTEM VALUE VALUES (513, 1, 49, '172.18.*.*', 'password', 'main', 'success', NULL, '2026-09-11 11:51:45.186072', 'ru', 'Europe/Moscow', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/150.0.0.0 YaBrowser/26.8.0.0 Safari/537.36', 'web', '1207d30185e0c1895d09', 'b91043c87d838a1766f9f7e38a0e3021', '678bf1739eec30e91d44def34967d830');
INSERT INTO public.user_auth_logins OVERRIDING SYSTEM VALUE VALUES (514, 1, NULL, '172.18.*.*', 'password', 'main', 'secondary_required', NULL, '2026-09-11 12:28:08.886488', 'ru-RU', 'Europe/Moscow', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/152.0.0.0 Safari/537.36', 'web', 'ee4db89bbf628a79b355', '3ac94e37157e1a6793981c9e342b3825', '9dc5fdf1e55a4a9876abab763a9f89fd');
INSERT INTO public.user_auth_logins OVERRIDING SYSTEM VALUE VALUES (515, 1, NULL, '172.18.*.*', 'password', 'main', 'secondary_required', NULL, '2026-09-11 12:28:22.661376', 'ru-RU', 'Europe/Moscow', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/152.0.0.0 Safari/537.36', 'web', '0aadfa518d98c319316b', 'e151f851c1752586cbc601d9db36c25e', '366ce1aabe43ccf97ad80e4bc6e6385c');
INSERT INTO public.user_auth_logins OVERRIDING SYSTEM VALUE VALUES (516, 1, NULL, '172.18.*.*', 'password', 'main', 'secondary_required', NULL, '2026-09-11 12:32:25.248101', 'ru-RU', 'Europe/Moscow', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/152.0.0.0 Safari/537.36', 'web', 'c0a20105ddd231736d89', 'd990080549b6b47253849a89367859af', '4fbf0f5126ea29c5269a7a0b6a77d7b3');
INSERT INTO public.user_auth_logins OVERRIDING SYSTEM VALUE VALUES (517, 1, NULL, '172.18.*.*', 'password', 'main', 'secondary_required', NULL, '2026-09-11 12:32:35.594011', 'ru-RU', 'Europe/Moscow', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/152.0.0.0 Safari/537.36', 'web', '5604ac2f73ae7d6372b6', 'b466666d90b54a7e65b171c8f18735da', '14e5272c8e777d63a31c1f140ca4c0f3');
INSERT INTO public.user_auth_logins OVERRIDING SYSTEM VALUE VALUES (518, 1, NULL, '172.18.*.*', 'password', 'main', 'secondary_required', NULL, '2026-09-11 12:35:34.766361', 'ru-RU', 'Europe/Moscow', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/152.0.0.0 Safari/537.36', 'web', 'd169f269eb40a618d182', '242cfc324ac359d962ade1a65a88707a', 'c189217f307670aa02f507c698e7e002');
INSERT INTO public.user_auth_logins OVERRIDING SYSTEM VALUE VALUES (519, 1, NULL, '172.18.*.*', 'password', 'main', 'secondary_required', NULL, '2026-09-11 12:37:49.903921', 'ru-RU', 'Europe/Moscow', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/152.0.0.0 Safari/537.36', 'web', 'd1d853d5fbfada843caa', '0aac572496e89f9cd9def56efa565642', 'f0b2a5f1b242446a2e4a9762df479e39');
INSERT INTO public.user_auth_logins OVERRIDING SYSTEM VALUE VALUES (520, 1, NULL, '172.18.*.*', 'password', 'main', 'secondary_required', NULL, '2026-09-11 12:40:08.528264', 'ru-RU', 'Europe/Moscow', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/152.0.0.0 Safari/537.36', 'web', '3fedd9e9f231704e4509', 'f29841789b778f2c40fad84e10a3f02a', '79499659b9862643990cea2d41687533');
INSERT INTO public.user_auth_logins OVERRIDING SYSTEM VALUE VALUES (521, 1, 62, '172.18.*.*', 'totp', 'main', 'success', NULL, '2026-09-11 12:40:29.588857', 'ru-RU', 'Europe/Moscow', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/152.0.0.0 Safari/537.36', 'web', '7ca6f9707cfff760b05e', '8b22e1b5ef223641ce5dbf5a4c62b694', '1a9ea27cd1e9947ac4c1d63dc7600c94');
INSERT INTO public.user_auth_logins OVERRIDING SYSTEM VALUE VALUES (522, 1, NULL, '172.18.*.*', 'password', 'main', 'secondary_required', NULL, '2026-09-11 12:42:02.298912', 'ru-RU', 'Europe/Moscow', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/152.0.0.0 Safari/537.36', 'web', '5d9890c8224304869616', '4e29a4f86766337baafafe6d385af10a', '07e87c49e896ec2953c6cdd37d96c68c');
INSERT INTO public.user_auth_logins OVERRIDING SYSTEM VALUE VALUES (523, 1, NULL, '172.18.*.*', 'password', 'main', 'fail', 'Неправильный пароль', '2026-09-11 12:43:06.657154', 'ru-RU', 'Europe/Moscow', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/152.0.0.0 Safari/537.36', 'web', '829594e55e3eb3081f9f', '34564d58c5a90e3697b9e68caa15af58', 'fc63bba23e9540bf253731c67e98230e');
INSERT INTO public.user_auth_logins OVERRIDING SYSTEM VALUE VALUES (524, 1, NULL, '172.18.*.*', 'password', 'main', 'secondary_required', NULL, '2026-09-11 12:51:04.267387', 'ru-RU', 'Europe/Moscow', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/152.0.0.0 Safari/537.36', 'web', '716463d7176e38e59988', '9eef00cffc2c8902228b9a532cac75ec', '8071bb6f3a735ce545ca60105777c6a0');
INSERT INTO public.user_auth_logins OVERRIDING SYSTEM VALUE VALUES (525, 1, 62, '172.18.*.*', 'backup_code', 'main', 'success', NULL, '2026-09-11 12:51:06.124878', 'ru-RU', 'Europe/Moscow', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/152.0.0.0 Safari/537.36', 'web', 'ae97003c45fce9d5b97e', '21021dd2a6d2649f2036317a59a8f63c', '244140ae083c3ae9d2baf0559949e174');
INSERT INTO public.user_auth_logins OVERRIDING SYSTEM VALUE VALUES (526, 1, 62, '172.18.*.*', 'seed_phrase', 'main', 'success', NULL, '2026-09-11 12:54:23.134479', 'ru-RU', 'Europe/Moscow', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/152.0.0.0 Safari/537.36', 'web', 'e366b34c1eb5bff25777', 'c803be7a01c976f4c3219313b5808d3c', '1ab7d659af553771793802e44a5e7359');
INSERT INTO public.user_auth_logins OVERRIDING SYSTEM VALUE VALUES (527, 1, NULL, '172.18.*.*', 'password', 'main', 'secondary_required', NULL, '2026-09-11 13:15:59.14541', 'ru-RU', 'Europe/Moscow', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/152.0.0.0 Safari/537.36', 'web', '5b8dcfc99840f7020ed4', '583c3d3b18561c8f52c350aa2fce6098', '9b764b2b2946868ae75d49dd25ef71a9');
INSERT INTO public.user_auth_logins OVERRIDING SYSTEM VALUE VALUES (528, 1, 62, '172.18.*.*', 'seed_phrase', 'main', 'success', NULL, '2026-09-11 13:16:02.402954', 'ru-RU', 'Europe/Moscow', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/152.0.0.0 Safari/537.36', 'web', '167f6b5f3550ad8f1c2d', 'e0f175ddcfac22270fbe04b44fef9351', '9986e30de170f711c3b4fd2a10a71d80');
INSERT INTO public.user_auth_logins OVERRIDING SYSTEM VALUE VALUES (530, 1, 70, '172.18.*.*', 'device_code', 'main', 'success', NULL, '2026-09-11 13:31:12.923483', NULL, NULL, 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/152.0.0.0 Safari/537.36', 'web', 'adc987660c28d0d11be4', '1542c58731e0f99d9e76abca1c6f3f94', '47d5600a45ca915bcf7c561e68d39d3a');
INSERT INTO public.user_auth_logins OVERRIDING SYSTEM VALUE VALUES (532, 1, 49, '172.18.*.*', 'seed_phrase', 'main', 'success', NULL, '2026-09-11 13:32:29.830659', 'ru', 'Europe/Moscow', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/150.0.0.0 YaBrowser/26.8.0.0 Safari/537.36', 'web', '6bc0efa1f935330e855f', '4ca398f854c8b344fc3d8e356dda36d7', '678a512137215cd40e68a0410a6f3387');
INSERT INTO public.user_auth_logins OVERRIDING SYSTEM VALUE VALUES (533, 1, 62, '172.18.*.*', 'seed_phrase', 'main', 'success', NULL, '2026-09-11 13:32:33.58058', 'ru-RU', 'Europe/Moscow', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/152.0.0.0 Safari/537.36', 'web', 'bb0e985fc5c506d5be6e', '7d6ae282e430ab76fae8b68f032cd996', '06a98adde5eb28e9f6db2ea99fa7cf14');
INSERT INTO public.user_auth_logins OVERRIDING SYSTEM VALUE VALUES (534, 1, 49, '172.18.*.*', 'seed_phrase', 'main', 'success', NULL, '2026-09-11 13:50:02.762891', 'ru', 'Europe/Moscow', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/150.0.0.0 YaBrowser/26.8.0.0 Safari/537.36', 'web', '181417f5897a837a9153', '79d72e4aa7225ef04370559dbc1ff019', 'e29a85f520c5da6b5277b5fa2949411a');
INSERT INTO public.user_auth_logins OVERRIDING SYSTEM VALUE VALUES (535, 1, 62, '172.18.*.*', 'seed_phrase', 'main', 'success', NULL, '2026-09-11 14:00:53.819122', 'ru-RU', 'Europe/Moscow', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/152.0.0.0 Safari/537.36', 'web', 'e97e1992f1098b9e1b68', '970e69203d23a4555c25d8b4a7dd545a', '9da1e1214bf0f284a07f876d1d9645fd');
INSERT INTO public.user_auth_logins OVERRIDING SYSTEM VALUE VALUES (536, 1, 71, '172.18.*.*', 'device_code', 'main', 'success', NULL, '2026-09-11 14:01:14.89313', NULL, NULL, 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/150.0.0.0 YaBrowser/26.8.0.0 Safari/537.36', 'web', '8543b7fcda2636c386c1', 'b9f358e31658ef5515b760d5d364102c', '85be8d5a6da5e414f83742cea50c9a20');
INSERT INTO public.user_auth_logins OVERRIDING SYSTEM VALUE VALUES (537, 1, 49, '172.18.*.*', 'password', 'main', 'success', NULL, '2026-09-11 17:38:37.156217', 'ru', 'Europe/Moscow', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/150.0.0.0 YaBrowser/26.8.0.0 Safari/537.36', 'web', '23c0618d2d664264b55d', 'c4469941f9b76f36b40349700b7f912e', '177e7d7172e206d1de37f01fc2975dff');
INSERT INTO public.user_auth_logins OVERRIDING SYSTEM VALUE VALUES (538, 1, 72, '172.18.*.*', 'device_code', 'main', 'success', NULL, '2026-09-11 17:48:24.057216', NULL, NULL, 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/150.0.0.0 YaBrowser/26.8.0.0 Safari/537.36', 'web', 'aa007e51a7ff6892442a', 'b4d5158d6a20ff519693b111d78b99f3', '1a1626dac0849aac88f29bf69e0d22fa');
INSERT INTO public.user_auth_logins OVERRIDING SYSTEM VALUE VALUES (540, 1, 49, '172.18.*.*', 'password', 'main', 'success', NULL, '2026-09-11 17:59:45.742455', 'ru', 'Europe/Moscow', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/150.0.0.0 YaBrowser/26.8.0.0 Safari/537.36', 'web', 'f169e3506a1b3bbf9744', 'befd50b07d7fa9d93232d133d84b3daa', 'd4c9ee975ccc950ef82e9df695a93383');
INSERT INTO public.user_auth_logins OVERRIDING SYSTEM VALUE VALUES (541, 1, 73, '172.18.*.*', 'device_code', 'main', 'success', NULL, '2026-09-11 18:00:20.381655', NULL, NULL, 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/152.0.0.0 Safari/537.36', 'web', 'd1155e3e3a7cb87c8ba6', 'f609faaff7707e357ab6f305133297d7', '3e579a32c16cd08dfdcc122185b8c41a');
INSERT INTO public.user_auth_logins OVERRIDING SYSTEM VALUE VALUES (543, 1, 49, '172.18.*.*', 'password', 'main', 'success', NULL, '2026-09-11 18:01:46.428684', 'ru', 'Europe/Moscow', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/150.0.0.0 YaBrowser/26.8.0.0 Safari/537.36', 'web', 'b7035af47d83e1a7bb9b', '5fa6d54a82f157cd6d08158c887f696e', '5a9d4ed60405b5c809a42825018ccb34');
INSERT INTO public.user_auth_logins OVERRIDING SYSTEM VALUE VALUES (544, 1, 74, '172.18.*.*', 'device_code', 'main', 'success', NULL, '2026-09-11 18:04:04.505919', NULL, NULL, 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/152.0.0.0 Safari/537.36', 'web', 'c1ebe034e2fd17152006', 'c7b4aeecdaff86fdfcc8a4085f4d0f29', '3a5b4a7c9aa1558d8b9f85882955d4d7');
INSERT INTO public.user_auth_logins OVERRIDING SYSTEM VALUE VALUES (545, 1, 62, '172.18.*.*', 'device_code', 'main', 'success', NULL, '2026-09-11 18:06:59.41082', 'ru-RU', 'Europe/Moscow', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/152.0.0.0 Safari/537.36', 'web', '78534c635d97f32e448c', '278ea6a1527adc9a448e3710508b0efd', 'ca6fc815d6075b1f7618657f83da1667');
INSERT INTO public.user_auth_logins OVERRIDING SYSTEM VALUE VALUES (546, 1, 62, '172.18.*.*', 'device_code', 'main', 'success', NULL, '2026-09-11 18:12:35.614137', 'ru-RU', 'Europe/Moscow', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/152.0.0.0 Safari/537.36', 'web', '15c799d879239217b282', 'f358f7a5afe35661ee3a3dfda1a6c2ef', '6e7d63b7d9934404ce5b2dce59adac14');
INSERT INTO public.user_auth_logins OVERRIDING SYSTEM VALUE VALUES (547, 1, NULL, '172.18.*.*', 'password', 'main', 'secondary_required', NULL, '2026-09-11 18:13:45.483773', 'ru-RU', 'Europe/Moscow', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/152.0.0.0 Safari/537.36', 'web', 'cae24cedb24d835749c2', '49c9bfece3938d5c60b867c4e8a89a14', 'a9f333a419446e56fc05777e13aee523');
INSERT INTO public.user_auth_logins OVERRIDING SYSTEM VALUE VALUES (549, 1, 62, '172.18.*.*', 'secondary_password', 'main', 'success', NULL, '2026-09-11 18:14:17.506722', 'ru-RU', 'Europe/Moscow', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/152.0.0.0 Safari/537.36', 'web', '74cc4a072f857345a9dc', 'c9c26489476a99257b083f0f4d925e3c', 'defa411a41b801a63fff664aae8e69cb');
INSERT INTO public.user_auth_logins OVERRIDING SYSTEM VALUE VALUES (550, 1, 62, '172.18.*.*', 'seed_phrase', 'main', 'success', NULL, '2026-09-11 18:16:39.120491', 'ru-RU', 'Europe/Moscow', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/152.0.0.0 Safari/537.36', 'web', '20a06d0afd3061651273', '976efc3425c9f0d45f737de4532da01f', '93942a378a08e5c61004f2b89f7cb130');
INSERT INTO public.user_auth_logins OVERRIDING SYSTEM VALUE VALUES (551, 1, 62, '172.18.*.*', 'password', 'main', 'success', NULL, '2026-09-11 18:27:07.634631', 'ru-RU', 'Europe/Moscow', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/152.0.0.0 Safari/537.36', 'web', 'ae9df6d9738adff7422b', '5f092f38cf108c482acebfb385a2e0d0', 'ce95a6392d5b236d0b3db28cfc705f0d');
INSERT INTO public.user_auth_logins OVERRIDING SYSTEM VALUE VALUES (552, 1, NULL, '172.18.*.*', 'password', 'main', 'secondary_required', NULL, '2026-09-11 18:27:27.092726', 'ru-RU', 'Europe/Moscow', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/152.0.0.0 Safari/537.36', 'web', 'b23008dc19a91f097f7e', 'd1f314d163fbaa0dd68d0f5c33d48406', '47e819fff075394fff23b158a6093cb7');
INSERT INTO public.user_auth_logins OVERRIDING SYSTEM VALUE VALUES (553, 1, NULL, '172.18.*.*', 'password', 'main', 'secondary_required', NULL, '2026-09-11 18:27:47.472215', 'ru-RU', 'Europe/Moscow', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/152.0.0.0 Safari/537.36', 'web', '1113724279e32fbd5f69', 'feb24ae39ca37d93e38afef97d301ef5', '9d617108336934c53f8e2ddc4630ec24');
INSERT INTO public.user_auth_logins OVERRIDING SYSTEM VALUE VALUES (554, 1, NULL, '172.18.*.*', 'password', 'main', 'secondary_required', NULL, '2026-09-11 18:28:56.102684', 'ru-RU', 'Europe/Moscow', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/152.0.0.0 Safari/537.36', 'web', '8f217a476f8700006c0f', 'd33cd69194ac2f2a29b170ac22591843', '95b4d8971a421a63d6b65dc66b8b7318');
INSERT INTO public.user_auth_logins OVERRIDING SYSTEM VALUE VALUES (555, 1, NULL, '172.18.*.*', 'password', 'main', 'secondary_required', NULL, '2026-09-11 18:29:00.56882', 'ru-RU', 'Europe/Moscow', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/152.0.0.0 Safari/537.36', 'web', '4bb9e11e1855bb62eaeb', 'f81bbeb30291fdcd3b9839e660cdf83f', '7122717b98fe5ce54b9866d144de7fce');
INSERT INTO public.user_auth_logins OVERRIDING SYSTEM VALUE VALUES (556, 1, NULL, '172.18.*.*', 'password', 'main', 'secondary_required', NULL, '2026-09-11 18:37:08.184742', 'ru-RU', 'Europe/Moscow', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/152.0.0.0 Safari/537.36', 'web', 'fcd5c65af5bb6a9189af', '978089a26d8d1ebc3c13e0fe686294a3', '8f5070cb49bb13eca56dea42bdd99ebf');
INSERT INTO public.user_auth_logins OVERRIDING SYSTEM VALUE VALUES (557, 1, 62, '172.18.*.*', 'totp', 'main', 'success', NULL, '2026-09-11 18:38:11.921872', 'ru-RU', 'Europe/Moscow', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/152.0.0.0 Safari/537.36', 'web', '637db0e51ec146f5d47a', '638d4abdd79768dab4fd3cc695c4bae9', '8a20011dca5a2529396c52a5120617c5');
INSERT INTO public.user_auth_logins OVERRIDING SYSTEM VALUE VALUES (558, 1, 62, '172.18.*.*', 'password', 'main', 'success', NULL, '2026-09-11 18:41:44.904981', 'ru-RU', 'Europe/Moscow', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/152.0.0.0 Safari/537.36', 'web', '57db5ef00cf73d5cd194', '4ecd2dfd247151cfdab87dd14da287b4', '5f19744d61679d5d455451905e15b222');
INSERT INTO public.user_auth_logins OVERRIDING SYSTEM VALUE VALUES (559, 1, NULL, '172.18.*.*', 'password', 'main', 'secondary_required', NULL, '2026-09-11 18:42:02.166969', 'ru-RU', 'Europe/Moscow', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/152.0.0.0 Safari/537.36', 'web', '34111ce86dd7f7c4626c', '7f4ada8704952cebd5a52eba2e5d0de0', '222f31d68ef3744fa81c8f346fc7de10');
INSERT INTO public.user_auth_logins OVERRIDING SYSTEM VALUE VALUES (560, 1, 62, '172.18.*.*', 'backup_code', 'main', 'success', NULL, '2026-09-11 18:42:05.055466', 'ru-RU', 'Europe/Moscow', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/152.0.0.0 Safari/537.36', 'web', 'b8719c43f6db9bf195a9', '5fd8c79f5c6d62187d6070b1f80a6a02', '8788573da4a3f0c8e74cec2e352a651e');
INSERT INTO public.user_auth_logins OVERRIDING SYSTEM VALUE VALUES (561, 1, 49, '172.18.*.*', 'password', 'main', 'success', NULL, '2026-09-11 18:44:30.577378', 'ru', 'Europe/Moscow', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/150.0.0.0 YaBrowser/26.8.0.0 Safari/537.36', 'web', 'd5489669088116a73ba1', '817d623254fbf9b68948037407435162', 'bcfad4177e291c5f7b50ee4ba4539f82');
INSERT INTO public.user_auth_logins OVERRIDING SYSTEM VALUE VALUES (562, 1, 49, '172.18.*.*', 'password', 'main', 'success', NULL, '2026-09-12 13:21:06.925941', 'ru', 'Europe/Moscow', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/150.0.0.0 YaBrowser/26.8.0.0 Safari/537.36', 'web', '199f4f061c1c1193c57c', '73761be5e9b7b3812b0edc90c2adb62a', '28009cd60cf4f91191d915c79efd2dcf');
INSERT INTO public.user_auth_logins OVERRIDING SYSTEM VALUE VALUES (563, 7, NULL, '172.18.*.*', 'password', 'main', 'secondary_required', NULL, '2026-09-12 13:30:36.349012', 'ru-RU', 'Europe/Moscow', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/152.0.0.0 Safari/537.36', 'web', 'ab64766367783049f661', '566d2e3d473e0e506d6915d38101c3d3', 'afead659a82503d194cd9d8d4619f2e9');
INSERT INTO public.user_auth_logins OVERRIDING SYSTEM VALUE VALUES (564, 7, 75, '172.18.*.*', 'secondary_password', 'main', 'success', NULL, '2026-09-12 13:30:46.858405', 'ru-RU', 'Europe/Moscow', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/152.0.0.0 Safari/537.36', 'web', '6f33f86a458a830e8743', '7b61e844470fb40f48cc8b960a2cc35b', 'cc065598c60202256a1d473dc69ac605');
INSERT INTO public.user_auth_logins OVERRIDING SYSTEM VALUE VALUES (566, 1, 49, '172.18.*.*', 'password', 'main', 'success', NULL, '2026-09-12 14:06:54.890967', 'ru', 'Europe/Moscow', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/150.0.0.0 YaBrowser/26.8.0.0 Safari/537.36', 'web', '3b7ad577a93b16b38189', '71839b90cd4a0b21c82ff4bea9b7927e', '67851876a174eae100c2ed7c44c9b41a');
INSERT INTO public.user_auth_logins OVERRIDING SYSTEM VALUE VALUES (567, 1, 49, '172.18.*.*', 'password', 'main', 'success', NULL, '2026-09-12 14:47:55.906044', 'ru', 'Europe/Moscow', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/150.0.0.0 YaBrowser/26.8.0.0 Safari/537.36', 'web', '810df2f421bc72165386', '91140dc2cb101494f06588e4f051129a', '759c398c956312201a694aa3b8354612');
INSERT INTO public.user_auth_logins OVERRIDING SYSTEM VALUE VALUES (568, 1, 62, '172.18.*.*', 'password', 'main', 'success', NULL, '2026-09-12 14:50:08.120474', 'ru-RU', 'Europe/Moscow', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/152.0.0.0 Safari/537.36', 'web', '39efccf00b0d9b367e35', 'b8112e7123609971b0dba1c57471686e', '5260b5255e820082185206314cdbb1b8');
INSERT INTO public.user_auth_logins OVERRIDING SYSTEM VALUE VALUES (569, 7, 75, '172.18.*.*', 'password', 'main', 'success', NULL, '2026-09-12 14:50:24.733251', 'ru-RU', 'Europe/Moscow', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/152.0.0.0 Safari/537.36', 'web', '670a2338532476024281', '6973f21edbf1f9ef45a4b29e9ac04e15', '7a13e09dde569a850c8c475678fcc4ed');
INSERT INTO public.user_auth_logins OVERRIDING SYSTEM VALUE VALUES (570, 1, 49, '172.18.*.*', 'password', 'main', 'success', NULL, '2026-09-12 15:50:13.169893', 'ru', 'Europe/Moscow', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/150.0.0.0 YaBrowser/26.8.0.0 Safari/537.36', 'web', 'a8ea6b496213cf190cab', 'fe3841ead7aeba02df94f098fc9f9f68', '61f743e6e4a1d46136b87065c6cfe87f');
INSERT INTO public.user_auth_logins OVERRIDING SYSTEM VALUE VALUES (571, 1, 49, '172.18.*.*', 'password', 'main', 'success', NULL, '2026-09-12 15:58:37.910623', 'ru', 'Europe/Moscow', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/150.0.0.0 YaBrowser/26.8.0.0 Safari/537.36', 'web', '003ea3c915eef0a16e30', 'ea7e9a6b58258ed6ced4bdb87740a774', '11b667e5bb63e35ed54fc985be22b8eb');
INSERT INTO public.user_auth_logins OVERRIDING SYSTEM VALUE VALUES (572, 1, 49, '172.18.*.*', 'password', 'main', 'success', NULL, '2026-09-12 15:59:23.523943', 'ru', 'Europe/Moscow', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/150.0.0.0 YaBrowser/26.8.0.0 Safari/537.36', 'web', 'b81835069ed02111e4d6', 'da99597c199671d45276950840cb5df0', 'b7974ba9d96914980e9a65e7f9f819bf');
INSERT INTO public.user_auth_logins OVERRIDING SYSTEM VALUE VALUES (573, 1, 49, '172.18.*.*', 'password', 'main', 'success', NULL, '2026-09-12 16:23:42.340964', 'ru', 'Europe/Moscow', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/150.0.0.0 YaBrowser/26.8.0.0 Safari/537.36', 'web', '21a8799ea00ce17574d4', 'c41988d4ca5fecd2ebeb7a9ec6fd20d9', 'f32a1e3a26b1f982eab1d4a96ab750cf');


--
-- TOC entry 4173 (class 0 OID 34686)
-- Dependencies: 279
-- Data for Name: user_devices; Type: TABLE DATA; Schema: public; Owner: admin
--

INSERT INTO public.user_devices OVERRIDING SYSTEM VALUE VALUES (71, 1, NULL, 'Unknown / API', 'Unknown', 'API', 'test', false, '172.18.*.*', 1, '2026-09-11 14:01:14.89313+00', '2026-09-11 14:01:14.89313+00', true, '0c0ae385a3994812947a', 'e5871c7f10e499b5d93423cf36767967', 'aeb046043cd53005b967d34df7e5b9cd', true, NULL);
INSERT INTO public.user_devices OVERRIDING SYSTEM VALUE VALUES (66, 1, NULL, 'Unknown / API', 'Unknown', 'API', 'test', false, '172.18.*.*', 1, '2026-09-10 12:47:18.500264+00', '2026-09-10 12:47:18.500264+00', true, '7beb0df338e171aa05e2', '225b601535a93d3905429533aec0d8e4', '7894bd49f650bb9cd996ef75ac3aa9a0', true, NULL);
INSERT INTO public.user_devices OVERRIDING SYSTEM VALUE VALUES (65, 1, NULL, 'Unknown / API', 'Unknown', 'API', 'test', false, '172.18.*.*', 1, '2026-09-10 12:45:30.437844+00', '2026-09-10 12:45:30.437844+00', true, '900fb0347ddf2e725df8', '84e6abf596f44261f301372ff42cbf24', '55600e52efd4225b8efbb74a3d774c36', true, NULL);
INSERT INTO public.user_devices OVERRIDING SYSTEM VALUE VALUES (63, 7, '176a85cb1dda2f3bf1b3bf9a1335de4459640ad3a21e2e914d771c35422837c7', 'Windows / Yandex Browser', 'Windows', 'Yandex Browser', 'Desktop PC (x86)', false, '172.18.*.*', 8, '2026-09-07 14:50:33.137356+00', '2026-09-09 17:43:22.733557+00', false, '850a0fe8231b2da95222', 'b5242594d039415ade0bab5bb52f7606', '93b513764c333e390aee7bbfe9b74b1b', false, NULL);
INSERT INTO public.user_devices OVERRIDING SYSTEM VALUE VALUES (64, 1, NULL, 'Unknown / API', 'Unknown', 'API', 'test', false, '172.18.*.*', 1, '2026-09-07 21:08:11.541577+00', '2026-09-07 21:08:11.541577+00', true, '82ab10903d365d5064f5', '9455312dee86ee4c7bbfc8fa92034455', '2234f0635eaf6adbe1429fe15b921ec4', false, NULL);
INSERT INTO public.user_devices OVERRIDING SYSTEM VALUE VALUES (67, 1, NULL, 'Unknown / API', 'Unknown', 'API', 'test', false, '172.18.*.*', 1, '2026-09-10 12:54:18.931882+00', '2026-09-10 12:54:18.931882+00', true, '779350280e0462f49505', 'df7cf4c2faac75af35cfd641190b5960', '2bd83e47293962b6c97d9cbbabab7c9e', true, NULL);
INSERT INTO public.user_devices OVERRIDING SYSTEM VALUE VALUES (68, 1, NULL, 'Unknown / API', 'Unknown', 'API', 'test', false, '172.18.*.*', 1, '2026-09-10 12:59:35.110447+00', '2026-09-10 12:59:35.110447+00', true, '9b327b5d8acf70a2aea6', '12b60ebe11af5af1f5c93451194e21b8', 'c205eee6de6576279070aecd89d7b6c1', true, NULL);
INSERT INTO public.user_devices OVERRIDING SYSTEM VALUE VALUES (69, 1, NULL, 'Unknown / API', 'Unknown', 'API', 'test', false, '172.18.*.*', 1, '2026-09-10 15:56:15.389585+00', '2026-09-10 15:56:15.389585+00', true, 'c443e18a59511f669df4', 'f87422557d3558b2dade986b4e0a1eb9', '800b98c7cd65ff8afe353a41b84f0d4e', true, NULL);
INSERT INTO public.user_devices OVERRIDING SYSTEM VALUE VALUES (55, 1, NULL, 'Unknown / Unknown', 'Unknown', 'Unknown', 'Unknown', false, '172.18.*.*', 1, '2026-09-05 19:44:54.147598+00', '2026-09-05 19:44:54.147598+00', true, '3e3fcfe79fa25fbcb41e', 'fb137edd756bebad2ef7f7850f27cde3', '8045a29d0e8e3730203c025cab76b491', false, NULL);
INSERT INTO public.user_devices OVERRIDING SYSTEM VALUE VALUES (54, 1, NULL, 'Unknown / Unknown', 'Unknown', 'Unknown', 'Unknown', false, '172.18.*.*', 1, '2026-09-05 19:44:45.84995+00', '2026-09-05 19:44:45.84995+00', true, 'a18618cd3a7113b1d73b', '5575dfdbc47acbf710bbf61c6046a129', 'bde34bdec0497453faae161ab0c3b3cd', false, NULL);
INSERT INTO public.user_devices OVERRIDING SYSTEM VALUE VALUES (53, 1, NULL, 'Unknown / Unknown', 'Unknown', 'Unknown', 'Unknown', false, '172.18.*.*', 1, '2026-09-05 19:44:33.586259+00', '2026-09-05 19:44:33.586259+00', true, '6e3f1c3b451c12527a53', '59d991d305a2110653526ff26c2494c8', 'd352c9a826e5d25a6017e7edd139f364', false, NULL);
INSERT INTO public.user_devices OVERRIDING SYSTEM VALUE VALUES (70, 1, NULL, 'Unknown / API', 'Unknown', 'API', 'test', false, '172.18.*.*', 1, '2026-09-11 13:31:12.923483+00', '2026-09-11 13:31:12.923483+00', true, 'b2dcb58438b2421bba20', '57cd643e2c36801d36ceb9ee1a9d70d8', '83f534c584f751e28cef6025924b278c', true, NULL);
INSERT INTO public.user_devices OVERRIDING SYSTEM VALUE VALUES (72, 1, NULL, 'Unknown / API', 'Unknown', 'API', 'test', false, '172.18.*.*', 1, '2026-09-11 17:48:24.057216+00', '2026-09-11 17:48:24.057216+00', true, '9a3b16f4c503ecd75ba9', 'd59f62db5a2eb8b6417cbaf5eb0795a8', '869c6059baf284311b1d2f6b116b3a3e', true, NULL);
INSERT INTO public.user_devices OVERRIDING SYSTEM VALUE VALUES (73, 1, NULL, 'Unknown / API', 'Unknown', 'API', 'test', false, '172.18.*.*', 1, '2026-09-11 18:00:20.381655+00', '2026-09-11 18:00:20.381655+00', true, 'e174756af6e0cd27ce34', '82ae6c09a0dd45e906c38b10dd533423', '461d74aa65ca732392ba34eea5e0013f', true, NULL);
INSERT INTO public.user_devices OVERRIDING SYSTEM VALUE VALUES (74, 1, NULL, 'Unknown / API', 'Unknown', 'API', 'test', false, '172.18.*.*', 1, '2026-09-11 18:04:04.505919+00', '2026-09-11 18:04:04.505919+00', true, '63fb376c5a46a7b18472', 'b5966241079c94b7343d0e5c1adf5e2b', 'e574e700569e9e37b2d64a79ed0c010c', true, NULL);
INSERT INTO public.user_devices OVERRIDING SYSTEM VALUE VALUES (75, 7, 'dfd4e3cc858848642d3203335120663f141a8f88fb8b9d331e14d6b50839b876', 'Windows / Chrome', 'Windows', 'Chrome', 'Desktop PC (x86)', false, '172.18.*.*', 2, '2026-09-12 13:30:46.858405+00', '2026-09-12 14:50:24.733251+00', false, '8ed4983e7759153b0e19', '5846e0070ee54d4de8a22d479d145bfe', '529a57bccbe1452611da7a7c0cc18c01', true, NULL);
INSERT INTO public.user_devices OVERRIDING SYSTEM VALUE VALUES (62, 1, 'dfd4e3cc858848642d3203335120663f141a8f88fb8b9d331e14d6b50839b876', 'Основной (Chrome, Desktop PC (x86))', 'Windows', 'Chrome', 'Desktop PC (x86)', false, '172.18.*.*', 29, '2026-09-06 20:20:14.607765+00', '2026-09-12 14:50:08.120474+00', false, '7d5cd7392cc121eb5035', '30311bff63c62793eeff95c3965cfd84', '405fbbfd734be0dbf5e78831932f9d5f', true, 'Основной');
INSERT INTO public.user_devices OVERRIDING SYSTEM VALUE VALUES (49, 1, '99e9f120becd635f68890db142634a470bd61f1193b4fbe1375188eefa0a0c19', 'Windows / Yandex Browser', 'Windows', 'Yandex Browser', 'Desktop PC (x86)', false, '172.18.*.*', 88, '2026-09-02 15:59:09.945656+00', '2026-09-12 16:23:42.340964+00', false, '5a1041cede2d6bbe4548', '22952870a7e333ef1aeea489fb78d363', 'fc3bf8705612e0c2d07032d86b9cfb7b', true, NULL);
INSERT INTO public.user_devices OVERRIDING SYSTEM VALUE VALUES (44, 1, NULL, 'Unknown / Unknown', 'Unknown', 'Unknown', 'Unknown', false, '172.18.*.*', 1, '2026-09-02 14:17:03.848289+00', '2026-09-02 14:17:03.848289+00', true, '91b7a96ef42a2329152b', 'b69f0fd871797620c638df7069045463', 'd8f9fd791cd1c42763427f1b2c43bc0d', false, NULL);
INSERT INTO public.user_devices OVERRIDING SYSTEM VALUE VALUES (43, 1, NULL, 'Unknown / Unknown', 'Unknown', 'Unknown', 'Unknown', false, '172.18.*.*', 1, '2026-09-02 14:17:03.848289+00', '2026-09-02 14:17:03.848289+00', true, 'fa1ec52209d483924080', '78cc7fc0d2592ed1032adedc30321c29', '842b86fa72ca91c455c9535a1d296542', false, NULL);
INSERT INTO public.user_devices OVERRIDING SYSTEM VALUE VALUES (46, 1, NULL, 'Unknown / Unknown', 'Unknown', 'Unknown', 'Unknown', false, '172.18.*.*', 1, '2026-09-02 15:01:40.819099+00', '2026-09-02 15:01:40.819099+00', true, '5acdb5e65bcdedac611e', 'f47185bb5d611f3b796d553bf3fce389', 'a87b3ed0fd22dae8be4498e016fd7349', false, NULL);
INSERT INTO public.user_devices OVERRIDING SYSTEM VALUE VALUES (47, 1, NULL, 'Unknown / Unknown', 'Unknown', 'Unknown', 'Unknown', false, '172.18.*.*', 1, '2026-09-02 15:27:47.068493+00', '2026-09-02 15:27:47.068493+00', true, 'ac95950191294efaf753', 'e7b43bfce2002d1fc46e5ddb81569474', '6b6d1549efadce741f1e3d53a7352452', false, NULL);
INSERT INTO public.user_devices OVERRIDING SYSTEM VALUE VALUES (50, 1, '98dbf2e957ef72059043835ae0349957cd06c23f092fa2736b36103a59fc6543', 'Windows / Yandex Browser', 'Windows', 'Yandex Browser', 'Desktop PC (x86)', false, '172.18.*.*', 2, '2026-09-02 20:13:10.02986+00', '2026-09-02 20:13:10.02986+00', true, '5a819e5c5675c5276341', 'c7614b907a9750a268240ef4cf16f85f', '2d21f1d8f196641094b70108b94f16bb', false, NULL);
INSERT INTO public.user_devices OVERRIDING SYSTEM VALUE VALUES (48, 1, NULL, 'Unknown / Unknown', 'Unknown', 'Unknown', 'Unknown', false, '172.18.*.*', 1, '2026-09-02 15:27:47.068493+00', '2026-09-02 15:27:47.068493+00', true, '0a79c5207cacdf32d2ad', 'c60ff2f7fd78d798262f97318681f900', '0e394cab196070f361c1c610e77bfc27', false, NULL);
INSERT INTO public.user_devices OVERRIDING SYSTEM VALUE VALUES (45, 1, NULL, 'Unknown / Unknown', 'Unknown', 'Unknown', 'Unknown', false, '172.18.*.*', 1, '2026-09-02 15:01:40.819099+00', '2026-09-02 15:01:40.819099+00', true, 'd14a4c7c0de7ccc1e22a', '9e277d294e9ac3a488f301f4ac2e58a4', 'aa6024b8dc21d98ebb170adf39bbf854', false, NULL);
INSERT INTO public.user_devices OVERRIDING SYSTEM VALUE VALUES (51, 1, NULL, 'Unknown / Unknown', 'Unknown', 'Unknown', 'Unknown', false, '172.18.*.*', 1, '2026-09-05 19:29:16.667076+00', '2026-09-05 19:29:16.667076+00', true, 'b8510dc015b3d17c42d8', 'e37e5ee5bfacf93ffbfdee759ab230c8', 'baf7209f0ffd6553d00fea2fdcbe5e5c', false, NULL);
INSERT INTO public.user_devices OVERRIDING SYSTEM VALUE VALUES (52, 1, NULL, 'Unknown / Unknown', 'Unknown', 'Unknown', 'Unknown', false, '172.18.*.*', 1, '2026-09-05 19:29:16.667076+00', '2026-09-05 19:29:16.667076+00', true, 'd0e7a7117574bda45e57', '577a82bcf2c72271c81b1fe7c0247d86', '376c15222cddf81e97445f0f653cbfc9', false, NULL);
INSERT INTO public.user_devices OVERRIDING SYSTEM VALUE VALUES (56, 1, NULL, 'Unknown / API', 'Unknown', 'API', 'test', false, '172.18.*.*', 1, '2026-09-05 19:47:56.763929+00', '2026-09-05 19:47:56.763929+00', true, 'c88aa4620f95c4f64b84', '9edd856bf606d617f64e5937a81dcd35', 'b192326b39b548cebbd0e6821b466652', false, NULL);
INSERT INTO public.user_devices OVERRIDING SYSTEM VALUE VALUES (57, 1, NULL, 'Unknown / API', 'Unknown', 'API', 'test', false, '172.18.*.*', 1, '2026-09-05 20:29:38.858528+00', '2026-09-05 20:29:38.858528+00', true, '0d5c7af856d34a59bf28', '025c2b3153387130002f0e640d0ec4c4', '596e52cc972a68dd022c8c60faed153f', false, NULL);
INSERT INTO public.user_devices OVERRIDING SYSTEM VALUE VALUES (58, 1, NULL, 'Unknown / API', 'Unknown', 'API', 'test', false, '172.18.*.*', 1, '2026-09-05 20:31:06.121591+00', '2026-09-05 20:31:06.121591+00', true, '0976ae3d20d61fa24f2a', 'b0dc308d2b0c5ad5ad04902e967236a6', 'ceaba6524035f42d85f99c189c4e862e', false, NULL);


--
-- TOC entry 4185 (class 0 OID 56186)
-- Dependencies: 291
-- Data for Name: user_permission_history; Type: TABLE DATA; Schema: public; Owner: admin
--

INSERT INTO public.user_permission_history VALUES (1, 1, 7, 'PERMISSION_TOGGLED', 'incident:check', 'INHERITED', 'GRANTED', NULL, '2026-09-07 22:41:02.574163');
INSERT INTO public.user_permission_history VALUES (2, 1, 7, 'PERMISSION_TOGGLED', 'incident:check', 'GRANTED', 'INHERITED', NULL, '2026-09-07 22:41:29.442627');
INSERT INTO public.user_permission_history VALUES (3, 1, 7, 'PERMISSION_TOGGLED', 'incident:create', 'INHERITED', 'DENIED', NULL, '2026-09-07 22:41:29.445722');
INSERT INTO public.user_permission_history VALUES (4, 1, 7, 'PERMISSION_TOGGLED', 'incident:delete', 'INHERITED', 'DENIED', NULL, '2026-09-07 22:41:29.448661');
INSERT INTO public.user_permission_history VALUES (5, 1, 7, 'PERMISSION_TOGGLED', 'incident:edit', 'INHERITED', 'GRANTED', NULL, '2026-09-07 22:41:29.450583');
INSERT INTO public.user_permission_history VALUES (6, 1, 7, 'PERMISSION_TOGGLED', 'user:edit_status', 'INHERITED', 'GRANTED', NULL, '2026-09-07 22:41:29.452863');
INSERT INTO public.user_permission_history VALUES (7, 1, 7, 'ROLE_CHANGED', 'incident:check', 'DEVELOPER', 'GRANTED', 'Смена статуса: DEVELOPER → OPERATOR', '2026-09-07 22:41:53.429126');
INSERT INTO public.user_permission_history VALUES (8, 1, 7, 'ROLE_CHANGED', 'incident:create', 'DEVELOPER', 'GRANTED', 'Смена статуса: DEVELOPER → OPERATOR', '2026-09-07 22:41:53.429126');
INSERT INTO public.user_permission_history VALUES (9, 1, 7, 'ROLE_CHANGED', 'user:edit_status', 'DEVELOPER', 'GRANTED', 'Смена статуса: DEVELOPER → OPERATOR', '2026-09-07 22:41:53.429126');
INSERT INTO public.user_permission_history VALUES (10, 1, 7, 'ROLE_CHANGED', 'incident:create', 'OPERATOR', 'GRANTED', 'Смена статуса: OPERATOR → DEVELOPER', '2026-09-07 22:42:10.324463');
INSERT INTO public.user_permission_history VALUES (11, 1, 7, 'ROLE_CHANGED', 'incident:edit', 'OPERATOR', 'GRANTED', 'Смена статуса: OPERATOR → DEVELOPER', '2026-09-07 22:42:10.324463');
INSERT INTO public.user_permission_history VALUES (12, 1, 7, 'ROLE_CHANGED', 'incident:delete', 'OPERATOR', 'GRANTED', 'Смена статуса: OPERATOR → DEVELOPER', '2026-09-07 22:42:10.324463');
INSERT INTO public.user_permission_history VALUES (13, 1, 7, 'ROLE_CHANGED', 'incident:check', 'OPERATOR', 'GRANTED', 'Смена статуса: OPERATOR → DEVELOPER', '2026-09-07 22:42:10.324463');
INSERT INTO public.user_permission_history VALUES (14, 1, 7, 'ROLE_CHANGED', 'user:edit_status', 'OPERATOR', 'GRANTED', 'Смена статуса: OPERATOR → DEVELOPER', '2026-09-07 22:42:10.324463');
INSERT INTO public.user_permission_history VALUES (15, 1, 7, 'ROLE_CHANGED', 'user:manage_permissions', 'OPERATOR', 'GRANTED', 'Смена статуса: OPERATOR → DEVELOPER', '2026-09-07 22:42:10.324463');
INSERT INTO public.user_permission_history VALUES (16, 1, 7, 'ROLE_CHANGED', 'settings:edit', 'OPERATOR', 'GRANTED', 'Смена статуса: OPERATOR → DEVELOPER', '2026-09-07 22:42:10.324463');
INSERT INTO public.user_permission_history VALUES (17, 1, 7, 'ROLE_CHANGED', 'critical_action:execute', 'OPERATOR', 'GRANTED', 'Смена статуса: OPERATOR → DEVELOPER', '2026-09-07 22:42:10.324463');
INSERT INTO public.user_permission_history VALUES (18, 1, 7, 'ROLE_CHANGED', 'waf:manage', 'OPERATOR', 'GRANTED', 'Смена статуса: OPERATOR → DEVELOPER', '2026-09-07 22:42:10.324463');
INSERT INTO public.user_permission_history VALUES (19, 1, 7, 'PERMISSION_TOGGLED', 'incident:create', 'INHERITED', 'DENIED', NULL, '2026-09-07 22:42:32.74951');
INSERT INTO public.user_permission_history VALUES (20, 1, 7, 'PERMISSION_TOGGLED', 'incident:check', 'INHERITED', 'DENIED', NULL, '2026-09-07 22:42:32.751949');
INSERT INTO public.user_permission_history VALUES (21, 1, 7, 'PERMISSION_TOGGLED', 'incident:delete', 'INHERITED', 'DENIED', NULL, '2026-09-09 14:37:51.565131');
INSERT INTO public.user_permission_history VALUES (22, 1, 7, 'ROLE_CHANGED', 'incident:create', 'DEVELOPER', 'GRANTED', 'Смена статуса: DEVELOPER → ADMINISTRATOR', '2026-09-09 15:21:01.385571');
INSERT INTO public.user_permission_history VALUES (23, 1, 7, 'ROLE_CHANGED', 'incident:edit', 'DEVELOPER', 'GRANTED', 'Смена статуса: DEVELOPER → ADMINISTRATOR', '2026-09-09 15:21:01.385571');
INSERT INTO public.user_permission_history VALUES (24, 1, 7, 'ROLE_CHANGED', 'incident:check', 'DEVELOPER', 'GRANTED', 'Смена статуса: DEVELOPER → ADMINISTRATOR', '2026-09-09 15:21:01.385571');
INSERT INTO public.user_permission_history VALUES (25, 1, 7, 'ROLE_CHANGED', 'user:edit_status', 'DEVELOPER', 'GRANTED', 'Смена статуса: DEVELOPER → ADMINISTRATOR', '2026-09-09 15:21:01.385571');
INSERT INTO public.user_permission_history VALUES (26, 1, 7, 'ROLE_CHANGED', 'settings:edit', 'DEVELOPER', 'GRANTED', 'Смена статуса: DEVELOPER → ADMINISTRATOR', '2026-09-09 15:21:01.385571');
INSERT INTO public.user_permission_history VALUES (27, 1, 7, 'ROLE_CHANGED', 'critical_action:execute', 'DEVELOPER', 'GRANTED', 'Смена статуса: DEVELOPER → ADMINISTRATOR', '2026-09-09 15:21:01.385571');
INSERT INTO public.user_permission_history VALUES (28, 1, 7, 'ROLE_CHANGED', 'waf:manage', 'DEVELOPER', 'GRANTED', 'Смена статуса: DEVELOPER → ADMINISTRATOR', '2026-09-09 15:21:01.385571');
INSERT INTO public.user_permission_history VALUES (29, 1, 7, 'ROLE_CHANGED', 'incident:check', 'ADMINISTRATOR', 'GRANTED', 'Смена статуса: ADMINISTRATOR → OPERATOR', '2026-09-09 16:03:40.915602');
INSERT INTO public.user_permission_history VALUES (30, 1, 7, 'ROLE_CHANGED', 'incident:create', 'ADMINISTRATOR', 'GRANTED', 'Смена статуса: ADMINISTRATOR → OPERATOR', '2026-09-09 16:03:40.915602');
INSERT INTO public.user_permission_history VALUES (31, 1, 7, 'ROLE_CHANGED', 'user:edit_status', 'ADMINISTRATOR', 'GRANTED', 'Смена статуса: ADMINISTRATOR → OPERATOR', '2026-09-09 16:03:40.915602');
INSERT INTO public.user_permission_history VALUES (32, 1, 7, 'ROLE_CHANGED', 'incident:create', 'OPERATOR', 'GRANTED', 'Смена статуса: OPERATOR → DEVELOPER', '2026-09-09 16:03:56.835399');
INSERT INTO public.user_permission_history VALUES (33, 1, 7, 'ROLE_CHANGED', 'incident:edit', 'OPERATOR', 'GRANTED', 'Смена статуса: OPERATOR → DEVELOPER', '2026-09-09 16:03:56.835399');
INSERT INTO public.user_permission_history VALUES (34, 1, 7, 'ROLE_CHANGED', 'incident:delete', 'OPERATOR', 'GRANTED', 'Смена статуса: OPERATOR → DEVELOPER', '2026-09-09 16:03:56.835399');
INSERT INTO public.user_permission_history VALUES (35, 1, 7, 'ROLE_CHANGED', 'incident:check', 'OPERATOR', 'GRANTED', 'Смена статуса: OPERATOR → DEVELOPER', '2026-09-09 16:03:56.835399');
INSERT INTO public.user_permission_history VALUES (36, 1, 7, 'ROLE_CHANGED', 'user:edit_status', 'OPERATOR', 'GRANTED', 'Смена статуса: OPERATOR → DEVELOPER', '2026-09-09 16:03:56.835399');
INSERT INTO public.user_permission_history VALUES (37, 1, 7, 'ROLE_CHANGED', 'user:manage_permissions', 'OPERATOR', 'GRANTED', 'Смена статуса: OPERATOR → DEVELOPER', '2026-09-09 16:03:56.835399');
INSERT INTO public.user_permission_history VALUES (38, 1, 7, 'ROLE_CHANGED', 'settings:edit', 'OPERATOR', 'GRANTED', 'Смена статуса: OPERATOR → DEVELOPER', '2026-09-09 16:03:56.835399');
INSERT INTO public.user_permission_history VALUES (39, 1, 7, 'ROLE_CHANGED', 'critical_action:execute', 'OPERATOR', 'GRANTED', 'Смена статуса: OPERATOR → DEVELOPER', '2026-09-09 16:03:56.835399');
INSERT INTO public.user_permission_history VALUES (40, 1, 7, 'ROLE_CHANGED', 'waf:manage', 'OPERATOR', 'GRANTED', 'Смена статуса: OPERATOR → DEVELOPER', '2026-09-09 16:03:56.835399');
INSERT INTO public.user_permission_history VALUES (41, 1, 7, 'ROLE_CHANGED', 'incident:create', 'DEVELOPER', 'GRANTED', 'Смена статуса: DEVELOPER → ADMINISTRATOR', '2026-09-09 16:04:03.509879');
INSERT INTO public.user_permission_history VALUES (42, 1, 7, 'ROLE_CHANGED', 'incident:edit', 'DEVELOPER', 'GRANTED', 'Смена статуса: DEVELOPER → ADMINISTRATOR', '2026-09-09 16:04:03.509879');
INSERT INTO public.user_permission_history VALUES (43, 1, 7, 'ROLE_CHANGED', 'incident:check', 'DEVELOPER', 'GRANTED', 'Смена статуса: DEVELOPER → ADMINISTRATOR', '2026-09-09 16:04:03.509879');
INSERT INTO public.user_permission_history VALUES (44, 1, 7, 'ROLE_CHANGED', 'user:edit_status', 'DEVELOPER', 'GRANTED', 'Смена статуса: DEVELOPER → ADMINISTRATOR', '2026-09-09 16:04:03.509879');
INSERT INTO public.user_permission_history VALUES (45, 1, 7, 'ROLE_CHANGED', 'settings:edit', 'DEVELOPER', 'GRANTED', 'Смена статуса: DEVELOPER → ADMINISTRATOR', '2026-09-09 16:04:03.509879');
INSERT INTO public.user_permission_history VALUES (46, 1, 7, 'ROLE_CHANGED', 'critical_action:execute', 'DEVELOPER', 'GRANTED', 'Смена статуса: DEVELOPER → ADMINISTRATOR', '2026-09-09 16:04:03.509879');
INSERT INTO public.user_permission_history VALUES (47, 1, 7, 'ROLE_CHANGED', 'waf:manage', 'DEVELOPER', 'GRANTED', 'Смена статуса: DEVELOPER → ADMINISTRATOR', '2026-09-09 16:04:03.509879');
INSERT INTO public.user_permission_history VALUES (48, 1, 7, 'ROLE_CHANGED', 'incident:create', 'MENEGER', 'GRANTED', 'Смена статуса: MENEGER → DEVELOPER', '2026-09-09 16:04:15.417609');
INSERT INTO public.user_permission_history VALUES (49, 1, 7, 'ROLE_CHANGED', 'incident:edit', 'MENEGER', 'GRANTED', 'Смена статуса: MENEGER → DEVELOPER', '2026-09-09 16:04:15.417609');
INSERT INTO public.user_permission_history VALUES (50, 1, 7, 'ROLE_CHANGED', 'incident:delete', 'MENEGER', 'GRANTED', 'Смена статуса: MENEGER → DEVELOPER', '2026-09-09 16:04:15.417609');
INSERT INTO public.user_permission_history VALUES (51, 1, 7, 'ROLE_CHANGED', 'incident:check', 'MENEGER', 'GRANTED', 'Смена статуса: MENEGER → DEVELOPER', '2026-09-09 16:04:15.417609');
INSERT INTO public.user_permission_history VALUES (52, 1, 7, 'ROLE_CHANGED', 'user:edit_status', 'MENEGER', 'GRANTED', 'Смена статуса: MENEGER → DEVELOPER', '2026-09-09 16:04:15.417609');
INSERT INTO public.user_permission_history VALUES (53, 1, 7, 'ROLE_CHANGED', 'user:manage_permissions', 'MENEGER', 'GRANTED', 'Смена статуса: MENEGER → DEVELOPER', '2026-09-09 16:04:15.417609');
INSERT INTO public.user_permission_history VALUES (54, 1, 7, 'ROLE_CHANGED', 'settings:edit', 'MENEGER', 'GRANTED', 'Смена статуса: MENEGER → DEVELOPER', '2026-09-09 16:04:15.417609');
INSERT INTO public.user_permission_history VALUES (55, 1, 7, 'ROLE_CHANGED', 'critical_action:execute', 'MENEGER', 'GRANTED', 'Смена статуса: MENEGER → DEVELOPER', '2026-09-09 16:04:15.417609');
INSERT INTO public.user_permission_history VALUES (56, 1, 7, 'ROLE_CHANGED', 'waf:manage', 'MENEGER', 'GRANTED', 'Смена статуса: MENEGER → DEVELOPER', '2026-09-09 16:04:15.417609');
INSERT INTO public.user_permission_history VALUES (57, 1, 7, 'ROLE_CHANGED', 'incident:create', 'DEVELOPER', 'GRANTED', 'Смена статуса: DEVELOPER → ADMINISTRATOR', '2026-09-09 16:04:19.788058');
INSERT INTO public.user_permission_history VALUES (58, 1, 7, 'ROLE_CHANGED', 'incident:edit', 'DEVELOPER', 'GRANTED', 'Смена статуса: DEVELOPER → ADMINISTRATOR', '2026-09-09 16:04:19.788058');
INSERT INTO public.user_permission_history VALUES (59, 1, 7, 'ROLE_CHANGED', 'incident:check', 'DEVELOPER', 'GRANTED', 'Смена статуса: DEVELOPER → ADMINISTRATOR', '2026-09-09 16:04:19.788058');
INSERT INTO public.user_permission_history VALUES (60, 1, 7, 'ROLE_CHANGED', 'user:edit_status', 'DEVELOPER', 'GRANTED', 'Смена статуса: DEVELOPER → ADMINISTRATOR', '2026-09-09 16:04:19.788058');
INSERT INTO public.user_permission_history VALUES (61, 1, 7, 'ROLE_CHANGED', 'settings:edit', 'DEVELOPER', 'GRANTED', 'Смена статуса: DEVELOPER → ADMINISTRATOR', '2026-09-09 16:04:19.788058');
INSERT INTO public.user_permission_history VALUES (62, 1, 7, 'ROLE_CHANGED', 'critical_action:execute', 'DEVELOPER', 'GRANTED', 'Смена статуса: DEVELOPER → ADMINISTRATOR', '2026-09-09 16:04:19.788058');
INSERT INTO public.user_permission_history VALUES (63, 1, 7, 'ROLE_CHANGED', 'waf:manage', 'DEVELOPER', 'GRANTED', 'Смена статуса: DEVELOPER → ADMINISTRATOR', '2026-09-09 16:04:19.788058');
INSERT INTO public.user_permission_history VALUES (64, 1, 7, 'ROLE_CHANGED', 'incident:check', 'ADMINISTRATOR', 'GRANTED', 'Смена статуса: ADMINISTRATOR → OPERATOR', '2026-09-09 16:24:58.530292');
INSERT INTO public.user_permission_history VALUES (65, 1, 7, 'ROLE_CHANGED', 'incident:create', 'ADMINISTRATOR', 'GRANTED', 'Смена статуса: ADMINISTRATOR → OPERATOR', '2026-09-09 16:24:58.530292');
INSERT INTO public.user_permission_history VALUES (66, 1, 7, 'ROLE_CHANGED', 'user:edit_status', 'ADMINISTRATOR', 'GRANTED', 'Смена статуса: ADMINISTRATOR → OPERATOR', '2026-09-09 16:24:58.530292');
INSERT INTO public.user_permission_history VALUES (67, 1, 7, 'ROLE_CHANGED', 'incident:create', 'USER_UNCONFIRMED', 'GRANTED', 'Смена статуса: USER_UNCONFIRMED → MODERATOR', '2026-09-09 17:43:55.738089');
INSERT INTO public.user_permission_history VALUES (68, 1, 7, 'ROLE_CHANGED', 'incident:check', 'USER_UNCONFIRMED', 'GRANTED', 'Смена статуса: USER_UNCONFIRMED → MODERATOR', '2026-09-09 17:43:55.738089');
INSERT INTO public.user_permission_history VALUES (69, 1, 7, 'ROLE_CHANGED', 'incident:create', 'DELETED_RET', 'GRANTED', 'Смена статуса: DELETED_RET → ADMINISTRATOR', '2026-09-09 17:45:24.280368');
INSERT INTO public.user_permission_history VALUES (70, 1, 7, 'ROLE_CHANGED', 'incident:edit', 'DELETED_RET', 'GRANTED', 'Смена статуса: DELETED_RET → ADMINISTRATOR', '2026-09-09 17:45:24.280368');
INSERT INTO public.user_permission_history VALUES (71, 1, 7, 'ROLE_CHANGED', 'incident:check', 'DELETED_RET', 'GRANTED', 'Смена статуса: DELETED_RET → ADMINISTRATOR', '2026-09-09 17:45:24.280368');
INSERT INTO public.user_permission_history VALUES (72, 1, 7, 'ROLE_CHANGED', 'user:edit_status', 'DELETED_RET', 'GRANTED', 'Смена статуса: DELETED_RET → ADMINISTRATOR', '2026-09-09 17:45:24.280368');
INSERT INTO public.user_permission_history VALUES (73, 1, 7, 'ROLE_CHANGED', 'settings:edit', 'DELETED_RET', 'GRANTED', 'Смена статуса: DELETED_RET → ADMINISTRATOR', '2026-09-09 17:45:24.280368');
INSERT INTO public.user_permission_history VALUES (74, 1, 7, 'ROLE_CHANGED', 'critical_action:execute', 'DELETED_RET', 'GRANTED', 'Смена статуса: DELETED_RET → ADMINISTRATOR', '2026-09-09 17:45:24.280368');
INSERT INTO public.user_permission_history VALUES (75, 1, 7, 'ROLE_CHANGED', 'waf:manage', 'DELETED_RET', 'GRANTED', 'Смена статуса: DELETED_RET → ADMINISTRATOR', '2026-09-09 17:45:24.280368');
INSERT INTO public.user_permission_history VALUES (76, 1, 7, 'ROLE_CHANGED', 'incident:create', 'ADMINISTRATOR', 'GRANTED', 'Смена статуса: ADMINISTRATOR → DEVELOPER', '2026-09-09 17:45:39.099876');
INSERT INTO public.user_permission_history VALUES (77, 1, 7, 'ROLE_CHANGED', 'incident:edit', 'ADMINISTRATOR', 'GRANTED', 'Смена статуса: ADMINISTRATOR → DEVELOPER', '2026-09-09 17:45:39.099876');
INSERT INTO public.user_permission_history VALUES (78, 1, 7, 'ROLE_CHANGED', 'incident:delete', 'ADMINISTRATOR', 'GRANTED', 'Смена статуса: ADMINISTRATOR → DEVELOPER', '2026-09-09 17:45:39.099876');
INSERT INTO public.user_permission_history VALUES (79, 1, 7, 'ROLE_CHANGED', 'incident:check', 'ADMINISTRATOR', 'GRANTED', 'Смена статуса: ADMINISTRATOR → DEVELOPER', '2026-09-09 17:45:39.099876');
INSERT INTO public.user_permission_history VALUES (80, 1, 7, 'ROLE_CHANGED', 'user:edit_status', 'ADMINISTRATOR', 'GRANTED', 'Смена статуса: ADMINISTRATOR → DEVELOPER', '2026-09-09 17:45:39.099876');
INSERT INTO public.user_permission_history VALUES (81, 1, 7, 'ROLE_CHANGED', 'user:manage_permissions', 'ADMINISTRATOR', 'GRANTED', 'Смена статуса: ADMINISTRATOR → DEVELOPER', '2026-09-09 17:45:39.099876');
INSERT INTO public.user_permission_history VALUES (82, 1, 7, 'ROLE_CHANGED', 'settings:edit', 'ADMINISTRATOR', 'GRANTED', 'Смена статуса: ADMINISTRATOR → DEVELOPER', '2026-09-09 17:45:39.099876');
INSERT INTO public.user_permission_history VALUES (83, 1, 7, 'ROLE_CHANGED', 'critical_action:execute', 'ADMINISTRATOR', 'GRANTED', 'Смена статуса: ADMINISTRATOR → DEVELOPER', '2026-09-09 17:45:39.099876');
INSERT INTO public.user_permission_history VALUES (84, 1, 7, 'ROLE_CHANGED', 'waf:manage', 'ADMINISTRATOR', 'GRANTED', 'Смена статуса: ADMINISTRATOR → DEVELOPER', '2026-09-09 17:45:39.099876');
INSERT INTO public.user_permission_history VALUES (85, 1, 7, 'ROLE_CHANGED', 'incident:create', 'DEVELOPER', 'GRANTED', 'Смена статуса: DEVELOPER → MODERATOR', '2026-09-09 17:45:45.878288');
INSERT INTO public.user_permission_history VALUES (86, 1, 7, 'ROLE_CHANGED', 'incident:check', 'DEVELOPER', 'GRANTED', 'Смена статуса: DEVELOPER → MODERATOR', '2026-09-09 17:45:45.878288');
INSERT INTO public.user_permission_history VALUES (87, 1, 7, 'ROLE_CHANGED', 'incident:create', 'MODERATOR', 'GRANTED', 'Смена статуса: MODERATOR → ADMINISTRATOR', '2026-09-09 17:45:50.99387');
INSERT INTO public.user_permission_history VALUES (88, 1, 7, 'ROLE_CHANGED', 'incident:edit', 'MODERATOR', 'GRANTED', 'Смена статуса: MODERATOR → ADMINISTRATOR', '2026-09-09 17:45:50.99387');
INSERT INTO public.user_permission_history VALUES (89, 1, 7, 'ROLE_CHANGED', 'incident:check', 'MODERATOR', 'GRANTED', 'Смена статуса: MODERATOR → ADMINISTRATOR', '2026-09-09 17:45:50.99387');
INSERT INTO public.user_permission_history VALUES (90, 1, 7, 'ROLE_CHANGED', 'user:edit_status', 'MODERATOR', 'GRANTED', 'Смена статуса: MODERATOR → ADMINISTRATOR', '2026-09-09 17:45:50.99387');
INSERT INTO public.user_permission_history VALUES (91, 1, 7, 'ROLE_CHANGED', 'settings:edit', 'MODERATOR', 'GRANTED', 'Смена статуса: MODERATOR → ADMINISTRATOR', '2026-09-09 17:45:50.99387');
INSERT INTO public.user_permission_history VALUES (92, 1, 7, 'ROLE_CHANGED', 'critical_action:execute', 'MODERATOR', 'GRANTED', 'Смена статуса: MODERATOR → ADMINISTRATOR', '2026-09-09 17:45:50.99387');
INSERT INTO public.user_permission_history VALUES (93, 1, 7, 'ROLE_CHANGED', 'waf:manage', 'MODERATOR', 'GRANTED', 'Смена статуса: MODERATOR → ADMINISTRATOR', '2026-09-09 17:45:50.99387');
INSERT INTO public.user_permission_history VALUES (94, 1, 7, 'ROLE_CHANGED', 'incident:create', 'OBSERVER', 'GRANTED', 'Смена статуса: OBSERVER → MODERATOR', '2026-09-10 15:42:14.952695');
INSERT INTO public.user_permission_history VALUES (95, 1, 7, 'ROLE_CHANGED', 'incident:check', 'OBSERVER', 'GRANTED', 'Смена статуса: OBSERVER → MODERATOR', '2026-09-10 15:42:14.952695');
INSERT INTO public.user_permission_history VALUES (96, 1, 7, 'ROLE_CHANGED', 'incident:create', 'USER', 'GRANTED', 'Смена статуса: USER → MODERATOR', '2026-09-10 15:42:33.061533');
INSERT INTO public.user_permission_history VALUES (97, 1, 7, 'ROLE_CHANGED', 'incident:check', 'USER', 'GRANTED', 'Смена статуса: USER → MODERATOR', '2026-09-10 15:42:33.061533');
INSERT INTO public.user_permission_history VALUES (98, 1, 7, 'ROLE_CHANGED', 'incident:create', 'MODERATOR', 'GRANTED', 'Смена статуса: MODERATOR → ADMINISTRATOR', '2026-09-11 13:54:19.591623');
INSERT INTO public.user_permission_history VALUES (99, 1, 7, 'ROLE_CHANGED', 'incident:edit', 'MODERATOR', 'GRANTED', 'Смена статуса: MODERATOR → ADMINISTRATOR', '2026-09-11 13:54:19.591623');
INSERT INTO public.user_permission_history VALUES (100, 1, 7, 'ROLE_CHANGED', 'incident:check', 'MODERATOR', 'GRANTED', 'Смена статуса: MODERATOR → ADMINISTRATOR', '2026-09-11 13:54:19.591623');
INSERT INTO public.user_permission_history VALUES (101, 1, 7, 'ROLE_CHANGED', 'user:edit_status', 'MODERATOR', 'GRANTED', 'Смена статуса: MODERATOR → ADMINISTRATOR', '2026-09-11 13:54:19.591623');
INSERT INTO public.user_permission_history VALUES (102, 1, 7, 'ROLE_CHANGED', 'settings:edit', 'MODERATOR', 'GRANTED', 'Смена статуса: MODERATOR → ADMINISTRATOR', '2026-09-11 13:54:19.591623');
INSERT INTO public.user_permission_history VALUES (103, 1, 7, 'ROLE_CHANGED', 'critical_action:execute', 'MODERATOR', 'GRANTED', 'Смена статуса: MODERATOR → ADMINISTRATOR', '2026-09-11 13:54:19.591623');
INSERT INTO public.user_permission_history VALUES (104, 1, 7, 'ROLE_CHANGED', 'waf:manage', 'MODERATOR', 'GRANTED', 'Смена статуса: MODERATOR → ADMINISTRATOR', '2026-09-11 13:54:19.591623');
INSERT INTO public.user_permission_history VALUES (105, 1, 7, 'ROLE_CHANGED', 'incident:create', 'ADMINISTRATOR', 'GRANTED', 'Смена статуса: ADMINISTRATOR → MODERATOR', '2026-09-11 13:54:31.895358');
INSERT INTO public.user_permission_history VALUES (106, 1, 7, 'ROLE_CHANGED', 'incident:check', 'ADMINISTRATOR', 'GRANTED', 'Смена статуса: ADMINISTRATOR → MODERATOR', '2026-09-11 13:54:31.895358');
INSERT INTO public.user_permission_history VALUES (107, 1, 7, 'ROLE_CHANGED', 'incident:create', 'MODERATOR', 'GRANTED', 'Смена статуса: MODERATOR → ADMINISTRATOR', '2026-09-12 13:32:08.810426');
INSERT INTO public.user_permission_history VALUES (108, 1, 7, 'ROLE_CHANGED', 'incident:edit', 'MODERATOR', 'GRANTED', 'Смена статуса: MODERATOR → ADMINISTRATOR', '2026-09-12 13:32:08.810426');
INSERT INTO public.user_permission_history VALUES (109, 1, 7, 'ROLE_CHANGED', 'incident:check', 'MODERATOR', 'GRANTED', 'Смена статуса: MODERATOR → ADMINISTRATOR', '2026-09-12 13:32:08.810426');
INSERT INTO public.user_permission_history VALUES (110, 1, 7, 'ROLE_CHANGED', 'user:edit_status', 'MODERATOR', 'GRANTED', 'Смена статуса: MODERATOR → ADMINISTRATOR', '2026-09-12 13:32:08.810426');
INSERT INTO public.user_permission_history VALUES (111, 1, 7, 'ROLE_CHANGED', 'settings:edit', 'MODERATOR', 'GRANTED', 'Смена статуса: MODERATOR → ADMINISTRATOR', '2026-09-12 13:32:08.810426');
INSERT INTO public.user_permission_history VALUES (112, 1, 7, 'ROLE_CHANGED', 'critical_action:execute', 'MODERATOR', 'GRANTED', 'Смена статуса: MODERATOR → ADMINISTRATOR', '2026-09-12 13:32:08.810426');
INSERT INTO public.user_permission_history VALUES (113, 1, 7, 'ROLE_CHANGED', 'waf:manage', 'MODERATOR', 'GRANTED', 'Смена статуса: MODERATOR → ADMINISTRATOR', '2026-09-12 13:32:08.810426');
INSERT INTO public.user_permission_history VALUES (114, 1, 7, 'ROLE_CHANGED', 'incident:create', 'ADMINISTRATOR', 'GRANTED', 'Смена статуса: ADMINISTRATOR → MODERATOR', '2026-09-12 13:32:31.925701');
INSERT INTO public.user_permission_history VALUES (115, 1, 7, 'ROLE_CHANGED', 'incident:check', 'ADMINISTRATOR', 'GRANTED', 'Смена статуса: ADMINISTRATOR → MODERATOR', '2026-09-12 13:32:31.925701');
INSERT INTO public.user_permission_history VALUES (116, 1, 7, 'ROLE_CHANGED', 'incident:create', 'MODERATOR', 'GRANTED', 'Смена статуса: MODERATOR → ADMINISTRATOR', '2026-09-12 13:32:37.136893');
INSERT INTO public.user_permission_history VALUES (117, 1, 7, 'ROLE_CHANGED', 'incident:edit', 'MODERATOR', 'GRANTED', 'Смена статуса: MODERATOR → ADMINISTRATOR', '2026-09-12 13:32:37.136893');
INSERT INTO public.user_permission_history VALUES (118, 1, 7, 'ROLE_CHANGED', 'incident:check', 'MODERATOR', 'GRANTED', 'Смена статуса: MODERATOR → ADMINISTRATOR', '2026-09-12 13:32:37.136893');
INSERT INTO public.user_permission_history VALUES (119, 1, 7, 'ROLE_CHANGED', 'user:edit_status', 'MODERATOR', 'GRANTED', 'Смена статуса: MODERATOR → ADMINISTRATOR', '2026-09-12 13:32:37.136893');
INSERT INTO public.user_permission_history VALUES (120, 1, 7, 'ROLE_CHANGED', 'settings:edit', 'MODERATOR', 'GRANTED', 'Смена статуса: MODERATOR → ADMINISTRATOR', '2026-09-12 13:32:37.136893');
INSERT INTO public.user_permission_history VALUES (121, 1, 7, 'ROLE_CHANGED', 'critical_action:execute', 'MODERATOR', 'GRANTED', 'Смена статуса: MODERATOR → ADMINISTRATOR', '2026-09-12 13:32:37.136893');
INSERT INTO public.user_permission_history VALUES (122, 1, 7, 'ROLE_CHANGED', 'waf:manage', 'MODERATOR', 'GRANTED', 'Смена статуса: MODERATOR → ADMINISTRATOR', '2026-09-12 13:32:37.136893');
INSERT INTO public.user_permission_history VALUES (123, 1, 7, 'ROLE_CHANGED', 'incident:check', 'ADMINISTRATOR', 'GRANTED', 'Смена статуса: ADMINISTRATOR → TOP_LEVEL_ADMINISTRATOR', '2026-09-12 13:32:44.568361');
INSERT INTO public.user_permission_history VALUES (124, 1, 7, 'ROLE_CHANGED', 'incident:create', 'ADMINISTRATOR', 'GRANTED', 'Смена статуса: ADMINISTRATOR → TOP_LEVEL_ADMINISTRATOR', '2026-09-12 13:32:44.568361');
INSERT INTO public.user_permission_history VALUES (125, 1, 7, 'ROLE_CHANGED', 'incident:delete', 'ADMINISTRATOR', 'GRANTED', 'Смена статуса: ADMINISTRATOR → TOP_LEVEL_ADMINISTRATOR', '2026-09-12 13:32:44.568361');
INSERT INTO public.user_permission_history VALUES (126, 1, 7, 'ROLE_CHANGED', 'incident:edit', 'ADMINISTRATOR', 'GRANTED', 'Смена статуса: ADMINISTRATOR → TOP_LEVEL_ADMINISTRATOR', '2026-09-12 13:32:44.568361');
INSERT INTO public.user_permission_history VALUES (127, 1, 7, 'ROLE_CHANGED', 'critical_action:execute', 'ADMINISTRATOR', 'GRANTED', 'Смена статуса: ADMINISTRATOR → TOP_LEVEL_ADMINISTRATOR', '2026-09-12 13:32:44.568361');
INSERT INTO public.user_permission_history VALUES (128, 1, 7, 'ROLE_CHANGED', 'settings:edit', 'ADMINISTRATOR', 'GRANTED', 'Смена статуса: ADMINISTRATOR → TOP_LEVEL_ADMINISTRATOR', '2026-09-12 13:32:44.568361');
INSERT INTO public.user_permission_history VALUES (129, 1, 7, 'ROLE_CHANGED', 'waf:manage', 'ADMINISTRATOR', 'GRANTED', 'Смена статуса: ADMINISTRATOR → TOP_LEVEL_ADMINISTRATOR', '2026-09-12 13:32:44.568361');
INSERT INTO public.user_permission_history VALUES (130, 1, 7, 'ROLE_CHANGED', 'user:manage_permissions', 'ADMINISTRATOR', 'GRANTED', 'Смена статуса: ADMINISTRATOR → TOP_LEVEL_ADMINISTRATOR', '2026-09-12 13:32:44.568361');
INSERT INTO public.user_permission_history VALUES (131, 1, 7, 'ROLE_CHANGED', 'user:edit_status', 'ADMINISTRATOR', 'GRANTED', 'Смена статуса: ADMINISTRATOR → TOP_LEVEL_ADMINISTRATOR', '2026-09-12 13:32:44.568361');


--
-- TOC entry 4183 (class 0 OID 56178)
-- Dependencies: 289
-- Data for Name: user_permission_overrides; Type: TABLE DATA; Schema: public; Owner: admin
--



--
-- TOC entry 4113 (class 0 OID 17822)
-- Dependencies: 219
-- Data for Name: user_refresh_tokens; Type: TABLE DATA; Schema: public; Owner: admin
--

INSERT INTO public.user_refresh_tokens VALUES ('a659549a-1cfa-4f76-aed1-550ea530f48b', 1, 'a0a79971f6dd27e0db3f1caeb14bb57d36963c539e6723e4f9d60caaaa33fc7ff797db34ae185ecd908d84f7e6aa99aaa6899bd320f056017af0ff4a44d63436', NULL, '2026-10-11 18:52:45.893', true, '2026-09-12 13:21:06.925941', NULL, 49);
INSERT INTO public.user_refresh_tokens VALUES ('b6889eb1-7a49-427d-94de-2d010afa5503', 1, '4c3d9e35397b668c0d6507fa41d29624dbd023862c8be82789e05fec11f8000f9c0647486603189a1e52b5513ddc5c437b7960b1e9facc16957be0da1ac7f3c7', NULL, '2026-10-12 13:21:06.959', true, '2026-09-12 13:21:07.531945', '2026-09-12 13:21:07.531945', 49);
INSERT INTO public.user_refresh_tokens VALUES ('bcb2e802-6d27-4152-97db-9e5870a759e2', 7, '532900da5305ab2b641bd9361c5a7e9b23f2541adc323da7a938bf46e105680ac31f523e7f39b38f29044b6ca719285357c1458372e4431788302b9fdfbf83e1', NULL, '2026-10-12 13:53:02.216', true, '2026-09-12 13:53:29.909631', '2026-09-12 13:53:29.909631', 75);
INSERT INTO public.user_refresh_tokens VALUES ('53174a73-969e-4775-a143-c9d5d535dc0b', 7, '110f63550e5e5752c94182ab70b2378e2b2315abd8e4f5f037f6e3fc09525af66e65b662b3f0527e38935e90ee719ddb754f3b6ce20c6491ebf60a14e0d83eb8', NULL, '2026-10-12 14:43:57.509', true, '2026-09-12 14:44:59.668447', '2026-09-12 14:44:59.668447', 75);
INSERT INTO public.user_refresh_tokens VALUES ('2b5437eb-f881-4f84-93d6-bfb39774a2d4', 1, 'cf0350bf1ea0a3606289c6a96fd86247d041fc0574a5bcb261a553170fd4318da3525cc8c6606d3c00f984d2ec3220194bcfce3691cd42720f113ae1601ea190', NULL, '2026-10-12 15:55:43.148', true, '2026-09-12 15:58:37.910623', NULL, 49);
INSERT INTO public.user_refresh_tokens VALUES ('beadb11f-f8c5-47f1-931c-70e5c37023a3', 7, '4e3981e51ebd0eae8637aec73d31051adac1379ae0a447c53f9f1c9d560173404203d80fbafb335aabaed1430e156b60c470e8a5817920f007b84eebb971b9ee', NULL, '2026-10-07 21:53:45.11', true, '2026-09-07 21:55:04.655498', '2026-09-07 21:55:04.655498', 63);
INSERT INTO public.user_refresh_tokens VALUES ('6d9d3a32-163c-49c5-95d8-b89947cea48a', 7, 'dd3ec601f1d0cb7733ecb802b62ec3cbb9943994ec05e3d6151017964ce11cce4e2fd5b3bc7febb267e23ca2105431d4e57a58c488f35c78b69c150868b49c3f', NULL, '2026-10-07 19:48:07.51', true, '2026-09-07 19:48:07.883049', '2026-09-07 19:48:07.883049', 63);
INSERT INTO public.user_refresh_tokens VALUES ('c8d43db0-49dc-44be-8614-2d9cb56129b4', 7, '796d6bc33a7d53319c1aed87b7e47d5d4e1b4feda54529c81b45a217920bae6db7a74e23d89d63869b330dad34c31d5fe6f2bfe94018f513ceaf21222a837790', NULL, '2026-10-07 22:40:58.423', true, '2026-09-07 22:41:02.611349', '2026-09-07 22:41:02.611349', 63);
INSERT INTO public.user_refresh_tokens VALUES ('5c515486-f1b8-4bd4-93da-4e1841322569', 7, 'c4ce9c4327e74f094eaf85a049ddf33a54352cf3007065b92a1d05c9d470b03eb5247aa811bf61bb5c6287974de16c5b0a4a30d5629873f8242cb8a35b46c451', NULL, '2026-10-09 15:20:52.386', true, '2026-09-09 15:21:01.431462', '2026-09-09 15:21:01.431462', 63);
INSERT INTO public.user_refresh_tokens VALUES ('70178254-2672-4b55-b4e7-643c0e7860c9', 7, '3f380bc98cd17956d4250dc8d9acdab60815c39efe269b9aeb489b7d40b031d69c35d764e02bc1f686a5db82043387ab6d83445a35aecf227a7457a84d297f77', NULL, '2026-10-07 22:15:08.873', true, '2026-09-07 22:15:16.845856', '2026-09-07 22:15:16.845856', 63);
INSERT INTO public.user_refresh_tokens VALUES ('dd76e460-737b-4f7a-b13b-41bdbe90a566', 1, '04eb6601e0f354e26b35906cdf8216a1c1aab80e83ff372524e324bf0aeff36e2f8705140eee8717f9579501833fb5b9a84294e7f0579e6dc68e5f3e6a9bb78e', NULL, '2026-10-07 14:51:13.534', true, '2026-09-11 18:44:18.948142', NULL, 49);
INSERT INTO public.user_refresh_tokens VALUES ('4dc182dd-339b-46da-8b5a-a2c81c3aa649', 1, 'bf88b1da6ae63630742245344788e8cd61a62a0a3834438a76825a1bfd3feaa7f9fa87778219f1869eee6a94e738fe45eca63adca4c5950d3937d5b4aba50f49', NULL, '2026-10-06 20:20:14.718', true, '2026-09-11 18:44:18.948142', '2026-09-06 20:20:17.009835', 62);
INSERT INTO public.user_refresh_tokens VALUES ('786f442a-bc04-446f-97f6-83820947656a', 7, '322d29a68a1951dd5d74586dc7e6cfc0c40686dca33f20151c1ba1faa09da06a0bec391e84bad940260c5116a7905fb5961fed5b6152cc34ef29fb4aed9ed3d0', NULL, '2026-10-07 22:15:16.855', true, '2026-09-07 22:16:12.959157', '2026-09-07 22:16:12.959157', 63);
INSERT INTO public.user_refresh_tokens VALUES ('0047060b-8992-4e39-9096-f05bb2844d1d', 1, '9b9273adcd51c3493e3c0ba45bda7f9a21a95ff465a3195acc994e05d168a8d6822a1f35ec96a037aeb7b4a172bc3893d58f775afc40d164bae0a12e14e95760', NULL, '2026-10-12 13:21:07.599', true, '2026-09-12 13:21:17.270353', '2026-09-12 13:21:17.270353', 49);
INSERT INTO public.user_refresh_tokens VALUES ('9751df99-7392-4a15-a168-98489cfed5ca', 1, '6ecc0aa00c490a631bd5dda460a8d30e32de4696aaa2f2b3f51574ce0481adb2a6d08e03f0d258f01fb30e0c1c7adf0b23398a6e0afe1e90e040e374c3aed51f', NULL, '2026-10-12 13:21:17.285', true, '2026-09-12 13:21:20.030696', '2026-09-12 13:21:20.030696', 49);
INSERT INTO public.user_refresh_tokens VALUES ('3ae6919c-d809-4973-93c0-d7d6396555c7', 1, 'c9efdfb4e265af9ef7fb2351b33449a25a847572cf6a52cf2b408cf7ec6c243588ba6b43c722b2403a4a8d9782688cfda22bdd6b4c6675fbfb94b1cbd17774a7', NULL, '2026-10-12 13:21:20.048', true, '2026-09-12 13:24:42.475648', '2026-09-12 13:24:42.475648', 49);
INSERT INTO public.user_refresh_tokens VALUES ('9e549ab9-de56-47b0-927e-a92ae41721a1', 7, '0f21dc96fa7ed69f5477b6b0fefb3ca88534c00f6a7b16c00518fe32110930d757af1cc94eb52309d93ccf3f27a8946d85f90a80bc1e32eaaf874d9cb20d2250', NULL, '2026-10-12 13:53:29.934', true, '2026-09-12 13:54:13.093642', '2026-09-12 13:54:13.093642', 75);
INSERT INTO public.user_refresh_tokens VALUES ('4e9be514-f5e3-47a0-93d4-3a9ff5b93446', 1, '23deaa4b691cd776dbe02b9878168bcd0acd2bcf57f2c2c9e3cc185b331529541b9e89e12dcdb5586d631aec9f561678d1be0174e9c1b9df2b8fc1beb875e782', NULL, '2026-10-12 14:44:15.433', true, '2026-09-12 14:47:55.906044', NULL, 49);
INSERT INTO public.user_refresh_tokens VALUES ('1369138a-a0c0-4017-b22f-a446e3cfc4c3', 1, 'e64206f48f81ed2cff5bb05c64adfa3a0fd495081d51205a6452d32e238ae064318323f3ded3ec4255ed60c1f6124c50cab128f68a1e3d8c0a9f59e3819d4563', NULL, '2026-10-12 15:58:37.95', true, '2026-09-12 15:58:39.327246', '2026-09-12 15:58:39.327246', 49);
INSERT INTO public.user_refresh_tokens VALUES ('2bd10dc5-d534-4f92-988f-2823f1f5b515', 1, '440baa70c6fea9cfe22d204e628c4f92e86c24b409f55b60f84dee0fc32ee8c73358a3b64f200f08457f635a675b3ebcbabad291120d9f91438a5697106d6f6f', NULL, '2026-10-12 15:58:39.366', true, '2026-09-12 15:58:54.806026', '2026-09-12 15:58:54.806026', 49);
INSERT INTO public.user_refresh_tokens VALUES ('1eb2c12b-e5bc-48cb-a455-dfd6b4c11998', 7, 'dd3ec601f1d0cb7733ecb802b62ec3cbb9943994ec05e3d6151017964ce11cce4e2fd5b3bc7febb267e23ca2105431d4e57a58c488f35c78b69c150868b49c3f', NULL, '2026-10-07 19:48:07.896', true, '2026-09-07 21:48:52.775843', NULL, 63);
INSERT INTO public.user_refresh_tokens VALUES ('558c0b9b-ed1f-43ff-b7e3-1ac7b943486d', 7, '9c15cdae5e5fceba985e3b9064aacd192e212a1bdc6dfb934055a3204a3da93ea9094e00e465ba790be1dae878f2f159fa7200e84f6b4d77888331bacffb5fab', NULL, '2026-10-07 21:55:04.701', true, '2026-09-07 21:55:12.128191', '2026-09-07 21:55:12.128191', 63);
INSERT INTO public.user_refresh_tokens VALUES ('42fd3a04-88f4-402a-83f8-501d103bc3c8', 7, '0ea454ffeb1736a401ddf6ae24925f862827470ec965c95c60592ca5a20635ab1425e7f7e55be9081397007622b3ed0c4d733fd05dffb3a41fdbda8df4a41122', NULL, '2026-10-07 22:16:12.991', true, '2026-09-07 22:16:24.594041', '2026-09-07 22:16:24.594041', 63);
INSERT INTO public.user_refresh_tokens VALUES ('fc4a620a-ccc9-40a9-a31a-b6a2b6619b0a', 7, '2597cd677ed749102222e16645edc6273985fbe28db11b197d50e31bdcd0571dc859001481b3b7c7aa4f6218c5773b3372e9a74e56623202309fbd214c669472', NULL, '2026-10-07 22:41:02.631', true, '2026-09-07 22:41:29.489386', '2026-09-07 22:41:29.489386', 63);
INSERT INTO public.user_refresh_tokens VALUES ('8efe32db-2e7b-4464-a4d7-382989d742d5', 1, '84be24062253be1787243bf02f72fe186751cb53bcc614daf09277cab70811ec9092b0bd44d6ecb33b944aecc60e2e5739c377142365334ca5d22fc790ee384a', NULL, '2026-10-12 13:24:42.51', true, '2026-09-12 13:26:29.748295', '2026-09-12 13:26:29.748295', 49);
INSERT INTO public.user_refresh_tokens VALUES ('c7830b82-fb1d-4d37-b257-a6e7834cb3b5', 7, 'cf8dece2f72db45ebb559db2a54a3e3190333ab7ecf32094179dfe0b50164c7052edde8c272375b4636b48d41cec05fae082c8dcc7d9c3226d75469afb6f4953', NULL, '2026-10-12 13:54:13.143', true, '2026-09-12 13:55:28.995476', '2026-09-12 13:55:28.995476', 75);
INSERT INTO public.user_refresh_tokens VALUES ('035888b9-87b3-456f-bc96-a153c5886d9e', 7, '7c914b81e4a7e866a5a7cbe792713ab308c43855661c0fdb5383143a399b4145220fca9c600ebdb228445b209ec1cf4174c0fa2681f5648270d0271323b9e962', NULL, '2026-10-07 14:52:57.814', true, '2026-09-07 14:52:58.181285', '2026-09-07 14:52:58.181285', 63);
INSERT INTO public.user_refresh_tokens VALUES ('c6d01b96-785a-4326-a42d-4365e101638c', 7, '8c9bd80c1dd120a7404a5979a6baaff157deb1bd30a955a334d62ad953fd89f0962d74564c63cfd51b1da43ca3505d9d47333a87fe4ab8d2971ca4d253c728ba', NULL, '2026-10-12 14:44:59.767', true, '2026-09-12 14:45:51.140806', '2026-09-12 14:45:51.140806', 75);
INSERT INTO public.user_refresh_tokens VALUES ('def3c591-34ea-43ad-b3b9-711b974d85cd', 1, 'b0e1da5e7be630671eda17477c29a1f1d19421048e8a26d60f11aa273a055066d534fef1f8293cc48780671f7bcd501e3f37f62f1c14d260d0e9ffeffba63077', NULL, '2026-10-12 15:58:54.842', true, '2026-09-12 15:59:23.523943', NULL, 49);
INSERT INTO public.user_refresh_tokens VALUES ('743fd693-ca17-412c-b644-6cf85deac654', 7, 'f7cc48fc28d60ed4de16e60e641e8822a98f1b091b7c6f51211d4b29132c7e3559018d51ef84c6d9cd8eed57d694b9de4cbaca87c2c75d1e040cd9ef1ab351e2', NULL, '2026-10-07 14:53:06.107', true, '2026-09-07 14:53:11.426515', '2026-09-07 14:53:11.426515', 63);
INSERT INTO public.user_refresh_tokens VALUES ('13c03cb0-899d-47a1-aeaa-1e2ecfb7a455', 7, '648a806f84c2c93361a589f34c28c260f728fb8e5505c51432c51bc92d1a81ee9949d7e8aaa3b2633c33dcaf6dcfd9a03b31bf356e1031f96026556102d75a11', NULL, '2026-10-07 14:53:11.435', true, '2026-09-07 16:07:00.065035', NULL, 63);
INSERT INTO public.user_refresh_tokens VALUES ('3a474d16-e6bb-49c4-9b38-1b126e326bec', 1, '56540c2af43d89a5e63f02a9e5940d4bfde3a02d472ddcf710f9a02fe7697569533f14d7cd341a4402c65180ed399be011d65cd7d6ffe077393323c581132d86', NULL, '2026-10-12 13:26:29.825', true, '2026-09-12 13:26:42.168481', '2026-09-12 13:26:42.168481', 49);
INSERT INTO public.user_refresh_tokens VALUES ('cdb7756b-9b0a-40fa-bdde-9bcd8beaeef9', 7, '9caea195023176cd3e47270923837d2bdafd9f35fd1bce1e5ac65eb77d9469b1578bbb29a772d791f56e57fdb899fccee7be4d59636f3a130e4be828654b8a1e', NULL, '2026-10-07 14:52:58.208', true, '2026-09-07 14:53:06.094166', '2026-09-07 14:53:06.094166', 63);
INSERT INTO public.user_refresh_tokens VALUES ('6ea3a3dd-ea4b-40f5-a944-29dbd7a12d74', 1, '094dc552d6ef0f8ee332a6a935ed0a06474579bbf33c0fe1444c22cbfc8df46abdaefac177b2df03c1ca8659fd0cf8cacfdf0da9a25b848fc3c54ffd3f0a0326', NULL, '2026-10-12 13:55:28.497', true, '2026-09-12 13:55:29.745663', '2026-09-12 13:55:29.745663', 49);
INSERT INTO public.user_refresh_tokens VALUES ('b84364d8-893f-43dc-a67f-3d811bea14eb', 7, 'bbac9a5c4705dcf8d1720e4fa11afb9fae4cfc21222af2c9e6a5cb10ee2da385e3c95fe6c3b5a3e552b3215ccb2e421e9fa3a470e9bdbe8e759a42805ca12af2', NULL, '2026-10-12 13:55:29.012', true, '2026-09-12 13:56:39.599399', '2026-09-12 13:56:39.599399', 75);
INSERT INTO public.user_refresh_tokens VALUES ('28caf514-ce9c-4b78-9c74-a6e10ad3c566', 7, 'd7bcdcb59802a36cd5a751744579efb579f5e5b6f97a92ec39a0cb3b17d2e740dc325f10ab3e3f7bbaae26c6b6ffceb4104de231565e02d42354170465a7ca6a', NULL, '2026-10-12 14:45:51.195', true, '2026-09-12 14:46:09.716105', '2026-09-12 14:46:09.716105', 75);
INSERT INTO public.user_refresh_tokens VALUES ('5a56b402-b8e2-492c-9a20-05159c04a048', 1, 'cdea35ce6bfb578a22d5142d746e948281e5e39a7ca25a7d9c5ddba31581363ba661110e05c257697befdca5d0427be5a5327d9f23bfefd38a93e9bf01f13674', NULL, '2026-10-12 15:59:23.562', true, '2026-09-12 15:59:24.720336', '2026-09-12 15:59:24.720336', 49);
INSERT INTO public.user_refresh_tokens VALUES ('7679d368-3565-462a-ac3f-be7c41e34b1d', 1, 'bd6ffe2707cc993f2e374d70ab2ae9120ee6397b4bf3f6dabd6dae183c44704a361d784c80f36efcea7851bbdf1658fc975d6f2c82ca2e4ade5864c5837420ea', NULL, '2026-10-07 19:22:26.409', true, '2026-09-11 18:44:18.948142', '2026-09-07 19:22:30.069707', 49);
INSERT INTO public.user_refresh_tokens VALUES ('50733789-a1de-459c-a6dc-68287c110546', 1, '93ddb62bc56452765142d83e6ac5071985d3f857b25bb815ccf2a15743d29cddbe1c58dfdb8a5f7f3239a495096c2faa706647f83c7c0e3b57334ea16fc9808c', NULL, '2026-10-12 15:59:24.738', true, '2026-09-12 16:01:42.758935', '2026-09-12 16:01:42.758935', 49);
INSERT INTO public.user_refresh_tokens VALUES ('52f7de6f-e2c6-4239-a257-a488fca59253', 7, 'f74cd0a33274a342ea852450da19768c4c3f01bedb4461c30201fecde3714324e642db0bded4b00bbc3ffcb33db36ed399e38c23c296b113eb3ce721ca02f6b4', NULL, '2026-10-07 22:16:24.604', true, '2026-09-07 22:19:34.003833', '2026-09-07 22:19:34.003833', 63);
INSERT INTO public.user_refresh_tokens VALUES ('fb3eee71-8bc9-43d2-b891-90466da43623', 7, '5e30e934a8f4e49f2d7196de042c33e35fa29d06beea9b14bacad441173232a8f8c6d793f8642b9e96f542b9010d6abf79c89b7388e51d36810d0c149cdf4827', NULL, '2026-10-07 22:41:29.506', true, '2026-09-07 22:41:53.492525', '2026-09-07 22:41:53.492525', 63);
INSERT INTO public.user_refresh_tokens VALUES ('b952cf04-5232-4ffb-bb3c-8df7b34393e5', 1, 'ce798a05170446dca9d3cd905b48931da1a01ef4806b0d74117f9898b3186ef01f25ee40864ecc9c29b3d4140a128db00be3ff3053e4fc6ec45b64d7eb8f5b53', NULL, '2026-10-03 23:11:19.824', true, '2026-09-11 18:44:18.948142', '2026-09-03 23:11:21.702523', 49);
INSERT INTO public.user_refresh_tokens VALUES ('77e1797b-aa02-480b-8755-9924b1d8bc16', 1, '1d143f369487889dc599ac82d7bd01b62fc518776f7572b23ea9c978b713c05d4075d5ad637d852db58aafcea478f7e8f0c1aed6131251a04aa07550a322c85b', NULL, '2026-10-12 13:26:42.204', true, '2026-09-12 13:30:26.37818', '2026-09-12 13:30:26.37818', 49);
INSERT INTO public.user_refresh_tokens VALUES ('fff93978-dc7d-425c-8a82-1c88c5ff588a', 1, '094dc552d6ef0f8ee332a6a935ed0a06474579bbf33c0fe1444c22cbfc8df46abdaefac177b2df03c1ca8659fd0cf8cacfdf0da9a25b848fc3c54ffd3f0a0326', NULL, '2026-10-12 13:55:28.608', true, '2026-09-12 13:55:29.745663', '2026-09-12 13:55:29.745663', 49);
INSERT INTO public.user_refresh_tokens VALUES ('30912180-c8f2-4cb9-b759-db3a79fa298c', 1, '0fca4bc5af114f3e27a22f159dd760f6372544bd16ab94b3323aff826c04872aa4412986b19f5e2b698612d57b306fc5d1ad60b7e9a142fd3f63381ae49e4557', NULL, '2026-10-12 13:55:29.763', true, '2026-09-12 14:06:47.328821', '2026-09-12 14:06:47.328821', 49);
INSERT INTO public.user_refresh_tokens VALUES ('d6e79999-1f26-4160-a541-4f817d54a644', 7, 'b9eaf866b8326761adb92d50cf7e9ffb4ccce8b00535db2751eff8d4175534bb46d4258a882c932fad2a9dec0db46112020bc24e6eabfb5376b52a9879af83a2', NULL, '2026-10-12 14:46:09.824', true, '2026-09-12 14:50:24.733251', NULL, 75);
INSERT INTO public.user_refresh_tokens VALUES ('ac7156f1-3d76-43e6-8e97-248f4368202e', 1, 'd3b0154b1ff240d4d34e7bcf2b37dd19fc0e3f51124a9e1e9a9f039c5d91c0d98740892ee68f226e1a12752a47f900d776840626696fb56a95cd96bb87e436ed', NULL, '2026-10-12 16:01:42.795', true, '2026-09-12 16:11:07.160752', '2026-09-12 16:11:07.160752', 49);
INSERT INTO public.user_refresh_tokens VALUES ('009041e4-ea99-495d-b336-f5e394082243', 1, '283f9c870f540b3e69d449995719ec8adcb28162d9dac6853a5f71864b82085c7070e71a25ecd7a410b26b1aa007faa60a1089a6d4f80165fb57bffff5528637', NULL, '2026-10-12 13:30:26.403', true, '2026-09-12 13:32:09.55485', '2026-09-12 13:32:09.55485', 49);
INSERT INTO public.user_refresh_tokens VALUES ('ad1deb19-7c7d-4fe9-a9ee-4af1c0f375f1', 7, '60a35db35ee3d5693bb8de05b83f0efbd592398a2789ba046ba12c4ab15b1dfe0ab2ccd4e985a9c17b16452d31ee8cba5b34ef8c9ca80cdc726625429c727aa7', NULL, '2026-10-12 13:56:39.677', true, '2026-09-12 14:01:04.248058', '2026-09-12 14:01:04.248058', 75);
INSERT INTO public.user_refresh_tokens VALUES ('a1a754af-8844-4266-a128-e50350737e02', 1, 'b8176bb19e04bfff69aceaf9f91960c020005906f6d0f12d1511a7cafd07811be3ea6999d41f9361550739532b9b30ca07e28e19fa1b9b807c994539a2d97514', NULL, '2026-10-12 14:47:55.941', true, '2026-09-12 14:48:16.649922', '2026-09-12 14:48:16.649922', 49);
INSERT INTO public.user_refresh_tokens VALUES ('5d761db9-2e00-402a-81b8-0e87250684e4', 1, 'eb3522c789d1aad1b066963fd5189c03bbe0c2c5648f9622ccfef19a82bb1a9b05f2cb38c55b4bad4e20e21c253ac8d071262386e7bf0cb2cdf0d4b583546d42', NULL, '2026-10-12 16:11:07.283', true, '2026-09-12 16:12:38.497699', '2026-09-12 16:12:38.497699', 49);
INSERT INTO public.user_refresh_tokens VALUES ('b1057e31-63b7-429b-96f2-6cc6e88d31a0', 7, '15441c533ea423560dc7352d082b4c7be921f1d51fc44852a56228849c121fee43aa5c36ffe005a745efe19b1b434e623165327557e64e1ced515637737be78b', NULL, '2026-10-07 21:55:12.143', true, '2026-09-07 22:06:42.287649', '2026-09-07 22:06:42.287649', 63);
INSERT INTO public.user_refresh_tokens VALUES ('f713de1e-0a6a-4409-8817-0b505c1f6106', 7, 'c5f5b8b9af51358136f3be48b3cb711d758d81a8bbd2f1a8d85cb5d5a33b9afb447f92754b8767ca7d458bd793ae2866cf4bccf2641b85a4269fce8ceee05d12', NULL, '2026-10-07 19:41:54.906', true, '2026-09-07 19:41:55.46476', '2026-09-07 19:41:55.46476', 63);
INSERT INTO public.user_refresh_tokens VALUES ('a9b788f2-5c38-4900-8cca-b5be20b7ba4a', 7, '514d81b26539cb00d8d61392f67735abc8c8c587b9191292f41cdce657335d978807e6decf0f83d803caa372775fb016a7ed2caa16535cd5582cbc295b246702', NULL, '2026-10-07 14:50:33.147', true, '2026-09-07 14:50:44.324108', '2026-09-07 14:50:44.324108', 63);
INSERT INTO public.user_refresh_tokens VALUES ('5daa46bc-22fa-4958-a6ce-5bf9eaafc3ba', 7, '514d81b26539cb00d8d61392f67735abc8c8c587b9191292f41cdce657335d978807e6decf0f83d803caa372775fb016a7ed2caa16535cd5582cbc295b246702', NULL, '2026-10-07 14:50:33.593', true, '2026-09-07 14:50:44.324108', '2026-09-07 14:50:44.324108', 63);
INSERT INTO public.user_refresh_tokens VALUES ('68779c67-0a19-4d48-ba5b-35f53d7fa849', 1, 'fbfbf17b373fdae29cda140cf79679bb3d2aa23dc68a597fd82c2c2598935a2d62eb1954a02854d5841e9fac08aac866cc2df172f6f5f98d6a17f786f1f588fd', NULL, '2026-10-05 20:05:10.173', true, '2026-09-11 18:44:18.948142', '2026-09-05 20:27:42.199791', 49);
INSERT INTO public.user_refresh_tokens VALUES ('11ca5615-9e5e-4acc-b2d1-ecccd6cea82d', 7, '401711ea937514602070e5758800365b86e66e284b66af9876474c5963f71cc86527861ac7d578d3645882859f831f3f4214edeca979c706bc0c44414dd818ce', NULL, '2026-10-07 21:48:52.792', true, '2026-09-07 21:48:53.153522', '2026-09-07 21:48:53.153522', 63);
INSERT INTO public.user_refresh_tokens VALUES ('e963fc95-dcdb-4c38-99b3-d0b38d2bde06', 7, 'db283be40b10a2511953935183ccda0ab0c2f639a797e769351acd73f843858018a3e5dffb1cb05e22ae93b177893a43b4a42181174eb5d4fc510e1725169b56', NULL, '2026-10-07 22:06:42.305', true, '2026-09-07 22:06:53.57577', '2026-09-07 22:06:53.57577', 63);
INSERT INTO public.user_refresh_tokens VALUES ('f83a9630-5f33-4725-a3d4-23918cae6b5f', 7, '2d73e696383fecb63ac9756fed588d48fb731c79470a844eafb8bf3e5b7b91711964729b00a68a63c538ad73bb1dbd181792af295d7b8f533cf14f2bb46b8b7e', NULL, '2026-10-07 21:48:53.18', true, '2026-09-07 21:49:08.382846', '2026-09-07 21:49:08.382846', 63);
INSERT INTO public.user_refresh_tokens VALUES ('5806300c-39fe-4ec3-ba36-3e6754c0a25c', 7, 'f6a0bc6fefbe3f6819c93a76f1d59342fb4081a6c1e1d4edde3cb1bb6a8a11b2c124b9a9f7730e8634f474d54e90bc4eae470dc69f187e1b32c8d7547cdf69b4', NULL, '2026-10-07 22:41:53.512', true, '2026-09-07 22:42:10.382537', '2026-09-07 22:42:10.382537', 63);
INSERT INTO public.user_refresh_tokens VALUES ('f571b3d4-171d-4629-824e-05975e613eda', 7, 'adf85b2dcd741a0eb316ab0a260598f2d01540c0edb75c0d996c46a9c26f7f87685887a5c12fa980b42933c0dad72f22ea3edf68e3b3202e5713ff4a1a918ce8', NULL, '2026-10-12 13:30:46.943', true, '2026-09-12 13:30:47.5021', '2026-09-12 13:30:47.5021', 75);
INSERT INTO public.user_refresh_tokens VALUES ('53289436-7bdb-4801-8178-822cf1a34465', 7, 'c2bb0af5f16b813e744247b53fd70bf293cf8257566c6aabfe58a8ad85c66d02a10622ed284829d40b71bbbbc93fccc8fead94fce64872b8d57c34cd38d45782', NULL, '2026-10-07 14:50:44.338', true, '2026-09-07 14:50:52.873983', '2026-09-07 14:50:52.873983', 63);
INSERT INTO public.user_refresh_tokens VALUES ('dc285845-2659-4c7e-ac4a-c322ca6b1b90', 7, 'a4c100784a6bc9809d2341a8d62ebf43f3486b6bb66b9ff86b703e4e28dc02e6d5641a49d5be7fdb7ba73d69fe294a0f7fa98d5173f0a58eb533fdd9396439f5', NULL, '2026-10-07 19:41:55.499', true, '2026-09-07 19:42:05.225449', '2026-09-07 19:42:05.225449', 63);
INSERT INTO public.user_refresh_tokens VALUES ('2a7bf32f-817a-424b-b31b-d2a949ba0e30', 7, 'c08b9bced5b16e8bb0430ba89bcc6420abf6ac3f028fbe3ed1a3729e52d7ae697aa9b267b02a2f53f8ef674c69415aa1ca32af25b1fdd08c39ed0a62c24d8b77', NULL, '2026-10-12 13:30:47.516', true, '2026-09-12 13:32:08.928111', '2026-09-12 13:32:08.928111', 75);
INSERT INTO public.user_refresh_tokens VALUES ('513692b4-5ac3-4c97-9158-7f1371ce8521', 7, '74b5464681604cd4bef361611bd298c9e48f765f7e1aa91527281ac2322574c00280339e7c85f30e210546efb22dc5ed671eaab9a008d613feb31ba3a7d02eca', NULL, '2026-10-12 14:01:04.302', true, '2026-09-12 14:06:48.213182', '2026-09-12 14:06:48.213182', 75);
INSERT INTO public.user_refresh_tokens VALUES ('489a8c80-bd41-405c-b252-e2f4b0c0303c', 1, '55670a209d00ba09550324f9246a72a78dcc1d3a45dcf3abffff4a841b96bb171b0ffd2e6f3d647f3fcb6402e45d56e2c33874427ce698ded930082432e5607f', NULL, '2026-10-12 14:48:16.701', true, '2026-09-12 14:49:44.695558', '2026-09-12 14:49:44.695558', 49);
INSERT INTO public.user_refresh_tokens VALUES ('bd597895-afeb-4d77-acff-56015f1a753a', 7, '3e59ea54427ccbc9b6cffe9178f57abddf93177b530c4243a866694a5101d324390aeb3693d9a570a34668d67529f5ce917382d279305653685d0f4003cc9a80', NULL, '2026-10-07 19:42:05.237', true, '2026-09-07 19:42:10.424927', '2026-09-07 19:42:10.424927', 63);
INSERT INTO public.user_refresh_tokens VALUES ('50086f40-3b0a-452b-91bd-a44ec07a0871', 1, 'e6fa824cbdd49b565667f482e8b767a3aff456d4628c7443573b28244565a8f4565b355e54de0eb25a8104924c04c1b42b591524a82bd850a8991bffc136226b', NULL, '2026-10-12 16:12:38.511', true, '2026-09-12 16:23:42.340964', NULL, 49);
INSERT INTO public.user_refresh_tokens VALUES ('187571bd-c4fa-4a4d-8d49-258ad7173e8e', 7, '8bda467a838df38fe7b202456a96aa7d62f38ca861124e658e79a037bccecb64bca9cc33ff004767bb01922578a9d751a0f909b1f05bc63addc354eb68bf4d6a', NULL, '2026-10-07 22:19:34.015', true, '2026-09-07 22:19:45.777625', '2026-09-07 22:19:45.777625', 63);
INSERT INTO public.user_refresh_tokens VALUES ('4b636578-bb6a-4aff-a8aa-36ed5611db99', 7, 'c4ce9c4327e74f094eaf85a049ddf33a54352cf3007065b92a1d05c9d470b03eb5247aa811bf61bb5c6287974de16c5b0a4a30d5629873f8242cb8a35b46c451', NULL, '2026-10-09 15:20:52.896', true, '2026-09-09 15:21:01.431462', '2026-09-09 15:21:01.431462', 63);
INSERT INTO public.user_refresh_tokens VALUES ('269c6426-2718-4b19-8443-3ac00f340c17', 7, '92ccfd682b7260dcebb24d38a32bd1c9ae4ce26a7ccf503695aa9de294de36ad0b5db55f1a8ed5758ed64c487bfc58052c976ca1a2e20410d3d37616d722d6f1', NULL, '2026-10-07 19:42:10.438', true, '2026-09-07 19:46:52.316282', '2026-09-07 19:46:52.316282', 63);
INSERT INTO public.user_refresh_tokens VALUES ('94133836-aad0-41cf-bb73-e9157dac3f06', 7, '5186874c105c801405f9a4189c9e268ed7b118804c9c4d00897d856bfa1a12338a2a503550dbaec5b5daee50c47b06901e39be5cae88eb6ecc4607050dcf8b3e', NULL, '2026-10-07 21:49:08.392', true, '2026-09-07 21:49:20.170277', '2026-09-07 21:49:20.170277', 63);
INSERT INTO public.user_refresh_tokens VALUES ('89c844ed-edd6-4089-b614-04bea9298ad9', 7, '1cba708f27613b50ca808715d0b42829db0a66ceffa0ecff2ed336622118018d29a95a730d7ec13ce6345f3e7364e379d1e1ba413aa6da981fd1fc55b530480a', NULL, '2026-10-09 15:21:01.442', true, '2026-09-09 16:01:37.843386', NULL, 63);
INSERT INTO public.user_refresh_tokens VALUES ('af51493f-bd0d-46d9-935f-cde08c706f11', 7, '03f3a5090b87d12c2e42a40b0dde11ee727caf111f049b0673aed07794062f1cad0f1a9c88be02acd1643fdba42894e4d2b4f1fcd3433e10241448adc64c1e72', NULL, '2026-10-07 22:06:53.587', true, '2026-09-07 22:06:59.336465', '2026-09-07 22:06:59.336465', 63);
INSERT INTO public.user_refresh_tokens VALUES ('45037637-d021-4ed9-a8a3-28ada9ff1cb4', 7, '9355ab19b9b222983e4f5a91a90a895866fa631f958a619cd9d2927c08420c2d869ec68ab041393bb5fa081d0fb428b46f6622388a1cb8c0cad36c16e74c3306', NULL, '2026-10-07 22:42:10.405', true, '2026-09-07 22:42:32.774163', '2026-09-07 22:42:32.774163', 63);
INSERT INTO public.user_refresh_tokens VALUES ('c6a9cb5d-e257-41a7-8330-824b026c8ecb', 7, '51712d55bf723496db184cf61c20e86d0c21b40643808548a5c4ec675c252f3ea1c3053881cf163546e48923001776095bb44c8b6494a58ee94f883e8390ba67', NULL, '2026-10-07 22:06:59.345', true, '2026-09-07 22:07:35.929271', '2026-09-07 22:07:35.929271', 63);
INSERT INTO public.user_refresh_tokens VALUES ('8e9d0c29-b90d-44c3-81ab-a2dc9e918947', 7, '5801204a20b4de5eb263fe3f2e65b873f69779f8ddec5ca7496aff8414c713b1f0139af80d35d74b276371726da791dbfd0485c03ed8f1ed367f3966cc4fa304', NULL, '2026-10-07 14:51:13.227', true, '2026-09-07 14:52:01.185742', NULL, 63);
INSERT INTO public.user_refresh_tokens VALUES ('9f9c169d-da2c-4a38-920e-a6d6582bb697', 7, 'e4b0af46a0d81c3c24747517bda4f2c2c688c961ebce129c37d9033aabd739dbd07a972eec2fcb432bbabb5c3011c761668b9938effb1179fe83decea6de9d99', NULL, '2026-10-07 14:50:52.893', true, '2026-09-07 14:51:02.898084', '2026-09-07 14:51:02.898084', 63);
INSERT INTO public.user_refresh_tokens VALUES ('c80cec70-7bdc-482b-a38a-959edef1f78a', 7, '9da14bae334831404a76cbfae3a51e0364a61824de73e8e5ce1e42f841e357a2f097534427a2cf8fa8d29e0f13d705b6b49ab0d7b9c251b0339f099a16f110a7', NULL, '2026-10-12 13:32:08.963', true, '2026-09-12 13:32:15.07155', '2026-09-12 13:32:15.07155', 75);
INSERT INTO public.user_refresh_tokens VALUES ('6e90618a-2102-43ec-849e-8340a7c47f10', 7, '86dd899f33e60d1f9022ba3e6709e85d203ada7c8ad38fe067727d53e4b089b7e45b936d5aef4c98487aeeeb30dd2825f2c28fa49094c46371a979d5db3ea372', NULL, '2026-10-07 14:51:02.908', true, '2026-09-07 14:51:09.23742', '2026-09-07 14:51:09.23742', 63);
INSERT INTO public.user_refresh_tokens VALUES ('cc2aedbc-8344-4952-929b-8814352f5d51', 1, '458e5f9aa99b192679e1ebb9b002ce627d0a9edcb6f4b91b97b45cd5010114c80ce940463e7f7d2bb553e06decd67890f3f25c4562687bbe28a56773f9803a20', NULL, '2026-10-12 13:32:09.571', true, '2026-09-12 13:32:32.51001', '2026-09-12 13:32:32.51001', 49);
INSERT INTO public.user_refresh_tokens VALUES ('e8f291bd-6ffb-400a-8ebd-5892068d37e2', 7, 'cbf073d1c8b89a9b2efe92ef446f43c306c1545103f293b565a6f680c2dea7128a76f9afc463fd1b51af56819a0056bb015f9cfad29bf5a7372c095b37dfc0de', NULL, '2026-10-09 16:03:40.996', true, '2026-09-09 16:03:56.8846', '2026-09-09 16:03:56.8846', 63);
INSERT INTO public.user_refresh_tokens VALUES ('8b661c95-0d90-4976-a71b-6d3ebb9fd1a7', 1, '4aa95838ddc2d705f026d31988a790aed69bfc706d77e9059d776bb5743293d5aabfa2f70945f75c1caebed62628c3c2bd13d531cf76a55dfb43f28b88895b90', NULL, '2026-10-12 14:06:47.372', true, '2026-09-12 14:06:54.890967', NULL, 49);
INSERT INTO public.user_refresh_tokens VALUES ('0e2be31c-b4c3-4f69-b941-3393facf58e4', 7, 'a75cfc3eb32afcb53ac316313bbf4c585454a130ea10e7016e5d69c60c0d5354350ff687885677b173f22de603dba9b8fee312d39de181d10df37fb1c2093044', NULL, '2026-10-07 14:51:09.268', true, '2026-09-07 14:51:13.217691', '2026-09-07 14:51:13.217691', 63);
INSERT INTO public.user_refresh_tokens VALUES ('3a3463fc-c6f7-41f1-bfcb-48827bfa5977', 1, '328067c404e43c60e154de7a260111a068fec9b133fa1148777d79ab5c68490f50ae6469a91a62a160370c6a58a2c33442493c2b0524dbe61f20efcd8290dd6d', NULL, '2026-10-07 19:07:39.824', true, '2026-09-11 18:44:18.948142', NULL, 49);
INSERT INTO public.user_refresh_tokens VALUES ('f15b7391-2949-4b15-bf3e-e939fb7dabb2', 1, '86899b3c10f73b79c31e5c0aa9421b4d74666608586a89e8bdf45cb0c25cc6b8501853f24d3b113c1f4b0012e3814062868d5f27d465b7c14bade89a3f4a8698', NULL, '2026-10-07 14:51:09.591', true, '2026-09-11 18:44:18.948142', '2026-09-07 14:51:13.514856', 49);
INSERT INTO public.user_refresh_tokens VALUES ('2fbb9463-0867-4798-835b-a38ea0c476c3', 7, '57852908efb789a1742e4490046b6c95d03addcd9d7b951c0dbf320628ef55a1bfc2b8e1b6e0ab612381a4e80cf573a68d0e10a716c56a87002261e20d3a4e06', NULL, '2026-10-12 14:06:48.256', true, '2026-09-12 14:08:34.431904', '2026-09-12 14:08:34.431904', 75);
INSERT INTO public.user_refresh_tokens VALUES ('dc216f14-2001-421d-aaea-f8171d6c4dd8', 7, '04cb73686e72535e23e420e4c0131bd71acfa85f1500606fda41d97043ac6d9621327a9b63d60a92009ff4d4e01d503cad43fe431c9d981ee3e70c701c19f02c', NULL, '2026-10-07 21:49:20.181', true, '2026-09-07 21:49:30.684273', '2026-09-07 21:49:30.684273', 63);
INSERT INTO public.user_refresh_tokens VALUES ('be32ab42-8ece-4a71-87e2-7de8befa6781', 7, '8792e12976ad768c0ea1500425baa6e5dded7eaaab0ea193943cfdf5b165fdc356aaf40cf99426965c6c486a1dd3cc31e50177f1705daec76e1d22bf0191e1e1', NULL, '2026-10-07 22:42:32.792', true, '2026-09-09 15:20:52.375762', NULL, 63);
INSERT INTO public.user_refresh_tokens VALUES ('662d0086-d5bf-4305-9f90-cc264e574bcd', 7, 'fdfb0cbef85f9f84696eea2894f8c55ae67cb9d5fa74fa2f073e29537b04966911d6ee5db6b108df3acde0b4f8f4d83407f092ef53a632ea74cad3dd90f4f8ce', NULL, '2026-10-07 22:07:35.94', true, '2026-09-07 22:07:41.364454', '2026-09-07 22:07:41.364454', 63);
INSERT INTO public.user_refresh_tokens VALUES ('7690c926-528e-45ad-ba60-a8f9541fba62', 1, '3beedb08aa11eb3a7d6147f87a750ac08db40f79f2829ddfeeb87d507c2a378c18f5607c248a4f753b2566c5c22002aa55a56becf0077e3e7b86eea444b5269d', NULL, '2026-10-12 14:49:44.743', true, '2026-09-12 14:50:19.780848', '2026-09-12 14:50:19.780848', 49);
INSERT INTO public.user_refresh_tokens VALUES ('1ef504d7-6a76-4f45-af4a-58666e939c57', 7, 'ac1af6ca42c3708794709241bbf869f2b88ec706d460a5120338cd3aa05977c953db70bc8fe40ce1018e0714cbfc50c5e21fa97f67b4488b9ab59c3e963f910d', NULL, '2026-10-07 22:07:41.373', true, '2026-09-07 22:08:04.428507', '2026-09-07 22:08:04.428507', 63);
INSERT INTO public.user_refresh_tokens VALUES ('629a9309-e5f6-4b68-ae92-7eb79da57936', 7, '6354901448f9dccad894ed2427becc7e19382f090ae5725d3eb0077351c5e2e4938a73d58c11e2d66739472ab2c3ffcf47c19f2cf8cd99bf9cf8baf626fb92b3', NULL, '2026-10-09 16:03:56.906', true, '2026-09-09 16:04:03.585693', '2026-09-09 16:04:03.585693', 63);
INSERT INTO public.user_refresh_tokens VALUES ('7e0231bd-7e21-487c-9029-9b359af0f0e9', 7, 'edfe8779f22223b33211771362f5c694d074d04fa13113c7c6281e626240b2fdea5a15c7801993d20bffc2d7e978ab4ea00fe9beed06025440ea503cc4a9ce87', NULL, '2026-10-07 22:19:45.798', true, '2026-09-07 22:20:02.115897', '2026-09-07 22:20:02.115897', 63);
INSERT INTO public.user_refresh_tokens VALUES ('05cb0662-74f3-4ebd-b475-61f1c34c49bc', 1, '4b70200fb68d1be55969a9b3c5add2ad5e332ec56c2a676ffafd9c1eef485d066407310d5a263cbcebb28f7be2dbf48dc618f607939a12d9b5062080288511d3', NULL, '2026-10-12 16:23:42.486', true, '2026-09-12 16:23:45.074825', '2026-09-12 16:23:45.074825', 49);
INSERT INTO public.user_refresh_tokens VALUES ('d1fdbad1-2dee-45fd-a655-26bb7679b1e7', 7, '8bb346cde7c568d1ee411ec8722178e5994fb60e11cef75457314716a9e279136cb9e1d6ccff359a6157dcbe10e55651b69afb012293cc386020d278f759bd04', NULL, '2026-10-09 16:04:03.605', true, '2026-09-09 16:04:10.227072', '2026-09-09 16:04:10.227072', 63);
INSERT INTO public.user_refresh_tokens VALUES ('1a6ffacf-0acd-4bd5-8783-5a59212d47c7', 7, 'd1f1d6bac88eda42e4643ba8c30a19e8d395a07ab367dfe83a3ebf4c1265e39efb0569bfcc327f56436695e4aa553c374796c05d7712674c42a0e39307411bfc', NULL, '2026-10-09 16:04:10.244', true, '2026-09-09 16:04:15.512276', '2026-09-09 16:04:15.512276', 63);
INSERT INTO public.user_refresh_tokens VALUES ('4e18ad93-d557-4be8-a02f-40aa8e95ef52', 7, '60b1d55e1fa966b70f2f07d84945d0938ad3d13e696bf8c7637e725f16e4c26b280922e3965cc11bfec3a4122dc21791f49979a8c9b78117f5cc77fa9eb9fa13', NULL, '2026-10-12 13:32:15.102', true, '2026-09-12 13:32:31.973436', '2026-09-12 13:32:31.973436', 75);
INSERT INTO public.user_refresh_tokens VALUES ('880f6067-d386-4142-b8e1-07d3e33f65ad', 1, 'b0fa46fbc186355e7f028799693373c39e0b68dbe4c1cc70b3e4e21fc1cee1940974ba33f8f24c1ee3e3a1088638e1857d4c47f2a163f1a39dceed1487867238', NULL, '2026-10-12 14:06:54.937', true, '2026-09-12 14:06:58.808154', '2026-09-12 14:06:58.808154', 49);
INSERT INTO public.user_refresh_tokens VALUES ('ea1c9146-16e7-4b14-821f-55638381bf71', 1, '993634fbb885345948720b86cc28e6770374e25b8ec9d3a15d634027d7f806e65742daf0cbfcf4b97ea517442047a58a69d324f854b032e35f7121c657f2c29f', NULL, '2026-10-12 14:50:08.137', true, '2026-09-12 14:50:08.950621', '2026-09-12 14:50:08.950621', 62);
INSERT INTO public.user_refresh_tokens VALUES ('b6cd5fb6-7b89-4d6b-a19a-a2d76ec211ad', 1, '993634fbb885345948720b86cc28e6770374e25b8ec9d3a15d634027d7f806e65742daf0cbfcf4b97ea517442047a58a69d324f854b032e35f7121c657f2c29f', NULL, '2026-10-12 14:50:08.972', false, NULL, NULL, 62);
INSERT INTO public.user_refresh_tokens VALUES ('936bbb73-bb23-4984-ab77-8ff93351b0bd', 7, 'cb91959a3c819d370886cd4b66fde0a71a1146312bc1e57d0b84f3a66a14e57d5250dd2f643a851a49cce627f929dbc380b75109a0ceded79ce44c12171ba6c5', NULL, '2026-10-07 21:49:30.701', true, '2026-09-07 21:49:39.935396', '2026-09-07 21:49:39.935396', 63);
INSERT INTO public.user_refresh_tokens VALUES ('4002ea01-f25a-4c95-a248-ab99c8a92513', 1, '6cdea80c594aff2354047dcb249bc8413f213698a711d5406c690435045171d3f381571fc033300e36b1e22043cb1a9979b789480b0e4d3bc36bec7e9f2c6d04', NULL, '2026-10-12 14:50:19.793', true, '2026-09-12 15:09:00.337881', '2026-09-12 15:09:00.337881', 49);
INSERT INTO public.user_refresh_tokens VALUES ('7336b6cf-b816-4639-ac2d-bb2a96281df4', 7, 'ec049f98225a340e5421eb5c4f3eccb36c177c8d66a7107a13a83ca22b2909b206faae5abfa3bb166463408d0c9c9a59809043ad2d6d4e2d1173f6ed09017ceb', NULL, '2026-10-07 21:49:39.953', true, '2026-09-07 21:49:47.931661', '2026-09-07 21:49:47.931661', 63);
INSERT INTO public.user_refresh_tokens VALUES ('9a6af178-b1c7-4b16-8ab9-6bba04de9edb', 1, '64d89f5b9b69c07d2b4d133814deeb38fbdf51f09e2af215989c9e5f581c8a0d952ba03dcd068408f532ae67ddf6a9f3fff856ec800ff55c8d7939ad55eed4d7', NULL, '2026-10-12 16:23:45.195', true, '2026-09-12 16:29:53.289161', '2026-09-12 16:29:53.289161', 49);
INSERT INTO public.user_refresh_tokens VALUES ('c36645dc-cc6b-43b5-923e-3439073865ba', 7, '8642bc3f5bf81c7012e8960d858c74539c557cb59cc2587a4fa97b9cb502490e696064a36f8a9ce59a8d921f14d7aebe6f82ffe4009a1b20947f72953becb584', NULL, '2026-10-07 21:49:47.944', true, '2026-09-07 21:50:09.264872', '2026-09-07 21:50:09.264872', 63);
INSERT INTO public.user_refresh_tokens VALUES ('093019cf-168a-4d66-b73f-ca606c255a42', 7, '3e83c3867a992580e6d50467a2d0748350fb6cf1b36b081936caeb58da5709bed971e46d42e361734d8852764ff613578f7753b24669d597400e23e15beb08f7', NULL, '2026-10-07 22:20:10.467', true, '2026-09-07 22:39:04.435871', '2026-09-07 22:39:04.435871', 63);
INSERT INTO public.user_refresh_tokens VALUES ('ca704bfe-5589-4e44-850d-39d787ae5c5e', 7, 'fe62613ce80dd9ea495ecaf6151d4ed05886f398dd79a911bd3d35b4eaf3b04782ae38cf6b2d63e50763ad1cb9146513afd030d2f2bcd384fd678001dd26ba02', NULL, '2026-10-07 22:08:04.442', true, '2026-09-07 22:08:10.381169', '2026-09-07 22:08:10.381169', 63);
INSERT INTO public.user_refresh_tokens VALUES ('58299ce6-7a15-4f27-86c3-54eb3081ed89', 7, 'd01b4d92f99e3c7143cb4bd762961a0bb1e8e4be129e87288858f93dbfc84e8c33de248c85fb8de96ee741189ac30a1b379dd9e887326fb8f016be0b57d98fd0', NULL, '2026-10-07 22:08:10.396', true, '2026-09-07 22:08:41.578304', '2026-09-07 22:08:41.578304', 63);
INSERT INTO public.user_refresh_tokens VALUES ('2c41b51c-87c3-479e-993b-61242cd71c48', 7, '6362b6907388b28cd059fb73a3e56aba68d6d0412cf0cb6f47c202ea1fdb9cf951e13ed274ac5ce7d6ea8e90ccd7f576a4faed00520c975c03f781d08c7a2235', NULL, '2026-10-07 22:20:02.129', true, '2026-09-07 22:20:10.442285', '2026-09-07 22:20:10.442285', 63);
INSERT INTO public.user_refresh_tokens VALUES ('47072119-36e2-45d0-b296-ea883fd1ce61', 7, 'b9030b358a5d6a8e9e124f695b052c59f5f4ded5425717ba4ecaddab2572325a96d9e3a5fc116c69ca8ba0fe2ecc1dd8f73070cd8d5529e04f0a61dad5f116da', NULL, '2026-10-09 16:04:15.531', true, '2026-09-09 16:04:19.891234', '2026-09-09 16:04:19.891234', 63);
INSERT INTO public.user_refresh_tokens VALUES ('9f5d7e01-4a59-4c2f-8236-fe5662e3056a', 7, '607219b790fd6e4d2e841a9afa0d49a7fabbb55be1107056ed5069148616a549d1cdf3c9a3512fcedb29d9a35b7b3251dbc3e15a7795b0697ff95a436c5a6720', NULL, '2026-10-09 16:04:19.921', true, '2026-09-09 16:24:58.634039', '2026-09-09 16:24:58.634039', 63);
INSERT INTO public.user_refresh_tokens VALUES ('82f84cf9-0934-4e80-a5f4-ff69be14443d', 7, '172d2a724fb8388df393e3fb0a7e32c2ad9a5e5c802488b10ca085dd17e6ee342288fb493a0466b3a221204c0cd78939dda68587791ebd1e2191f64cdde1293c', NULL, '2026-10-07 19:46:52.359', true, '2026-09-07 19:47:22.531571', NULL, 63);
INSERT INTO public.user_refresh_tokens VALUES ('25d44fba-5481-4478-8d4a-167e8406245a', 7, '7f67482549637d84c538c49be705326cbaceae108d40c43709734a17ed3cf908c553390ff4e6dbbeec56ad5d261cf8c95d50450fad95854cb2a6ffdaa6a02502', NULL, '2026-10-12 13:32:31.995', true, '2026-09-12 13:32:37.184837', '2026-09-12 13:32:37.184837', 75);
INSERT INTO public.user_refresh_tokens VALUES ('4b362d01-a4a8-4fbf-a313-385f17ef520b', 1, '538d1631aad9f3232e2d2751b1cd90424d5ef61a9c38db53ac9353f682fcb8e1f0266cf557cbe4a5044ef4970852c8725753fc0c8ce73464bd40f65ae02bb238', NULL, '2026-10-12 13:32:32.542', true, '2026-09-12 13:32:37.656998', '2026-09-12 13:32:37.656998', 49);
INSERT INTO public.user_refresh_tokens VALUES ('337bab7d-7e84-4ddf-b96c-fc8f0066bd5c', 1, '6bc45a768eb7dc6ae739f1c127f4dafc589511c8ca148a7ac6ef70323ea88774c8a69a7d23aa287cb3250fe1f9b6a9a57674695df3c8f4e94baa608f8ec3ea43', NULL, '2026-10-12 14:06:58.83', true, '2026-09-12 14:23:09.651423', '2026-09-12 14:23:09.651423', 49);
INSERT INTO public.user_refresh_tokens VALUES ('b6884d42-b35e-4bc0-a11a-5efd321e545f', 7, 'f9e8f45e5130ac1d11dfb92078628b8e790d76ccaebf7963cfca26737f8395856ade987188fe8ab2d2f6e57803c70a50c78aae82ab9906c440e300da444ee701', NULL, '2026-10-07 21:50:09.434', true, '2026-09-07 21:53:45.096683', '2026-09-07 21:53:45.096683', 63);
INSERT INTO public.user_refresh_tokens VALUES ('51ad7e5b-18ed-4bb1-81fb-5de8dec442cc', 7, '58dac34a7a8a015dfa057893838d76d4151cc2bc793787ce05cee55af36dce257679deacd6d75e6e02f43cd33bb2066c43337f0716fed5b460a1a0afb72ce521', NULL, '2026-10-09 17:43:22.755', true, '2026-09-09 17:43:23.386247', '2026-09-09 17:43:23.386247', 63);
INSERT INTO public.user_refresh_tokens VALUES ('0dba1c70-1955-4ea6-bb6f-fa8bd652010b', 7, '14d2ef727dfa4141789fc308e25dabfd1eb6e1ebce9df5b77935e062609867272f7910ed44668c25c70b018c979f32a193b3b26190af13174de68b1ded56b60c', NULL, '2026-10-07 22:08:41.594', true, '2026-09-07 22:15:08.856325', '2026-09-07 22:15:08.856325', 63);
INSERT INTO public.user_refresh_tokens VALUES ('3a51b6ca-5be0-41fa-9c7a-4c636adbe3f5', 7, 'faf072d5abe71ff15214ca24e02f0248d445f2b4988225a909952da2b955ab42203c9164b1bc71b789eb68960ee33cba24108c34bcfd843d9be7abed8bbb1cf7', NULL, '2026-10-09 16:01:37.874', true, '2026-09-09 16:01:38.515345', '2026-09-09 16:01:38.515345', 63);
INSERT INTO public.user_refresh_tokens VALUES ('d842a980-280f-4651-a448-b4a9bf68073f', 7, 'f619349d4d35bae8540b16d5c7dac88d32d1b458d10575c1f731f54871dd0f4752cfef9dafcdc237c7e189c5580fc5acf30f2b244e04d1ce445504a530a136ab', NULL, '2026-10-12 14:50:24.748', true, '2026-09-12 14:50:25.272807', '2026-09-12 14:50:25.272807', 75);
INSERT INTO public.user_refresh_tokens VALUES ('c9fbc1d0-95cc-428d-bd86-05c5f87a4aa5', 7, '7893f7f54d96481334923543e9cc6e60513b9acd825f0bdeb12dca2f8be5d21e40b2909dfcb32dcec90371091d233440736dbb155cde54ccc176d885bdd9ea51', NULL, '2026-10-07 22:39:04.445', true, '2026-09-07 22:40:58.289981', '2026-09-07 22:40:58.289981', 63);
INSERT INTO public.user_refresh_tokens VALUES ('586b9d35-36bb-4f99-bc80-073aa6b671a0', 7, '1911322eb13161f49c0356a908c36c287a71226dc565181e9a2aba6a9037d084e6efab6f0b9649d0e497f42840a7e6f7513884d616a066d353aaa4e679236536', NULL, '2026-10-12 14:50:25.307', true, '2026-09-12 15:11:23.871623', '2026-09-12 15:11:23.871623', 75);
INSERT INTO public.user_refresh_tokens VALUES ('da24ea87-8b89-4a5b-a658-33d8377b66a9', 1, '33917a7805c8b440e16aa356b9372533e341ba92c3ba4bbc4d3553eb73bc1d88f3afade72f013dec3e14d17e1abc3ee7ad4e02a39dec5f4f50b4816fa202b34e', NULL, '2026-10-12 16:29:53.315', true, '2026-09-12 16:42:19.876359', '2026-09-12 16:42:19.876359', 49);
INSERT INTO public.user_refresh_tokens VALUES ('993b90e8-8f4a-4720-8930-b35210a43dfd', 7, '1c0378a913ff9d582073077ca7057b2a5ac02cada142a3f796a0a62b4c7e92aa54268b50fcb1f3eb2b0374f11e9e5750e13cc6f4b6ba77fd5f7550a19f7c8e38', NULL, '2026-10-09 17:43:23.428', true, '2026-09-09 17:43:32.474024', '2026-09-09 17:43:32.474024', 63);
INSERT INTO public.user_refresh_tokens VALUES ('e9853326-c7c9-4405-9529-4de098d43ace', 7, 'cdf523fd776b883ff51f0d4dd53e26e7a27608cc7ebfcf865e2ae8b3f4173f3209a7b35a43c35b41c44acff1b6a90fbce1500b0e5095532687474d00ee45cf85', NULL, '2026-10-09 17:43:32.484', true, '2026-09-09 17:43:43.685477', '2026-09-09 17:43:43.685477', 63);
INSERT INTO public.user_refresh_tokens VALUES ('2d94f6c2-ee27-4bf1-8b95-1445e39c9ba5', 7, 'c587d8d449af6a77ad0d9dd87fe35bea58fb55e111891e7d2fdef4c7543041272284aa2486ca845470cc5e2dd00832102884704d58c87460a7f53a14de2174c3', NULL, '2026-10-09 17:43:43.697', true, '2026-09-09 17:43:50.31332', '2026-09-09 17:43:50.31332', 63);
INSERT INTO public.user_refresh_tokens VALUES ('c71dac26-8313-4af1-8a87-bc823b954ea0', 7, '80410f4e45e46f7732d07cfbc22da1952d6975f7438d69a3622abfa08f511d553ed93780dc006f28385c83dd5926c1eaee209be85e5e08c9b483e7d373fd013d', NULL, '2026-10-09 17:43:50.339', true, '2026-09-09 17:43:55.810907', '2026-09-09 17:43:55.810907', 63);
INSERT INTO public.user_refresh_tokens VALUES ('c1c3dbf2-75b8-441f-821c-5d0233c42809', 7, '49cb0a0e591df23bc5cd93b3239ceed01f414680f8800f80c3ec93b4b2643f646a7128e5ba751b8ddc01550457a1beb5c5e1aad9c8f11d2d7b8bf5080eb6f51b', NULL, '2026-10-09 17:43:55.824', true, '2026-09-09 17:44:02.804546', '2026-09-09 17:44:02.804546', 63);
INSERT INTO public.user_refresh_tokens VALUES ('3e6ccc1a-2ba6-4444-9d48-88d355db3ecf', 7, 'fba9b0a8f38575b7425eb319d5644822bc573dc73fe4ae0731a4457a30cdad8aadaa257ab12963d6c35fa48f215ab6e2744727f6974a89067ded3390dd48742b', NULL, '2026-10-09 17:44:02.822', true, '2026-09-09 17:44:07.496371', '2026-09-09 17:44:07.496371', 63);
INSERT INTO public.user_refresh_tokens VALUES ('6ac6469e-de66-466d-85bf-08b4dceb58dd', 7, '8ed37789868e1458164da02b68fe46fdc910c9c310f21b15a6f34aa3b9bcdb8dfafe48cac07c73f3ca9fe72ebf624a58633c0797cba345689721bedb6490bcde', NULL, '2026-10-12 13:32:37.201', true, '2026-09-12 13:32:44.626894', '2026-09-12 13:32:44.626894', 75);
INSERT INTO public.user_refresh_tokens VALUES ('f90f6e63-f236-4062-b029-91d4c811faf0', 1, '188d152e4b1638ff2d3fcc10fb72641c576655dbee472096e89c98ed66145bf722b927826cdc31a2719e5588c1f0ec09588f1bac66438181d8820840994d1fae', NULL, '2026-10-12 13:32:37.687', true, '2026-09-12 13:32:45.145844', '2026-09-12 13:32:45.145844', 49);
INSERT INTO public.user_refresh_tokens VALUES ('77dbc2da-d03a-465c-a27e-8ca3541b79fd', 1, '3cfdd789fb1fab55dd894a7efe4df28618eca42f0ac7ba8e833ef132627b563f61c519832b3c5fd596209279ef9bbea4188e0da121229948162f85e36fab2abc', NULL, '2026-10-12 13:32:58.538', true, '2026-09-12 13:45:38.392915', '2026-09-12 13:45:38.392915', 49);
INSERT INTO public.user_refresh_tokens VALUES ('bcf892a8-4883-4a50-8bf3-72237347e6b6', 7, '8969441adefe055929448cd9cba91abca4d7c3deb9dc18b2498d2fe98d5ed061da195939a2c89c467bfa35b97ac8daa787f96b6b5c95213b7c86fe201c961593', NULL, '2026-10-12 14:08:34.454', true, '2026-09-12 14:26:28.649839', '2026-09-12 14:26:28.649839', 75);
INSERT INTO public.user_refresh_tokens VALUES ('bf74f85b-a848-4394-9cf3-ff0ea94b05a7', 1, '56da6c4c05173cc127ba437c9ba314a9a730077d8a3f43d51d861d7dedefcd7892d370d6c7913d1760e97672339f1fb24f7f364791f04c132249a24b14e083ac', NULL, '2026-10-12 15:09:00.371', true, '2026-09-12 15:18:45.358104', '2026-09-12 15:18:45.358104', 49);
INSERT INTO public.user_refresh_tokens VALUES ('393a1750-8716-4e48-a4da-d590ba37b0b2', 1, '2e23740dcde354d10cca49834d2c9f2a1f9f839e2234a7a5021c864b7ffb88ad1af866692e279b76bdc55b1dd34bdd5829fb5259f72bc0d4d2d37523c31ec670', NULL, '2026-10-12 16:42:19.911', false, NULL, NULL, 49);
INSERT INTO public.user_refresh_tokens VALUES ('d7ba65c5-996e-4119-bced-319076b101c7', 7, 'd30dd4739a1d3f837df1b1a60cf042d7f80142072b6c53462932c460c53b1755d830777a5a97477fdb34f5bc098c9fb89dbc2e7dcf61aec6457aad749867eadf', NULL, '2026-10-09 16:01:38.56', true, '2026-09-09 16:03:40.975198', '2026-09-09 16:03:40.975198', 63);
INSERT INTO public.user_refresh_tokens VALUES ('b4bf5f25-b7d5-463b-9ddf-88eb656c7385', 7, '90d245beb42aa4d916f5353d023fa02839d9f8573d3d65730ffc951e82c3b1c051df3835cd1820f6e026ed629f113dd1167e01d45b22413c599385c87fa814dd', NULL, '2026-10-09 16:24:58.66', true, '2026-09-09 17:43:22.733557', NULL, 63);
INSERT INTO public.user_refresh_tokens VALUES ('1a36100a-1632-4af0-a7c3-0f34fb3dfcee', 7, '4154fdb8a883dbfb153bf1e0676bc1e09bba8992a298918b9ad093df8c433e6b8b16061fb75203af845341d362da40584ad2575157575f8aadb80f9f68aea05e', NULL, '2026-10-09 17:44:07.507', true, '2026-09-09 17:44:12.411565', '2026-09-09 17:44:12.411565', 63);
INSERT INTO public.user_refresh_tokens VALUES ('83a6f13d-bfdf-47a5-a9e4-592fc045180b', 1, '1763e98a40662a427d7b1f4db302cf658e9fe8e898210156f1e9f6aff5440ee28a6cf038fbf012ec98568534098185b54728805fd10e698aa946a4f33b9a4df0', NULL, '2026-10-12 13:32:45.207', true, '2026-09-12 13:32:58.513562', '2026-09-12 13:32:58.513562', 49);
INSERT INTO public.user_refresh_tokens VALUES ('a2eeb76b-7849-4d5b-8e32-689dc9d8c28e', 7, 'c704200bc42aa5cccb55c0a6a91e2d9350024d4e16d77d53bac6c18dc55bda2d789d1b4ccb9d34aaeee503ad32670b6d8721088268e504097c486e5d2dcd4688', NULL, '2026-10-09 17:44:12.428', true, '2026-09-09 17:44:16.220847', '2026-09-09 17:44:16.220847', 63);
INSERT INTO public.user_refresh_tokens VALUES ('a9256f42-8ac2-4d11-a856-4c1b776f365a', 7, '2c4b105ee866c71b8bcd497badc400bbeef1d0ea29c1a8b12f678d3aaa564fde765303145f82135940e1d2b00c0a1ab29bc0a0a18405a62153c679726f1ec50d', NULL, '2026-10-12 13:32:44.656', true, '2026-09-12 13:33:17.168287', '2026-09-12 13:33:17.168287', 75);
INSERT INTO public.user_refresh_tokens VALUES ('2c620bdc-980d-4cf2-961d-2451094e8dbb', 1, 'd5ae718e24ac34d06c02937d1f0a6b47191847460cf6e9112547e4afdbcc43ea380e332e84206fe63341c8d8abda20ddae2a0d495b4fdd854c259753e38f96f9', NULL, '2026-10-12 14:23:09.718', true, '2026-09-12 14:24:51.843463', '2026-09-12 14:24:51.843463', 49);
INSERT INTO public.user_refresh_tokens VALUES ('3052969a-de15-4965-9c6a-15d34b54b803', 7, 'bd7444368d75dc2027b0d346493d03a34a65239f82ef1fd59982c202e6eb20e9da1efa55b7e51492b844045a56efb314c46e3dc0c559f8b1c151625a5c97e0d5', NULL, '2026-10-12 15:11:23.93', false, NULL, NULL, 75);
INSERT INTO public.user_refresh_tokens VALUES ('2d0c8e57-8344-4f8e-9b04-944f9fc1a078', 1, 'd5c1b5f244862c2e12f0963acc6a918199e4a0ae045480f0144fc50bf2e22347d8c7bb24762fd09cc0d111d8342cfacbf36dc7221bd89fc64bb0dba3785194e4', NULL, '2026-10-10 16:14:29.463', true, '2026-09-11 18:44:18.948142', '2026-09-10 16:20:53.075748', 49);
INSERT INTO public.user_refresh_tokens VALUES ('4d69a5d8-188a-4d03-82a3-78d2f5ef6347', 1, '9931a1ab0413986f762c605f702e62fd2ff28a975f60eb0476ac5e6d94c990da6f54225a17d82acb8518ab88b94fe01e80775c25ff90f433c2dc1731adf34db8', NULL, '2026-10-10 16:32:34.34', true, '2026-09-11 18:44:18.948142', '2026-09-10 16:32:35.026658', 49);
INSERT INTO public.user_refresh_tokens VALUES ('a3f68403-c6d2-40ed-b9f6-cfbcd7b7aacc', 7, '9984f304f950166f7e0ba0e555b7e4e50910daddec3477d7591cc0009fe70882381eb899d26c6386178f2eb0def935caf4cc3fb5ff87b90406beca03428f47fd', NULL, '2026-10-09 17:44:16.238', true, '2026-09-09 17:44:25.24975', '2026-09-09 17:44:25.24975', 63);
INSERT INTO public.user_refresh_tokens VALUES ('0eeb3aff-a336-4609-bd62-86f90b8163cc', 7, 'edfd69ecc025245c44cf1f9a034fbf203bc023ea14c66fb4cf741de97e7b8ca6cdf844d08364eb0360f98ba2dbb56af20b80cd267cd395f432f791c56847f9fb', NULL, '2026-10-12 13:33:17.239', true, '2026-09-12 13:39:46.348344', '2026-09-12 13:39:46.348344', 75);
INSERT INTO public.user_refresh_tokens VALUES ('8e7d3c49-bcb9-41bd-ae75-daecf72b045c', 7, '2fc00b3999e39b9bf0736cbb5e71df945a4d0e019340083cd2e235fb72056a26f1777606746367ed49447859b7970f955c800020424deaac12adfbfbda5ab27f', NULL, '2026-10-09 17:45:45.946', true, '2026-09-09 17:45:51.034125', '2026-09-09 17:45:51.034125', 63);
INSERT INTO public.user_refresh_tokens VALUES ('711729cd-9a53-45c1-ab71-1989649b00a7', 1, 'a6e5ef4daab592675cb29fd8bad7855066c1c84c2b0eee6d30950ded44e607ee482bc309a663c54a25c5a4f8351b7a291c554e7f9c97779771a035482eea809b', NULL, '2026-10-09 17:44:13.88', true, '2026-09-11 18:44:18.948142', '2026-09-09 17:44:17.582705', 49);
INSERT INTO public.user_refresh_tokens VALUES ('1cdede4c-1459-4b7e-88d0-226bd55254e9', 7, '07fafbaae95f9c2e54fa10471b556ecff9b4e6a0121f3e7c75ddb67c14901b5a880c53d4117d7a33c3a56b241371d5dc19af430cb9ea4154f2a5a6a531bc52cb', NULL, '2026-10-09 17:45:51.048', false, NULL, NULL, 63);
INSERT INTO public.user_refresh_tokens VALUES ('527cbd94-e368-4afd-89e2-be8e88a5f40d', 7, 'd65493a4b29ff32bb34e9d0bcf7a16304db54db9c8729b404f3626a09c7caac8d8be0a9e78b0caacd6f3996615b5082948e5cbef5fa0e2da1c33e1dc75eed6da', NULL, '2026-10-09 17:44:25.306', true, '2026-09-09 17:45:19.119677', '2026-09-09 17:45:19.119677', 63);
INSERT INTO public.user_refresh_tokens VALUES ('8d33e589-c0f5-4f20-8b17-09b40fba0041', 1, '55ec87c6a6fb5a68bff09bd871830e5058771f25ef343205a89e5d21842ca2f4d2b3d59e8b9316035b92bb719a79b404ff290e0864b2ce488b8d8576f42e6c37', NULL, '2026-10-12 14:24:51.856', true, '2026-09-12 14:30:38.370841', '2026-09-12 14:30:38.370841', 49);
INSERT INTO public.user_refresh_tokens VALUES ('8cb630ea-72fa-41d1-b0f4-48ee1359cde0', 1, '21706c462a2a2862f1b942648b167e1174cd08a71242e6995c4fce4fda186645d7d97c7f392861478540b5e14605b5505a6825ed38d15ce4876ea24bb412a01d', NULL, '2026-10-12 15:18:45.413', true, '2026-09-12 15:50:13.169893', NULL, 49);
INSERT INTO public.user_refresh_tokens VALUES ('3505da5b-a9cc-423d-9aea-97057fab016f', 7, '0953fb07efb2fd36caa474b2a1f0d47bbba1fb19e31ce1267732194dceb0089ed900ff438c90335efc46d275a1d2584ec5424f798f02b1f43b28cdbc72774613', NULL, '2026-10-09 17:45:19.153', true, '2026-09-09 17:45:24.385404', '2026-09-09 17:45:24.385404', 63);
INSERT INTO public.user_refresh_tokens VALUES ('f717f3a3-a3da-4cde-8f32-3849ef4bfd55', 7, 'fd5dd0946ac9ff41ca5e43f42f0993bbf425e9b37939afe93d1b18b6b65e2fbc6ad59d1e0439547bfe1f20af8ae18fd2a2e4fcf956bc4837da84449a24cead5b', NULL, '2026-10-09 17:45:24.425', true, '2026-09-09 17:45:39.155623', '2026-09-09 17:45:39.155623', 63);
INSERT INTO public.user_refresh_tokens VALUES ('74bb2bc0-15ac-4f8f-b2fa-03cc91209cc5', 7, 'c6ebfd11190efe58e8bd9cfb222cce781e0c7c3c88a28f3710085834b2e73965dc2e6f517b1035dce091619e1d06bad3c9608f337d8365497181a509e57dc67b', NULL, '2026-10-09 17:45:39.175', true, '2026-09-09 17:45:45.917854', '2026-09-09 17:45:45.917854', 63);
INSERT INTO public.user_refresh_tokens VALUES ('9e527ac5-639c-4582-921b-b16b03eb452b', 7, 'f6291206505c5f09ccc9c9de6eb2856bc5e507b62313f8b778f1760d50a18ef6f55e5b0f798c83cc79364d75134347330933d2b112b088667602c5bc51620c0e', NULL, '2026-10-12 13:39:46.413', true, '2026-09-12 13:39:52.575693', '2026-09-12 13:39:52.575693', 75);
INSERT INTO public.user_refresh_tokens VALUES ('99353508-1d87-4e27-9b38-100474ce1265', 7, 'e30a20dc75b3299b93d4da190f5198e2270960be6798264258f074fb251b87b827b62de3ad4299ac9fd332e1c982d4522e67af5dd9309874965121e24d2cf2f1', NULL, '2026-10-12 14:26:28.673', true, '2026-09-12 14:43:51.47389', '2026-09-12 14:43:51.47389', 75);
INSERT INTO public.user_refresh_tokens VALUES ('4b55a583-957d-433c-9855-b9ec7b0fcd02', 1, '1316bf02b450681b14b62a552f766e7f811368545a7f0929c76c38a01eac546fbf0e968d378322488fb71f6cbecd284a323833b213695e741896ba3ea5313d04', NULL, '2026-10-12 15:50:13.203', true, '2026-09-12 15:50:15.166463', '2026-09-12 15:50:15.166463', 49);
INSERT INTO public.user_refresh_tokens VALUES ('50f9c29a-33a8-4a66-8753-6f8d9cbb0320', 1, '5c3ee9aef525722914f8035c185543f555de59a714c6bc30d527977f5925a5bd84b8243ead2fa84ef93dbcb9af51ba4bb0edaabbb9c9c316efd6d090e319519e', NULL, '2026-10-12 15:50:15.201', true, '2026-09-12 15:50:21.630921', '2026-09-12 15:50:21.630921', 49);
INSERT INTO public.user_refresh_tokens VALUES ('fe5b11bb-79a1-485c-bbdc-cd91b26568bf', 1, '8f009985a654322a8c7e957894d735411018ea6f8fcab883332805847a845adf70c2325a42a0aea533e0becd7c7745e9288ad6b3ea3802ed39a715ec67ec1ba5', NULL, '2026-10-10 12:59:35.128', true, '2026-09-11 18:44:18.948142', '2026-09-10 12:59:35.943046', 68);
INSERT INTO public.user_refresh_tokens VALUES ('4daf931d-5ef2-4d5c-9154-cdaa8683a7cf', 7, '9c1cb219a2163d4c87eb78f701294eb48816e5e0e586e10ee4b9619dc2c28be0e84513af329af99314ba8d0ca5232ba63f0e23828b00a52586fc3a1c4546202d', NULL, '2026-10-12 13:39:52.608', true, '2026-09-12 13:50:14.521278', '2026-09-12 13:50:14.521278', 75);
INSERT INTO public.user_refresh_tokens VALUES ('2a994f1a-c4b2-4ddb-97ab-24983555f834', 1, '249c1c90b80a67a94e4d1183defe1348674a991b38cd42f2db9ba8b699501ebdb77be72a59b9d8f7784f6f9a686adfc1078bcfd6b7b85b953a750f7b750c9b8a', NULL, '2026-10-12 14:30:38.419', true, '2026-09-12 14:30:42.721987', '2026-09-12 14:30:42.721987', 49);
INSERT INTO public.user_refresh_tokens VALUES ('caaa6603-2be2-45d4-b02c-3fd55686816d', 1, 'c555bf03e93e34d84c22d72888cac607dfa3d1927d1e3c0e1423af8767420e69c68f0054be45d5952d3d1ffa801bc6f2c461eca071694aa5ee129f05f7ba21fb', NULL, '2026-10-12 14:30:42.748', true, '2026-09-12 14:35:30.517336', '2026-09-12 14:35:30.517336', 49);
INSERT INTO public.user_refresh_tokens VALUES ('fe02f777-bbbc-4244-8c39-ca9f649317d0', 1, '4d5217313c650734af29a951074d3d29426ff9dc54776ca56fbb37c4a6a93a3d51f15d4c94ddfebe107727a3fa8e551f4cd187361ec99e67b64a4672783790d0', NULL, '2026-10-12 15:50:21.654', true, '2026-09-12 15:51:45.577588', '2026-09-12 15:51:45.577588', 49);
INSERT INTO public.user_refresh_tokens VALUES ('17a099ac-d1f1-431f-8c9e-d56db381f4e7', 1, '8c03b0edfe7f26ced0b3686de9df7a190ae5c356e2cd0341e35ac41e7b57adf0fb4899505345a507b8f33e8ee8bb89eb0186c09c7d52392257fc7a063f3f63f6', NULL, '2026-10-11 17:38:37.209', true, '2026-09-11 18:44:18.948142', '2026-09-11 17:38:37.972709', 49);
INSERT INTO public.user_refresh_tokens VALUES ('0e3db310-d482-4af2-9ad2-b53fcfd8afab', 1, 'bd9168b01ab46a95c69f4ae01bc702f818ab9676d574261096ee26f845ba4dedd090cf3075dc184033661e39ae5c36a7c71f97351d42767dd3337ba90e9756ae', NULL, '2026-10-11 17:38:38.034', true, '2026-09-11 18:44:18.948142', '2026-09-11 17:39:06.150054', 49);
INSERT INTO public.user_refresh_tokens VALUES ('8b7eb5ac-b127-47ea-b370-cf0b8127809a', 1, '36efd22e02ad963c65d3f91417b557e73d07e85903f24579db6d06cc5ccd1e6128d147e74b79f0abbe1e434996bdbcc8ff5637669e15bfdfcc2bbc7c87408634', NULL, '2026-10-12 15:51:45.663', true, '2026-09-12 15:54:01.769096', '2026-09-12 15:54:01.769096', 49);
INSERT INTO public.user_refresh_tokens VALUES ('36eb606e-ce0e-4b31-add2-8520679452bd', 1, 'e68dae6bc061f8549b6e3867666eb4a3a8b78e7027c6a1fd622941f32e7b38d65e4f70821b03c00b4480fff1e8c153608daf9b6f68b7ef118ba6beb82c83ec88', NULL, '2026-10-12 13:45:38.413', true, '2026-09-12 13:55:28.440325', '2026-09-12 13:55:28.440325', 49);
INSERT INTO public.user_refresh_tokens VALUES ('c471f514-2a89-4db0-a3d7-dd9deefa728d', 1, 'befe57c375c5e88012c77a1e15c509fd0e209d5ab42073f660cc7c107b62c5b64787b294b2c2758f141df7b98b9e1eac47afb2ca62dc75f25dea27459770074a', NULL, '2026-10-11 18:27:09.661', true, '2026-09-11 18:44:18.948142', NULL, 62);
INSERT INTO public.user_refresh_tokens VALUES ('9710b073-6f3b-4546-a24d-97b2dd400f66', 1, '1eeb7688b2d81f9bee2c54d924f812070813b070ca5c5f57ac28d3b21d5daad4acab9f4411edb37a8e720e5a765d20cbecc6f0f407b72c615fd58fbddb95c5b1', NULL, '2026-10-11 18:38:11.943', true, '2026-09-11 18:44:18.948142', '2026-09-11 18:38:13.028', 62);
INSERT INTO public.user_refresh_tokens VALUES ('f7072768-81bb-4626-af50-0f49d8d55ef0', 1, '74dbcbbedb0a0c59090593d46f4d5604d79db2d54114ece07a09fba19f748d8139e9126130ee8b242f140d2a64b203b300d56bf10c33cb2071b5e2c4d1bb60a4', NULL, '2026-10-12 14:35:30.546', true, '2026-09-12 14:44:15.413497', '2026-09-12 14:44:15.413497', 49);
INSERT INTO public.user_refresh_tokens VALUES ('645d9417-5c39-43e0-b00a-01468be33d66', 1, 'f0529f2bcaac6b5fa464f27b8a3feb06a0ef63c286df984562116178e276fa8f87f86b17b4bade4f07fb5f95d7ba5fa62379ce0700cddcc3cd371fdeb702c81d', NULL, '2026-10-11 18:38:13.071', true, '2026-09-11 18:44:18.948142', NULL, 62);
INSERT INTO public.user_refresh_tokens VALUES ('333ff262-c158-4326-9053-dfa5f78d5e67', 1, 'a37a7d269711d114ac65cdab89a1a0737477451ed2a4739926dd5ab4bf0e9a4296aa107ffa238ee4888643865e8d6183fb81970b7a7a89ea928b594751866bf1', NULL, '2026-10-06 20:17:20.122', true, '2026-09-11 18:44:18.948142', '2026-09-06 20:17:22.639513', 49);
INSERT INTO public.user_refresh_tokens VALUES ('f01b4d65-0931-427b-9724-9285d8a5392c', 1, 'f87f54e5675baf8788c3b8760c11219112f9e98eb2e92b3027add504a2c44bc3f111c5b8efb6797b5f919fb1758ff3f43d5e03756cdae6a32c9ed1fb2df5c322', NULL, '2026-10-06 20:17:22.659', true, '2026-09-11 18:44:18.948142', '2026-09-06 20:17:25.051144', 49);
INSERT INTO public.user_refresh_tokens VALUES ('47fb0ff1-ef72-4727-9608-4f5908e3f200', 1, '9406ec83165b4ecb72466e060e13c8221b9770f85fac38268888800a90177e2f82b0489ea667343b9db765def881d7f0c255e45b0ea310872fe45e65ab6851f3', NULL, '2026-10-06 18:53:17.413', true, '2026-09-11 18:44:18.948142', '2026-09-06 18:54:05.804922', 49);
INSERT INTO public.user_refresh_tokens VALUES ('9a6b880f-aed2-417b-8456-77303ff2a8f2', 1, 'bef77b9be30d87c153feb007707233e14e48b75ddba405a5fb6b111756da987e54d22124ff623379f82f934ceac9a086c26065a23d51119233878a9b96bd529d', NULL, '2026-10-07 19:16:44.322', true, '2026-09-11 18:44:18.948142', '2026-09-07 19:16:46.935799', 49);
INSERT INTO public.user_refresh_tokens VALUES ('8561f216-79a7-45e2-a9a5-478636a2cce5', 1, 'e01dbe15c81cc4a51a7c9fbd26c734014d95f2e80edc983e5127b188734c3fb4d330fa57200ad7677aca643f09fe2172cee867a0b166ac92ac65499783bf56c4', NULL, '2026-10-06 19:06:07.95', true, '2026-09-11 18:44:18.948142', '2026-09-06 19:12:39.056872', 49);
INSERT INTO public.user_refresh_tokens VALUES ('28216750-1b28-4c2b-972e-b775d6f39239', 1, 'c47cc048e7ddc1990110f4d27ff88a2b02b78ca04ee0cdbddb3664fdbd31561d56a9d1275292442eadae15d8fc37e157d1bfd4f37cd57949000b4be8a4c7adbb', NULL, '2026-10-06 18:34:57.691', true, '2026-09-11 18:44:18.948142', NULL, 49);
INSERT INTO public.user_refresh_tokens VALUES ('51fb0d43-1837-43db-9cac-b6d700693ad5', 1, 'f5e1f0396d600801ab3e34fbe1e400dc3026bd5ee0e40b900065244780e72971b31007c715a33ab07c4692ab0143edb2ff7ea87607436b16340a802f60b39fbe', NULL, '2026-10-07 15:52:45.692', true, '2026-09-11 18:44:18.948142', '2026-09-07 15:57:05.466473', 49);
INSERT INTO public.user_refresh_tokens VALUES ('912523a7-fe91-4641-9807-cbaf95e107b1', 1, '2384f59f60597876b9ade4a28a84f66831a294a9201c67e5d063a07c7c6cce2b9847e2ffcbcf46a88ea7f381a54e28e6fbecbcf1a92c08673db2a407975cdab4', NULL, '2026-10-06 18:53:16.206', true, '2026-09-11 18:44:18.948142', '2026-09-06 18:53:17.391731', 49);
INSERT INTO public.user_refresh_tokens VALUES ('a78849a1-6827-4864-95df-22e3e6624144', 1, '6b81667faef555538b98ac1e163a440255db767bd6fe2e23c1f4eb2073983d91614d410ecde45c4b5b3dfe6b5539714ac35d9bfd0bbf228c42a3c2b5fe612fce', NULL, '2026-10-09 14:41:13.581', true, '2026-09-11 18:44:18.948142', '2026-09-09 14:41:14.066654', 49);
INSERT INTO public.user_refresh_tokens VALUES ('8713d83f-6348-4e51-b8a0-fb1e27386103', 1, 'b51ac791fb6a50017de3cbc5f1482c2651aa0397ee34cbfa07badbc99a93d9c49b80fcb13e0b6949d770f118945ef5b34dd129f602e34a76e68ea78e335b7505', NULL, '2026-10-07 19:16:46.954', true, '2026-09-11 18:44:18.948142', NULL, 49);
INSERT INTO public.user_refresh_tokens VALUES ('23ad1ccc-8592-4c14-b6db-c950236ab12b', 1, '00bb62bb33a83ad26b9911ffdba49cd42095b4d457a368f6ef713b07a84ad81ec60a33c7650772e5b931b8c0b3d78dc5eebb6370702764e67a3623441d5d7bd8', NULL, '2026-10-07 16:28:26.113', true, '2026-09-11 18:44:18.948142', '2026-09-07 16:28:26.999942', 49);
INSERT INTO public.user_refresh_tokens VALUES ('f9dade5e-d3cd-4003-a6ef-fd17e069ad37', 1, 'ff608c3ccc6213bde2b4da86572960300c6c9817130f8758ec9d7ab7e16e5bc39e0661fad9c49897fb40af8e3b4b24fcec5546f4f9f34664e422b2af6a2666d3', NULL, '2026-10-06 18:54:05.832', true, '2026-09-11 18:44:18.948142', NULL, 49);
INSERT INTO public.user_refresh_tokens VALUES ('086e5fa7-d2ff-4d73-824a-668b5d8f2d86', 1, 'e36c8c3142c3af1997fa78ac0824fd64aa46af8bb3bd16ec0b7eaaef7650f3130a625baa19152d82424fd74b11ea8bb7ad413dc0b65ad4ec512d4ddf48fb59ec', NULL, '2026-10-09 14:51:33.869', true, '2026-09-11 18:44:18.948142', '2026-09-09 14:52:37.663677', 49);
INSERT INTO public.user_refresh_tokens VALUES ('b883eb5f-703b-4cc0-809e-9e44662b91a1', 1, 'c5ba1213c44a7fc9692fcaaac3936458b2367c50e9ab7d5f99038c31d23bfc0feff80a25e003b7851ecf265e2fb05e551801965e60579b40a618c0bc88463fb0', NULL, '2026-10-07 16:28:27.191', true, '2026-09-11 18:44:18.948142', '2026-09-07 16:29:48.81744', 49);
INSERT INTO public.user_refresh_tokens VALUES ('ea7bcfd9-f5f8-467b-ac9a-7f12809e5507', 1, '83d52ab271db075de71103baa6d586d7d80dd7ef8996c66a620f32fc0431436a96779d44eae165fc8eebc1791a6fc7fd84eaff65fe2f212a2d0a75ec70047db3', NULL, '2026-10-06 18:54:50.414', true, '2026-09-11 18:44:18.948142', '2026-09-06 18:54:50.990232', 49);
INSERT INTO public.user_refresh_tokens VALUES ('08929859-26e1-401b-9090-3393b06e7d78', 1, '8f0f304d9c8a31a649752973f9d5ca3e28df6a1421ebee090503e4bd863229b57e3fe42485dc0fefe6a2de8869798c904f08565bb89a15bbf9e57d2360da3091', NULL, '2026-10-06 18:54:51.017', true, '2026-09-11 18:44:18.948142', '2026-09-06 18:59:48.532436', 49);
INSERT INTO public.user_refresh_tokens VALUES ('a633522b-0c41-441b-afaa-c7c781bf9356', 1, '4f4fe877d9c3b1d00b4aabb237939ecf527e3b0c48ece3847c5bd40142052c956635e41e8c31dcf76ae83990812369a2fe03e9967fe268910d310457c630eaf9', NULL, '2026-10-11 18:41:44.919', true, '2026-09-11 18:44:18.948142', '2026-09-11 18:41:47.738639', 62);
INSERT INTO public.user_refresh_tokens VALUES ('fa571a2e-16b3-49ee-b146-a798b45a2337', 1, '1e66b24851ea06123b953d39582d36d13be699359bc4d493f7813e94d4b512f1d7da26362d3f1de652d31233542ec2e7f056418641be1512c1f2d7f06b944afa', NULL, '2026-10-11 18:41:47.765', true, '2026-09-11 18:44:18.948142', NULL, 62);
INSERT INTO public.user_refresh_tokens VALUES ('019c2675-46df-44d4-a168-5ea770db663a', 1, '87f8bdbffe68eaa14a9e97c53ce978f3c0beec07bf7d2cf2bad2935083ad860740d698d76b7612e7d09af82d952410a75477f79a856210b4ff709e1d30c48ffb', NULL, '2026-10-11 18:42:05.084', true, '2026-09-11 18:44:18.948142', '2026-09-11 18:42:06.069406', 62);
INSERT INTO public.user_refresh_tokens VALUES ('eaa9df76-894a-4b78-bd56-e8064b962ce3', 1, '195583fbbc643299c0fdfd04ff15c9238f1bc6cd421a05b35b9480bf9924593b1249c2899d8346393c97f8b7c4a2ee56fc7fc64040c613c6168a97f8435a919d', NULL, '2026-10-11 18:35:16.779', true, '2026-09-11 18:44:18.948142', NULL, 49);
INSERT INTO public.user_refresh_tokens VALUES ('fc925eb9-5d36-4432-ae6e-551c08547b9c', 1, '916bcb2e44cedb83b42a85cf1f0580bf34480baed4178dcbe7cc96835b7451dc71e24b37e4ff18b6906af29fed95485b68abb999c3260541acb2d1958ef4a2cc', NULL, '2026-10-11 18:42:06.096', true, '2026-09-11 18:44:18.948142', NULL, 62);
INSERT INTO public.user_refresh_tokens VALUES ('7c2d29a7-22d4-4167-9360-bd2e2ea19ad0', 1, '3c297a0969f1fa2d2f29d32972f7bc3a07899da747b54920d5f08039257d736db83afb964217f66a74b09cd3743e6039b7c1df94f714e592c7bd9d33b72923b0', NULL, '2026-10-06 19:33:32.517', true, '2026-09-11 18:44:18.948142', '2026-09-06 19:34:17.735391', 49);
INSERT INTO public.user_refresh_tokens VALUES ('45379568-80e7-4010-84f0-3a02672d1f79', 1, '4d581c5f708d28a2d86cfda62c9b9606d9c4ef2c627e12073b2c4635030b7a514b9b1f4c65ac02a7542119323baec6d579632427d5cfa77613d322df2822f435', NULL, '2026-10-07 19:47:48.34', true, '2026-09-11 18:44:18.948142', '2026-09-07 19:48:35.847271', 49);
INSERT INTO public.user_refresh_tokens VALUES ('16fd8193-29cf-4eaf-91bf-65f29abf3266', 1, '52d04c9c1456dd16369eafc6bf5a1d0f3129205c2fb33897f0f730a5c5550cbe3cc18bc12721ad820b7abfa56eb86e3d8f8f1dd790d42d9e9cde61c1faa746ed', NULL, '2026-10-06 19:21:29.177', true, '2026-09-11 18:44:18.948142', '2026-09-06 19:26:44.787529', 49);
INSERT INTO public.user_refresh_tokens VALUES ('189de2eb-a53f-4df9-bd36-e28f8aafc4c5', 1, '0724e62a453acff9160e382b15d695043c9cb1b79c91bd956cdfbfed9d378f839bbf157437bf638d04858105d02bae8d3a5ff551eb9c00a213b831f60d39eafa', NULL, '2026-10-07 21:29:01.033', true, '2026-09-11 18:44:18.948142', '2026-09-07 21:31:30.974398', 49);
INSERT INTO public.user_refresh_tokens VALUES ('e127c69c-886b-4767-930e-299c1c3369d5', 1, '7a2b67ee06dc6432cb467fe1a9ddb5b687da8d51c825f7abd0a2595e2294f298dee6e3b724595ba61429968fa2c5907216b2a08cca07dde7196af9fd057a7622', NULL, '2026-10-06 19:12:39.081', true, '2026-09-11 18:44:18.948142', NULL, 49);
INSERT INTO public.user_refresh_tokens VALUES ('47b0cacc-2f8b-4b96-b473-f9f17485bd85', 1, 'ea7cf6a62f285fb245e63f9614a29681ffc8924d8f0b9471828fdb62598de49de1b18fb16b2ee88c674ba4a9209b74dba3f9494d3af5b21b001a3a5d659f22b0', NULL, '2026-10-08 00:59:17.494', true, '2026-09-11 18:44:18.948142', '2026-09-08 00:59:28.761638', 49);
INSERT INTO public.user_refresh_tokens VALUES ('20bddece-931b-4c02-8269-a6912e6b3e96', 1, '8087ac14b241688eee8b8b9fcb5168d6f26f6bd3af0c3e8f481ecca97dcc7198110e46c40998584e5e61aace433b6c3e9584dd51ea2efee3e9717ef2fe783bfe', NULL, '2026-10-08 00:59:13.419', true, '2026-09-11 18:44:18.948142', '2026-09-08 00:59:17.483651', 49);
INSERT INTO public.user_refresh_tokens VALUES ('6c35a8e5-dc86-4da8-aac6-ddd623930d5b', 1, '44b03ad5dda50c46789a7280819ef68631eae1f715fb2b646d73e10ee87d0260144e69c86f15864e8b36ff1c0be71c4a7bed5fcd35b79b0fe0312173389d24b2', NULL, '2026-10-09 14:07:45.449', true, '2026-09-11 18:44:18.948142', NULL, 49);
INSERT INTO public.user_refresh_tokens VALUES ('7f4b35c9-2aff-4317-8dc5-71692a690b71', 1, 'a8bf3167490da580ece4ecf162165bcc7cbc74b19a55eceda11e956d85e33bdd7f11367eda8a73a9939816c96f92fdb6e9d13f617da817820c500462e21f0957', NULL, '2026-10-10 16:08:10.839', true, '2026-09-11 18:44:18.948142', '2026-09-10 16:08:11.296242', 49);
INSERT INTO public.user_refresh_tokens VALUES ('0697a1a1-a61f-4551-8cca-2b0b08ccbdb2', 1, 'e0741ef3ee0eb6faad057fb940d79aac878fd0c15f1d90efb13f8f47facfce16063b11c7b0b34b45f93772e286eb9622394c73bf1f717bb589c0753e31f10326', NULL, '2026-10-05 19:47:56.792', true, '2026-09-11 18:44:18.948142', NULL, 56);
INSERT INTO public.user_refresh_tokens VALUES ('6568b40f-59c4-4598-af1a-6a2d646cbb55', 1, '36d8b0a7d2ef1b56c194cf275d88cc535cbe6681de9f38c8e0d367378ac2745169f6e618ec6896f55efac503e6c1f6dd45578882ce22d2c78d0fc49f9f0bee3f', NULL, '2026-10-06 20:17:25.074', true, '2026-09-11 18:44:18.948142', NULL, 49);
INSERT INTO public.user_refresh_tokens VALUES ('ebb5fec1-5472-4669-a7e4-4307010cf5a0', 1, '25e6a81ea07af0bbce9f1f5b31a613d11f4ac71b2a86e046658438c9e79c1af3dcc7d5d45697f92548f12a2b8d5661a1b9a801e7e4ec1b6bf92255c4501e8c8d', NULL, '2026-10-06 19:26:44.85', true, '2026-09-11 18:44:18.948142', '2026-09-06 19:33:02.622608', 49);
INSERT INTO public.user_refresh_tokens VALUES ('93a8f991-4e72-424b-84a1-36c2957023bb', 1, 'c9d1a345faf6058a988b6a11bdbf4c54ac316110a49217aa0da8deed9a6d47c0c8955729ec8501bacd68b4ca1bceabbed04423f52eaf2d9910f4b89c5aa0ebcc', NULL, '2026-10-06 19:13:42.544', true, '2026-09-11 18:44:18.948142', '2026-09-06 19:13:44.305026', 49);
INSERT INTO public.user_refresh_tokens VALUES ('838d1940-6e1f-4ca3-b9b6-2705c1ba2fc5', 1, 'f0cea81d03f87262d04f4a768f2c99ca083c59ba01ef48832bc8586ba0fffd857632aecd22ee6c50de7af64ca0a249923adb617d82bb8871eddba54e0d741a49', NULL, '2026-10-07 14:52:22.117', true, '2026-09-11 18:44:18.948142', '2026-09-07 14:52:26.383696', 49);
INSERT INTO public.user_refresh_tokens VALUES ('d047829b-435a-4f8a-b77f-89e13032b2c7', 1, 'c156d844a8a15da8b3a6f79d0709489a30cbf363ff1a7f5787865ac118da6d91141404713d7ec9858a23f03825fcfa9523036fb4a3885f0d95a7f47ef0a7faaa', NULL, '2026-10-06 19:13:44.322', true, '2026-09-11 18:44:18.948142', '2026-09-06 19:21:29.140141', 49);
INSERT INTO public.user_refresh_tokens VALUES ('44d63666-7aee-4791-b675-6e17fa9960b9', 1, '4e6be1b33bf1ad6fe35b73f9fabe7c1558f59a5758405d4e850e0718ef44091a250319d7d9709b0967f2ad31e028d7f36750e321f10744f68d1dff557bdfbfb5', NULL, '2026-10-07 19:17:33.675', true, '2026-09-11 18:44:18.948142', '2026-09-07 19:17:34.158082', 49);
INSERT INTO public.user_refresh_tokens VALUES ('6da4fc14-9d3c-465f-bfd7-ccfa033fe318', 1, '4aa6a94839ea8ee91d7588422c477d51539ebe7d2e010dab741a061ec0c30d3c2d93e29982db51dc32224c0bdaad483cd32e339bde3014c77856435f090cd7e7', NULL, '2026-10-07 18:29:17.63', true, '2026-09-11 18:44:18.948142', '2026-09-07 18:29:18.391815', 49);
INSERT INTO public.user_refresh_tokens VALUES ('4238b01b-4ab8-4bea-833b-7aa020e86f2e', 1, '3c297a0969f1fa2d2f29d32972f7bc3a07899da747b54920d5f08039257d736db83afb964217f66a74b09cd3743e6039b7c1df94f714e592c7bd9d33b72923b0', NULL, '2026-10-06 19:33:32.567', true, '2026-09-11 18:44:18.948142', '2026-09-06 19:34:17.735391', 49);
INSERT INTO public.user_refresh_tokens VALUES ('9a64b505-9c41-4e14-adc5-ef589563797b', 1, '0012a247754127b35e1fe2413fcab69d24f1fd7da568901e8150364a59b0d07e3b0912fb29145cd2864912f09bc9912d778899318f64400846e28cd46ab8f8f6', NULL, '2026-10-06 19:33:22.625', true, '2026-09-11 18:44:18.948142', '2026-09-06 19:33:32.502472', 49);
INSERT INTO public.user_refresh_tokens VALUES ('e4a9af5d-ac55-48ed-b4b1-76dc628b4509', 1, '0012a247754127b35e1fe2413fcab69d24f1fd7da568901e8150364a59b0d07e3b0912fb29145cd2864912f09bc9912d778899318f64400846e28cd46ab8f8f6', NULL, '2026-10-06 19:33:22.786', true, '2026-09-11 18:44:18.948142', '2026-09-06 19:33:32.502472', 49);
INSERT INTO public.user_refresh_tokens VALUES ('b7e7ce05-11a9-4990-ae18-0669c0c82bf7', 1, 'b9901e97e1135308a6cdcc4818ef04881537567e12080902cec6b03d7d55b517672bd00cda24e7b47411c1014a824783dda4835d059c4a2dcaf5bd09421bd159', NULL, '2026-10-06 19:33:02.706', true, '2026-09-11 18:44:18.948142', '2026-09-06 19:33:22.605759', 49);
INSERT INTO public.user_refresh_tokens VALUES ('87b6ca8c-c802-4b9d-bdfa-926e0357c594', 1, '22dac3bc3c5d533166ee30b155bca9112192228afc24b11e4585d5204e3e8faf80ac20160a62abfdad9b83d2cb9a61194fa843e25564800631780be1ecd41eed', NULL, '2026-10-07 14:52:26.426', true, '2026-09-11 18:44:18.948142', '2026-09-07 14:53:06.453366', 49);
INSERT INTO public.user_refresh_tokens VALUES ('b5708681-ef39-42d3-a4f3-f1efbbf7de2e', 1, 'b9901e97e1135308a6cdcc4818ef04881537567e12080902cec6b03d7d55b517672bd00cda24e7b47411c1014a824783dda4835d059c4a2dcaf5bd09421bd159', NULL, '2026-10-06 19:33:02.842', true, '2026-09-11 18:44:18.948142', '2026-09-06 19:33:22.605759', 49);
INSERT INTO public.user_refresh_tokens VALUES ('48640dcd-3755-400c-b4a6-d23e2f67edc6', 1, '4c9d743c763d8bc36e81c449c4a00e39bfb0319a17ca2b2565bf6ba0e7e1424e7266fddfc1fd8ad7d532cdd0d766f9a521e0e02c6e97c1bbf8f0b0ca626e7a85', NULL, '2026-10-06 19:34:17.786', true, '2026-09-11 18:44:18.948142', '2026-09-06 19:34:29.826603', 49);
INSERT INTO public.user_refresh_tokens VALUES ('35aea58c-ca73-4e39-b1c7-294b4766edd1', 1, '2b3d455ce7ca34a683c5e818c9a525127e5c2d54c108e172883f16d17b246c95746c628360346ec0d3c24fede7a7f9bea448f502102b33fff631d5ee26fc95f4', NULL, '2026-10-10 16:32:12.725', true, '2026-09-11 18:44:18.948142', '2026-09-10 16:32:13.442964', 49);
INSERT INTO public.user_refresh_tokens VALUES ('f81eab5c-c193-45b8-8a71-552c5069473f', 1, 'df4d7534d51d798385ada21a5f20ee18acaa42e18613b6882d708499ddc592d6c11302a2b8e19798c80d63d16cbf680b73467dd3ea9dccb47b618874c231cc42', NULL, '2026-10-06 19:34:29.845', true, '2026-09-11 18:44:18.948142', '2026-09-06 19:34:56.37146', 49);
INSERT INTO public.user_refresh_tokens VALUES ('93b0c30e-3c48-4cfc-a144-b64be2dd9163', 1, '9004ce5fac1ffc563cdb7462ce0201d2171eb95305831d4ce7bbf2cc0005493ee89c20333bb5e1f46285d6a25c263a496aa4e71ffe7ffbc6494321caeceed931', NULL, '2026-10-07 15:57:05.495', true, '2026-09-11 18:44:18.948142', '2026-09-07 15:57:30.992066', 49);
INSERT INTO public.user_refresh_tokens VALUES ('7fe0f9ea-4ff0-48cb-982c-f8689c2b24ec', 1, '2f24e99b4df7c3eb734379c092ee43ba487886d31e205c9dea6ca24a389c7d00baa6a8061f0f8cc67c51ef67fbb1600f9abf04ebc0a3a4e02482781ab146c733', NULL, '2026-10-06 19:34:56.396', true, '2026-09-11 18:44:18.948142', NULL, 49);
INSERT INTO public.user_refresh_tokens VALUES ('ef15c36e-d195-4ac6-8343-f92ab80d0dbb', 1, 'ac6ef9ba3a03e80b7079dff368e3c900ee61b04765ae2d3785d40ebf67ee574541e72cba22be844ff4b57d95b8f58583d762fda04063e17a62de8f365cb09a5a', NULL, '2026-10-06 19:35:33.883', true, '2026-09-11 18:44:18.948142', '2026-09-06 19:35:34.96242', 49);
INSERT INTO public.user_refresh_tokens VALUES ('27105690-0690-4b3c-b9ec-c87b717b4c64', 1, '6253d4bf028890b4c12232083f3e91ddb3145f3d640337d3d834b5bb458bcc60263e1d1c2dd95eca45e93191928b8ec24b8f541bfb95ee84a90c80495064b07a', NULL, '2026-10-06 19:35:34.98', true, '2026-09-11 18:44:18.948142', '2026-09-06 19:35:52.10084', 49);
INSERT INTO public.user_refresh_tokens VALUES ('742fe6e5-b8a6-4a67-a145-8184b4568e31', 1, '0f30c8a7f805fc6c71a0f79b5004e4b7e6059622c5a59f8412e0b7a70bf0cf206578220003ba202423be00c979c572867a5503ff3b92745d1092ebc1173eb9c3', NULL, '2026-10-06 19:35:52.142', true, '2026-09-11 18:44:18.948142', '2026-09-06 19:35:54.838105', 49);
INSERT INTO public.user_refresh_tokens VALUES ('d88d30ac-5d43-4ad4-9b48-b3fb174e0567', 1, '484f848511c99efb722579329e407a2566c85b132d4742bd09de4102cbe569cc0737291110854ce705c085b95caf0108fc912176cce3bacd6b959fe6cd3841a3', NULL, '2026-10-06 19:35:54.873', true, '2026-09-11 18:44:18.948142', '2026-09-06 19:35:58.432422', 49);
INSERT INTO public.user_refresh_tokens VALUES ('ba05e6fa-56e5-4df0-be0b-37bac251fbff', 1, '0b58bf7b45a733a87e4a2101574e70e4dd5305288d23c2a822107360665b02a2aea0b1bda643ee9b4c9947ddae89d83705fcf61c3d7f24dbb385d54fa0a1381c', NULL, '2026-10-07 19:17:34.177', true, '2026-09-11 18:44:18.948142', '2026-09-07 19:22:26.289017', 49);
INSERT INTO public.user_refresh_tokens VALUES ('bb476250-f06a-4823-831a-a8a4bb12eaf8', 1, 'bb5e5dc9d79aca75442a50dbf30419a0de5056369d94e1b3a8f24082ab0461075f338f05d1b292c731ff8e745aa1ca2cf696631f294cddbba2c2729f4e0bb4c5', NULL, '2026-10-06 19:35:58.473', true, '2026-09-11 18:44:18.948142', '2026-09-06 19:36:34.936813', 49);
INSERT INTO public.user_refresh_tokens VALUES ('3b9f7454-73a6-4911-81dd-2aefcca3cd5c', 1, '0aee6001568c94778e1cab28676d854f59c8b114a3107795d6a5766c1c37c57b055358532eae7363734a898a7a63f582a869d350b5e89cef73a540348a1cb815', NULL, '2026-10-07 16:29:48.862', true, '2026-09-11 18:44:18.948142', NULL, 49);
INSERT INTO public.user_refresh_tokens VALUES ('60e124c0-d13b-4156-b90d-8ea30fd542c1', 1, 'f7ab09d5222b5357e6193737debbc26b14405901568d3a23a14b54c703a56a04907233f7ce52af43d08ec1c1febf6b54f0498986497901b85dad03bf3606196f', NULL, '2026-10-07 21:31:31.008', true, '2026-09-11 18:44:18.948142', '2026-09-07 21:40:52.210159', 49);
INSERT INTO public.user_refresh_tokens VALUES ('48a09dea-8a87-4d0f-a24b-d0fa84afdc51', 1, '1eb8d087c29ed7568c92a2b36ddf105b2b7c7f3945907542ea41fa2aeece16ab1f2b0b1b207470a69a0b3d655a052cf1bc4d33d17be48cf00df73bce58e956ba', NULL, '2026-10-06 19:36:35.475', true, '2026-09-11 18:44:18.948142', '2026-09-06 19:37:24.746534', 49);
INSERT INTO public.user_refresh_tokens VALUES ('1cb46180-6759-43ce-8335-ce9a6a8476a0', 1, '2bef25d85194fdae71ede5f2ac8b077a6ec63cdb13cf7ebb62f6c53a9fa595cb0db7656618f36a32edd9c5d8dd0da1e451a653bd5a342226712ee3250844cf90', NULL, '2026-10-06 20:20:17.037', true, '2026-09-11 18:44:18.948142', NULL, 62);
INSERT INTO public.user_refresh_tokens VALUES ('359dda8c-a078-4228-8eec-1a230bf409fc', 1, '5252eec3782889bfc0f1d223609e10d59616beb9fbd2c39e8a2c7edc786df65308eee2d1b103ac6be4bf54b0f3edec5f0212b6c4bf0a0acb5d7a354fee7968ba', NULL, '2026-10-06 20:21:36.046', true, '2026-09-11 18:44:18.948142', NULL, 62);
INSERT INTO public.user_refresh_tokens VALUES ('d6319885-50b6-4120-a8da-ba7a6eee9136', 1, 'd1498751230106679a38642746d6c1514e80c22391df31a42eb2935dc0125df2901bbd39634ce14d004e11691e816e10aa12c04a08bab48e4d4b9fb26b1621fa', NULL, '2026-10-09 14:41:14.153', true, '2026-09-11 18:44:18.948142', '2026-09-09 14:41:31.345357', 49);
INSERT INTO public.user_refresh_tokens VALUES ('8d7a77fa-bbc7-4868-a7be-1743fd6dfb49', 1, 'cbca8d7766179efbc0e81fd9982d6665497a78c79224489a1ce050a9899c8d407e0ef5d74ad3d3632a1cbc954e0580226c918a67fa942cbdd2fbfe2a2784fdec', NULL, '2026-10-10 16:08:11.326', true, '2026-09-11 18:44:18.948142', NULL, 49);
INSERT INTO public.user_refresh_tokens VALUES ('8cf3e7db-98b2-48b1-afe7-6294477b92da', 1, '873a3d71d2e670e1a1fb056ad1563d7dbcd4a5f3f31b3fdd73c076d6b00dc7f35b28c0f35574785c817ad2bec84172b39fd18b3cb6b46e8808f626060761c444', NULL, '2026-10-05 19:44:11.793', true, '2026-09-11 18:44:18.948142', '2026-09-05 19:44:13.605919', 49);
INSERT INTO public.user_refresh_tokens VALUES ('7cecbf00-1cd1-4bcf-a53f-dd6434049fa9', 1, 'cce90eca3ab2208a6340b2d8b0eded08fa258a1492450e3152e6babb46344b6dd7bf3428447a013399dd4d678a7f84cd76f1d933da74e0a287616d23c36515e1', NULL, '2026-10-06 20:21:34.026', true, '2026-09-11 18:44:18.948142', '2026-09-06 20:21:36.021961', 62);
INSERT INTO public.user_refresh_tokens VALUES ('f4c7622d-1f38-41d4-aa6d-1e14dd5cf9cc', 1, '3e7c0b681d73407cde300e405a88b84b90787beb24e47c06bd16b34f452bc8c10b3d7fd78b3ea165f5feff271f0d1e5fc8813d657d0d9253a23d6f8b5b371470', NULL, '2026-10-05 20:00:39.529', true, '2026-09-11 18:44:18.948142', '2026-09-05 20:03:14.223141', 49);
INSERT INTO public.user_refresh_tokens VALUES ('7e78b99b-c436-4e38-8a1e-86da21af4dcf', 1, '5369a5ae06eac2c44f6eed17c8ce6481cd81f2fd7bee3399a57c9fb3a4fe256685ef590291d8d10a83d3f7b41f7e86ccdd2cf533e47b54d8395e5620841297f0', NULL, '2026-10-06 19:37:24.804', true, '2026-09-11 18:44:18.948142', NULL, 49);
INSERT INTO public.user_refresh_tokens VALUES ('4469fcc7-6539-4230-bfdf-f167e715d101', 1, 'f93bd3a8ca83939c20bd26aedf8677663cc5025c98e2c48fa2887c0d0ddc67b6c61ed18ac349d6f41b765d91937f89f192a80ddf8452592b30848bf173dff8c2', NULL, '2026-10-06 19:37:36.382', true, '2026-09-11 18:44:18.948142', '2026-09-06 19:37:38.28879', 49);
INSERT INTO public.user_refresh_tokens VALUES ('27071ef3-87a9-4315-8bc7-861e727cb9d1', 1, 'b13893df486f1bccd794e1a37ce8c8eff51534d4eedaa50b1969daf1b5a9949f0e6ad8fbef69b7b458ee3d935e08b4d035ac6558f8b9fa91b199b3b63264295e', NULL, '2026-10-06 19:43:43.291', true, '2026-09-11 18:44:18.948142', '2026-09-06 19:44:03.0364', 49);
INSERT INTO public.user_refresh_tokens VALUES ('1d36ef76-2d94-4610-9ad9-9dd88a406111', 1, 'fae766f40aaf22afd8c640aa263b67e3660812f7ee8ca4e65641e9400b9b0be996c180f5a82a97442fbe26b4a5e41a2a9de5838e249c22d0b42c778669491c5f', NULL, '2026-10-06 19:37:38.314', true, '2026-09-11 18:44:18.948142', '2026-09-06 19:40:46.811475', 49);
INSERT INTO public.user_refresh_tokens VALUES ('6f3facee-3059-4f2f-ae83-2c62744a0323', 1, '7d206c1134f248b5148635b870cf5d4da6e0cd70f64ac7032e9315ca42ba8103aa5a751d1b3b97f8702c841261ec3c9094582a5a39f82eccdf12e48f4283f9d3', NULL, '2026-10-06 19:40:46.906', true, '2026-09-11 18:44:18.948142', NULL, 49);
INSERT INTO public.user_refresh_tokens VALUES ('d1ad97d9-5752-47ae-b807-282abe65c3c1', 1, '0a5b9f1d0a9be50f0d89f673b1f333210a1d8a53cace878a3a114a469293e2379768bf326578f7e1b210c37680498d28f3a8b712d124cd991cbc72612e7e0825', NULL, '2026-10-07 14:53:06.465', true, '2026-09-11 18:44:18.948142', '2026-09-07 14:53:11.780508', 49);
INSERT INTO public.user_refresh_tokens VALUES ('485ef51d-8cb0-4618-a698-8d71601dcd32', 1, 'aeb97fcf598a26743ad48153603a7189789227a51e6f6e15f311c6b60091d2ee0123200ad37d1dac03542199e671b928f9b0b1a4861e223afab7435b8cc06530', NULL, '2026-10-06 19:41:21.319', true, '2026-09-11 18:44:18.948142', '2026-09-06 19:41:22.917188', 49);
INSERT INTO public.user_refresh_tokens VALUES ('868ab27f-fdcc-4248-b582-3213a98ea1d3', 1, '97d9fa6c0ca96f0354b155f08bf432d8c9c263f52c437de6d4dc112f080d13de15ae2696830e1f7411e00837bb516cabb6abc4e7a19bdd8d6f31f3abf910a572', NULL, '2026-10-06 19:41:23.172', true, '2026-09-11 18:44:18.948142', NULL, 49);
INSERT INTO public.user_refresh_tokens VALUES ('66b6acf2-8be5-42de-a34f-f1caf96dcbef', 1, '8b4739992951f88fd545c25d7610e2022d56bf0095927787b8666febc4a808f6c6bd37667cdcbf0bba088bcf404c625b2206ecdc6a4909c69f96bb6a997155a1', NULL, '2026-10-06 19:47:05.543', true, '2026-09-11 18:44:18.948142', '2026-09-06 19:47:37.490162', 49);
INSERT INTO public.user_refresh_tokens VALUES ('05d453ab-0b60-4bf5-abf5-9696d8e9a646', 1, '7557979fa682e63e6d7f00cd371a1463ab39a6775594960e1459a75dd97984311d588223a2ef2bc0bdb5ac02f9de8439fd851364c499f65af968d61690ae3691', NULL, '2026-10-06 19:43:41.961', true, '2026-09-11 18:44:18.948142', '2026-09-06 19:43:43.274691', 49);
INSERT INTO public.user_refresh_tokens VALUES ('eb8f7262-30e7-434a-8f47-a2a3be12c6b8', 1, 'b8ee52e2c6eb195c1d34a218f9e25c0fc1bcb64c301833b61022970eccc57725fc5238218b74e8b4e0a244e018769c803c87578558341c82a83b9a62c19e0c24', NULL, '2026-10-06 19:44:03.055', true, '2026-09-11 18:44:18.948142', '2026-09-06 19:45:48.555095', 49);
INSERT INTO public.user_refresh_tokens VALUES ('7e6af0f8-e5d0-48eb-bb9a-d8dea4041348', 1, '9ec69477e4b851de826162099dfe08d4338e4c60110c9c352bae40949765e9aa1dcbc1f878517224280558c1892e895eb6a33b0c9e2af7e8938251257a1c8972', NULL, '2026-10-06 19:45:48.571', true, '2026-09-11 18:44:18.948142', NULL, 49);
INSERT INTO public.user_refresh_tokens VALUES ('2dc83bff-2205-4bae-8cc4-2df6e392da5b', 1, 'bb8576fba37a10cb421d6bcbe7a6a89065c3bffc8fee6652ad67eb474bd5e6bf66ccbd4bd99e72a2e6dd0e0ac5e7aa19a2a66f6aa6813167702c83f576c473dc', NULL, '2026-10-06 19:47:04.021', true, '2026-09-11 18:44:18.948142', '2026-09-06 19:47:05.522097', 49);
INSERT INTO public.user_refresh_tokens VALUES ('042dafff-7b33-4383-9712-91f1c62e5ef1', 1, '6828f958f85ea2fb249ba5b2cf55f266941dc4b5e9a279853e3adf27c8c9a4f2f8e7e1427ac58c230717497b5f0253de577f118d41dd6511189372ad4c55fbd0', NULL, '2026-10-06 19:48:10.891', true, '2026-09-11 18:44:18.948142', '2026-09-06 19:57:37.511655', 49);
INSERT INTO public.user_refresh_tokens VALUES ('abc387da-0604-4507-8dce-dd48430a09d0', 1, '34460cca73b79496e48cb5a0aa449ce7ec5179744720c79a12299834817d483d9113c50e8b53f60acdd1e7445abc145f77f8ee58f9f7961113d5725e04c91733', NULL, '2026-10-06 19:47:37.51', true, '2026-09-11 18:44:18.948142', '2026-09-06 19:47:43.652494', 49);
INSERT INTO public.user_refresh_tokens VALUES ('2086b920-ddfb-438f-b1ce-ff194c7a65b8', 1, '0d48508a00c5ba38e9e9ae191f1fe18278af47eddbe66101a8ddd138860017001d868713982b4f87db93acd787b75de932d318c2612566d51f7d52d64fb674c4', NULL, '2026-10-06 19:47:43.678', true, '2026-09-11 18:44:18.948142', NULL, 49);
INSERT INTO public.user_refresh_tokens VALUES ('95955aa6-1302-4cde-8b19-6025c7382b30', 1, 'a38f3434a178da750fc41e18e3186aeb6ab076e11eb610dd93800a22986a0ac85b82fd07bb734ab7685f923442433c37f8e150d3ffd47b72bb9897ca29855a3a', NULL, '2026-10-06 19:48:09.306', true, '2026-09-11 18:44:18.948142', '2026-09-06 19:48:10.831263', 49);
INSERT INTO public.user_refresh_tokens VALUES ('3536e9a0-5bfa-4677-8add-8b961037e35a', 1, '4901db8dbf713f37cb4b5c066079bf590dced2ec2dcf746e5035523023d9a7379a188ab0914a34496a0d9d80edc9ca198935a58321253734a025001c54725150', NULL, '2026-10-06 19:57:37.528', true, '2026-09-11 18:44:18.948142', NULL, 49);
INSERT INTO public.user_refresh_tokens VALUES ('ff5ef86b-0435-4b45-b227-9428e2e1b471', 1, '2dbfb7d41ded98323361430d7434b3d2c14aa8920e9444e338d4a3dc9a183153a04bc8564d3a4548d5343319a69b8666c30a5aec2c9b0faf1efcb676444b5d70', NULL, '2026-10-06 20:02:23.31', true, '2026-09-11 18:44:18.948142', '2026-09-06 20:02:25.638827', 49);
INSERT INTO public.user_refresh_tokens VALUES ('4fdff41e-d197-4dd9-ae50-cea7136e1df7', 1, '9e08208a62f8f2f330f6fe179f67bd221ef85698e3354f7ebbbb90be6193e6120cd023e10b79856650eca569c78729e12c2ccd79464d965a8540682290799545', NULL, '2026-10-06 20:02:25.667', true, '2026-09-11 18:44:18.948142', '2026-09-06 20:03:13.62863', 49);
INSERT INTO public.user_refresh_tokens VALUES ('e01e6a21-7e3c-49d2-a29f-3689c0c462ed', 1, '55f6d4ceb9fbe33b702d10935e16ed6fd786d01571f8f0cbc35f4cb5dfd5c3421409cd2e308d95a78954289e876eead695f1748c3fdce2a604b02a8996ab5825', NULL, '2026-10-07 14:53:11.791', true, '2026-09-11 18:44:18.948142', NULL, 49);
INSERT INTO public.user_refresh_tokens VALUES ('3eb0c008-edb8-4fb0-b85c-943b8e045a46', 1, '6e086962c4e1bf33b3b4fd39eab1d116231213b777afdfda012224cf0033f734988ab5c6c3485d4193474fcc129f9a42abcb9a06e5decce1904e3b351cfc5bb6', NULL, '2026-10-07 15:57:31.042', true, '2026-09-11 18:44:18.948142', '2026-09-07 16:01:08.40139', 49);
INSERT INTO public.user_refresh_tokens VALUES ('643ed20c-3da3-4b77-b7a3-a81c9dd4ae30', 1, 'f1d373a551f5a30923612abadba030634681790df8ed0f78a7df3c74925115e2e964addf1311fffcc2418fa3d82198d542d02a2be20ef79b95d9f82fb6a37829', NULL, '2026-10-07 16:50:41.256', true, '2026-09-11 18:44:18.948142', '2026-09-07 16:50:44.19342', 49);
INSERT INTO public.user_refresh_tokens VALUES ('c377d230-8ffd-439c-84db-fa037f8251d4', 1, 'd795e4d74e28992ec130f2d536adcf019a3a059293e7fb5ea6587b19f842c14c21f46bf63c9c0613599d41f67c3803e0cdce6bafc91c1b89d7a7b7506dde9c5d', NULL, '2026-10-07 16:50:44.232', true, '2026-09-11 18:44:18.948142', '2026-09-07 16:58:43.423447', 49);
INSERT INTO public.user_refresh_tokens VALUES ('d1396a8e-b33f-466b-a1be-af928c569c46', 1, '5a2168ab9eb0652b9c9519d543923f90c80fab67375751759f9dec9befc0d1306f17ad28e22948ca17e99cbd25e12f9f2925b0d3a364020f8e0731de2dbd2198', NULL, '2026-10-02 20:13:10.845', true, '2026-09-11 18:44:18.948142', NULL, 50);
INSERT INTO public.user_refresh_tokens VALUES ('9843e814-9ccf-4a48-91c2-c0725717c5c2', 1, 'ba691d0ab40094c37f86b124f5a28b981838c35f9d1186009982ce9d1078422e5f0fc1437eb3956ea2651faf40ec8f2f1c364321185740b692039b4a5572b0f6', NULL, '2026-10-07 18:29:18.416', true, '2026-09-11 18:44:18.948142', '2026-09-07 18:30:18.330152', 49);
INSERT INTO public.user_refresh_tokens VALUES ('cf09f00e-9c10-4a72-a62c-17679709a531', 1, 'cbe73e2c6af2fe26fad8cead523f1571de197d1fa98a6bba11f515d98a7ab155b478098fea609747b423085e4790aae3109b2a67d6063a8605abae7fb3196ddf', NULL, '2026-10-06 20:19:05.476', true, '2026-09-11 18:44:18.948142', NULL, 49);
INSERT INTO public.user_refresh_tokens VALUES ('fbce9f25-92c6-4301-b42b-5e290b972868', 1, '545bc66cd8842c08cb8f4966e478852a3224cf176bf45ba65156eed2560c299fff5a14de1ae9bcd7653fa6eb545bd3a367c0aacaada25d7e17af90324e94cb25', NULL, '2026-10-07 21:55:12.561', true, '2026-09-11 18:44:18.948142', '2026-09-07 22:08:43.346128', 49);
INSERT INTO public.user_refresh_tokens VALUES ('4300ebcd-4458-40ba-9ade-4c72fe2c6b99', 1, '661f5ad6d05e8488e41bfdde9e32458f8610fffcbc42cb1586cc3a714aa3d4e7b0336ebec2836663b87cad571d9fb9ab6c4eb916ac44be5aa10f3a3529b6c04e', NULL, '2026-10-05 20:03:14.246', true, '2026-09-11 18:44:18.948142', '2026-09-05 20:04:15.25758', 49);
INSERT INTO public.user_refresh_tokens VALUES ('e4951472-5bbb-496f-b142-60b4ff8a9a9a', 1, '1dda5b6a4d2f417cc323c419ba64e82c505d1c48d81988a6f7f4021a4b03c02ce97bc42e2a5da4f7ec303371e6d1acb8272d05932bd37a35fe0482c13d31be17', NULL, '2026-10-05 20:04:15.276', true, '2026-09-11 18:44:18.948142', '2026-09-05 20:05:10.15936', 49);
INSERT INTO public.user_refresh_tokens VALUES ('78fc17c3-4e7b-425e-b90d-f716f0dfeab2', 1, 'f5d80a1f63d4e520f6109d06030133df7522d814f6f374a465411718e970dae78302296de7a7b3b1e258570b1a33b73f5925b163c5dca0fa06a92a91f51df4f4', NULL, '2026-10-07 19:22:30.115', true, '2026-09-11 18:44:18.948142', '2026-09-07 19:28:10.923799', 49);
INSERT INTO public.user_refresh_tokens VALUES ('f513944a-aba4-4c75-8a06-a8f6da740810', 1, 'd9e9bf6258ee81460c1363ba73d858a1a0a7171f1b613f8624841d193b525562b017dba77e34404f5eb33a4387696e76a846c477259a0a8b7da02c449b10f769', NULL, '2026-10-07 16:01:08.447', true, '2026-09-11 18:44:18.948142', '2026-09-07 16:05:10.646933', 49);
INSERT INTO public.user_refresh_tokens VALUES ('f0bedfbc-5253-4dac-9f61-fc26b8a28ee6', 1, '3424942b8a5a042441aa1e1bfe62c615623e6a5b2f0c8f167324c34373d790a1ef58f6bebf4078b49b420fdd975e4871277500e284a2c25f7ff969afa096b437', NULL, '2026-10-07 19:48:35.867', true, '2026-09-11 18:44:18.948142', '2026-09-07 20:05:15.545548', 49);
INSERT INTO public.user_refresh_tokens VALUES ('a608beac-8fc8-4018-97e9-feac6a04132c', 1, '2d6fc988f6fdb1b48f7affd2ae1e6f58b7f6a870f20faad3494fc6a57f32d57f99efce1247a23d2283253508bed0bb6e6c5b7a06cf979279c32b743131a3a4f0', NULL, '2026-10-06 20:16:02.237', true, '2026-09-11 18:44:18.948142', NULL, 49);
INSERT INTO public.user_refresh_tokens VALUES ('0a0b41fc-1aa4-4bbc-b6f8-b259f440cc42', 1, 'de1debcf8c7d6614e036f6d905bfeec54ee69152670792a889c5a67baf6caef570317cce231522907806eb9dafc1bfd2d88b716e065e9a0b1a45f3509f656bff', NULL, '2026-10-06 20:03:13.654', true, '2026-09-11 18:44:18.948142', '2026-09-06 20:03:20.616065', 49);
INSERT INTO public.user_refresh_tokens VALUES ('566071a8-b22f-4af1-b781-b508af74a0a7', 1, 'fe377b28729e099e1e74c3c765a617a6d93cb8a470a1fe0b74a49fbb6db53e62c54ff1c85196bf2bdd643550effd447c296c9cd15ef059e0334f64039e36d7ed', NULL, '2026-10-06 20:03:20.635', true, '2026-09-11 18:44:18.948142', '2026-09-06 20:10:05.663713', 49);
INSERT INTO public.user_refresh_tokens VALUES ('f47478f2-f31e-40eb-9241-e3b418a96ee3', 1, '6db0d0765b83a187d40c192c7ada7d873e74cd91f0ffc8fdcb6b3e0ada641e3702b6e7d449da501de9a352e8ca857417c224ee50c41d0a8a8708d326048500b6', NULL, '2026-10-06 20:10:05.682', true, '2026-09-11 18:44:18.948142', NULL, 49);
INSERT INTO public.user_refresh_tokens VALUES ('2d5652bd-9e59-41fd-a645-f14d175eaa4d', 1, '344df54071cdcdf5287ea553503cc957af8c26560e78c6bc86e063dca7681e9765ad1670e49697ba58994e03b2c2794c933d48801327901f952f8ebf08c47cdc', NULL, '2026-10-06 20:16:00.386', true, '2026-09-11 18:44:18.948142', '2026-09-06 20:16:02.114625', 49);
INSERT INTO public.user_refresh_tokens VALUES ('9c7c9124-ec8b-4a25-bfe0-5b83ff2101a2', 1, '7759acaee87b0dca79875a33c59f08f39f4db3cc3fa641d753bb5aed9757215d70a38c3476812ba8f80c9367f8dc6f872b64c92308ae02c89b1462b6e9e0ebd9', NULL, '2026-10-09 14:41:31.377', true, '2026-09-11 18:44:18.948142', '2026-09-09 14:41:37.43071', 49);
INSERT INTO public.user_refresh_tokens VALUES ('0ff905ea-3bd4-4565-bbde-443ec26419d8', 1, '3b18f063496656f5c93a346d238d2339aa6b7c302b44598dc5d6252fd47dc396434507907c7f888682baf8b285d459ae571e2febde2fff60fb6fddef6f847bb3', NULL, '2026-10-07 16:58:43.452', true, '2026-09-11 18:44:18.948142', '2026-09-07 17:19:50.092064', 49);
INSERT INTO public.user_refresh_tokens VALUES ('6d6577bb-6687-43cb-943c-0d262fe2f43e', 1, '30180ab70f5c526bc390c5570a5b2375e8dcdd5ddfb16594775efa3fb67e965985717d0db0f334d43858dad3671ba3c3054a6ffe328fe20c38159f233bd56e29', NULL, '2026-10-07 14:49:40.475', true, '2026-09-11 18:44:18.948142', '2026-09-07 14:49:41.114399', 49);
INSERT INTO public.user_refresh_tokens VALUES ('dd8a4303-fb91-489a-8101-6e67dea5e104', 1, 'd35475b374f72bc4fc9e0e3560956576ab7766b9ad427e9e6a9ccce5d14e10ff40e22831b5957d6b4963020c0ee5bd3d0e53efb4d0a2217a3c03ada56e0372ed', NULL, '2026-10-06 20:18:59.194', true, '2026-09-11 18:44:18.948142', '2026-09-06 20:19:00.844246', 49);
INSERT INTO public.user_refresh_tokens VALUES ('de18a3e7-3a96-4f09-860c-a327cae01fe7', 1, '2f4991bc54e72cd53d5fe4970524965f2ba86cc7e93924f23707e3286534ce90283b86575252214e53c2cbe81e01cadf4f9e69df760d7bf1a002095b9d072be7', NULL, '2026-10-07 18:30:18.351', true, '2026-09-11 18:44:18.948142', NULL, 49);
INSERT INTO public.user_refresh_tokens VALUES ('65ba5a3b-ae95-4014-9ba0-5a959dc48942', 1, 'd4193832ad5c8bae90bc8b9e6cfbae7b3eefb130e8454604d837594baab68dde538d99c2b87c26e43cc4a403ebd520c325d083e7f4f0b2f6dd1953c84f21c417', NULL, '2026-10-06 20:19:00.871', true, '2026-09-11 18:44:18.948142', '2026-09-06 20:19:05.463763', 49);
INSERT INTO public.user_refresh_tokens VALUES ('a186fdf3-0f00-4d48-9f8b-d4c0ae556a49', 1, '646e2f133156a296278e395bb293ef16769afb109fb93e7d36299bc75c13e27c2bfd15f5cf437260f97135b39efce41d087dd447262cae6e4fc0c94865fddc95', NULL, '2026-10-07 20:05:15.609', true, '2026-09-11 18:44:18.948142', '2026-09-07 20:05:16.658857', 49);
INSERT INTO public.user_refresh_tokens VALUES ('9985c0d2-21b3-4802-b2b3-e007e72751ce', 1, 'fe82b94feceeff6be61f781e0b3e6396829a4f7de8b49bdf7756bc308700a927deab6085a64a41fe5bcb8f52cf893719a5336f48c91894b28b3a14ebcbcd164e', NULL, '2026-10-07 14:49:41.168', true, '2026-09-11 18:44:18.948142', '2026-09-07 14:50:01.082669', 49);
INSERT INTO public.user_refresh_tokens VALUES ('7fc0a59b-bf13-4a12-aabe-0cb95b10effb', 1, '703af88711a18fb3b60a2a594133b79315684c51dde924d1c240d1863fbc1d68126f908cda1938372b63fef8811644bcb00d4072e78eb5e98ecfd038e3ef4be6', NULL, '2026-10-07 21:40:52.243', true, '2026-09-11 18:44:18.948142', '2026-09-07 21:42:26.183087', 49);
INSERT INTO public.user_refresh_tokens VALUES ('469c1eca-6885-4bbe-b9e1-a8d42b42a0b6', 1, '248f8c8c9739121abc32f3a2525af489ecac1445275667c71b61bc4d23542f2dfee7d80f49638b5d8223ef095bfaa3a0110ca3523163c62e587c87e50da2d3d6', NULL, '2026-10-09 14:52:37.708', true, '2026-09-11 18:44:18.948142', '2026-09-09 14:58:59.53646', 49);
INSERT INTO public.user_refresh_tokens VALUES ('27f7a5fa-70ec-474a-aab1-e09c910374ac', 1, '9a521da9f5e717790116d85fbfa7caabe1a8c87bba065443cfb3cf163599ec6dafbcff6ad58dddb6d9434fc6bc618f1d5a50d21ebf266fdb3d3ded505e8e2ec2', NULL, '2026-10-08 00:59:28.777', true, '2026-09-11 18:44:18.948142', '2026-09-08 01:00:02.297506', 49);
INSERT INTO public.user_refresh_tokens VALUES ('edbc9bc9-b60f-4a5c-a3c0-97beaabf3d8d', 1, '2fee026307ff6ee7841f169dbe2727e9753037e9dac4b34fa26033decd7895d3ad92634d95479f6bb50a9362db7fa0f8ffd4211c51806c9236e534de9c771797', NULL, '2026-10-07 21:42:26.22', true, '2026-09-11 18:44:18.948142', '2026-09-07 21:49:48.749438', 49);
INSERT INTO public.user_refresh_tokens VALUES ('b45670ca-6b59-49ce-afaa-eac1723a569b', 1, '5ca3c57077da2475ac3f308b2ca1838d52bf19e8ff93aac0f687186966f3e84ca0edb5f67dd4bb14a5bd35eef0271dc877cd746b769aa5931347da88432a68f3', NULL, '2026-10-09 14:41:37.445', true, '2026-09-11 18:44:18.948142', '2026-09-09 14:42:09.801152', 49);
INSERT INTO public.user_refresh_tokens VALUES ('666ee005-b7ce-49c1-99f4-ea56b06763db', 1, '84e229eb1f9ccad5a625c37abf1b3299f8f3c3088358561c359f7f3d36064c7c11af22e2817aa7a0970f4cfe8b24a65bd0d12ce99560c3137aad84b24bda661c', NULL, '2026-10-07 21:55:05.195', true, '2026-09-11 18:44:18.948142', '2026-09-07 21:55:12.544669', 49);
INSERT INTO public.user_refresh_tokens VALUES ('27637140-1b00-4142-81f1-a6e0b6ccb800', 1, 'cee227cae0ec70412ea92ef02223bb33db25f4a6ef311a70487ee9d3f6c720816d470ba7917888235530997fa18694919bd451635b298fe60a4115a1b5198ca9', NULL, '2026-10-09 14:12:14.576', true, '2026-09-11 18:44:18.948142', NULL, 49);
INSERT INTO public.user_refresh_tokens VALUES ('d3def8ff-80d7-436d-b440-ed56b58c9879', 1, '014130c2d3ff86249fb66a91d227375f23950e31d940c63de98651afded360fa9898fe52a70fdaacbe9a8c77a3b86c5f6174ba4cba42c8ac8fc130b472ba6c06', NULL, '2026-10-08 01:00:02.32', true, '2026-09-11 18:44:18.948142', '2026-09-08 01:00:13.424334', 49);
INSERT INTO public.user_refresh_tokens VALUES ('f71abb26-e37d-417d-91ad-010e67e31e7d', 1, '4b0643e3f86f82ca90afb204ad780c13c4e187813da41de335d98223f58bdf88a48e870a3f8a1d62efc34e8c8a31e1a3e703494dd2e0cdd8a2ecce6c4953598b', NULL, '2026-10-09 14:12:13.829', true, '2026-09-11 18:44:18.948142', '2026-09-09 14:12:14.502026', 49);
INSERT INTO public.user_refresh_tokens VALUES ('d7f354cb-a49c-423f-a903-7c85964586be', 1, '71157b2c020a714c623239f5e93fa981d25c325d7dfbd66c2784e4aab25a4d3452f028128925d580eaea472ca4a7a0dda316f257185b7fe75d7a7520baa863e2', NULL, '2026-10-04 00:00:47.819', true, '2026-09-11 18:44:18.948142', '2026-09-04 00:01:12.849807', 49);
INSERT INTO public.user_refresh_tokens VALUES ('2e76d5fa-ff84-45fb-b8cc-a36f0e6dc45e', 1, '018228edd1e5002aa6bedcfe0c9ae60fb334fc1a732372e0c77d67f85aa884c23e10201448e78c0d7aa08de01c9af20033349c2ef5301493e97804c692217adf', NULL, '2026-10-05 18:58:19.497', true, '2026-09-11 18:44:18.948142', '2026-09-05 18:58:31.214802', 49);
INSERT INTO public.user_refresh_tokens VALUES ('e7cf1b4d-4698-4344-914a-4d398645227f', 1, 'd21a3e8627b339fb9a809107bf006da1fc016a3bac8b367f2dda73c854cb35c5510abf2b5a4e1608edfe61273639c963942b65e04acd68567a65d9b43fd2b0d9', NULL, '2026-10-05 18:58:31.309', true, '2026-09-11 18:44:18.948142', '2026-09-05 18:58:56.958803', 49);
INSERT INTO public.user_refresh_tokens VALUES ('3bce6ba0-cb90-40f9-8c1f-f409710920f1', 1, 'e645bfc5dad1fab9afd9132650a11d8e25f6bf8d362ba20a6626646ef6df17a41e4fc4037e8ec0a8d5e9bdaa33e87f937d276697040b8f4fabf7fb3ef70c3a06', NULL, '2026-10-02 15:27:47.11', true, '2026-09-11 18:44:18.948142', NULL, 47);
INSERT INTO public.user_refresh_tokens VALUES ('6f0b9a62-9fc6-44e6-9fc1-b631861eb9d2', 1, '93b6e886d6392b983fd74b6d35cd4b0809f2128a3a5f429d4a73808693b0c409173a573843e9e4809ec714e5926c12ca99eda139d81fbf35bb415797eabab3bc', NULL, '2026-10-02 15:01:41.049', true, '2026-09-11 18:44:18.948142', NULL, 45);
INSERT INTO public.user_refresh_tokens VALUES ('2ed7b50f-2bc4-467f-a1d8-156b99f1ef23', 1, 'bfb7c6f5b478fab6bcf2987d57baf08eb82d475a1b04013d3ba50e4f873aa51ec240c40b1ac2f73cd98d838146a8767bc133246a753aa996e3eef02b44c34a0e', NULL, '2026-10-05 19:29:16.725', true, '2026-09-11 18:44:18.948142', NULL, 51);
INSERT INTO public.user_refresh_tokens VALUES ('43ff4947-42f4-4b8e-9e62-8732ac05eb08', 1, '47d88aa075e9ec393b837caba5d36d8121d78ffd69b14ca5e3283819d7d9744e9e8b8316d00fd926bdce83c06db7e354799ec5e4489d1e4ad0932ea59795db89', NULL, '2026-10-03 23:11:21.778', true, '2026-09-11 18:44:18.948142', NULL, 49);
INSERT INTO public.user_refresh_tokens VALUES ('5c033a4b-1adf-4858-800a-bae38d037527', 1, 'a4c2c7b8eb03c15e87f71fed8bc0e0e0910e60ee03db35b2786cc295a9440d7a93f07e3768987421199d50f1b6718e0aa1bf29f584504d74b71be11cfb5cf7f8', NULL, '2026-10-05 19:44:54.164', true, '2026-09-11 18:44:18.948142', NULL, 55);
INSERT INTO public.user_refresh_tokens VALUES ('12dbba5c-4fb5-4d5f-83b1-26f209f67ef5', 1, '15eeaba44a69288742421eb615abc0c66df40ea12f7f455ba1a04d7c9cc0ddd1307f45c273173ebfcd4b3cbf0f5fd6a45f3dbc56d80f8e26cc25bb5555424031', NULL, '2026-10-05 19:44:45.857', true, '2026-09-11 18:44:18.948142', NULL, 54);
INSERT INTO public.user_refresh_tokens VALUES ('c530684f-c76a-46b1-a983-019c9160c1c3', 1, '6939740b042eb84a6ec9e07baf3fb9caf90990b7c5f741d832487f7670ab04a4e3dc4b5ec1e798d5144d9311ecb475da79629ba56de4df45e025c55650f4a7b9', NULL, '2026-10-05 19:44:33.604', true, '2026-09-11 18:44:18.948142', NULL, 53);
INSERT INTO public.user_refresh_tokens VALUES ('1083ece7-5a3b-40ce-9263-3c155fcbdae7', 1, '0e83281dba500a18cb511a22c3079bdb650442f79a15e7c2af3a01188243668a88c525838785f4b4dd7c126a867b3440057d0e6368c72b53e645039aadeb2837', NULL, '2026-10-02 16:01:21.231', true, '2026-09-11 18:44:18.948142', NULL, 49);
INSERT INTO public.user_refresh_tokens VALUES ('928ce685-f037-42f1-8ceb-da71396a3d90', 1, 'ea60f3d875c1518910a463d8499f335e89e28cbc2d1d33702dd8af9e7e3265d6e50803f3fdcdbf5def56472b2f182c6b846d9190b771cf37c148b5849eb14549', NULL, '2026-10-05 19:44:13.937', true, '2026-09-11 18:44:18.948142', NULL, 49);
INSERT INTO public.user_refresh_tokens VALUES ('fe32fd21-d1ae-4af9-a45f-6d9d01ef940e', 1, '2a7bdea957a8c8879de4204eb898897f5ac15806308f177c3f4a575db92633d82f5d89b03e654c93a336f3982daf1ea21f8c83337ade5b59b848b52cb7137582', NULL, '2026-10-04 00:01:12.887', true, '2026-09-11 18:44:18.948142', NULL, 49);
INSERT INTO public.user_refresh_tokens VALUES ('2805aa7e-8928-4c61-bf05-4a895b3e28af', 1, 'c4dd14b82c1176bb53a1f4e181bed4f2c992986c28033132a073a3ce2e03fc23786bc785c16298b21ced586492eb02ec5e08ac66994ccece7e58d32aa4c83bba', NULL, '2026-10-07 15:32:42.174', true, '2026-09-11 18:44:18.948142', '2026-09-07 15:32:46.63028', 49);
INSERT INTO public.user_refresh_tokens VALUES ('563f085d-9ae0-456c-95fe-ebb6ec3bf608', 1, '13890dfe987bca59b20580418658f1cca91d31ef3329e3d9a93fa37bf3eedc82d26892f3a7bcae4be708a4b135d7d1ad4a52fad9c8f09f4e245bf64ff5cb0f36', NULL, '2026-10-05 19:24:34.558', true, '2026-09-11 18:44:18.948142', NULL, 49);
INSERT INTO public.user_refresh_tokens VALUES ('5b9ca483-ddb6-4de6-98d7-bdcb2a361e17', 1, 'd02d6725d858e21b1d400c2dc2f4fc85d396d67c3a3d951794a41107b776cc47b70e84afcab46d08591c00b6343082d4c4a35dea121a32dc9f88b74831822d61', NULL, '2026-10-05 20:00:38.206', true, '2026-09-11 18:44:18.948142', '2026-09-05 20:00:39.513726', 49);
INSERT INTO public.user_refresh_tokens VALUES ('edd60b41-be10-4cc3-89df-a56ff751ac31', 1, '9f4e8d63f2851c353efefec729e261e52565e036a1f6a00adaa28c315450b5145bab2e700d25a6f5f7968c04f2ff19fc39b731417099e8cab6ffe0bdd1210a03', NULL, '2026-10-06 17:06:43.881', true, '2026-09-11 18:44:18.948142', NULL, 49);
INSERT INTO public.user_refresh_tokens VALUES ('040c5210-a952-4c6a-bbeb-c8da430e0d7e', 1, '6c5b26e157763da5d26b0701df3e3b96448433b087f0369730c78d031c7c8aa56332031bc08732c7d2beb0f156ba7e831c8a96097b4dfd6827b0c82a2927ccd6', NULL, '2026-10-05 20:27:42.254', true, '2026-09-11 18:44:18.948142', '2026-09-05 20:29:13.078923', 49);
INSERT INTO public.user_refresh_tokens VALUES ('f8299687-b7de-4201-a771-6898101734d8', 1, '364bb044719c21634ef7cb73bc7992fb2cf8bb36fc45eea10fe37db7787e294a34f622853fcd7f92e4a95e1c7aa7bb9609862f0c93409f0b5e7f40d7bab1c9b9', NULL, '2026-10-05 20:29:13.129', true, '2026-09-11 18:44:18.948142', '2026-09-05 20:29:51.972531', 49);
INSERT INTO public.user_refresh_tokens VALUES ('4e50a705-89ab-4963-bfec-bb27adf9e0ef', 1, '530f05fb8fcb10cf6bed1ee78aa3fc789a82caa14107d226a435d4bd5764b7d122c2bf3ca61e08ac6b793d1499d01bdc9c2e2943cead6c55fdc86b335d947008', NULL, '2026-10-05 20:29:38.872', true, '2026-09-11 18:44:18.948142', NULL, 57);
INSERT INTO public.user_refresh_tokens VALUES ('753f59c0-e2a9-49e3-b087-00bcfdbcc2f1', 1, 'c7a751acb049341eb2b0e7aeea87d85be22c3090549aa1054a9c87521f8cd1c063ba64af683751a1bb111259c6a72107beca173ddfadb1b2456243a00c0c84b8', NULL, '2026-10-05 20:29:51.994', true, '2026-09-11 18:44:18.948142', NULL, 49);
INSERT INTO public.user_refresh_tokens VALUES ('7158cb03-9b44-4f4f-b496-9516a3c1d92d', 1, 'e620ff13b2dd07bfbe5d1384febad216a4075117106d3f64161cfe1b060165db34902441b631bb688c8f180f718766ba1ebf11f7beed342aec8b1c354de08c8d', NULL, '2026-10-07 15:32:46.644', true, '2026-09-11 18:44:18.948142', '2026-09-07 15:44:05.951941', 49);
INSERT INTO public.user_refresh_tokens VALUES ('13824ead-dd72-47d0-a979-91e66f142c63', 1, 'e12538be94ff70579251e2dd165ad1ab1920ff02c19fa10b207fd3ec7a464548144f00ac4920d7442b572be60c3e811d4996440a6debfc5c946785493c02c6cb', NULL, '2026-10-05 20:30:37.54', true, '2026-09-11 18:44:18.948142', '2026-09-05 20:30:38.482946', 49);
INSERT INTO public.user_refresh_tokens VALUES ('9c20f893-d9a3-4c9f-bd3c-85309939aafb', 1, 'a863046b44955aec2a6ecfcc3fb565e2ccb51a74555c70bd189a904b30fa8d1059ca1d8d7fb65941b1faf9aa1806707ab6d1711b12950da0e16719c544def30a', NULL, '2026-10-06 18:18:46.363', true, '2026-09-11 18:44:18.948142', '2026-09-06 18:18:47.367193', 49);
INSERT INTO public.user_refresh_tokens VALUES ('bdaf9bc8-c38c-4b2c-bcc3-301672ec3628', 1, 'cc4bfff2d2451e503778baa8594c0bdcbf2818959ce70aef64156570107dd68a9d9ddc1cbaa0073995ac0f4292de4e5ddaf0a97efeacee82e218ffe7db7ce427', NULL, '2026-10-05 20:30:38.514', true, '2026-09-11 18:44:18.948142', '2026-09-05 20:30:57.975059', 49);
INSERT INTO public.user_refresh_tokens VALUES ('40162c49-ddfa-4ccd-8e93-11363dc8b8fb', 1, 'ee1e1e6982957ebef1124b897c8cf23cec2a753cb9ec02c03923aa51afd3680a66225b0bafd660d6824a94b23b4f6d6639619767a7bd52b835b7eceef28dc23a', NULL, '2026-10-05 20:30:57.995', true, '2026-09-11 18:44:18.948142', '2026-09-05 20:31:12.319005', 49);
INSERT INTO public.user_refresh_tokens VALUES ('34f24405-50ce-4f11-aad6-a2ee14e6c8c4', 1, '1a2f743a569ee8049deacff6e8c12428679207f7b55e34bd10e2f48566c3eca1c36b6899cc6dc7ecf7d0ebd3950e53e6fdfdc4f75a7ebdb2c9d67ef3163bf273', NULL, '2026-10-05 20:31:06.135', true, '2026-09-11 18:44:18.948142', NULL, 58);
INSERT INTO public.user_refresh_tokens VALUES ('663a51d4-99b8-475e-8e8f-bdcb79abdbf4', 1, 'd0843f8e55d1887fd03e630bb561edad0bad7895e047f93f8f3754e4c6c77900ec34b00fc2f258e69b222ca010853126d289903a5bc6e0edbf6af1c359dc6a28', NULL, '2026-10-05 20:31:12.33', true, '2026-09-11 18:44:18.948142', '2026-09-05 20:31:35.848631', 49);
INSERT INTO public.user_refresh_tokens VALUES ('5c6cf9f4-9096-477f-9743-6c3fac708e51', 1, '71439cd54852ee6ab96bf7d26c8cc20522a8282ecbb3669fa10b66e000ee136a764a8499976f954ad4b640a6fdf282695aae5a2e2bf4ebce0736b0f0a4859243', NULL, '2026-10-05 20:31:35.864', true, '2026-09-11 18:44:18.948142', NULL, 49);
INSERT INTO public.user_refresh_tokens VALUES ('a060d785-e72e-4d42-93ba-18ad91b7b63f', 1, '17849f2a927d1faef17e138010ac07ce802ff3135090b2a2e3bd2302d8c9fd6be3b6cd6aebff5cc433a167009893889b63ee9f61efda021efd7cee1f02694c31', NULL, '2026-10-07 14:50:01.099', true, '2026-09-11 18:44:18.948142', '2026-09-07 14:50:44.702928', 49);
INSERT INTO public.user_refresh_tokens VALUES ('a8874fd8-3ff5-4c32-8159-fb94cf83b549', 1, '97baaf29b3fb887bc7a1a5fcdeac1e8bc46964a52f4677238bc482e7ba822fa69a20b8ac62570813e5b23e6e5a70e685051dd102ed8a8f3ae53c67ba07773934', NULL, '2026-10-07 16:05:10.694', true, '2026-09-11 18:44:18.948142', '2026-09-07 16:06:10.500381', 49);
INSERT INTO public.user_refresh_tokens VALUES ('112b8134-d8c2-4e79-b55b-12f3425ca02d', 1, '35256af71561db16500debc6d2a367143ad730303702df73d5bc52930da810ebfc2b6f75819b3436addbd4410081255ba0db5669df6e94c6080edd8e9c619545', NULL, '2026-10-07 17:19:50.12', true, '2026-09-11 18:44:18.948142', NULL, 49);
INSERT INTO public.user_refresh_tokens VALUES ('0218b77f-8b10-4d5a-b3dd-dd0078c6561a', 1, '2225e392773298330d796a461ea2f9ef6284f3eaac9cd74ff660d20ff13dcb2ce84994d304a7d8ee47519c80d05149899a6d2ba36622011eb1c588cb8cd0691e', NULL, '2026-10-05 18:58:57.121', true, '2026-09-11 18:44:18.948142', '2026-09-05 19:01:31.233896', 49);
INSERT INTO public.user_refresh_tokens VALUES ('25a0d0ae-70ee-4982-ad56-8470983f3bf3', 1, '96104c798407145dc6ea3229962e2460d477ab9bfd7ec6096d34a416395cb920fce11b1b4bcd4f011360ac084f09749b2bb863ff45912062ec3d655c91011be8', NULL, '2026-10-02 15:59:10.029', true, '2026-09-11 18:44:18.948142', '2026-09-02 15:59:11.519661', 49);
INSERT INTO public.user_refresh_tokens VALUES ('8a048da4-5c49-4194-aaa6-64ba8c8a4927', 1, '90cc92a6da24641b644017f78b875e276720c152a82e218d1901f8faad937937dc7e5f54e3b4eea60aeddcb46ad7ed79671a3300e00fa15c0b1cb5f80d5b3b4b', NULL, '2026-10-03 23:40:00.421', true, '2026-09-11 18:44:18.948142', '2026-09-03 23:40:01.756092', 49);
INSERT INTO public.user_refresh_tokens VALUES ('a75fcbc4-53d4-47ec-b228-3b4d2fb4092e', 1, '03c7ea70a7a4c174cc95cfc322f570b51d3d211d499ad7d97ab6579bc25f46e27debf8490b4c4c63b6b1b62b9cbc58cc1fbb62789e6378f9adf71bc64af16812', NULL, '2026-10-02 15:59:11.559', true, '2026-09-11 18:44:18.948142', '2026-09-02 16:01:21.210064', 49);
INSERT INTO public.user_refresh_tokens VALUES ('f0efe547-0d2f-4d8c-8d35-ffd10a9db010', 1, '5a2168ab9eb0652b9c9519d543923f90c80fab67375751759f9dec9befc0d1306f17ad28e22948ca17e99cbd25e12f9f2925b0d3a364020f8e0731de2dbd2198', NULL, '2026-10-02 20:13:10.128', true, '2026-09-11 18:44:18.948142', '2026-09-02 20:13:10.795927', 50);
INSERT INTO public.user_refresh_tokens VALUES ('4c6d0e0c-0b5e-451e-ab55-e9b0598a7421', 1, 'cb3e2ac6015da8f90bd5d6666b0c1061d79a34d06901d6dc8f4b61dae2a2e0d1aaf1dbb044ce5218a50098c18bf9c9e324ed9e81d5dab43226e97ba1a3ecd337', NULL, '2026-10-03 23:40:01.824', true, '2026-09-11 18:44:18.948142', '2026-09-03 23:51:18.23932', 49);
INSERT INTO public.user_refresh_tokens VALUES ('b0984dce-efeb-4a10-b553-69c733bcd9b6', 1, 'aa2f517eafa194a318a825a547bd0b5c03f1456a48730ddae1b62225edb5d5d4fb26458c5d7d28779ab109f394254d507b690657b7d3fa222ebe8b0a51597828', NULL, '2026-10-03 23:51:18.569', true, '2026-09-11 18:44:18.948142', '2026-09-04 00:00:47.584167', 49);
INSERT INTO public.user_refresh_tokens VALUES ('12b121ce-cdf1-4f35-9f0e-a957a3e09c1e', 1, '673f2aef31499741b2d5b4e90433cf86da65defdb87107d2335c134da0b8662edecf5a4a036617255a150c0f78da3666e912c8a5505c4f5b72404471fe663db1', NULL, '2026-10-05 19:01:31.358', true, '2026-09-11 18:44:18.948142', '2026-09-05 19:24:34.52114', 49);
INSERT INTO public.user_refresh_tokens VALUES ('15a475fe-a529-4f4b-9792-4874dcae956f', 1, '10a577a83acd29926d95fe2f1edf3c9f87d03ae3fdd100aae37662b2bb307a0403113ab005c3ccae0a877d64ac49b294dbf75ddeb41fc6a9ba4f0beb55da7c2b', NULL, '2026-10-02 14:17:03.882', true, '2026-09-11 18:44:18.948142', NULL, 43);
INSERT INTO public.user_refresh_tokens VALUES ('b2d1caa7-2235-44b6-97c2-3497c1b48971', 1, 'e7c6a9a3572a5822a0538b2da09b9b59e16c186d94368d065101362a879e7b07fd517638f3ff605c7e20074c5370f37c137d9e449d200f9a04d59b161bd33a36', NULL, '2026-10-07 15:44:06.009', true, '2026-09-11 18:44:18.948142', '2026-09-07 15:44:53.359212', 49);
INSERT INTO public.user_refresh_tokens VALUES ('5bee14a9-0c12-4058-81e6-9a0b69f819f8', 1, '257b3792aeeab21fdb85aab59855c2ee066a368f6f2d36ae0da448a1060fdb43f84d717e29835aae2dcc23e5639ff83fe7292fc9e186db3f099b117d0625624b', NULL, '2026-10-07 16:06:10.514', true, '2026-09-11 18:44:18.948142', NULL, 49);
INSERT INTO public.user_refresh_tokens VALUES ('a8bd6be2-1b80-4156-9f38-81d1f66b3b98', 1, '4c281d91a6b801cff871db562dd5301cdd993d474d493898564f876c220876354f5fb2bd55aff5cdf824bae84bf69c56e221453f9341fe39cb91ca209820bf4f', NULL, '2026-10-07 20:05:16.674', true, '2026-09-11 18:44:18.948142', NULL, 49);
INSERT INTO public.user_refresh_tokens VALUES ('d4feb54b-b4e2-48df-a106-d30b0b1c7c31', 1, '467d655dc2ab86d949f48a2b122c8b677937859b3bd7d6262b0cd1d9b5ff8dd7bb77d6318d6b2b70a6ae56b50df5abecb56b652fe2a5371fdf918709e83d6fc6', NULL, '2026-10-09 14:42:09.821', true, '2026-09-11 18:44:18.948142', '2026-09-09 14:42:25.647226', 49);
INSERT INTO public.user_refresh_tokens VALUES ('882d52d2-fdbc-482b-a33a-d6a8a8180fb1', 1, '6565ffaadf78ff83955b3631c26f057ec9dcf9e7d34a9998273cb81f33895b7e6483648efa263bb05bb65aa754d9aac029969a2fccd5ae5bea67e1a45986f5a3', NULL, '2026-10-07 17:20:11.134', true, '2026-09-11 18:44:18.948142', '2026-09-07 17:24:35.589009', 49);
INSERT INTO public.user_refresh_tokens VALUES ('3fbe2359-61ff-4f59-88bf-80e5e2d11c51', 1, 'f29544543d70c75fa9b44305cfb0ff7d87f3f0c6f5fa920b3338f16d7a68fbacfc1af21229b4a85cea558cfa93105239bd0a6c5f6afc11a8e842abecae10e6ff', NULL, '2026-10-07 21:07:27.99', true, '2026-09-11 18:44:18.948142', '2026-09-07 21:07:29.195574', 49);
INSERT INTO public.user_refresh_tokens VALUES ('3e904177-6983-444b-83ae-67d03c33af2d', 1, '5c1bd6674258c09ba608ede6fcb7c7f58aa34782ff23c2ae7b4d18c29deaddfc041e4163b92964634795e7a2542eb4d87dcdf131163ae67e79d4c4b422c0c70d', NULL, '2026-10-07 19:06:39.579', true, '2026-09-11 18:44:18.948142', '2026-09-07 19:06:40.866769', 49);
INSERT INTO public.user_refresh_tokens VALUES ('6ea3faa8-ad63-4f84-ae49-5f64a4bb0a59', 1, 'f2b7415e962456b0448b8c92508e4fc6451b008e69676d51f9d113f5ff4e1f7afa1548f219bdc4a516691c4dc80578e77561b2394edf9a7ca126bb44614f8729', NULL, '2026-10-07 19:06:40.889', true, '2026-09-11 18:44:18.948142', '2026-09-07 19:07:12.301165', 49);
INSERT INTO public.user_refresh_tokens VALUES ('bcffeec4-2cec-4258-ae84-521e88cc766c', 1, 'e5192fe12511fa0f7f83ac91700aef71f562697a09edeb5bef8f49513eb23e46d2a71d598d7f0cd72c3e2537e8441a4afe845eff28bb5f821cdc05dd0916d625', NULL, '2026-10-07 21:07:29.292', true, '2026-09-11 18:44:18.948142', '2026-09-07 21:09:35.572599', 49);
INSERT INTO public.user_refresh_tokens VALUES ('14d3c0d8-f383-49db-b707-bf13202744e1', 1, '28820696feffd8676965605cccc8f25ab48738e3547a82d7638825e6b2b0dda2278b9ab10e373151c4c165e0f3c41c54b13c58aac9b6e6dac8f61edd435d79a0', NULL, '2026-10-07 22:18:06.66', true, '2026-09-11 18:44:18.948142', '2026-09-07 22:19:46.94387', 49);
INSERT INTO public.user_refresh_tokens VALUES ('852dda3e-4595-46ab-92e4-67b09333f49a', 1, '33606907c35f79180051bf466ef24e117d260aae6548e1642b0e5aa6e9444f317581ec78f913e6c0f29fe2b4300fe02ee2ce2a6be718dff4cba50edc831cc13f', NULL, '2026-10-07 22:41:54.148', true, '2026-09-11 18:44:18.948142', '2026-09-07 22:42:10.860094', 49);
INSERT INTO public.user_refresh_tokens VALUES ('9070d4b5-fbb2-4d5e-9ec8-bfa31bed85a8', 1, '1b48afc44c674a808cd8b045f5bfcc078b6ff326767d5b56771e5ab70355681aa74c75f374be30b00876b1cbeb3236eb2a19f876d96d77818c5f09e897cc2fc3', NULL, '2026-10-08 00:46:26.645', true, '2026-09-11 18:44:18.948142', '2026-09-08 00:46:27.755898', 49);
INSERT INTO public.user_refresh_tokens VALUES ('eec92dfb-8397-47b3-b569-7ac6c4402fea', 1, '6b529ed46aa6c2794d35ad7ce31011e60b481a165ef1b00c01e10a57cc829d093508382d58b0123dab760d53f0d687a2f701e9bf8927dc7fa55c29bf9178e6ee', NULL, '2026-10-08 00:46:27.881', true, '2026-09-11 18:44:18.948142', '2026-09-08 00:46:39.880155', 49);
INSERT INTO public.user_refresh_tokens VALUES ('752f1166-77cf-4058-8ffb-7b41c24b605a', 1, 'd7064035dc676d5677d8baf0a069fc8bb223381efa6aa764114a363437f02c97856e30694f171f5c4b49bb4d88307c0c02dbdf8aa06ab7bddec210e431b3dd04', NULL, '2026-10-08 01:00:13.489', true, '2026-09-11 18:44:18.948142', '2026-09-08 01:00:53.740757', 49);
INSERT INTO public.user_refresh_tokens VALUES ('f027aad4-b9bc-49d1-8cfa-e23d788b8d23', 1, '118b513c6755b0d1e18eb0fa1e41b0f8da926fd50dab94c00476dff938b98e0ad8fe799a44b76bd1b277d4f577e8d2e58d43fc2e95c16d10c230e7a9086a1d11', NULL, '2026-10-09 13:47:31.201', true, '2026-09-11 18:44:18.948142', '2026-09-09 13:47:34.021322', 49);
INSERT INTO public.user_refresh_tokens VALUES ('acea61ea-63a9-4973-bd6e-3fd1b85505c5', 1, 'a2772de488bb353849f2261ffbe1ff4e5f0b9387088850257e3fe503d4bf495c93875d4dfb84628a99ecb3733ba43c1aebeb4bd650d4cd65a20f368b937e76cd', NULL, '2026-10-09 14:34:53.314', true, '2026-09-11 18:44:18.948142', NULL, 49);
INSERT INTO public.user_refresh_tokens VALUES ('892c8fa5-11aa-4067-9fcb-3a796b33158a', 1, '833a00d89a7986e38217ff3246f0d9f87fa9a44add666d3503489ecb0ee0b591680eac7d501ef5d73486f19c99f8e1eeb2800376f2a15d9906ff8f4b42abdf18', NULL, '2026-10-07 15:44:53.381', true, '2026-09-11 18:44:18.948142', '2026-09-07 15:48:56.805364', 49);
INSERT INTO public.user_refresh_tokens VALUES ('ccefb33d-f1f7-45dc-9cc9-03db3da0a669', 1, '1007459e7d313097855935530c8544465b1e1ea43979e341ef672a7fdc9746883648888a2d6eeca3fd23f308fbe0a9c92fce1fa0d9a91f65a1ba1fbc617f4321', NULL, '2026-10-07 14:50:44.727', true, '2026-09-11 18:44:18.948142', '2026-09-07 14:50:53.212689', 49);
INSERT INTO public.user_refresh_tokens VALUES ('239bdcd6-40d7-4919-ac98-51655fbff4bb', 1, '06e535e194fcb8bb710030cfe1e1f02f934d6d09256240b6926045b2b8f37a521e1c31883484564e43dc4260c48f2adb01280feba1f006a1904f104b0c0a5dc6', NULL, '2026-10-09 14:59:06.626', true, '2026-09-11 18:44:18.948142', '2026-09-09 14:59:18.922906', 49);
INSERT INTO public.user_refresh_tokens VALUES ('9c08a537-2c79-422c-b196-0c47854c0117', 1, '8845ee88b2d6171d8abddd93d4b6cf866c64d518ef89ddfe6413856513bdbb2e5f919fb6404d55c0cab47ebc758ab3cf0bcf638e420b65888f02383046e1fa6c', NULL, '2026-10-07 16:19:51.37', true, '2026-09-11 18:44:18.948142', '2026-09-07 16:19:52.315668', 49);
INSERT INTO public.user_refresh_tokens VALUES ('7b1e9d58-2782-4849-9af0-59a4e8942a62', 1, 'c2c8d0b19c80c07975b8c3d3f0ad1023e74a3aa0e9433d82e48dd5faa60bd7b977e954bf4555df4ced76c991f36df19b924c48e25b6895d1d602e213c06b91c6', NULL, '2026-10-09 14:42:25.675', true, '2026-09-11 18:44:18.948142', '2026-09-09 14:47:03.001399', 49);
INSERT INTO public.user_refresh_tokens VALUES ('0cc4d1bb-6376-41af-b992-3de9d0660880', 1, 'cee71cacc0c03d8f7dc96d8a6f37a052618ac26659b5ad351339f1238726defb4944dc2ca1e739e9a7d621ad6b0ae83b2d10ddac26f6140238e64c1b9eb818b6', NULL, '2026-10-07 19:28:10.994', true, '2026-09-11 18:44:18.948142', '2026-09-07 19:42:06.348337', 49);
INSERT INTO public.user_refresh_tokens VALUES ('5002da39-b762-455c-a111-4e023bef3ba9', 1, 'b6a92c3ed638de0fabfb3937d36d1d58b65e2bcb8c3e174b6d2014d634a98df38e51ab968b1a5927a0a64934b10c09d8281f1e0b8142af989dc67f2ab5edcad8', NULL, '2026-10-07 16:19:52.378', true, '2026-09-11 18:44:18.948142', '2026-09-07 16:20:41.187455', 49);
INSERT INTO public.user_refresh_tokens VALUES ('d159cfaf-67f6-4172-a674-b6c1123ddb0b', 1, 'c6faea82fe99ecb5c1107a89a8c7c2a9f6a1eb4e3d80686609616b28218d948637e7e2c4b6d0942530245e140b2a1771199de6ec7b37d642fbfa124ec4a16f00', NULL, '2026-10-09 14:58:59.611', true, '2026-09-11 18:44:18.948142', '2026-09-09 14:59:06.587332', 49);
INSERT INTO public.user_refresh_tokens VALUES ('024c4e49-b973-4239-84f9-2ec8ef12318c', 1, '6565ffaadf78ff83955b3631c26f057ec9dcf9e7d34a9998273cb81f33895b7e6483648efa263bb05bb65aa754d9aac029969a2fccd5ae5bea67e1a45986f5a3', NULL, '2026-10-07 17:20:11.945', true, '2026-09-11 18:44:18.948142', '2026-09-07 17:24:35.589009', 49);
INSERT INTO public.user_refresh_tokens VALUES ('5361a310-4a94-459a-ab99-3b1288dbcdac', 1, 'b45a9a0b0195ce59e5e244c1f112314dc334be37e041f433c13c54a80ebec1d5f4a5a7bfe679726abfef610d3c6e66cc73dcc8ab99cc5e1b17cfb0fd03f056a0', NULL, '2026-10-07 17:24:35.62', true, '2026-09-11 18:44:18.948142', '2026-09-07 17:26:11.68671', 49);
INSERT INTO public.user_refresh_tokens VALUES ('85825b2d-6529-4a26-85e8-db149d7c9a57', 1, 'a4b39ec6e745a9445ecb81bab56b018a6c392f0c7cdfd247b15013c471901fa0f661ae462f2ddbd1d6af8d4e85c43d5584099fe587b201d2aa49ea53365adcef', NULL, '2026-10-11 11:54:18.436', true, '2026-09-11 18:44:18.948142', '2026-09-11 12:15:16.574329', 49);
INSERT INTO public.user_refresh_tokens VALUES ('f8fb2a11-6d60-4abe-993a-37569ada7c1c', 1, '582bbc3da85a056c3dd4834416cfcc8af732d5cc424a78d405ce280e319b196598b87985a07173608835c220754feac8347f07249a610a962be9449bf56b2ab7', NULL, '2026-10-07 19:07:12.339', true, '2026-09-11 18:44:18.948142', '2026-09-07 19:07:39.744494', 49);
INSERT INTO public.user_refresh_tokens VALUES ('5c7c9685-d1cd-4b12-8040-9bf0e48a525f', 1, '91956a7fd065c4272177511239e491c2034f3c182b1c0e14f62a4991939731818943e462c45db7bb38300e8a120cc52d8dc2850816da1d23293b6cf97162aee3', NULL, '2026-10-07 19:42:06.367', true, '2026-09-11 18:44:18.948142', '2026-09-07 19:42:11.317555', 49);
INSERT INTO public.user_refresh_tokens VALUES ('d0f69107-21cc-4dc8-838b-a54df15175cf', 1, 'c3e75211c44fc87acbb5531a12a4c67f3adecfa62adb747bb83c804d4a7abb29f832695e2abda975313e7a297160063d1f594a89802cac2401bda2032b00cdd3', NULL, '2026-10-09 15:21:01.905', true, '2026-09-11 18:44:18.948142', NULL, 49);
INSERT INTO public.user_refresh_tokens VALUES ('371880ba-e5b5-417c-8f46-24863b37b30c', 1, '92d82fd7892179f448071cda0333b15e17e1ce63d1db12ecbb02ae89cf83abc06fb34e5a6087a5b1952e8237fcd47dad263026f3e6434428521c3a95a66a5bc5', NULL, '2026-10-09 13:47:34.305', true, '2026-09-11 18:44:18.948142', '2026-09-09 13:56:29.534479', 49);
INSERT INTO public.user_refresh_tokens VALUES ('3415b071-f832-4bfc-91be-8e74d4cb8ef8', 1, 'fbfa5f6d7951ce546cfe320d35d7546a79387da8568e4a8b758064690c02c67715fc015af49e8a421306735ca0964bb6d7bae4a952db19ba8f33261d5bd07989', NULL, '2026-10-07 22:42:10.883', true, '2026-09-11 18:44:18.948142', NULL, 49);
INSERT INTO public.user_refresh_tokens VALUES ('9124d09f-1dbc-496e-a36b-6207ec3dbedb', 1, 'c0e1f6cf08aa555cdf2fd500a1b553da60d298b7b35a8c6649e8eee544aa07e24a6ed5a78f537ee3fc9c5d8d4c1b406189093bfe821ce5e57ecf2876b0ddfbd2', NULL, '2026-10-09 14:34:52.801', true, '2026-09-11 18:44:18.948142', '2026-09-09 14:34:53.289873', 49);
INSERT INTO public.user_refresh_tokens VALUES ('a3796502-305a-4dde-bb29-954b824ff112', 1, 'eb85acd97fd2356b72b54015ce62652a98e5d91053eec660e7644269d202924d080c25c95e4bf2d3aaf60a89fef0d8cde7261fea1710d799a27b6e3d027ecb40', NULL, '2026-10-08 00:46:39.922', true, '2026-09-11 18:44:18.948142', '2026-09-08 00:46:59.095671', 49);
INSERT INTO public.user_refresh_tokens VALUES ('783834d1-b768-4774-bb55-2442dc2e14af', 1, '714bfe4cf400faa16a0548ea8f081d0c26b1a54d5bad596cb66a1ff7fe56ccb1f8adff2fb766d8342a4deecbbcc0dffbed2023f9f3e8e4ce15f60865dd27b1a0', NULL, '2026-10-08 01:00:53.783', true, '2026-09-11 18:44:18.948142', '2026-09-08 01:01:07.732825', 49);
INSERT INTO public.user_refresh_tokens VALUES ('b1b5693d-b289-41e9-ace4-b77e79ea0ffd', 1, 'b21382a961e7b055a1c995749254e82bb0229cd13d210a564a2e6fa544fb81e1e8b01bdfcf46d8858e2c186f1ae7811d72eaba92e5161de19b0359be2bcbb2e8', NULL, '2026-10-09 16:03:41.84', true, '2026-09-11 18:44:18.948142', '2026-09-09 16:03:57.341965', 49);
INSERT INTO public.user_refresh_tokens VALUES ('0c972047-c221-4387-93c4-4e5c543e5e5d', 1, 'f2477c325738e5b4995d5ff2abea88b94da80abd8892dd543a0027220514857aa6ae3d46d11c7a370aa839487935fd4b9081b18d9657cc2a14a177fa5cc45cd6', NULL, '2026-10-09 16:24:59.871', true, '2026-09-11 18:44:18.948142', NULL, 49);
INSERT INTO public.user_refresh_tokens VALUES ('6045b2c8-b827-47ad-81bd-2185ffa95bcf', 1, '2841505b9453412f2ba5084e948fa35fa9251f88939cf6c53d5ff9e0a49807319c46765bd30f7f7fa87d7260a56e79f0854a85cdf8210df1b7265b7ba9136719', NULL, '2026-10-07 21:08:11.555', true, '2026-09-11 18:44:18.948142', NULL, 64);
INSERT INTO public.user_refresh_tokens VALUES ('766bba1f-cea1-455e-9a59-7afa2ea4232b', 1, '2cefdb104477bc05bd7f80a284c15e44c8d129b1ce548895ed8679d719e7c9d198c5926f47296cba276cfc743637a8dea61ce9c664a8ce0bf44cd3bf33eff7c8', NULL, '2026-10-07 14:50:53.24', true, '2026-09-11 18:44:18.948142', '2026-09-07 14:51:03.246225', 49);
INSERT INTO public.user_refresh_tokens VALUES ('5e24c116-1810-475f-b9dd-6c706a0cd67d', 1, '97a72ef9403b1a423b91ea2a367bbcb2c188d9b9053b55160ae33739b22ca03d6970be93a8dfd102a94f9b6d9d7178b85dcfef9fbf089fcf529eedeaacada42f', NULL, '2026-10-07 15:48:56.853', true, '2026-09-11 18:44:18.948142', '2026-09-07 15:49:34.825988', 49);
INSERT INTO public.user_refresh_tokens VALUES ('49e5061c-9eaa-4809-83d3-aa9d13aca629', 1, '47ac6c170b2edbaea2bceb2e42c2bb8c69752d4886b82c6f28571e44de7a09c2aba87f80dc31d0c435691caa2c74132774b778429f16ae2d506cde1c9fd8dc24', NULL, '2026-10-07 19:42:11.344', true, '2026-09-11 18:44:18.948142', '2026-09-07 19:46:51.03245', 49);
INSERT INTO public.user_refresh_tokens VALUES ('3ac50305-72de-4be0-835a-4d444ae1f9a7', 1, 'b6b683356887dd40cef000d8230abf38fd9fbbb1a8798b47ab5fd46d91a1ca171074612fce218f01dd423bf287e7c60b2236a1a8338183267aa68aeaf893194e', NULL, '2026-10-07 16:20:41.204', true, '2026-09-11 18:44:18.948142', NULL, 49);
INSERT INTO public.user_refresh_tokens VALUES ('c84cf9e6-20c9-4c83-bcce-5c025106b9f1', 1, 'de82839be8a19b5897c27845af30bd111ba70024c90c3b6621f46ffbfed801e41f96b54f40fa7a30769c691cea2f422d570c920906dbc6efb918fab21dd589ae', NULL, '2026-10-07 14:51:03.255', true, '2026-09-11 18:44:18.948142', '2026-09-07 14:51:09.581518', 49);
INSERT INTO public.user_refresh_tokens VALUES ('a60d635d-7b6b-4f02-a030-c3c625b44773', 1, '1cc6f2fd809d837e748ca0e476893cee9317caf3b425353539ca8bde8e4a7cc01b39d2da75feca636aae6b86ffb269ba681a18ae56969945e6fdbd32feb3b175', NULL, '2026-10-09 14:47:03.034', true, '2026-09-11 18:44:18.948142', '2026-09-09 14:47:14.626314', 49);
INSERT INTO public.user_refresh_tokens VALUES ('2ac4f3f8-61ec-498c-b4de-d0ca535f7d69', 1, 'ce8c75bb5265bb8a1886a88c9d3de1cb92f340b2d2edddecd54a1ed6e160dcf078d68c6afd0084b93fcbd9a6a350f11928b1016b1689ea58847699daf73a51d4', NULL, '2026-10-07 21:09:35.598', true, '2026-09-11 18:44:18.948142', '2026-09-07 21:15:39.392509', 49);
INSERT INTO public.user_refresh_tokens VALUES ('8f3d88bc-c7a5-4aaf-8fd3-60832949c710', 1, '547797716bb5f8c761d020cef7a4f2b52eceed477fd843921531c378b7be811fb873702a210a1ad094fc1c2a695828333951c578ce3affbf3948b3d93f6811d7', NULL, '2026-10-07 17:26:11.726', true, '2026-09-11 18:44:18.948142', '2026-09-07 17:26:45.543056', 49);
INSERT INTO public.user_refresh_tokens VALUES ('2e570fc2-4c17-4713-80cf-0db3374b45e2', 1, '6134b48a08465dc32365e512367c9980a000e6d7fc6c16c40e2ba3fe48d129cd39cea6fbe2b2a7c95355291df4142f885fd8fc6c3b5aeefbfc744af05c4338d1', NULL, '2026-10-09 14:59:18.97', true, '2026-09-11 18:44:18.948142', '2026-09-09 15:00:12.262457', 49);
INSERT INTO public.user_refresh_tokens VALUES ('436fe711-ea76-4ecb-9cd6-731b3a99f0ec', 1, '85cb33d2264ca54358340e910ba250fefd1b7c752b6d7bd51b1c4123ddb3de8aa89d6e13af41a974fdd23d07ed7563a2600ded491132f66d34f79f952f3c1766', NULL, '2026-10-08 00:46:59.161', true, '2026-09-11 18:44:18.948142', '2026-09-08 00:50:54.068712', 49);
INSERT INTO public.user_refresh_tokens VALUES ('864be027-03d2-4d64-9c82-24a0fa528881', 1, 'a414201b19726f7690e927a11f2e99f94f043c5a2c97f74741f14f976a391f5480fe4cfbe252306521ec7ec961bf60bf54adc58e483376367ad07e44b8e4db76', NULL, '2026-10-09 16:00:24.861', true, '2026-09-11 18:44:18.948142', '2026-09-09 16:00:25.896867', 49);
INSERT INTO public.user_refresh_tokens VALUES ('73a2f138-4372-40bc-8529-e9a0a036341f', 1, 'ce7b7a55cb4c5db3cfa06d54acb86231aa576aaf3c62fa64c9b498900e117b7d2520ba49c68b56735abddbb30d474af3ddf4cc359652da22195d83ce52814639', NULL, '2026-10-09 16:03:57.363', true, '2026-09-11 18:44:18.948142', '2026-09-09 16:04:04.12118', 49);
INSERT INTO public.user_refresh_tokens VALUES ('59428207-36ae-4e30-8c2f-ad0f5524f2a3', 1, '8b61f4ae26c8d9250547ac11ded45666b75bd1dd545300a4907243b07d4624405a7655febf3a73778906ee3c4647386daa65ea246ec15e59af371c917b884021', NULL, '2026-10-08 01:01:07.773', true, '2026-09-11 18:44:18.948142', '2026-09-08 01:01:19.112047', 49);
INSERT INTO public.user_refresh_tokens VALUES ('199bf0d2-5925-47b2-aa08-4ed0b4a18314', 1, '761d4fe4c5f3f3ca1b73b212b5e7bc27460c3c5b2bb7d2c55cfbdeb7ff18fe994b4f6119eccf06f82ac7d07a95c1e32ae38806a0b8a9901bfc81849e83a9b255', NULL, '2026-10-07 22:19:46.978', true, '2026-09-11 18:44:18.948142', '2026-09-07 22:20:02.638888', 49);
INSERT INTO public.user_refresh_tokens VALUES ('79aae717-7ace-4f9e-8a30-bbd008c5e31e', 1, '0f8423c75fa449a2a99b0188a30343f9496d0ccd35e38fbe8ebbf84dc86fa4e44f38b5c1e25e9cf7891a3f6a13a6706f832447b947196bf987a3ff065ff6ab29', NULL, '2026-10-09 13:56:29.618', true, '2026-09-11 18:44:18.948142', NULL, 49);
INSERT INTO public.user_refresh_tokens VALUES ('5b73329b-97b9-4d8c-a0d3-97790e5eadfc', 1, 'ed00b80fa90246fb60ce4eb308b7844c4cf5e50e7af5e2ac29e5be2534c9b8f0d656eb6da503b89e3c6b14d899ed7af184d49c4c89965c8739ce0bfb60d4a34f', NULL, '2026-10-09 16:04:04.145', true, '2026-09-11 18:44:18.948142', '2026-09-09 16:04:10.710503', 49);
INSERT INTO public.user_refresh_tokens VALUES ('5aea9243-1871-44ee-a87b-5300ae392063', 1, '7631b8ae9b2279fe32f90ad09d640beacda34e8349bce536193bbbb71a88f3ce4dc0808f14e361e5c72f59d3eecbc1efd38923df3fdb8b1d131f4c95bf112f63', NULL, '2026-10-09 16:51:06.761', true, '2026-09-11 18:44:18.948142', '2026-09-09 16:51:07.386646', 49);
INSERT INTO public.user_refresh_tokens VALUES ('f2f686c3-d57d-4630-91ea-246e13fa9813', 1, 'f6cc0f257825165a5c8a60762d4588246b963b22659a2de257c4d7702cb516a2bcfe3eb3c2e5928694402c96ddadc3d37f37dea348ff5a5ee169fe162744c233', NULL, '2026-10-10 16:08:20.275', true, '2026-09-11 18:44:18.948142', '2026-09-10 16:10:10.278175', 49);
INSERT INTO public.user_refresh_tokens VALUES ('d9f567cf-9358-4581-b5b7-e4514959874d', 1, 'e846ac19f8d28b6eb3a5ce37c5af8fd150d70477d74fe3863405118b5b40454ac33143e990f5edd0efad24e3dcb3174b146fe30a1215a5df885e81ff5a9e00ec', NULL, '2026-10-07 19:46:51.055', true, '2026-09-11 18:44:18.948142', NULL, 49);
INSERT INTO public.user_refresh_tokens VALUES ('961d6b48-ca8b-4180-86f5-48ddf8fb3e19', 1, 'f65b1b48890b1a4f1ca1f9fcd7e67bd9e21b79abee4289e836c696ecc6a2d47295324b7c2bb9139e0e8a8a3ee2b8d127bb6347fb7b50aa04991601bfb8e79a7b', NULL, '2026-10-07 15:49:34.917', true, '2026-09-11 18:44:18.948142', '2026-09-07 15:49:52.422999', 49);
INSERT INTO public.user_refresh_tokens VALUES ('aa50f368-88bb-4d84-a0a2-c0238e11a876', 1, '2a6160e56836bdf1bde33a62702d8530c38470b9b33e62c3c913f8ce30666bf74996334b2f64b3631bb34e3ad972225abe84ff29f6f7e3e54f6ec30573d2fc7e', NULL, '2026-10-09 14:47:14.661', true, '2026-09-11 18:44:18.948142', NULL, 49);
INSERT INTO public.user_refresh_tokens VALUES ('aaa8b11d-e513-429e-a4fd-c914fa9ab81a', 1, 'f6cc0f257825165a5c8a60762d4588246b963b22659a2de257c4d7702cb516a2bcfe3eb3c2e5928694402c96ddadc3d37f37dea348ff5a5ee169fe162744c233', NULL, '2026-10-10 16:08:20.716', true, '2026-09-11 18:44:18.948142', '2026-09-10 16:10:10.278175', 49);
INSERT INTO public.user_refresh_tokens VALUES ('63bc9e5e-aade-4dc6-a9a7-60732552da76', 1, '762c7ef3b342f0c6a5810ecef3f9cc4fb142e0193aed96df80dc059dc1d2549533de6d06a31eca67c80873834bbf41b17ef18ff39d58c9b02741edc39b388d78', NULL, '2026-10-07 16:21:19.749', true, '2026-09-11 18:44:18.948142', '2026-09-07 16:21:20.474752', 49);
INSERT INTO public.user_refresh_tokens VALUES ('a0add11e-c773-43c0-a3e5-bcbfc0b18494', 1, '8c464ff2c90e8a856f29f52ab8e7d5d23885366e830bbae6d2dbc0b5531201b70f894fa0b860926843a994d52bddf036056d751498291f19d37c21329904f93e', NULL, '2026-10-07 21:15:39.427', true, '2026-09-11 18:44:18.948142', '2026-09-07 21:20:14.307546', 49);
INSERT INTO public.user_refresh_tokens VALUES ('0510d41b-c7d8-47bf-bbe1-fa4896daee32', 1, '8f779e1f649b86c4813e536455dbb2ce1f1c026ff119ed76229268c29d5a97403ecc6c69ffe6b5b62732b5768baad8000db2b1488525aa6fcb440085688029d5', NULL, '2026-10-07 16:21:20.5', true, '2026-09-11 18:44:18.948142', NULL, 49);
INSERT INTO public.user_refresh_tokens VALUES ('32d0479b-c647-4f69-b965-20cad804ac74', 1, '34ad0677a2c0da50c4d39b8d91961f5fad1fb2621bb580f39c9219bcffdbed3b6181b6b53dd43c28f278004a40366a01c372ec5a564b47956f8754dee1d8d511', NULL, '2026-10-07 22:20:02.65', true, '2026-09-11 18:44:18.948142', '2026-09-07 22:20:10.901907', 49);
INSERT INTO public.user_refresh_tokens VALUES ('ef3a3aba-a1aa-4b96-aead-787dbae1913e', 1, '4139e0c621e827d2e4ec8b4f0275ce3c19fd1c1853ea7c824f68bcf41badbc2020399295c43d5db33f55fa8a39a0a7db0cfaf92331df47529f68acd00b9927b7', NULL, '2026-10-07 16:21:46.909', true, '2026-09-11 18:44:18.948142', '2026-09-07 16:21:47.735321', 49);
INSERT INTO public.user_refresh_tokens VALUES ('d3ef87ae-24e3-42f6-b1b7-d5a7e68fa0f8', 1, '816d1fc7c418921b49f3d05e692d28d522895773f35bf5e4d72fb768408ef12ba5ea4e33937b29857988e458fb085549e0493e1640124dfcf6cd749dbc0b1fe2', NULL, '2026-10-07 16:21:47.811', true, '2026-09-11 18:44:18.948142', NULL, 49);
INSERT INTO public.user_refresh_tokens VALUES ('bba03776-a763-408f-8320-d1299592c1dc', 1, '21ea49cfdadbb72f67cc93ef90e3d2070bf43ba8d27bad2108f6b4d015f378d37de094c125092837419b5be5e3b3e7eabffa83d3094d27b8e08c59d25c637fdb', NULL, '2026-10-07 17:26:45.596', true, '2026-09-11 18:44:18.948142', NULL, 49);
INSERT INTO public.user_refresh_tokens VALUES ('4a5068a0-58d0-42be-a7ef-ecfa9a804e7f', 1, '75e21180be3bfe7446a2cb306ad883c234399a4acfc6b0f537d8cd9ca8471aa81e1f97a17edae714747a428f14b0550c1ac4213bcc0dde25a46cc6c89f8d06ee', NULL, '2026-10-09 15:00:12.299', true, '2026-09-11 18:44:18.948142', '2026-09-09 15:00:56.393736', 49);
INSERT INTO public.user_refresh_tokens VALUES ('8c03c948-9c2d-4343-bb45-a3115af9dd97', 1, '84233c83776d5d3116697842720c95e8558f07cd08f1669c630b769584556040fd8bc255ee50fd50d64db017932c7cd244112d050add4d730912116dd8791665', NULL, '2026-10-09 14:47:18.265', true, '2026-09-11 18:44:18.948142', '2026-09-09 14:48:16.312195', 49);
INSERT INTO public.user_refresh_tokens VALUES ('b12114bc-dbd8-4dc0-b363-7ca476063794', 1, '1314ae5b21cf90188f9904a45005bd19d87281f70f89eb92e106a127ad26a7976633489be7a2d79a8afddb8b3a982529029e3ed297457f05ff774d47c007866a', NULL, '2026-10-07 21:49:48.782', true, '2026-09-11 18:44:18.948142', '2026-09-07 21:53:13.033215', 49);
INSERT INTO public.user_refresh_tokens VALUES ('8748b6e6-e4e1-484d-a83b-c917ad0520f1', 1, '84233c83776d5d3116697842720c95e8558f07cd08f1669c630b769584556040fd8bc255ee50fd50d64db017932c7cd244112d050add4d730912116dd8791665', NULL, '2026-10-09 14:47:18.999', true, '2026-09-11 18:44:18.948142', '2026-09-09 14:48:16.312195', 49);
INSERT INTO public.user_refresh_tokens VALUES ('868ce4b1-34ec-4078-8ae1-5bac8fc5ab4e', 1, '84135f933fda79e86aebdc58a25e866e1efd82db6ddfcebe58a95c32568ae8710bc0a40c714285184234ec6b152e8b7c71d39d5bd3e9e1e4bf510e54d6b20f41', NULL, '2026-10-09 13:56:34.218', true, '2026-09-11 18:44:18.948142', '2026-09-09 13:56:35.511073', 49);
INSERT INTO public.user_refresh_tokens VALUES ('8562a18b-b266-48e2-817d-a47f3068b0be', 1, '485a599111a60a19a654c89fe9a8ddb18c16b76c6cceb532ff4c5d74f9d4698df97ad3bf29701c1b80fa7bccf1efacbf68cc4aa082c0832f99c217e23b073536', NULL, '2026-10-07 22:20:10.923', true, '2026-09-11 18:44:18.948142', '2026-09-07 22:39:04.522466', 49);
INSERT INTO public.user_refresh_tokens VALUES ('56c283f1-088a-48eb-b745-e5f070036e19', 1, '5935ef845494f81cbcd2ab7e691bc6883dcd988eb251bbd8830be299d141252a5fe7da3c3655f9fb60d8eeaf10ab811a3eb847f0b21f0227fb9599121933cba6', NULL, '2026-10-09 16:00:26.054', true, '2026-09-11 18:44:18.948142', '2026-09-09 16:03:41.788818', 49);
INSERT INTO public.user_refresh_tokens VALUES ('3cad5df6-f233-443d-af89-a92d89db4c56', 1, 'ba5e80876b3448d892a01d9a0f0a184b6c9838527d822618e73aeacc8129ed2bf0f1ac06372a5bb9e1aeb736b5c82e70d7612bb9cc71ddec2dcaa286d047de4a', NULL, '2026-10-09 16:04:10.731', true, '2026-09-11 18:44:18.948142', '2026-09-09 16:04:15.994035', 49);
INSERT INTO public.user_refresh_tokens VALUES ('03fb43f9-b29c-4dc1-9795-a17a5bf0a946', 1, 'ddc6ca6bb3b67bd1b2cb238d5c34d895054c0dc9da8eb8711239af1b1c2bf59965db8e6c520d4a117531b2372cf9e5f3d9bf859307ec6508af91053c8290ff00', NULL, '2026-10-08 00:50:54.101', true, '2026-09-11 18:44:18.948142', '2026-09-08 00:51:04.525643', 49);
INSERT INTO public.user_refresh_tokens VALUES ('b6dcd863-cdee-4430-a42d-c05cedaf946d', 1, '350428cdbe39983dd908bc85ecbe99e6c1a246ef6177ddc31aac5db2fc89638ed07f147db0db93c5948b1fa121875973b0cce222b4e8f3d8fa1373c43f624af6', NULL, '2026-10-08 00:51:04.558', true, '2026-09-11 18:44:18.948142', '2026-09-08 00:52:28.592177', 49);
INSERT INTO public.user_refresh_tokens VALUES ('f93d0762-ec9f-4e33-ac32-df1daa184a20', 1, '3ed5f3871aab432b4c70c86184756ef4dfce553414049d261dbaabb2b42c1d57fb263bdaf0b9958cd1ac4af69548dc5f7d2b30f48b31dc6b491801d25880d331', NULL, '2026-10-09 16:04:16.024', true, '2026-09-11 18:44:18.948142', '2026-09-09 16:04:20.283844', 49);
INSERT INTO public.user_refresh_tokens VALUES ('afbf8d5a-7c81-434d-8ed2-558c3a38c309', 1, '683acf6631746de5ad3194fe93459ead67e2567c9be0290f253c8f21e2c37a1095694c86090380d01f829f39717b40f62b2eee358e11a244b2a008ef7d1ffe8e', NULL, '2026-10-08 01:01:19.132', true, '2026-09-11 18:44:18.948142', NULL, 49);
INSERT INTO public.user_refresh_tokens VALUES ('0eda1f96-4c2c-4ac8-a1e0-e7a700a4b687', 1, '00d8d2bebefcd6a9494aa6bd08508e8d2738f5341a125c107b15942f2e6f898be97dccc7f06cd1e69a3e52383a6fb870ac54e7cb4aa9bb44e1ee7b5cdc8fd2fd', NULL, '2026-10-09 13:56:35.53', true, '2026-09-11 18:44:18.948142', '2026-09-09 14:07:13.465117', 49);
INSERT INTO public.user_refresh_tokens VALUES ('9a5942ce-e4da-4ee3-bfd2-b60c06aa9ef9', 1, '94a79b49f7c658aea896538aef98b3d634fa81435ebafd6a4d6a1b0b014b18ef606ac8a99f9f523f1916a8df5c3836ac4a0839f1abfabd2b8f0297aa65cce3a2', NULL, '2026-10-07 15:49:52.456', true, '2026-09-11 18:44:18.948142', '2026-09-07 15:50:35.506988', 49);
INSERT INTO public.user_refresh_tokens VALUES ('47c712da-da31-49e5-9ebe-a06ae07ba2e4', 1, '2bca46470aa046f2bc47ae505c98d01445785420d7561a36e492fa23112eeea1234ce0ce09795a1e270696f4a88a7e1d21b90c3182e1d283a1abf82d4c2443b8', NULL, '2026-10-09 17:43:45.007', true, '2026-09-11 18:44:18.948142', '2026-09-09 17:43:51.683635', 49);
INSERT INTO public.user_refresh_tokens VALUES ('8f9e31e1-73b5-48ce-8032-ed77b04dd0ab', 1, '2c6a9a80040abd463096317a4705c1518f1a1535716878d5ae7805733627a50dbfcaf9748166c12965a671808dde9cf5fe658ccc2997c78d52b5f8fc1853bb8d', NULL, '2026-10-09 14:48:16.33', true, '2026-09-11 18:44:18.948142', '2026-09-09 14:51:19.838805', 49);
INSERT INTO public.user_refresh_tokens VALUES ('0d396d11-528e-4d33-928e-39e6e2573f8c', 1, 'ca39a7c14e731c7ab8424b0d2d8926c8a21a828e834ed244b7c8ef2e0f38755a4439d0c5295fb0d786ba6c51aa71be148a58650e45cd48bcef4cb1be83e02b61', NULL, '2026-10-07 16:26:11.58', true, '2026-09-11 18:44:18.948142', '2026-09-07 16:26:12.602762', 49);
INSERT INTO public.user_refresh_tokens VALUES ('33a1d01c-8adb-495d-af25-f711fb2a0173', 1, 'd985570c86a88d5d7a6c5c825f60733f6bd1e52612a329ee9b3b3781989f656b69461d4469f1bdf0923a4abcb2c45bba94bac0795f42ac5ba1c749b03c436c8b', NULL, '2026-10-07 21:20:14.329', true, '2026-09-11 18:44:18.948142', '2026-09-07 21:25:13.730281', 49);
INSERT INTO public.user_refresh_tokens VALUES ('de4b4525-ccbc-4ca5-a32e-dcf278b3d654', 1, 'bd936bf5c3e8f941e7199bf58ba0e0084804de763f59f08cca334ebb1f91c2aa8db3b2feea7a2f5d8da4b1852e3fb8b02c66f95454af4bbc01b089364b064300', NULL, '2026-10-10 16:32:13.504', true, '2026-09-11 18:44:18.948142', NULL, 49);
INSERT INTO public.user_refresh_tokens VALUES ('74f2eaea-8077-4799-a51e-399f870b1557', 1, '43c71d5b0c62c434628c8d12b21473492719cbb476f05af16b6b1dbb3ed6056661edf261729d6d3d9cb03680d408ffd599191d801ae92426e18b9d1497771f28', NULL, '2026-10-07 16:26:12.63', true, '2026-09-11 18:44:18.948142', '2026-09-07 16:26:22.859593', 49);
INSERT INTO public.user_refresh_tokens VALUES ('c57f3f7f-4746-4bb2-b129-5635e822e7b1', 1, 'fce0848b80b8c98f92a0bd5486343df4c6ae8edfdc0344e528ad9a7ec6692ab22bdf8bd538b5cf566d4122fb6f698adc0bbca1fba4e108b9709937c579bffb83', NULL, '2026-10-09 15:00:56.405', true, '2026-09-11 18:44:18.948142', NULL, 49);
INSERT INTO public.user_refresh_tokens VALUES ('1458894f-43dd-480a-806c-3eadd66d2b8b', 1, '459a1ee38f9b2fb0714aa48df5b309104dcfd5e20c84e96e6d30228c7d53b3a6c966e9a7dc42460558a4bc723fa5557f351241ef23f6a95479dbd9007b96e135', NULL, '2026-10-11 12:30:34.882', true, '2026-09-11 18:44:18.948142', '2026-09-11 12:30:44.529595', 49);
INSERT INTO public.user_refresh_tokens VALUES ('a38e6d1f-e581-422d-a5da-d973dae8ffc2', 1, 'd6954ac291ea19d410d71fe2cd52c7fc31f3fd78d1cfa6ce94deeb248e4dbea31b458683e5e63d8a08e4d903b1dd2322c7463eae660569dc3d7b5bcd921dfeab', NULL, '2026-10-07 22:39:04.534', true, '2026-09-11 18:44:18.948142', '2026-09-07 22:40:44.663332', 49);
INSERT INTO public.user_refresh_tokens VALUES ('487bbdf1-a952-4b95-bfc9-c8d160c8eb29', 1, '57c977c4829da3f5f187bc36d798dd97a3ee77ae971dbf18062e8102c897214a4f6cf19ca2c889b6e76468684fce461b5c2eab74676ae860d8a1dc6b3d52d18e', NULL, '2026-10-09 16:04:20.314', true, '2026-09-11 18:44:18.948142', '2026-09-09 16:24:59.754537', 49);
INSERT INTO public.user_refresh_tokens VALUES ('e09bd6f6-76f9-43a9-bebc-75d749a56f48', 1, '7de5c0cff09e8761ca82e470bb204d28d242ddb505e7bddc428338d3a45b2109086c6c0800b824b186bd15dcbfcd787310a55a3f7f8bbd55c687a9f2db42ee6c', NULL, '2026-10-09 16:51:07.452', true, '2026-09-11 18:44:18.948142', NULL, 49);
INSERT INTO public.user_refresh_tokens VALUES ('c56f38fe-b82a-4804-994f-67affde08112', 1, '38efa29ed13d975c8f8ba930e5c2507981b475718aecab5b0b0342b632e37355a5db49d85799902a7a2d04d19af7fefe67997321eb0fa88345dfb66fa6d37014', NULL, '2026-10-08 00:52:28.711', true, '2026-09-11 18:44:18.948142', '2026-09-08 00:54:15.660208', 49);
INSERT INTO public.user_refresh_tokens VALUES ('eb6053fd-ec4f-419a-af62-8b4d48a5689b', 1, 'bb4f748ae1ee72575e4b5899614bf8feac854d8c278636574bfe2caf4c97bf930ccc33d3c7ddb93fe9879a77c3c734aff55f2df907509cb804e1aa4130f5490b', NULL, '2026-10-09 17:41:30.079', true, '2026-09-11 18:44:18.948142', '2026-09-09 17:41:31.646273', 49);
INSERT INTO public.user_refresh_tokens VALUES ('d16c3b66-203a-4f9d-ac31-cf62ddbf408c', 1, '133457564e867820c534944388994de20cf4d03237bc304e3cf5fa51b703c0abb14042fe1310e423042e42d7879f857b9ed64bcd0f5a5f64d371bc9afe7d18cf', NULL, '2026-10-09 14:07:13.475', true, '2026-09-11 18:44:18.948142', '2026-09-09 14:07:25.621018', 49);
INSERT INTO public.user_refresh_tokens VALUES ('664e77dd-d9c0-4617-9acd-cbf8d96aced7', 1, 'abd0793c40ded0be800f5ab6c2cc70cc1a3e04947696316b03bc3c81d67f424a9ebde985887e3025faf70cabc1b1a025c9338972e0e53248c51c641f50743fe7', NULL, '2026-10-09 17:43:34.174', true, '2026-09-11 18:44:18.948142', '2026-09-09 17:43:44.988886', 49);
INSERT INTO public.user_refresh_tokens VALUES ('8544be3e-6bcc-483f-86fd-2bc4f86dec56', 1, 'ea6b0d4398468889c97c978ea6f27ce615f8a341ebf04a427121d4a90f12327d99408634f56bd9d158e59bb7beb58301f3e8afaa02e9c13d89e3fb1fca889782', NULL, '2026-10-09 17:41:31.723', true, '2026-09-11 18:44:18.948142', '2026-09-09 17:42:20.659643', 49);
INSERT INTO public.user_refresh_tokens VALUES ('3a33ae53-197f-4c00-a227-2cdaed331dde', 1, 'a99332b8ce95a8b90879d93200a803c5132bf5551de04933647c19aba60db2c5096d30c08179fd9ca3349967f5ea8f2492bb92bd846daaa2e5594fc53a3ee2ef', NULL, '2026-10-09 17:42:20.704', true, '2026-09-11 18:44:18.948142', '2026-09-09 17:42:48.409689', 49);
INSERT INTO public.user_refresh_tokens VALUES ('ad48092b-f723-47ac-a2e2-56bc93915a91', 1, 'aac1fdaf54f78cf3a2ef3cd971515da06d4d4b5dda66d865b36d41213a13cd47a9e9f62d3e041c31add8719b00979d0a0d1f37d418c1aa3abf828b7848f77cbc', NULL, '2026-10-09 17:42:48.468', true, '2026-09-11 18:44:18.948142', '2026-09-09 17:43:34.149151', 49);
INSERT INTO public.user_refresh_tokens VALUES ('070a956a-b3cb-4bc3-b1f1-2fc1d7c9d4c7', 1, '1fc4cf598d17b0a8c80eca96272005c339db3a71856144e64652482c1bac29147b9752708b146fa18fcb494ddc8ddcba4ffc6cfcbb6da1db965554bf99984a9f', NULL, '2026-10-09 17:43:51.712', true, '2026-09-11 18:44:18.948142', '2026-09-09 17:43:57.048669', 49);
INSERT INTO public.user_refresh_tokens VALUES ('cbdd2e7f-8b0a-4107-9878-6f902f06002c', 1, '7b2a723ac2da936925fb11397f112769fe320dd707bbaadd87b6c5444df8679aa82b31ad52d1e76a31820793eeb75ba55e29e110ef7cee021126918344acf2c0', NULL, '2026-10-09 17:43:57.061', true, '2026-09-11 18:44:18.948142', '2026-09-09 17:44:04.483385', 49);
INSERT INTO public.user_refresh_tokens VALUES ('b2362b64-7fdc-481c-bda7-14bea05e9882', 1, '0e5b80e80809f8c093fc91e5fa1a3671946ba31ddc18fb3da7c4615656b9906893ecea7d8669afed033acac332583eaf3419cf3257dae1a2ba6ce83e61b04575', NULL, '2026-10-09 17:44:04.519', true, '2026-09-11 18:44:18.948142', '2026-09-09 17:44:09.109003', 49);
INSERT INTO public.user_refresh_tokens VALUES ('b912108d-3973-459d-939d-c04461151672', 1, '0e7c0b51372ed7b472b7acc3af39ba9f9468b463a516f86b7d22fb7674675466d71ea935922caad7ffd7803f131c2bc55ba9b400462010b23a69fe55c346f4bf', NULL, '2026-10-10 16:10:10.291', true, '2026-09-11 18:44:18.948142', '2026-09-10 16:14:29.412826', 49);
INSERT INTO public.user_refresh_tokens VALUES ('80ffa427-588f-4f62-b6de-c573221392be', 1, '6971bb18a1e4d5a43afbf76954869d7c9ccf99054eda2fd46f4be2ab6d48cc7b655843a526d3de6bc4e4e3a460a9a9c01b3816b17b72e93c9ac72b1c2faf8bb5', NULL, '2026-10-06 17:04:27.65', true, '2026-09-11 18:44:18.948142', '2026-09-06 17:04:28.430539', 49);
INSERT INTO public.user_refresh_tokens VALUES ('d113f70c-ef17-42fc-8867-ad67f87a9bd8', 1, 'bcff5853ef0d1603f6b10cf347c5cda6f22e2065ee84b8591ac7d5ab40ea4a3c306c24d2f302dc07b0080378de8e32db9f341eac73d9082505d33e06ada50aec', NULL, '2026-10-06 18:18:47.459', true, '2026-09-11 18:44:18.948142', '2026-09-06 18:21:33.455035', 49);
INSERT INTO public.user_refresh_tokens VALUES ('408bbc15-b645-4be0-9de3-c231b5e7edb4', 1, '8fd7c0e2af4bd21eb9b9004e5a143175ab51e096bd723510f6ebe0363f5d598496327ef4d07c6c72e117946839f211e95c41814fe405176d1e47267423cc4b2c', NULL, '2026-10-06 17:04:28.475', true, '2026-09-11 18:44:18.948142', '2026-09-06 17:06:43.859614', 49);
INSERT INTO public.user_refresh_tokens VALUES ('168c358a-798c-47d5-957a-3e78c0b48944', 1, '764f6d9f7e6fee6415691ef170553b2eb14b3856d496c2ff48b1eeb2d00e876490445a0ad780044718a785c967f0a0840d8884e216df85f47c73d51e722ecd44', NULL, '2026-10-06 18:21:33.483', true, '2026-09-11 18:44:18.948142', '2026-09-06 18:21:38.706257', 49);
INSERT INTO public.user_refresh_tokens VALUES ('0481ef72-d8df-4c0d-b92b-17e88a6fa074', 1, '0d82f112896703b91094a623dddfc7f3257315e9bd3d16686a429a892491e888b41a5e9973448b76b6b19d3f314156ec6358be2ee32cbb285a35b27c06584848', NULL, '2026-10-06 18:21:38.727', true, '2026-09-11 18:44:18.948142', NULL, 49);
INSERT INTO public.user_refresh_tokens VALUES ('d7fd9ba8-474f-4065-ad3c-d4a66f8e3b30', 1, '0ebc043e98af04c2c51a3dc9eeff64b75499a0a6f65cd88a9ff80559fcf00870ba5798e40a9c83c0cdfd8fbaa38c20bcdab499911d33dd172c242c93bcf35127', NULL, '2026-10-07 15:50:35.587', true, '2026-09-11 18:44:18.948142', '2026-09-07 15:52:45.648064', 49);
INSERT INTO public.user_refresh_tokens VALUES ('316ca511-2ba7-4c83-94b1-b6578302bfe9', 1, 'd5654b797a3efeae7e8b097f26752ac40c6dcd77e578a6e1fcf1e44309dd46a8787e3739e4a0cc1b06e0a7ad9ae41a537f73722f4f2931113108d95f3ff79f63', NULL, '2026-10-06 18:24:05.379', true, '2026-09-11 18:44:18.948142', '2026-09-06 18:24:06.328096', 49);
INSERT INTO public.user_refresh_tokens VALUES ('90640d61-812b-4d41-8f66-73c05bf30fa8', 1, 'de82bc41bd57a2ec2839c5ea346d82606762b9ef36b057d0cb3d7e7e02c3c329f7d4ae0bd414d1e7a96182eb09b41dc4bbdcfec1671df60df04fa193eb21eb4f', NULL, '2026-10-06 18:24:06.355', true, '2026-09-11 18:44:18.948142', NULL, 49);
INSERT INTO public.user_refresh_tokens VALUES ('b6f7aff4-b674-41f7-b74b-3a643deafee0', 1, '1485793626409c3bcbde82bbb7ba1cf85f87b8aa8db0d6427651073cc61d57974c450e369ec3b3a8115e6c4e9ce0193e1fb75f5d57e0cfbba2ca085ed1f45266', NULL, '2026-10-06 18:26:44.369', true, '2026-09-11 18:44:18.948142', '2026-09-06 18:27:17.734182', 49);
INSERT INTO public.user_refresh_tokens VALUES ('ce3c934a-f07f-424c-aeb4-9ad10f4dbaf9', 1, '87d1a7b8603ab42bc84635d9c98746c52cfbaa726bcd2218ef0fab4804f309e86b967b1a0483f0029aa4ea16345842ae8cf9371fcda661f9e37e585b6fe29438', NULL, '2026-10-07 19:47:47.638', true, '2026-09-11 18:44:18.948142', '2026-09-07 19:47:48.319886', 49);
INSERT INTO public.user_refresh_tokens VALUES ('4b06552a-aeb4-4fc1-8ce9-c8c0d0125ffc', 1, 'bfda7a7d30e8aefd24b94e0e9feea82f1661105f2e230316240380eecb1a9d2a92ee451c572e7133d06ca437bf6fe2bc50aa295ea96c2691d4833bf7cc096951', NULL, '2026-10-07 16:26:22.879', true, '2026-09-11 18:44:18.948142', NULL, 49);
INSERT INTO public.user_refresh_tokens VALUES ('0bf3e03d-fcf5-4c11-be7c-f78bba4c1220', 1, '71bd13744320f55aab169345db561b3389b7660eb9f9f11ade7e5daf1065f30d092cd898417d9b292a80f65cb27af5a177df72591c410cc3cda70ad274f53138', NULL, '2026-10-09 14:51:19.883', true, '2026-09-11 18:44:18.948142', '2026-09-09 14:51:33.800856', 49);
INSERT INTO public.user_refresh_tokens VALUES ('2aa924f3-ac34-4434-8b81-55b0b714542c', 1, '6eb9bb3a21ec1b4a6d7c2cb44f2b06307de4d6a6d8a2629e8d9c6cd32692be2f5ac39fb38356f37143ffd1dd2ee39dd279643335c8120ef85158431c15ec47b8', NULL, '2026-10-06 18:27:17.757', true, '2026-09-11 18:44:18.948142', NULL, 49);
INSERT INTO public.user_refresh_tokens VALUES ('d97ce4e3-b431-4399-8895-2477354c9384', 1, '1485793626409c3bcbde82bbb7ba1cf85f87b8aa8db0d6427651073cc61d57974c450e369ec3b3a8115e6c4e9ce0193e1fb75f5d57e0cfbba2ca085ed1f45266', NULL, '2026-10-06 18:26:44.934', true, '2026-09-11 18:44:18.948142', '2026-09-06 18:27:17.734182', 49);
INSERT INTO public.user_refresh_tokens VALUES ('74b0291e-7ee9-421c-afb3-a8eee9063989', 1, 'f2f9345517b1ea867d8a67e200339413b811e4244314a9f7856f7f00a5d611690818fb644664545c7b49c5b0ae9cc92cf842a0bc58e36976c9f8d24dbf0d3de4', NULL, '2026-10-06 18:33:38.304', true, '2026-09-11 18:44:18.948142', '2026-09-06 18:33:40.252683', 49);
INSERT INTO public.user_refresh_tokens VALUES ('becdd10c-2dad-4df2-85cf-6dcd37bd956a', 1, '79e31a74970d4de880a7c5dc70c11b76b79d1d5fb245a0dbbbdc03f7d28f05f4c7c3d63430957ab8f52606701e3d1404333788986c5931c00b7c0e2fc702c539', NULL, '2026-10-08 00:54:15.706', true, '2026-09-11 18:44:18.948142', '2026-09-08 00:59:13.382266', 49);
INSERT INTO public.user_refresh_tokens VALUES ('d807a6f8-2ec6-4cb2-870d-4a295503397a', 1, 'f5009682deceba2ea2e6c770ada5b91a180263f5fdbf94109562d0106663adc59729c137f1a1fe7f8a6aeba2ac8eb0983e06210ccdd90ad7df82cbdd7fc97398', NULL, '2026-10-07 21:25:13.77', true, '2026-09-11 18:44:18.948142', '2026-09-07 21:29:01.01531', 49);
INSERT INTO public.user_refresh_tokens VALUES ('7f98ee36-a1c5-4fbb-a24f-97dc2e245a77', 1, '6122c5ee4b1e464f9cd65b44285b0bfdeb4379030af4849f1e1e5dc849ce6aebe37959e3f6e0b2f109b1cb40a7162ad8dbccef96c65310fe90b73ed67a2883af', NULL, '2026-10-06 18:33:40.387', true, '2026-09-11 18:44:18.948142', '2026-09-06 18:34:26.099688', 49);
INSERT INTO public.user_refresh_tokens VALUES ('f1705203-cf52-49f6-b797-b27fbfdf57b8', 1, 'b58c545d0aedf76f0f58b45e19254b33e2eb62d7b50f77729290574a25816cbdda58d3872bbd6ead4bcebb9e856794f0f7ad552079475160f875b54cc6cdb026', NULL, '2026-10-06 18:59:48.55', true, '2026-09-11 18:44:18.948142', '2026-09-06 19:01:05.912037', 49);
INSERT INTO public.user_refresh_tokens VALUES ('12488e32-9e9c-4758-aad9-cf22427765fe', 1, 'f4d809b2234943a237a36ffec2680a63abe24a05751a5a24a0588761381ac5923160d7a8a0a684ef212fc20cb89755571f9d4298b7a5002d7517550cad954a17', NULL, '2026-10-07 22:08:43.383', true, '2026-09-11 18:44:18.948142', '2026-09-07 22:18:06.635098', 49);
INSERT INTO public.user_refresh_tokens VALUES ('bfa355c6-2ce1-4f75-97ca-71ed5f2c92b6', 1, '4fa0a9d81b84642aa8ce6afed6338e8a4f24d2edd63dd887b45d56a5c71ebc5324d658d3f4a686f06600edf2aacbdfc949fa10a028ab2963962bc55a3336ecda', NULL, '2026-10-06 19:01:32.346', true, '2026-09-11 18:44:18.948142', '2026-09-06 19:05:56.633548', 49);
INSERT INTO public.user_refresh_tokens VALUES ('0b76e01f-2b1f-443c-86d9-08c40af5f75d', 1, 'f9b23079d46f5186baddef91fbd87623f89c6f92e0815afbd6a41a1b7295f9d3f21588f4b4d9a7999ddce0493c6a797047127b8c76e07e80b064d56e6a25c410', NULL, '2026-10-07 21:53:13.089', true, '2026-09-11 18:44:18.948142', '2026-09-07 21:53:27.566543', 49);
INSERT INTO public.user_refresh_tokens VALUES ('237dc3ad-d2cf-418b-8d30-2184b42851c2', 1, 'd0830242567a18e1db6738fd2a7c24372f4835a0926f769aa875dee2bbe9b732ed6918df0fdfdd3412a3c30a6b7fbdbb668fece6e52845a285b7fb53c0c384d7', NULL, '2026-10-06 18:34:26.115', true, '2026-09-11 18:44:18.948142', '2026-09-06 18:34:43.321214', 49);
INSERT INTO public.user_refresh_tokens VALUES ('b346cea3-6768-49df-bb23-fb8a14cf596f', 1, 'ef486d668f6ed12f265b726740354d731a76d75edbbd8c8317f9565aa8c279ef3d487bb42e3316edab1456257e09561614b98b4f17786760ddd7b3c60c9c6b2a', NULL, '2026-10-06 19:01:05.948', true, '2026-09-11 18:44:18.948142', '2026-09-06 19:01:32.324066', 49);
INSERT INTO public.user_refresh_tokens VALUES ('3c15d4e5-b297-4ba4-883d-6500b1f33660', 1, 'b57ba5348ff9796c1d5c019f24b6bbc20680d23e1277ed7855928183a110597053fc6d7e6f8d8e6a90dc269d1482fb1456d65ae47eebebd1bc1f322f4e477e59', NULL, '2026-10-09 15:19:57.622', true, '2026-09-11 18:44:18.948142', '2026-09-09 15:19:58.569094', 49);
INSERT INTO public.user_refresh_tokens VALUES ('4450ca9f-6952-4422-ab53-0be490f0c7c3', 1, '6a9a32035ee779ae9c9972936eaa48fecec6e8caa62830b34dca873608f197935e0bd09f94d5dc78f25e2d93bafa47fcd8b41e36c12d576aa3de4355ee4f2c31', NULL, '2026-10-06 19:05:56.753', true, '2026-09-11 18:44:18.948142', '2026-09-06 19:06:07.928932', 49);
INSERT INTO public.user_refresh_tokens VALUES ('f3194107-6431-44fb-babe-3102dcf8dc8e', 1, '69ebd597ccb862bd08fb35af40d5c7f71078d397970c3e740a3cacf9f3aaf229a79ad435f4db57e31d5f480f27fc03a75158028dab3a2729e911e1f24a60ac09', NULL, '2026-10-07 21:53:27.612', true, '2026-09-11 18:44:18.948142', '2026-09-07 21:55:05.175937', 49);
INSERT INTO public.user_refresh_tokens VALUES ('ce117acf-8b2a-43c0-8660-7a09259c4396', 1, '60580e509cdec9ea578f7e4ea83b70fbb0f8060c83b7a93b9162166f0263c8f34a6b9d9a01e596ba8b05418171dbadfd501500870104bc777f504e9365b37ecf', NULL, '2026-10-06 18:34:43.336', true, '2026-09-11 18:44:18.948142', '2026-09-06 18:34:57.672045', 49);
INSERT INTO public.user_refresh_tokens VALUES ('8cb8e769-d134-4b02-9003-9cd73764620a', 1, '0624b48f041af1d1f9738fed45153ed49bc22a6a1a4ba83148f7ad209226c31fa80f786c15f48f22b94dbfd23271d68e4c5e007cb0155f74affa579264de8d3c', NULL, '2026-10-09 15:19:58.647', true, '2026-09-11 18:44:18.948142', '2026-09-09 15:21:01.877956', 49);
INSERT INTO public.user_refresh_tokens VALUES ('61edd8bd-be89-4486-9152-1e0435de8278', 1, 'abfa23c44939560e750fcab09c26696b08d1106b7b6d324f7f8213ab0460dfc244900389171b58dc35c7b556202edbb7ca70c931ebdc155dfaf2df607bfd2e0b', NULL, '2026-10-07 22:40:44.758', true, '2026-09-11 18:44:18.948142', '2026-09-07 22:41:54.114889', 49);
INSERT INTO public.user_refresh_tokens VALUES ('a70c6605-8f22-4912-8956-b77a9f2770f0', 1, 'f8d76fc37316fe21a61030140bcb40ee33a251e315bf4b4a5bd7eed28e8b750ce7568e4f5498be294d3811595e5546da1064d71e9b7086590a4af7bdeda36932', NULL, '2026-10-09 14:07:25.64', true, '2026-09-11 18:44:18.948142', '2026-09-09 14:07:45.442308', 49);
INSERT INTO public.user_refresh_tokens VALUES ('fe2c5bae-4842-4f36-934d-5419d9024d5c', 1, '85c4e7791b663600be19dfbd89de6b47a3fc82cd4811f3f89c2ffb023fe43ba54717bbffca207dfe4fdc36d20963f11189b813160e5bc7e96f5cfeb96e72ac30', NULL, '2026-10-09 17:44:09.145', true, '2026-09-11 18:44:18.948142', '2026-09-09 17:44:13.856188', 49);
INSERT INTO public.user_refresh_tokens VALUES ('024af00c-5547-4a45-a70b-ae73fa1818af', 1, '85862e3c28184923f0292f990c0291b32e1d67dfbeb2c0e53173743200b188a8e61833215cbb5b8e266e5b141d29b53cb631932f4b15e2ea10c65f535ebad687', NULL, '2026-10-10 16:32:35.045', true, '2026-09-11 18:44:18.948142', NULL, 49);
INSERT INTO public.user_refresh_tokens VALUES ('8784718a-b41e-497a-ae5a-8ed9803fdf27', 1, '9177e17a491c702bd5f98cd22a665aa29f2f031ef9a591387fd5c24d5c8f30b3a756a3153f8a6897ab8e4eda36b35b8584107fa4ea851c3965f5d8e3c9b79165', NULL, '2026-10-11 12:15:16.587', true, '2026-09-11 18:44:18.948142', '2026-09-11 12:18:25.517891', 49);
INSERT INTO public.user_refresh_tokens VALUES ('54910cfe-f6fa-43ff-bd79-973eda68ce14', 1, 'b99f84905b542f7de33a643250ee5e72718f2959a8c181b892b8d9dfdf480d6b254b2e0e5ddf6083b4fbd1985e7d317e1f8094890e6efd43b1b44f02c6a3c57e', NULL, '2026-10-11 13:34:44.509', true, '2026-09-11 18:44:18.948142', NULL, 62);
INSERT INTO public.user_refresh_tokens VALUES ('dac7a927-73c9-40a5-b260-b201f3d9aa67', 1, '0d66fb486b6c391a18c4d02f52dbf138c86050382a358b5d23e9d206cc9c89721e83d5c907ceb7ccba1e4335a653ee47e0365b3ae8fef81de6f3a2a2cd094bd6', NULL, '2026-10-11 12:18:25.543', true, '2026-09-11 18:44:18.948142', '2026-09-11 12:26:34.546732', 49);
INSERT INTO public.user_refresh_tokens VALUES ('3f631bf2-3af4-4505-a8ed-919e57080614', 1, 'b928876736871537f11c0757227b6a59a1c5d18335829affb422c8a417980add28a6e4b3c21491a18ce34aa5fdef9b5fb70bf196db722a06342c9078d8e6003b', NULL, '2026-10-11 13:16:02.458', true, '2026-09-11 18:44:18.948142', '2026-09-11 13:16:03.880449', 62);
INSERT INTO public.user_refresh_tokens VALUES ('fda762d0-3250-4b00-a440-7acc11b43d05', 1, 'e3dbd5419db44a7f6a7e2cca88c94fafbe5ee5ba95875f61aef86c9a61e59729d6276e41a5180aeed47b122773a682e7ada630ceb358343b43bc5e378796e851', NULL, '2026-10-11 12:30:44.54', true, '2026-09-11 18:44:18.948142', '2026-09-11 12:38:37.6064', 49);
INSERT INTO public.user_refresh_tokens VALUES ('72adcbc9-f73a-4939-9dbf-94ce89b808ef', 1, '5f5a854f671d9eccbdfd2ad4341fe3018587c79245084b36e93b802d01a08a27ad36ee6a28af15f8aa045c0cf1f4e3b28a74e989a60a870964c38ae1be5b9d5c', NULL, '2026-10-11 12:51:06.226', true, '2026-09-11 18:44:18.948142', '2026-09-11 12:51:08.468795', 62);
INSERT INTO public.user_refresh_tokens VALUES ('e7544fe7-94da-48ce-8e7f-9ba5c717cc9a', 1, '17ceb4eb141d3a4808e423526400d9b00a86338e3526133745f0049bde114546d33bee563a1e32f5f361dc5e0c6cda5f2fad6a67bcbb64bf38fc9614669a1059', NULL, '2026-10-11 13:50:02.945', true, '2026-09-11 18:44:18.948142', '2026-09-11 13:50:03.636282', 49);
INSERT INTO public.user_refresh_tokens VALUES ('3dbf754d-4367-4f49-9c80-fac04adf8b83', 1, '452c11d8a25812a847c86b15219f85ea6495c1f07040fe75880508bd7eed66eb7fab1bc4f301262f03e5a0ead30ba4ffe9797f0652cc3f405b8a320110876692', NULL, '2026-10-11 12:39:43.595', true, '2026-09-11 18:44:18.948142', '2026-09-11 12:51:21.161099', 49);
INSERT INTO public.user_refresh_tokens VALUES ('eb6749d6-b91e-43c6-bf7e-d5ec116d0cb3', 1, '43006ff31c3257adcc0438a478c8ffe03f27b5a2ba84465b8597dde0fb7cea2fc2c1e784c3a6ab59122db8c3b3f56ea1391fb32fd74f6c7a2ebf0cb1b19cf9c7', NULL, '2026-10-11 13:31:12.946', true, '2026-09-11 18:44:18.948142', '2026-09-11 13:31:14.462829', 70);
INSERT INTO public.user_refresh_tokens VALUES ('ccb69a61-8efc-42b3-b9ff-2b199dfe531d', 1, '92b235595bc18caed5843c8957d8c557c63ed682a94b5a81ed952a399348be2c2852c646a96ec4fa7c8efc576d2e6ea70d78e34028b84d6e80ffba89365259a6', NULL, '2026-10-11 12:54:23.2', true, '2026-09-11 18:44:18.948142', '2026-09-11 12:54:24.253174', 62);
INSERT INTO public.user_refresh_tokens VALUES ('f802fca0-7b30-47ab-9c43-7dd3167b4c4c', 1, '3267ba45ceb42432d782ff24c42415923d4240ea12814f40e60be43f40e74dedc9685c88a419e5b8ffa23418c84a74cea9fa69aa755619997f8721454bf5dc95', NULL, '2026-10-11 13:31:14.481', true, '2026-09-11 18:44:18.948142', NULL, 70);
INSERT INTO public.user_refresh_tokens VALUES ('af387dd9-037e-4cc1-a2d9-0b494a9a018a', 1, '518af063fe161344ab24e3ff3a83c0a1748de3d7df32660592bc2330c220466b6e519a2555220e31a0dc6081fc75470f7215764faec611d7c763a4192b98b988', NULL, '2026-10-11 12:54:24.311', true, '2026-09-11 18:44:18.948142', '2026-09-11 13:10:43.514041', 62);
INSERT INTO public.user_refresh_tokens VALUES ('5313b3c4-0527-47bb-a6e3-c2fa6b0bab87', 1, '3d8451d7df8784feb0eb802f60e4fe1187e983ca89ac2daebf04d17b469b77f46f17b019b1434e6a1f04bc2595c4cc3257514cb7c643207f32968944e9a12813', NULL, '2026-10-11 13:10:43.531', true, '2026-09-11 18:44:18.948142', '2026-09-11 13:15:20.076327', 62);
INSERT INTO public.user_refresh_tokens VALUES ('96e49771-7852-4d02-87df-31de183aa3b3', 1, '4678a54cb760cdea3dba06cbbf32d38dba153de2065c7800d249edc419e84dbb59815cc43f213eb2ceb792e4b4503ecfb908b32bbb2249c0e9e8732d4f3be3ab', NULL, '2026-10-11 13:32:29.864', true, '2026-09-11 18:44:18.948142', '2026-09-11 13:32:30.361522', 49);
INSERT INTO public.user_refresh_tokens VALUES ('26ac053a-45e6-42c5-b195-f420afd6c86d', 1, 'b9d1bc1cac7331d4f2aa3a6d2d0dd44aafd6f3c45f77bc7645bd09f1d9fdacc748f85b1d7aa39bfbb1fb5234e4ea2cb0d1ae45a893883df8845ac6ece8187032', NULL, '2026-10-11 13:32:33.615', true, '2026-09-11 18:44:18.948142', '2026-09-11 13:32:34.091134', 62);
INSERT INTO public.user_refresh_tokens VALUES ('6c86be52-3f70-4792-8ad2-27650e5214ea', 1, '49611e007b15ca1e1766ca316f4331aff285ad8d304ee2d3ab7737bad190ccd1de6c0e780fd3a172c8335c483082f2e68a83a760f466ccf8a0d913b4e9c137ce', NULL, '2026-10-11 13:54:20.71', true, '2026-09-11 18:44:18.948142', '2026-09-11 13:54:32.331465', 49);
INSERT INTO public.user_refresh_tokens VALUES ('b9a4cb95-4931-4ab6-b049-a3df3d45a71a', 1, '3d4d7ac742acfe8fa6a0b79e9dd952a0634d83b3432329a84f19ef6f04aea8f21337efc032cb347316135e584890c773c930f5a2dc8bebaef24b15297fed36cf', NULL, '2026-10-11 13:32:34.123', true, '2026-09-11 18:44:18.948142', '2026-09-11 13:34:44.491041', 62);
INSERT INTO public.user_refresh_tokens VALUES ('06983067-96c6-46c1-bff7-0cabae45cef9', 1, 'b59db175fdfb6ed241fce558c1d2538040facad6e000978be913cc1b4deab074d2c8097fd09217f279e790f0d3dbb265381998d65b9d43782fa33cb1ac7e90b6', NULL, '2026-10-11 13:32:30.385', true, '2026-09-11 18:44:18.948142', NULL, 49);
INSERT INTO public.user_refresh_tokens VALUES ('716ad5c2-1f68-4620-a89f-ecca840b3cb6', 1, 'd71159790118d062de4a7509ad0cd347d3561767c97b304639fc4f7c21576f2bc9906020ffe2fe200f94075847c0975c8a29a85cf00cc64fb2d33d266caeabb2', NULL, '2026-10-11 13:50:03.694', true, '2026-09-11 18:44:18.948142', '2026-09-11 13:51:07.087681', 49);
INSERT INTO public.user_refresh_tokens VALUES ('212de6dd-e162-4607-8dfc-aff8d2321873', 1, '6f878725ef034a3ba908b30278d884efa754d93104c7c532b97b13c9d6c5a5ac8a884975bd7dd460b4e792802a4dcd6cb8fd20b624440c92ce1f970111695e5d', NULL, '2026-10-11 13:51:07.109', true, '2026-09-11 18:44:18.948142', '2026-09-11 13:54:20.695196', 49);
INSERT INTO public.user_refresh_tokens VALUES ('378e89f4-1d10-4f6c-9356-44fdf8204671', 1, '66843544b68f5cc50510ad8ace3a4f4058a285d2d3f4375d37603237db68acb0717d8a2c2c16e98e7059d0679f107e9fa05c5c2da28ed5b94d95047521335d9b', NULL, '2026-10-11 13:54:32.351', true, '2026-09-11 18:44:18.948142', '2026-09-11 13:57:46.470683', 49);
INSERT INTO public.user_refresh_tokens VALUES ('fe53ed2c-1ddb-47b1-b3bf-f65274bc9b25', 1, '5a941f82c97ae9bfece255560ded83658a26e81591c2eaa55bf945d6bf03b8e7ad941c77104609b261fe5df7e5a4c95c6267595e29484319d4e96048a7693e21', NULL, '2026-10-11 14:00:53.868', true, '2026-09-11 18:44:18.948142', '2026-09-11 14:00:54.56492', 62);
INSERT INTO public.user_refresh_tokens VALUES ('0d7c8957-588e-43e0-aa44-a184da881cad', 1, '9658b3ca8cec0bdf371292a221754c43b6f5aa58ab15417b986eddc9dfb10b04e2ea1ecdc20e2b5bd0dce8edf5d2f858aa943837e6457f6e18dbde3a775e262e', NULL, '2026-10-11 14:01:16.599', true, '2026-09-11 18:44:18.948142', NULL, 71);
INSERT INTO public.user_refresh_tokens VALUES ('07dd61ec-71ef-4b53-90ea-e33456357e94', 1, '075bdce7eec39843661d20217a2a8908b35d6b2d79461b42160506fe8a0a76c2a30a8397e98eb918b4b72d369a03f180004985468f65090f511eb89e640c03b3', NULL, '2026-10-11 14:01:14.917', true, '2026-09-11 18:44:18.948142', '2026-09-11 14:01:16.546975', 71);
INSERT INTO public.user_refresh_tokens VALUES ('acb4c188-ebf3-483e-8ee9-b46a3907b8c6', 1, '893d4d0780bbe8e0e06df400e89c8765619c24f182319da3bfcc565cb7e43201f795b76f37ebf19b2c984098a1d6b3e613c22d03c3acfc0a4cf44e94f661abc2', NULL, '2026-10-11 13:57:46.514', true, '2026-09-11 18:44:18.948142', NULL, 49);
INSERT INTO public.user_refresh_tokens VALUES ('0dfe309a-dd9b-405e-8bd6-7d90b7cba9a1', 1, 'a14d5a2075182d64fb87f10e47da85b1096af1de5c72e7e8153aa89e7db41ddc1653d4e92c30e27dacfe08cdfa13430b8eaf068fb4e5103a82e491f38f27ddaf', NULL, '2026-10-11 14:00:54.588', true, '2026-09-11 18:44:18.948142', NULL, 62);
INSERT INTO public.user_refresh_tokens VALUES ('292ba043-6364-42b0-9528-b1708bb1bec3', 1, 'a98a77361e0045f7fe3f5a7bfcb257112cb74b183bad58a14a1154de5e1b33e0142c0b03eecebd15f56f5dce1fbd2ee9d28a6c02e19bf5a9732287b4ff9e9b93', NULL, '2026-10-10 16:20:53.173', true, '2026-09-11 18:44:18.948142', NULL, 49);
INSERT INTO public.user_refresh_tokens VALUES ('a71cc8ea-31e6-4b00-8ce3-63e2e5236f74', 1, 'd70dc9abe786d9c0a7a6cd49d721136b11e9cd62fe580060b0be795f451444d16ca2934d668974303b7771c555d6cea84cc01ba51befb4292bf8dcf6dffc8698', NULL, '2026-10-09 17:44:17.601', true, '2026-09-11 18:44:18.948142', '2026-09-09 17:44:26.767707', 49);
INSERT INTO public.user_refresh_tokens VALUES ('d034d210-ebee-4342-ae11-7da890fa4c9a', 1, '52eb975e0b184ada7626a61f0014b2e9f767d06de39ed471649de03feabe95eacc3cc3ef084c70a90ab04d559cedb02a791f2a0d39be07ea17a1b1f79dbe3bb8', NULL, '2026-10-10 12:53:18.791', true, '2026-09-11 18:44:18.948142', '2026-09-10 12:54:02.626835', 49);
INSERT INTO public.user_refresh_tokens VALUES ('478a2604-3f78-4fea-90c9-abb16259067d', 1, 'a955a5442479011befab032f23f1821bc797779c4d5845be02c715a854cbb6ec15a0cb43fcd5e5f4d6465cd3fe42d4f16de336e210a6211a71e384949b06dbee', NULL, '2026-10-09 17:44:26.786', true, '2026-09-11 18:44:18.948142', '2026-09-09 17:45:20.592681', 49);
INSERT INTO public.user_refresh_tokens VALUES ('e9ce81dc-0832-4ce3-8113-19875c0c9d5e', 1, 'bc405bde037d16b5592ac0156857bd01d50ff36cc9878e0b9bf86e1620520c34cb171812faf224c80994e97c0ff07e5186aee62be33936e85516de911bf3fe19', NULL, '2026-10-09 17:45:47.392', true, '2026-09-11 18:44:18.948142', '2026-09-09 17:45:52.764396', 49);
INSERT INTO public.user_refresh_tokens VALUES ('5e9f5385-e5e3-446c-991c-5ee8bf4162e1', 1, '9b3102b95fdc71d98ead3fa8ed8a4baa1e1aef7dbaeea59f9a796d8975b03a96784c617c40fc132df4767275686dd0b48396b185ba53e4fa92c14db7a27d5ed7', NULL, '2026-10-09 17:45:20.61', true, '2026-09-11 18:44:18.948142', '2026-09-09 17:45:25.974789', 49);
INSERT INTO public.user_refresh_tokens VALUES ('5fe63a76-cacd-41ee-9b85-050153ce7a54', 1, '0871eab6fb529ef4fc10f5649d1b94edba74f1495252cdc5d0bbfcac4dc0a5cfa3dc4129fc9437c6fcbd577506b6d96bd2b332abce0266d052ca74b63f481cb3', NULL, '2026-10-09 17:45:52.783', true, '2026-09-11 18:44:18.948142', NULL, 49);
INSERT INTO public.user_refresh_tokens VALUES ('a570c26a-a859-4a0f-99df-4d4b759a45ad', 1, '2b3d86900dee1d615d81558810a97f21e84262df22e5e4699a119fbbeb39c006a708fa3aa001088b3fd16824855b28f65cd851c6b74a3d56f9026abd4aec3cea', NULL, '2026-10-09 17:45:26', true, '2026-09-11 18:44:18.948142', '2026-09-09 17:45:40.822188', 49);
INSERT INTO public.user_refresh_tokens VALUES ('722c13e9-c6ab-4177-a7cb-84b1f7cfbfb3', 1, '6b98605bb1b12432d8c06a15700bf81aea3b3fc03b704b89270688cc48e1177e591bbfa20755a82e2848a47551a1d5e13e6706ecd54512fd8fdd93455c442fa9', NULL, '2026-10-10 11:26:53.939', true, '2026-09-11 18:44:18.948142', '2026-09-10 11:29:12.106767', 49);
INSERT INTO public.user_refresh_tokens VALUES ('525698c2-5a9b-4b67-b30b-deb156040df1', 1, 'b0c9b8767a2cc7398e4666d1d1a24acfbd8c4dee7755997f6c088600ab6aa0079f35eccb28a71bb608445045ab017c2306af805eae313a08e2101829480d6238', NULL, '2026-10-09 17:45:40.842', true, '2026-09-11 18:44:18.948142', '2026-09-09 17:45:47.358612', 49);
INSERT INTO public.user_refresh_tokens VALUES ('258a4bd7-8c0e-44a3-842b-60cab676b61a', 1, 'b2221a78498bfb362447a39110afae69272b35b98481f7bcddf99f16a73533ae51154614c980e9ed87a3f5d69b01f910771c548506ad825aa6bb7948b12180b6', NULL, '2026-10-10 11:29:12.14', true, '2026-09-11 18:44:18.948142', NULL, 49);
INSERT INTO public.user_refresh_tokens VALUES ('b6f62c3f-4629-425a-9c44-42eabcf590ec', 1, 'cedf849df3369e1f1f75cccdc7f1182a017e3c3b7851c401908d1624a85a508ba9a73230aa9d793d7f3ac48a91bd95de64570b1f0745355a66934a8a23200195', NULL, '2026-10-10 11:23:41.077', true, '2026-09-11 18:44:18.948142', '2026-09-10 11:24:52.35536', 49);
INSERT INTO public.user_refresh_tokens VALUES ('424e1b4a-e55f-4131-be06-f7d828a39d7e', 1, 'cedf849df3369e1f1f75cccdc7f1182a017e3c3b7851c401908d1624a85a508ba9a73230aa9d793d7f3ac48a91bd95de64570b1f0745355a66934a8a23200195', NULL, '2026-10-10 11:23:41.871', true, '2026-09-11 18:44:18.948142', '2026-09-10 11:24:52.35536', 49);
INSERT INTO public.user_refresh_tokens VALUES ('a3cfc573-40e8-4ff3-8464-455e01a1aa9c', 1, 'd9fcfc20abad5b92bafe34af06778f09e86989b851e61834b48b76d3fe5084d1e1700286abf113eeccd0e524b4783c069d89d5911a69a3c2eb165950b0426df9', NULL, '2026-10-10 12:31:23.422', true, '2026-09-11 18:44:18.948142', '2026-09-10 12:45:11.729688', 49);
INSERT INTO public.user_refresh_tokens VALUES ('6d76e667-3c43-45b3-a44c-11bc4c0e5283', 1, '6aa1ec3ab244a2dc57b2356abdd62b43b0d58e90e80f9ad207b4a42bb375bb39b0620f2013aa883ef2ac5091063223e4ef5e2dd7027e0febc0134e166c7cba6d', NULL, '2026-10-10 11:24:52.418', true, '2026-09-11 18:44:18.948142', '2026-09-10 11:26:53.907982', 49);
INSERT INTO public.user_refresh_tokens VALUES ('4ae319a1-5779-4982-8790-9da20aba4de2', 1, '6c391d9f53b85d81fcb6fa9bbdba4cc3c86379b8bc05d4f86b96db4fc6e565dc542e0a0343c6294e1b5b49ac78e79b20a39a78a1944514fe4fd610fb7780302d', NULL, '2026-10-10 11:29:58.41', true, '2026-09-11 18:44:18.948142', '2026-09-10 11:29:58.754477', 49);
INSERT INTO public.user_refresh_tokens VALUES ('6df2bdf4-6354-403b-8d19-3cbb94260ea9', 1, '6c391d9f53b85d81fcb6fa9bbdba4cc3c86379b8bc05d4f86b96db4fc6e565dc542e0a0343c6294e1b5b49ac78e79b20a39a78a1944514fe4fd610fb7780302d', NULL, '2026-10-10 11:29:58.784', true, '2026-09-11 18:44:18.948142', NULL, 49);
INSERT INTO public.user_refresh_tokens VALUES ('d3f59b6c-159a-4d84-ace7-ca3c09f48f27', 1, '243d47c385215143de2ffce3370d55cbc8539ad1380039af700cc4539d268cc12db5d1df14a2057c84db395dc008513e394def1a06e8a80848a492e7405b0685', NULL, '2026-10-10 12:31:22.62', true, '2026-09-11 18:44:18.948142', '2026-09-10 12:31:23.328255', 49);
INSERT INTO public.user_refresh_tokens VALUES ('337458c9-7153-4652-9b19-fb9a9d665395', 1, '96b4a9d9663831254c4765cc16848ab0c3d2589f0509076de7e78736ed79a5b9aa41bf1a168bb6ae0762fdc4d0cfb47df3ca5a1be7b730ce3a75251e568330a4', NULL, '2026-10-10 12:47:18.514', true, '2026-09-11 18:44:18.948142', NULL, 66);
INSERT INTO public.user_refresh_tokens VALUES ('f5c1c04c-3c16-40f0-8e30-e380cf5634f5', 1, 'c48eab4355f1798450c7c76335cd65fcb90eb5b67ca4932812229a1c1f0113a703dcfb00a0e134367265352dd81c6f3239ec2939f51c2f64454261a5e17ff434', NULL, '2026-10-10 12:45:30.458', true, '2026-09-11 18:44:18.948142', NULL, 65);
INSERT INTO public.user_refresh_tokens VALUES ('3fdbe38a-afa8-466c-bb89-714c35aaaadd', 1, '11794d6d9f1097c95501a1651dc9f14ffffc39e9aa526d7dd65dddf7f51f6641ff449397be932d52b0cc65ab1903fa04eafe8e703c252197dc13de67c659e3c2', NULL, '2026-10-10 12:45:11.758', true, '2026-09-11 18:44:18.948142', NULL, 49);
INSERT INTO public.user_refresh_tokens VALUES ('2116908b-a98f-4222-a863-03747f5f23db', 1, 'cb312f88418f4a5db6d34d7c6d996def48076b174a0783d7ee13633842c25cf3a0d79c0847830cfbfc3d3511fe601f53269e2ee9038679ef36136189ddcba81e', NULL, '2026-10-10 12:53:17.322', true, '2026-09-11 18:44:18.948142', '2026-09-10 12:53:18.735869', 49);
INSERT INTO public.user_refresh_tokens VALUES ('0acae8c0-f4c0-4335-9365-7c92013f6bc2', 1, 'e3106a71c443042422efe92114b50935f648f27cb609b54b1c300fd6a0a315597405ed6a11c1ad51c8a8ca7beb46a4fa0b74c9e7a6c90e5fbbc3f8351b9e300d', NULL, '2026-10-10 12:54:20.053', true, '2026-09-11 18:44:18.948142', NULL, 67);
INSERT INTO public.user_refresh_tokens VALUES ('c520f275-745a-47e3-ad99-5f5878898b7f', 1, '2bd74220994094dc3c0d25abe6fb1b377afcd9a2bf6d94963cd5f603a9e361a8e4e7aef52f9ff1853c0ec533e000764f94f792c2c497791f4e0dba5d9131d599', NULL, '2026-10-10 12:54:18.945', true, '2026-09-11 18:44:18.948142', '2026-09-10 12:54:20.019708', 67);
INSERT INTO public.user_refresh_tokens VALUES ('a70380a4-425d-47d3-a406-4f5c85dbe3bd', 1, '1fff83f01e05ef45489dfee5390e1e0a7679d7652e456c3c3343ea47fddeac59e4fe5ff55cbc60a22e7c3277cf7a21d5f426322f489e83a2be5569d816e91f41', NULL, '2026-10-10 12:54:02.652', true, '2026-09-11 18:44:18.948142', NULL, 49);
INSERT INTO public.user_refresh_tokens VALUES ('15002396-54cc-495a-ac07-d8d32f37a690', 1, 'c7ab1f66ad439be50801670d7bc79e75b5bdda5f69c173aafbe7f6689c71f6fca6b06968703864197304b1f5f68a046a194a2ef3c2baf1dc2c2a99181b537282', NULL, '2026-10-10 16:00:53.367', true, '2026-09-11 18:44:18.948142', NULL, 49);
INSERT INTO public.user_refresh_tokens VALUES ('40c49ec8-0850-4f29-9609-3bb54381c68c', 1, '8f009985a654322a8c7e957894d735411018ea6f8fcab883332805847a845adf70c2325a42a0aea533e0becd7c7745e9288ad6b3ea3802ed39a715ec67ec1ba5', NULL, '2026-10-10 12:59:35.97', true, '2026-09-11 18:44:18.948142', NULL, 68);
INSERT INTO public.user_refresh_tokens VALUES ('eff08ad7-9069-4eec-9345-1ca2ab60f121', 1, 'd9746fc33a5a01773bd99c4da53a1a6cb57157598a7385eace8f41631ed483c70ac4be377454892f52d9f89b775b0b0adcc449ecfb6b442b7f39207b74e20412', NULL, '2026-10-11 12:40:29.611', true, '2026-09-11 18:44:18.948142', '2026-09-11 12:40:31.741159', 62);
INSERT INTO public.user_refresh_tokens VALUES ('1601c97a-83f2-4da2-8711-3e7e7f0c9894', 1, 'bd18ffced167af626b9ef73bbbdbbdfd827966f62ceee36705309a1a12630829cdc12c8ef9b6001850a975116ead8415d3069344ca7fcc2f4fcc68243968dbcb', NULL, '2026-10-10 15:09:56.607', true, '2026-09-11 18:44:18.948142', '2026-09-10 15:09:57.573329', 49);
INSERT INTO public.user_refresh_tokens VALUES ('d6efb511-7936-4287-96cb-85c76cc9b822', 1, 'b339636f7f75dc267ad3946ef5fd853b6ca12922b1a6e35476d35567acc50d54d64aa3d459bedc0777c0601089d35b6806c606c6cdbf62a93aca90503d5d9bbb', NULL, '2026-10-10 16:22:27.665', true, '2026-09-11 18:44:18.948142', '2026-09-10 16:22:28.699101', 49);
INSERT INTO public.user_refresh_tokens VALUES ('02993deb-9b01-419c-9cd2-03a1dbda1e3d', 1, '9f3a76714eaef792612a19bbafc3441c1b2f94b6f66ae843b0c93f82fcb750c4601b6579cfa1a4a0da1a08a5ab46bb5e9bf6f93a0fc9f992569fe81f8e0a3f9b', NULL, '2026-10-10 15:42:23.122', true, '2026-09-11 18:44:18.948142', '2026-09-10 15:42:33.729294', 49);
INSERT INTO public.user_refresh_tokens VALUES ('39f43a08-21d7-4e0e-b4c6-00f0a61db56f', 1, '6ad33ba569d56d5df79a2119efffe3b47cd8b751cbce9a25302343c3aa2dbd415383f4e2509e323327500a7f10e751099b8e5fe20fad464d0d38c2cdd949b2ea', NULL, '2026-10-10 15:09:57.616', true, '2026-09-11 18:44:18.948142', '2026-09-10 15:15:39.261094', 49);
INSERT INTO public.user_refresh_tokens VALUES ('b5038969-82f7-45f6-b1e6-75227e931a87', 1, 'f7300e4a94adcd21a6e42e763b28a7d1d6acb2b7e67211d8f1022371f75ed7a0aab5e795022f4a12f0291738d362a89c2de897855a7638430416ddb348f9a93c', NULL, '2026-10-10 16:22:28.723', true, '2026-09-11 18:44:18.948142', NULL, 49);
INSERT INTO public.user_refresh_tokens VALUES ('06798fb4-95cb-4a4d-baf4-c66ba835db0d', 1, '675d40a47296b9b6ea2c35d8302f123132332dbf28a044481224a5eb3593d574694aa8c0ebc884c114284a8954a49744ed3c83f48a19e533f5cf158131f2898b', NULL, '2026-10-10 15:15:39.271', true, '2026-09-11 18:44:18.948142', '2026-09-10 15:33:05.389202', 49);
INSERT INTO public.user_refresh_tokens VALUES ('0af0068f-530d-4280-9f96-3c960ebf0208', 1, '950bed0f5263164a7a19f1fa9a004c290416f13a761107a40792a07d0b7a4cbfd0950c1d9aac7f50c0750da0e7388ee432ebc5bc7c990933b77c9e5e76471de1', NULL, '2026-10-11 11:51:45.587', true, '2026-09-11 18:44:18.948142', '2026-09-11 11:51:46.172896', 49);
INSERT INTO public.user_refresh_tokens VALUES ('1fa90b1e-aded-46b4-a2a8-a07987be4939', 1, '439545c8fee51472661220a5ed18e3ea7000a5abf1479e1a8dd8c1fbcf97b3b30c46ca2c457e14901373cb9327dd4b48ce9d7b435f8686c6b701582389e89382', NULL, '2026-10-10 15:33:05.438', true, '2026-09-11 18:44:18.948142', '2026-09-10 15:33:06.144828', 49);
INSERT INTO public.user_refresh_tokens VALUES ('778aa298-7f40-43c5-bd00-5de1bdd4052a', 1, '3c611b3671acc6a83412c4ce9d1244182cd0cec6b1542e727ffbe2fef0376f10bd97a0ec85d793b84a5c644813387fb5b09bff393cef713454db5dd3c5b81230', NULL, '2026-10-10 15:42:33.758', true, '2026-09-11 18:44:18.948142', '2026-09-10 15:55:51.27878', 49);
INSERT INTO public.user_refresh_tokens VALUES ('d4ae1b8d-eac0-4188-901d-b9b51b09aba6', 1, '413dbf90fff195585876b7b2a02ee00c706eeafd4f7c0f3b30597f9a152f0176313ef4079c173f1a200f17b39ee93471ada036d272ac8573e0674a22f84cb52e', NULL, '2026-10-10 15:33:06.175', true, '2026-09-11 18:44:18.948142', '2026-09-10 15:33:09.428317', 49);
INSERT INTO public.user_refresh_tokens VALUES ('cae9804d-6ae4-4e77-bb7e-21c176bf231a', 1, '185e02fa71f31875dc16be8cb32bac6071010d1bd1c4432d6afad3177c96129765df1785aaf841fe084eb5ca6a8110175132eebda761a5afdc1a91675d9d4543', NULL, '2026-10-11 12:26:34.58', true, '2026-09-11 18:44:18.948142', '2026-09-11 12:30:34.859824', 49);
INSERT INTO public.user_refresh_tokens VALUES ('9813af60-6dda-4620-a89b-92d708c67402', 1, '138b17991f65f82b145ffbe5f5fae876358db1fe02d3042a34b493e2c7fe033f01928a591758eff4c0f5b1f55d25dcf1d40983ce139913c74473a01afc5b1e2d', NULL, '2026-10-11 11:51:46.235', true, '2026-09-11 18:44:18.948142', '2026-09-11 11:54:18.407883', 49);
INSERT INTO public.user_refresh_tokens VALUES ('9de1cd3d-0ff1-437a-a48c-a7d4587b313c', 1, 'f3361ff164a00b39881ac4ee99a48463c73794b84371d4ff7983683876f299802e27e6034d2af00c6edb2e942b9f770aef07205ec793fbc367c70a2bba3f5c91', NULL, '2026-10-11 18:04:07.905', true, '2026-09-11 18:44:18.948142', NULL, 74);
INSERT INTO public.user_refresh_tokens VALUES ('e74bf469-67ac-42ab-93f1-aebc59078781', 1, 'cc0cd65515b81ae3d553d19aabe0e424a910fd90dac81e704c6fcd458ccc7b8c9d21a01316a43286b75486f269956226c38a8d2eaf892baeaaa3571e0ef84769', NULL, '2026-10-10 15:33:09.482', true, '2026-09-11 18:44:18.948142', '2026-09-10 15:41:56.042133', 49);
INSERT INTO public.user_refresh_tokens VALUES ('f93d2a40-8fc8-4e4b-ae89-59508aa02c28', 1, '9cc82e13527b665f6acc136157b839bd1fa37481a9a167c771788909286cb03c4b8ed722b85812116db4e927fc98dc66411a06afc9100250f09c166742761847', NULL, '2026-10-10 15:41:56.096', true, '2026-09-11 18:44:18.948142', '2026-09-10 15:42:03.555366', 49);
INSERT INTO public.user_refresh_tokens VALUES ('8be288bc-d5bd-4042-ba49-d38e2085d1ed', 1, 'b0fa9905872229fd2b78392ed0e822f8ccd88041a72692d0b28da60c3567aea76218b475d57b750336201b5be8cc147a1a05af92340c1e0fe92fcec3810632e1', NULL, '2026-10-11 12:38:37.634', true, '2026-09-11 18:44:18.948142', '2026-09-11 12:39:43.570016', 49);
INSERT INTO public.user_refresh_tokens VALUES ('6ea19998-d1b7-4b72-90f0-a1beb356dd89', 1, '8cf430a201025f0094e1de0f12e46ea4bf3c9479554a82832456613163f72c098f859a4ddd684a00c001222d69f508398f0e9da4df4250d4b3c33ded11f4d4d8', NULL, '2026-10-10 15:42:03.591', true, '2026-09-11 18:44:18.948142', '2026-09-10 15:42:11.521325', 49);
INSERT INTO public.user_refresh_tokens VALUES ('1e36a85f-2828-454e-9422-5bf83172ffa2', 1, '1bc5adefc399b1c1a8ca23f2dca3bfb6fa187ca255572c07e474dadf62afb09d30f8f328d12b65d080cdeb7611483feb1bc8ddd69e3c8dcd41efc8ab23780a9b', NULL, '2026-10-10 15:56:15.407', true, '2026-09-11 18:44:18.948142', '2026-09-10 15:56:17.872979', 69);
INSERT INTO public.user_refresh_tokens VALUES ('613c7ee8-66f5-428e-becc-cb8d6f4847a4', 1, '51b5897450a91f686cdc76a4d1da695802f497844b495b918e007f8a7876d14960b155d15a09a95c9dc788f60987f6386d2a627a5774f17e2c75418cc803b151', NULL, '2026-10-10 15:42:11.531', true, '2026-09-11 18:44:18.948142', '2026-09-10 15:42:15.609889', 49);
INSERT INTO public.user_refresh_tokens VALUES ('72c61271-a113-4389-969c-98e2f1da5796', 1, '8fdbdbc354ea63176e52c2f700680992c35aea4768e44c6a5992d9a7e825d8f70b5fc8f048dfe1c1d826802d2b9f1e00ed609e51d8676d2209c46329586d2ec7', NULL, '2026-10-11 12:40:31.767', true, '2026-09-11 18:44:18.948142', NULL, 62);
INSERT INTO public.user_refresh_tokens VALUES ('966557cd-6109-48b3-b7cf-625bf8d98a97', 1, 'a6ddb9c689005acb998b3adf83fdfe577e09a7fd479e8916e764e4dbdaed75c128f689fb855fb15168e3f3e2b59a08a29511cfa1e005c3f0a4ee72a31093fef7', NULL, '2026-10-10 15:42:15.63', true, '2026-09-11 18:44:18.948142', '2026-09-10 15:42:23.088167', 49);
INSERT INTO public.user_refresh_tokens VALUES ('ff5d8b23-77c6-485e-a8e4-913525432798', 1, '8842c19a67bfb6c337290c9479e86a77876009d28c51fa4a3b4bde3b74059ac39611e723176b55f9abf6c62013f606654b08a39f9f877ccde9be57025c3f9493', NULL, '2026-10-10 15:56:17.903', true, '2026-09-11 18:44:18.948142', NULL, 69);
INSERT INTO public.user_refresh_tokens VALUES ('7893b5a8-6b6a-4314-a610-4b610f9abb28', 1, '53796c125f2f852f543ff736d3368e73c402f87c58a093b29d421641267120ec14e79af7ab97968bd1143646468413dbe77826249744b91e05cc2c385cd4c5a2', NULL, '2026-10-11 12:51:08.489', true, '2026-09-11 18:44:18.948142', NULL, 62);
INSERT INTO public.user_refresh_tokens VALUES ('47412e9c-88db-417d-b495-2a7c066b89e3', 1, 'f1c0cc840a72be9d0b025a49cf0991565cf99c74e3a703878d986d8df90e07bbdfdf7e667997ebac68fe46268e11336742b1245432fb2b8240d04604d7da35e9', NULL, '2026-10-10 15:55:51.287', true, '2026-09-11 18:44:18.948142', '2026-09-10 16:00:40.637596', 49);
INSERT INTO public.user_refresh_tokens VALUES ('1b202605-7d5b-46ee-990e-f1e7c1dc4410', 1, '289935ab4ecdb9b6cb7499855f3f2e679bac05ae074b55e2df67333f0eb0b6c3240e3ef134b8e77d761a58516ad3bf5e1ed428faa9db246a2db452d9d57f06cb', NULL, '2026-10-11 13:15:20.096', true, '2026-09-11 18:44:18.948142', NULL, 62);
INSERT INTO public.user_refresh_tokens VALUES ('3365594a-97ee-4775-a1d0-6a58bf97d86b', 1, 'e71994b5d860d0e27e2ddc1e8f3d2d788404ee95c62abc2ae13c159d3f5456888db0a1557a68583444f2f1515dd55c4396c2d9f85def23cb458f1bcc7a5ed0ac', NULL, '2026-10-10 16:00:40.67', true, '2026-09-11 18:44:18.948142', NULL, 49);
INSERT INTO public.user_refresh_tokens VALUES ('211df04f-9d87-48c6-83a2-103be76ffb03', 1, 'a5746256d572c9849fd0b79d4f9d98a99e4d5c8122c29f036888aba489f9b764ad376e43d70f6aeeeb3847e6db83734e719a5bf43c8243a2dcd0c1ead89097fd', NULL, '2026-10-11 12:51:21.206', true, '2026-09-11 18:44:18.948142', '2026-09-11 13:10:43.487823', 49);
INSERT INTO public.user_refresh_tokens VALUES ('17bc4dcf-b8e3-4fc3-a861-f7b2cb18d980', 1, '558bac80c77bf02b571ac2f89fa83269895f5e1fb7fb191facdc4ab15bfd38e21b5d0292d3dad30347b7e75b22fd683a9addf9078409b11f8218286151eb4af2', NULL, '2026-10-10 16:00:52.943', true, '2026-09-11 18:44:18.948142', '2026-09-10 16:00:53.355572', 49);
INSERT INTO public.user_refresh_tokens VALUES ('d6484e74-8520-409a-88a0-76a84c600338', 1, '3d8451d7df8784feb0eb802f60e4fe1187e983ca89ac2daebf04d17b469b77f46f17b019b1434e6a1f04bc2595c4cc3257514cb7c643207f32968944e9a12813', NULL, '2026-10-11 13:10:43.51', true, '2026-09-11 18:44:18.948142', '2026-09-11 13:15:20.076327', 49);
INSERT INTO public.user_refresh_tokens VALUES ('38955156-a3c5-44a1-a2e3-787f0748c107', 1, '516c814c57dcbacdb5c0d80572378f237e741cba77f690d0a6b3cdf2a6c7604c3d2cbbb5b2d25388e63b13e61de8f7da09d84300ff46178f05a29aa19b2bcc2d', NULL, '2026-10-11 13:16:03.956', true, '2026-09-11 18:44:18.948142', NULL, 62);
INSERT INTO public.user_refresh_tokens VALUES ('1d6ebe86-7c1b-4a5f-97f3-6ee6082e1559', 1, 'ecb1319bdccc8759afaafe41a699eb85be103fc5348c3a9e7540479c46a5416785b58b3d1f7bae5a2d03bf481eb91e557526be2a20c92dad1a35ce7bf82e7ce6', NULL, '2026-10-11 18:14:53.867', true, '2026-09-11 18:44:18.948142', '2026-09-11 18:16:07.619868', 49);
INSERT INTO public.user_refresh_tokens VALUES ('494e6c9d-2107-4c36-8a2d-53163a9cff13', 1, '5ec2a844991657ab9c5e87c99ffb8861c56f9e2031b3e32932d14e714400f698cd01a893591df1ba9b965a86dedf7696d30b630dcf326197608e03a427781b0d', NULL, '2026-10-11 17:39:06.164', true, '2026-09-11 18:44:18.948142', '2026-09-11 17:46:44.543452', 49);
INSERT INTO public.user_refresh_tokens VALUES ('4391b8a7-4389-4f7d-9888-d6d745db849b', 1, '11b095477eba4f0d716cf1d19057f4bf038143c8248dfac10cf95deef52dea362721d52db2c6d8d4b0a16da964386b42635382d80d8af06f3ba1abb22ea65be8', NULL, '2026-10-11 18:00:20.396', true, '2026-09-11 18:44:18.948142', '2026-09-11 18:00:23.679316', 73);
INSERT INTO public.user_refresh_tokens VALUES ('8a9757ae-1cd2-4aad-8a71-9238ab46b051', 1, '16432c0a08198ef65fb2ff77e79c49cc499205ffbc962e868ee8f1fa9970f401ed6bd509b4de1d8266fdb6e697d9cf66d841bd3bc56411ad2031893b6fcb9490', NULL, '2026-10-11 17:46:44.569', true, '2026-09-11 18:44:18.948142', '2026-09-11 17:48:10.335636', 49);
INSERT INTO public.user_refresh_tokens VALUES ('db39d9a0-a3fc-4af0-923b-188a40e20a87', 1, '47a85ff48563b719939674c2f0180f489c484caff0065f5e5830ce79bc640d8ade3d378ccd163b0385e54c7806f9a21afcb0f3bdf546657f0b497fb9ca4bcbff', NULL, '2026-10-11 17:48:24.072', true, '2026-09-11 18:44:18.948142', '2026-09-11 17:48:27.691478', 72);
INSERT INTO public.user_refresh_tokens VALUES ('d83530c5-d9ef-4432-9d7a-88d0dd522861', 1, '9cb541bac26ad42bd17d3d9e4e1c55b8501b29f5c0ab328259d1099984149a99e2ada7b7e01399c795357369b4ae83004d78354c68ca7d81ea9b579174dd54e8', NULL, '2026-10-11 18:00:23.74', true, '2026-09-11 18:44:18.948142', NULL, 73);
INSERT INTO public.user_refresh_tokens VALUES ('af7cb8a2-4fbe-427f-843c-286455752e9f', 1, 'a284e5c791d16ded549bdd743d7661ce3c92fc6facfab80e767947c89ea2bff1a3af64f09efc87cb70a3eda0143acd307f27506c35773c1277534645c8e7f46c', NULL, '2026-10-11 17:48:10.359', true, '2026-09-11 18:44:18.948142', '2026-09-11 17:48:50.257859', 49);
INSERT INTO public.user_refresh_tokens VALUES ('c6bacfc3-d189-48bc-a3e1-830b0debe5e1', 1, 'e8e9d00acb0911d6c022a1191da09e5fab185a65db43929643e953cfec9baab9c57b5c2a30a1d7b86b767dff07afacc3b1d2c6169c81f502d3ea22ed3a83f15f', NULL, '2026-10-11 17:59:47.319', true, '2026-09-11 18:44:18.948142', NULL, 49);
INSERT INTO public.user_refresh_tokens VALUES ('a98f6054-52d4-43e1-832d-1e5ca9277202', 1, 'db7e092e93900419294cabaf739ff54538e17f44722afe94388e7c356824eef11c0c8e479f97c85343d4c1d322179830b05dcbe661839f3e6ef8f7b43e31fa46', NULL, '2026-10-11 17:48:27.78', true, '2026-09-11 18:44:18.948142', '2026-09-11 17:48:50.50652', 72);
INSERT INTO public.user_refresh_tokens VALUES ('d6ec2bae-3ebf-4c81-bc4a-ec24ebf9f8c0', 1, '4b2a5201e6dc0fc0914e51b2cfc7889aae1efe31db0f46ee8dd6e67f44e3e8dee7cd3534b55d1e97b4ce0657348067b62d961d2ebe5b762d3cbc221267df1000', NULL, '2026-10-11 18:14:17.625', true, '2026-09-11 18:44:18.948142', '2026-09-11 18:14:19.260957', 62);
INSERT INTO public.user_refresh_tokens VALUES ('f489b9e1-9977-4bdd-9482-a14330f33512', 1, '2f57fac3bf0360eb1e1aafd5225563077e402e3a13f6f6ed1f2edbe259ccd1499e41e9c1484325e565dbc01c4ea54a73febedfbf20ccac577376a893697fc3ee', NULL, '2026-10-11 17:48:50.275', true, '2026-09-11 18:44:18.948142', '2026-09-11 17:58:04.516693', 49);
INSERT INTO public.user_refresh_tokens VALUES ('1dd2be21-da06-4463-86be-c0cdc08e84d1', 1, '2f57fac3bf0360eb1e1aafd5225563077e402e3a13f6f6ed1f2edbe259ccd1499e41e9c1484325e565dbc01c4ea54a73febedfbf20ccac577376a893697fc3ee', NULL, '2026-10-11 17:48:50.523', true, '2026-09-11 18:44:18.948142', '2026-09-11 17:58:04.516693', 72);
INSERT INTO public.user_refresh_tokens VALUES ('b532a954-eca0-4535-8515-4472eab6e401', 1, 'e2ee54c6d9360056914220befe31489c8f0b2c3991075a04f3ca6b20050e3a04ffc9e61ac887d20907efdd703135a15daa220f70f455d2c4edbd05b63cf97b04', NULL, '2026-10-11 17:58:04.545', true, '2026-09-11 18:44:18.948142', '2026-09-11 17:59:10.488442', 49);
INSERT INTO public.user_refresh_tokens VALUES ('8cff4b1f-fae7-4e6a-9640-f15c0ba36aa6', 1, '03e139f0233a64eee143357322c0a8b1a60bbba4652b303a520f76be4cf0753632a7a039af26cc1703bf052c9dab5c7bb2cc89695632027f9b5d4d45c7949e3a', NULL, '2026-10-11 17:59:10.502', true, '2026-09-11 18:44:18.948142', NULL, 49);
INSERT INTO public.user_refresh_tokens VALUES ('4d1857c2-bd40-4933-9761-bd7b4afff954', 1, 'cc7523c49c04cb924906c97359812bd0396cb3471642e27780029c0a050a25a1dd9b55f12a76acbb01eb40eaab21698a203ea40618e179c936ec321360958b40', NULL, '2026-10-11 17:59:45.813', true, '2026-09-11 18:44:18.948142', '2026-09-11 17:59:47.270695', 49);
INSERT INTO public.user_refresh_tokens VALUES ('378af532-8a0b-44a6-b787-69ab5f008f40', 1, '66b82bc813bd407510f59bba79cd100624ae21f109b060831b89b0835bef5a2dd24f2da86bc014807f6c62af544127e816fe459578a9c49958ac60a7cb72aa4b', NULL, '2026-10-11 18:01:46.443', true, '2026-09-11 18:44:18.948142', '2026-09-11 18:07:09.382279', 49);
INSERT INTO public.user_refresh_tokens VALUES ('4804b6d8-85f0-4d91-a392-e34e9d066b5c', 1, 'a4d0ede1ce11c277a10612177941e90a15c9943895c770604a984628001b058e52b0e66ca761150ea1296174830302e42edf4c2c64d74aeb9142827afc46d39d', NULL, '2026-10-11 18:04:04.518', true, '2026-09-11 18:44:18.948142', '2026-09-11 18:04:07.840268', 74);
INSERT INTO public.user_refresh_tokens VALUES ('5c0168d5-7e63-4a92-9d35-dc560e2649fe', 1, '66b82bc813bd407510f59bba79cd100624ae21f109b060831b89b0835bef5a2dd24f2da86bc014807f6c62af544127e816fe459578a9c49958ac60a7cb72aa4b', NULL, '2026-10-11 18:01:46.927', true, '2026-09-11 18:44:18.948142', '2026-09-11 18:07:09.382279', 49);
INSERT INTO public.user_refresh_tokens VALUES ('01a3ab7f-d2ee-4b70-b9fc-5f16bcdc7fe2', 1, '23101934bdedfb1669def6d979c37d0167f964a0e96bebdbe1b40884837a3a6fcc730de53eecbcc0604eb86e88e5a158d5d1e1d5b808707c8526a9e2ee5a2243', NULL, '2026-10-11 18:06:59.43', true, '2026-09-11 18:44:18.948142', '2026-09-11 18:07:02.574104', 62);
INSERT INTO public.user_refresh_tokens VALUES ('11d6fc1d-eb6b-4c00-be83-dfe85507e96a', 1, '280ebd87e2db6660866ceff35c55931a27fc804f8728dde4b17dcc86d8218fea77e9dc4559b5dd2d6cca38053fdfdd9605d5e42ab86d4566f0e32846ae730980', NULL, '2026-10-11 18:07:02.598', true, '2026-09-11 18:44:18.948142', NULL, 62);
INSERT INTO public.user_refresh_tokens VALUES ('d8b4c5ca-4786-4740-b015-ee05e286b4ff', 1, '5b965afef0c52bb144390d07404872a987d1f7d3f13dcb0c87ccd47cf0cff481a9d4b29f743c77612e92280d19f4052f1c26c7bb5470d1d30e65fdb606272120', NULL, '2026-10-11 18:12:35.639', true, '2026-09-11 18:44:18.948142', '2026-09-11 18:12:36.789514', 62);
INSERT INTO public.user_refresh_tokens VALUES ('8685e54a-e0ea-463a-8321-a92c77c1f6ba', 1, '673f25d447ead5afaedc00aca3a96ec9542e7338b609c8f6a12efe65657faef6ac2032e79e1ed9b501907c0a255da82cdcff1c25cc5c77d08617917623649db8', NULL, '2026-10-11 18:12:36.922', true, '2026-09-11 18:44:18.948142', NULL, 62);
INSERT INTO public.user_refresh_tokens VALUES ('9adc7941-238f-40fc-85db-15697156ccb2', 1, 'a53c16efc9625b516e6b06cfaab2ac00eea44b1cc5118139a4eb60ae34986f2f6a394a9f97add007d553b0b22d162b4d90f5ddc1c08bc206f26f08bbb43363b8', NULL, '2026-10-11 18:07:09.413', true, '2026-09-11 18:44:18.948142', '2026-09-11 18:14:53.80316', 49);
INSERT INTO public.user_refresh_tokens VALUES ('2416395b-87e8-469e-8aa9-998b1c3d4fe9', 1, '03cca64d5cd5495a3a8c5849688af124e97f89f3a246d1d06f8995c6b073d6383b607b02b06c820e64b85b42ec6c7f20d1fd523397650d79df494afa0a6ce8b4', NULL, '2026-10-11 18:16:40.065', true, '2026-09-11 18:44:18.948142', NULL, 62);
INSERT INTO public.user_refresh_tokens VALUES ('97f27f21-80ed-4b56-9fa3-0b18283f9912', 1, '89cde97c1477343bd626c3b6382fca8a20940d4608cbfb273eda4ce930bbf69c2c47a410dacc6cdf320cf0e564f46400ee5c77d39adc8c7ef5474aa71603d9f2', NULL, '2026-10-11 18:14:19.277', true, '2026-09-11 18:44:18.948142', NULL, 62);
INSERT INTO public.user_refresh_tokens VALUES ('b9b6e5b6-2128-42ae-8797-e47a606f2458', 1, 'b29fd7720b54e69eac035815d15bf16a0fb7bbc7356e6fcf3c476ed55c804eb9be1418e1c09aa242a59e3cf1ebd0bf2e4e4a3331f00852e46e5b928cf2304a5a', NULL, '2026-10-11 18:16:39.172', true, '2026-09-11 18:44:18.948142', '2026-09-11 18:16:40.044723', 62);
INSERT INTO public.user_refresh_tokens VALUES ('5bfb1cfc-f02d-4621-a032-ed45e6fb2e45', 1, '6e6485264d4d837402b826832e6b29b6547a33803f16fc79ee51bbdc08be052976e7467183797c3da53940bc0d054cc936e95c85c6e90d22899f3cbab6527e92', NULL, '2026-10-11 18:16:07.643', true, '2026-09-11 18:44:18.948142', '2026-09-11 18:20:30.558238', 49);
INSERT INTO public.user_refresh_tokens VALUES ('d9e25832-3af3-4f59-af1b-04c4ae7d47b4', 1, 'af0ab29135b57781b4c83bdb8d7054b6d0481ef859b0b7f1ae7951b4429dbd7d169e2dd2a71e9a00532d62d5bdc225446992110a3dd98a1e2a6724cb9dd45ce8', NULL, '2026-10-11 18:27:07.655', true, '2026-09-11 18:44:18.948142', '2026-09-11 18:27:09.617671', 62);
INSERT INTO public.user_refresh_tokens VALUES ('a4bd5199-63e9-4f18-8283-114abc541f26', 1, '101a48305ba6e9513f7fd1b4d26856bd0ef5eaffdccafb1d84397130ca8c1d9008ddbeede660b22fce315941cb1d1ff22a2e55c602f3ad7fdf1f182d03935805', NULL, '2026-10-11 18:20:30.57', true, '2026-09-11 18:44:18.948142', '2026-09-11 18:35:16.733665', 49);
INSERT INTO public.user_refresh_tokens VALUES ('8a716e8a-1021-4b82-ac28-a7db4e4ba7be', 1, '473d1eddd08e18a96553516df55622296cbca6818437d9e181236629ed3ac0dca05e483dcfee879852d3cb617f9bedd1a3bc0b12930154a6cc395fe176a760d4', NULL, '2026-10-11 18:44:31.387', true, '2026-09-11 18:52:45.837693', '2026-09-11 18:52:45.837693', 49);
INSERT INTO public.user_refresh_tokens VALUES ('c0d4864d-1d96-4e7d-a189-67593c201e01', 1, '6dfb4d33b929c4bb39f039b7d2467d48aae3761e46ae8903050f3362f13953ec229af1809c00dd5873632ee5171bb3ec526fd30d280081acb9a846f459ea02e2', NULL, '2026-10-11 18:44:30.618', true, '2026-09-11 18:44:31.359716', '2026-09-11 18:44:31.359716', 49);
INSERT INTO public.user_refresh_tokens VALUES ('e921d9e2-1737-4691-9774-ccb839f5f34e', 7, 'a5f0b4c0545acc774b2b0acf2f05a43806e083b7b928f321a351aab976379ed62f42bcf459788cb6ac743fca733585f35d0d1d00920fc2a738b4e86ae7d36569', NULL, '2026-10-12 13:50:14.546', true, '2026-09-12 13:53:02.134761', '2026-09-12 13:53:02.134761', 75);
INSERT INTO public.user_refresh_tokens VALUES ('127b245d-7829-4178-9579-3d9e7a67b12a', 7, '9d7614f61418c64ed27129214d38c8a39307d5449fa7f95a7c4e0936c01c3beafeb781711089eb0b1e38adc11451ad07db9064df75e0130fa4edf42f83217ba2', NULL, '2026-10-12 14:43:51.53', true, '2026-09-12 14:43:57.468436', '2026-09-12 14:43:57.468436', 75);
INSERT INTO public.user_refresh_tokens VALUES ('f78cd98b-08d0-4b0d-ac98-bdd79e6c5143', 1, '512d0aa37ce7fcafe3a696c42dd7bc942e1af4db9c9efb2e17f91475300397849e3f94908a200bdd6e82188693c04bbf747d17f8f764bd23843fd6a85481b775', NULL, '2026-10-12 15:54:01.872', true, '2026-09-12 15:55:43.126333', '2026-09-12 15:55:43.126333', 49);


--
-- TOC entry 4171 (class 0 OID 34671)
-- Dependencies: 277
-- Data for Name: user_role_history; Type: TABLE DATA; Schema: public; Owner: admin
--

INSERT INTO public.user_role_history VALUES (3, 1, 7, 3, 1, 'success', NULL, '2026-08-28 15:04:53.689932+00');
INSERT INTO public.user_role_history VALUES (4, 1, 7, 1, 4, 'success', NULL, '2026-09-07 14:50:00.753905+00');
INSERT INTO public.user_role_history VALUES (5, 1, 7, 4, 1, 'success', NULL, '2026-09-07 14:50:44.268964+00');
INSERT INTO public.user_role_history VALUES (6, 1, 7, 1, 4, 'success', NULL, '2026-09-07 14:50:52.826947+00');
INSERT INTO public.user_role_history VALUES (7, 1, 7, 4, 1, 'success', NULL, '2026-09-07 14:51:02.856698+00');
INSERT INTO public.user_role_history VALUES (8, 1, 7, 1, 2, 'success', NULL, '2026-09-07 14:51:09.187034+00');
INSERT INTO public.user_role_history VALUES (9, 1, 7, 2, 1, 'success', NULL, '2026-09-07 14:51:13.173077+00');
INSERT INTO public.user_role_history VALUES (10, 1, 7, 1, 2, 'success', NULL, '2026-09-07 14:53:06.0373+00');
INSERT INTO public.user_role_history VALUES (11, 1, 7, 2, 1, 'success', NULL, '2026-09-07 14:53:11.391473+00');
INSERT INTO public.user_role_history VALUES (12, 1, 7, 1, 2, 'success', NULL, '2026-09-07 19:42:05.191067+00');
INSERT INTO public.user_role_history VALUES (13, 1, 7, 2, 1, 'success', NULL, '2026-09-07 19:42:10.368816+00');
INSERT INTO public.user_role_history VALUES (14, 1, 7, 1, 4, 'success', NULL, '2026-09-07 21:49:47.90848+00');
INSERT INTO public.user_role_history VALUES (15, 1, 7, 4, 1, 'success', NULL, '2026-09-07 21:55:04.578241+00');
INSERT INTO public.user_role_history VALUES (16, 1, 7, 1, 4, 'success', NULL, '2026-09-07 21:55:12.071504+00');
INSERT INTO public.user_role_history VALUES (17, 1, 7, 4, 1, 'success', NULL, '2026-09-07 22:08:41.544154+00');
INSERT INTO public.user_role_history VALUES (18, 1, 7, 1, 3, 'success', NULL, '2026-09-07 22:19:45.718425+00');
INSERT INTO public.user_role_history VALUES (19, 1, 7, 3, 4, 'success', NULL, '2026-09-07 22:20:02.071004+00');
INSERT INTO public.user_role_history VALUES (20, 1, 7, 4, 1, 'success', NULL, '2026-09-07 22:20:10.411397+00');
INSERT INTO public.user_role_history VALUES (21, 1, 7, 1, 4, 'success', NULL, '2026-09-07 22:41:53.429126+00');
INSERT INTO public.user_role_history VALUES (22, 1, 7, 4, 1, 'success', NULL, '2026-09-07 22:42:10.324463+00');
INSERT INTO public.user_role_history VALUES (23, 1, 7, 1, 2, 'success', NULL, '2026-09-09 15:21:01.385571+00');
INSERT INTO public.user_role_history VALUES (24, 1, 7, 2, 4, 'success', NULL, '2026-09-09 16:03:40.915602+00');
INSERT INTO public.user_role_history VALUES (25, 1, 7, 4, 1, 'success', NULL, '2026-09-09 16:03:56.835399+00');
INSERT INTO public.user_role_history VALUES (26, 1, 7, 1, 2, 'success', NULL, '2026-09-09 16:04:03.509879+00');
INSERT INTO public.user_role_history VALUES (27, 1, 7, 2, 3, 'success', NULL, '2026-09-09 16:04:10.164905+00');
INSERT INTO public.user_role_history VALUES (28, 1, 7, 3, 1, 'success', NULL, '2026-09-09 16:04:15.417609+00');
INSERT INTO public.user_role_history VALUES (29, 1, 7, 1, 2, 'success', NULL, '2026-09-09 16:04:19.788058+00');
INSERT INTO public.user_role_history VALUES (30, 1, 7, 2, 4, 'success', NULL, '2026-09-09 16:24:58.530292+00');
INSERT INTO public.user_role_history VALUES (31, 1, 7, 2, 0, 'success', NULL, '2026-09-09 17:43:32.423058+00');
INSERT INTO public.user_role_history VALUES (32, 1, 7, 0, 30, 'success', NULL, '2026-09-09 17:43:43.620052+00');
INSERT INTO public.user_role_history VALUES (33, 1, 7, 30, 41, 'success', NULL, '2026-09-09 17:43:50.237393+00');
INSERT INTO public.user_role_history VALUES (34, 1, 7, 41, 20, 'success', NULL, '2026-09-09 17:43:55.738089+00');
INSERT INTO public.user_role_history VALUES (35, 1, 7, 20, -2, 'success', NULL, '2026-09-09 17:44:02.761856+00');
INSERT INTO public.user_role_history VALUES (36, 1, 7, -2, -1, 'success', NULL, '2026-09-09 17:44:07.458243+00');
INSERT INTO public.user_role_history VALUES (37, 1, 7, -1, -10, 'success', NULL, '2026-09-09 17:44:12.386496+00');
INSERT INTO public.user_role_history VALUES (38, 1, 7, -10, -11, 'success', NULL, '2026-09-09 17:44:16.17668+00');
INSERT INTO public.user_role_history VALUES (39, 1, 7, -11, 10, 'success', NULL, '2026-09-09 17:44:25.019669+00');
INSERT INTO public.user_role_history VALUES (40, 1, 7, 10, -10, 'success', NULL, '2026-09-09 17:45:19.062872+00');
INSERT INTO public.user_role_history VALUES (41, 1, 7, -10, 11, 'success', NULL, '2026-09-09 17:45:24.280368+00');
INSERT INTO public.user_role_history VALUES (42, 1, 7, 11, 2, 'success', NULL, '2026-09-09 17:45:39.099876+00');
INSERT INTO public.user_role_history VALUES (43, 1, 7, 2, 20, 'success', NULL, '2026-09-09 17:45:45.878288+00');
INSERT INTO public.user_role_history VALUES (44, 1, 7, 20, 11, 'success', NULL, '2026-09-09 17:45:50.99387+00');
INSERT INTO public.user_role_history VALUES (45, 1, 7, 11, 40, 'success', NULL, '2026-09-10 15:41:54.536792+00');
INSERT INTO public.user_role_history VALUES (46, 1, 7, 40, 0, 'success', NULL, '2026-09-10 15:42:02.605381+00');
INSERT INTO public.user_role_history VALUES (47, 1, 7, 0, 3, 'success', NULL, '2026-09-10 15:42:10.90362+00');
INSERT INTO public.user_role_history VALUES (48, 1, 7, 3, 20, 'success', NULL, '2026-09-10 15:42:14.952695+00');
INSERT INTO public.user_role_history VALUES (49, 1, 7, 20, 40, 'success', NULL, '2026-09-10 15:42:22.179328+00');
INSERT INTO public.user_role_history VALUES (50, 1, 7, 40, 20, 'success', NULL, '2026-09-10 15:42:33.061533+00');
INSERT INTO public.user_role_history VALUES (51, 1, 7, 20, 11, 'success', NULL, '2026-09-11 13:54:19.591623+00');
INSERT INTO public.user_role_history VALUES (52, 1, 7, 11, 20, 'success', NULL, '2026-09-11 13:54:31.895358+00');
INSERT INTO public.user_role_history VALUES (53, 1, 7, 20, 11, 'success', NULL, '2026-09-12 13:32:08.810426+00');
INSERT INTO public.user_role_history VALUES (54, 1, 7, 11, 20, 'success', NULL, '2026-09-12 13:32:31.925701+00');
INSERT INTO public.user_role_history VALUES (55, 1, 7, 20, 11, 'success', NULL, '2026-09-12 13:32:37.136893+00');
INSERT INTO public.user_role_history VALUES (56, 1, 7, 11, 10, 'success', NULL, '2026-09-12 13:32:44.568361+00');


--
-- TOC entry 4186 (class 0 OID 56218)
-- Dependencies: 292
-- Data for Name: user_security_settings; Type: TABLE DATA; Schema: public; Owner: admin
--

INSERT INTO public.user_security_settings VALUES ('1d13d5c3-6571-4e7d-b564-84051c7ded0a', NULL, NULL, NULL, NULL, false, NULL, NULL, NULL, NULL, '2026-09-10 12:35:51.196522+00', '2026-09-11 18:42:29.173755+00', 1);
INSERT INTO public.user_security_settings VALUES ('155f14b8-ee07-479a-94c7-7592c0ca7661', NULL, NULL, NULL, NULL, false, NULL, NULL, NULL, NULL, '2026-09-10 12:35:51.196522+00', '2026-09-10 12:35:51.196522+00', 8);
INSERT INTO public.user_security_settings VALUES ('28f3396e-37ff-47ec-b2fc-2a0afcff974f', NULL, NULL, NULL, NULL, false, NULL, NULL, NULL, NULL, '2026-09-10 12:35:51.196522+00', '2026-09-10 12:35:51.196522+00', 7);
INSERT INTO public.user_security_settings VALUES ('875e7105-023a-47da-9d72-dc4bbead3558', NULL, NULL, NULL, NULL, false, NULL, NULL, NULL, NULL, '2026-09-10 12:35:51.196522+00', '2026-09-10 12:35:51.196522+00', 9);


--
-- TOC entry 4112 (class 0 OID 17815)
-- Dependencies: 218
-- Data for Name: user_statuses; Type: TABLE DATA; Schema: public; Owner: admin
--

INSERT INTO public.user_statuses VALUES (11, 'ADMINISTRATOR', 'Администратор', 'Администратор', true, true);
INSERT INTO public.user_statuses VALUES (30, 'PARTNER', 'Партнёр', 'Связь с другими системами, API доступ', false, true);
INSERT INTO public.user_statuses VALUES (40, 'USER', 'Пользоатель', 'Пользователь системы', false, true);
INSERT INTO public.user_statuses VALUES (-10, 'DELETED_RET', 'Удалён с возвратом', 'Удалён с возможностью возврата', false, true);
INSERT INTO public.user_statuses VALUES (-11, 'DELETED_NO_RET', 'Удалён без возврата', 'Удалён без возможности возврата', false, false);
INSERT INTO public.user_statuses VALUES (-1, 'BLOCKED', 'Заблокирован', 'Заблокирован с возможностью войти в аккаунт и ограниченным доступом', false, true);
INSERT INTO public.user_statuses VALUES (10, 'TOP_LEVEL_ADMINISTRATOR', 'Высший администратор', 'Полный доступ администратора к системе', true, true);
INSERT INTO public.user_statuses VALUES (-2, 'BLOCKED_PER', 'Заблокирован пермонентно', 'Заблокирован без возможности войти в аккаунт', false, true);
INSERT INTO public.user_statuses VALUES (41, 'USER_UNCONFIRMED', 'Неподтверждённый пользователь', 'Пользователь без подтверждения', false, true);
INSERT INTO public.user_statuses VALUES (3, 'OBSERVER', 'Наблюдатель', 'Без возможности редактировать с полным доступом', true, true);
INSERT INTO public.user_statuses VALUES (2, 'DEVELOPER', 'Разработчик', 'Полный доступ', true, true);
INSERT INTO public.user_statuses VALUES (1, 'TOP_LEVEL_DEVELOPER', 'Высший разработчик', 'Полный доступ разработчика к системе', true, true);
INSERT INTO public.user_statuses VALUES (0, 'SYSTEM', 'Системный', 'Системный', true, false);
INSERT INTO public.user_statuses VALUES (20, 'MODERATOR', 'Модератор', 'Модератор c базовым доступом', true, true);


--
-- TOC entry 4111 (class 0 OID 17810)
-- Dependencies: 217
-- Data for Name: users; Type: TABLE DATA; Schema: public; Owner: admin
--

INSERT INTO public.users OVERRIDING SYSTEM VALUE VALUES (9, 'admin1013456', '$2b$05$O0EFqWC5rLFDn8fAgVW0luNssZq7.gSeOrn65PmgJgbwGd9uumgmy', 1, '2026-07-30 19:02:25.420874', false);
INSERT INTO public.users OVERRIDING SYSTEM VALUE VALUES (1, 'admin', '$2b$05$Q76VRgvVVh.d9rRcocSbCeGlWqsxlVpcrDdwMx6KC7Ze190BvXKJm', 1, '2025-03-05 10:23:54', false);
INSERT INTO public.users OVERRIDING SYSTEM VALUE VALUES (8, 'admin101345', '$2b$05$IfGLNtyDqto8whxit1WNjuqi72XqMqXYzIn5FSty6WavQNN/lvZdS', 2, '2026-07-30 14:45:48.771404', true);
INSERT INTO public.users OVERRIDING SYSTEM VALUE VALUES (7, 'admin10134', '$2b$05$Q.fAN68ZBVqcLuJqiMMgQepdcLSS4lR3koF/qh/wlsaXq5K0IZWKW', 10, '2026-07-30 14:44:09.559324', false);


--
-- TOC entry 4128 (class 0 OID 17896)
-- Dependencies: 234
-- Data for Name: users_emails; Type: TABLE DATA; Schema: public; Owner: admin
--

INSERT INTO public.users_emails VALUES ('d5f612d4-51df-46c8-babf-a8824fc8045c', NULL, '336c3ab88af2af11c0620ddfc1c9e4440a8ff2cb3d58b11d6a743b30699bec4e20b5fa2773ebdb724a11078adb30382ec4996df83dc2cf91dd719706d5853384', '0d05d869605098cd4a3572da8c24', 'c19a9b3ad6e98d3443fc73b19dbea65e', '4ae6f2d18b611ea461b75a88dc98a710', false, '2026-08-20 19:32:00.984782');
INSERT INTO public.users_emails VALUES ('ffee6e5e-1a4d-4d62-8d50-603756c19912', NULL, '42177bf46410809c46c4cf2a10cfed081c8e4df9af055e721bae1e06ca2a2134fc097c8d575c724973093f33fac5cd0903e0d40520a2d9e2fc79fc443b658c1e', 'b4b55a8d599a8eac869ca3fc662f47c1c930bc45fe02573b5b03', '6cd547ffbfe0832030db72f062ebad8b', 'c20702c1bd9579b68d1a57e37fae20c3', false, '2026-08-22 19:38:35.46212');
INSERT INTO public.users_emails VALUES ('77824e52-71a9-4be8-b027-350612b4e6eb', NULL, '41670bfb3a7ed0953d1a05adecdceb9e19e746e96a9e33032bef0fb53e2ad53b4a1d17760eb7cb4b147f9b999aa23606b06807eac51323a834b00da12eca7b5b', '5ce4c1062416e6498ebd3838e04934be79b7cf10eb', '093deaa929a42c0c6b7ee4fbb075b9c3', '62067047ecedfe414e50d94f47921a17', false, '2026-08-24 22:59:17.956268');


--
-- TOC entry 4129 (class 0 OID 17907)
-- Dependencies: 235
-- Data for Name: users_tgs; Type: TABLE DATA; Schema: public; Owner: admin
--

INSERT INTO public.users_tgs VALUES ('e828fff8-9d9f-4f65-aed9-a527cfdefe00', NULL, '36810b0533c67ea7d32fccfb343373a0e9231913a418ee526bcaf9e1da548b34465f4028cc8b16e20f31bd84af063e6080bdc0a0b242ad7daee3db0f8d2dd29a', 'a1aea82b633537d513', '2fcbb755c0e89c94a9553ff9b757afdc', '9566dac35772a389bbc571c81c672fc2', '2026-08-20 19:32:00.984782');


--
-- TOC entry 4385 (class 0 OID 0)
-- Dependencies: 280
-- Name: action_telemetry_id_seq; Type: SEQUENCE SET; Schema: public; Owner: admin
--

SELECT pg_catalog.setval('public.action_telemetry_id_seq', 5, true);


--
-- TOC entry 4386 (class 0 OID 0)
-- Dependencies: 274
-- Name: admin_user_data_id_seq; Type: SEQUENCE SET; Schema: public; Owner: admin
--

SELECT pg_catalog.setval('public.admin_user_data_id_seq', 28, true);


--
-- TOC entry 4387 (class 0 OID 0)
-- Dependencies: 269
-- Name: donation_access_attempts_attempt_id_seq; Type: SEQUENCE SET; Schema: public; Owner: admin
--

SELECT pg_catalog.setval('public.donation_access_attempts_attempt_id_seq', 1, false);


--
-- TOC entry 4388 (class 0 OID 0)
-- Dependencies: 263
-- Name: donation_activations_activation_id_seq; Type: SEQUENCE SET; Schema: public; Owner: admin
--

SELECT pg_catalog.setval('public.donation_activations_activation_id_seq', 1, true);


--
-- TOC entry 4389 (class 0 OID 0)
-- Dependencies: 265
-- Name: donation_active_perks_active_perk_id_seq; Type: SEQUENCE SET; Schema: public; Owner: admin
--

SELECT pg_catalog.setval('public.donation_active_perks_active_perk_id_seq', 2, true);


--
-- TOC entry 4390 (class 0 OID 0)
-- Dependencies: 267
-- Name: donation_check_log_log_id_seq; Type: SEQUENCE SET; Schema: public; Owner: admin
--

SELECT pg_catalog.setval('public.donation_check_log_log_id_seq', 1, true);


--
-- TOC entry 4391 (class 0 OID 0)
-- Dependencies: 258
-- Name: donation_packages_package_id_seq; Type: SEQUENCE SET; Schema: public; Owner: admin
--

SELECT pg_catalog.setval('public.donation_packages_package_id_seq', 4, true);


--
-- TOC entry 4392 (class 0 OID 0)
-- Dependencies: 256
-- Name: donation_perks_perk_id_seq; Type: SEQUENCE SET; Schema: public; Owner: admin
--

SELECT pg_catalog.setval('public.donation_perks_perk_id_seq', 6, true);


--
-- TOC entry 4393 (class 0 OID 0)
-- Dependencies: 261
-- Name: donation_requests_request_id_seq; Type: SEQUENCE SET; Schema: public; Owner: admin
--

SELECT pg_catalog.setval('public.donation_requests_request_id_seq', 1, true);


--
-- TOC entry 4394 (class 0 OID 0)
-- Dependencies: 249
-- Name: file_settings_id_seq; Type: SEQUENCE SET; Schema: public; Owner: admin
--

SELECT pg_catalog.setval('public.file_settings_id_seq', 1, false);


--
-- TOC entry 4395 (class 0 OID 0)
-- Dependencies: 232
-- Name: incidents_data_dictionary_element_id_seq; Type: SEQUENCE SET; Schema: public; Owner: admin
--

SELECT pg_catalog.setval('public.incidents_data_dictionary_element_id_seq', 14, true);


--
-- TOC entry 4396 (class 0 OID 0)
-- Dependencies: 309
-- Name: notification_admin_history_id_seq; Type: SEQUENCE SET; Schema: public; Owner: admin
--

SELECT pg_catalog.setval('public.notification_admin_history_id_seq', 23, true);


--
-- TOC entry 4397 (class 0 OID 0)
-- Dependencies: 307
-- Name: notification_channel_stats_id_seq; Type: SEQUENCE SET; Schema: public; Owner: admin
--

SELECT pg_catalog.setval('public.notification_channel_stats_id_seq', 1, false);


--
-- TOC entry 4398 (class 0 OID 0)
-- Dependencies: 293
-- Name: notification_channels_id_seq; Type: SEQUENCE SET; Schema: public; Owner: admin
--

SELECT pg_catalog.setval('public.notification_channels_id_seq', 4, true);


--
-- TOC entry 4399 (class 0 OID 0)
-- Dependencies: 301
-- Name: notification_default_role_settings_id_seq; Type: SEQUENCE SET; Schema: public; Owner: admin
--

SELECT pg_catalog.setval('public.notification_default_role_settings_id_seq', 61, true);


--
-- TOC entry 4400 (class 0 OID 0)
-- Dependencies: 297
-- Name: notification_group_channels_id_seq; Type: SEQUENCE SET; Schema: public; Owner: admin
--

SELECT pg_catalog.setval('public.notification_group_channels_id_seq', 112, true);


--
-- TOC entry 4401 (class 0 OID 0)
-- Dependencies: 295
-- Name: notification_groups_id_seq; Type: SEQUENCE SET; Schema: public; Owner: admin
--

SELECT pg_catalog.setval('public.notification_groups_id_seq', 14, true);


--
-- TOC entry 4402 (class 0 OID 0)
-- Dependencies: 299
-- Name: notification_templates_id_seq; Type: SEQUENCE SET; Schema: public; Owner: admin
--

SELECT pg_catalog.setval('public.notification_templates_id_seq', 15, true);


--
-- TOC entry 4403 (class 0 OID 0)
-- Dependencies: 311
-- Name: notification_user_settings_history_id_seq; Type: SEQUENCE SET; Schema: public; Owner: admin
--

SELECT pg_catalog.setval('public.notification_user_settings_history_id_seq', 2, true);


--
-- TOC entry 4404 (class 0 OID 0)
-- Dependencies: 303
-- Name: notification_user_settings_id_seq; Type: SEQUENCE SET; Schema: public; Owner: admin
--

SELECT pg_catalog.setval('public.notification_user_settings_id_seq', 109, true);


--
-- TOC entry 4405 (class 0 OID 0)
-- Dependencies: 305
-- Name: notifications_id_seq; Type: SEQUENCE SET; Schema: public; Owner: admin
--

SELECT pg_catalog.setval('public.notifications_id_seq', 74, true);


--
-- TOC entry 4406 (class 0 OID 0)
-- Dependencies: 282
-- Name: password_change_history_id_seq; Type: SEQUENCE SET; Schema: public; Owner: admin
--

SELECT pg_catalog.setval('public.password_change_history_id_seq', 42, true);


--
-- TOC entry 4407 (class 0 OID 0)
-- Dependencies: 286
-- Name: permissions_id_seq; Type: SEQUENCE SET; Schema: public; Owner: admin
--

SELECT pg_catalog.setval('public.permissions_id_seq', 9, true);


--
-- TOC entry 4408 (class 0 OID 0)
-- Dependencies: 225
-- Name: policy_versions_id_seq; Type: SEQUENCE SET; Schema: public; Owner: admin
--

SELECT pg_catalog.setval('public.policy_versions_id_seq', 8, true);


--
-- TOC entry 4409 (class 0 OID 0)
-- Dependencies: 230
-- Name: settings_history_id_seq; Type: SEQUENCE SET; Schema: public; Owner: admin
--

SELECT pg_catalog.setval('public.settings_history_id_seq', 15, true);


--
-- TOC entry 4410 (class 0 OID 0)
-- Dependencies: 284
-- Name: system_scheduled_tasks_id_seq; Type: SEQUENCE SET; Schema: public; Owner: admin
--

SELECT pg_catalog.setval('public.system_scheduled_tasks_id_seq', 19, true);


--
-- TOC entry 4411 (class 0 OID 0)
-- Dependencies: 227
-- Name: system_versions_version_id_seq; Type: SEQUENCE SET; Schema: public; Owner: admin
--

SELECT pg_catalog.setval('public.system_versions_version_id_seq', 1, true);


--
-- TOC entry 4412 (class 0 OID 0)
-- Dependencies: 221
-- Name: user_auth_logins_user_auth_login_id_seq; Type: SEQUENCE SET; Schema: public; Owner: admin
--

SELECT pg_catalog.setval('public.user_auth_logins_user_auth_login_id_seq', 573, true);


--
-- TOC entry 4413 (class 0 OID 0)
-- Dependencies: 278
-- Name: user_devices_id_seq; Type: SEQUENCE SET; Schema: public; Owner: admin
--

SELECT pg_catalog.setval('public.user_devices_id_seq', 75, true);


--
-- TOC entry 4414 (class 0 OID 0)
-- Dependencies: 290
-- Name: user_permission_history_id_seq; Type: SEQUENCE SET; Schema: public; Owner: admin
--

SELECT pg_catalog.setval('public.user_permission_history_id_seq', 131, true);


--
-- TOC entry 4415 (class 0 OID 0)
-- Dependencies: 276
-- Name: user_role_history_id_seq; Type: SEQUENCE SET; Schema: public; Owner: admin
--

SELECT pg_catalog.setval('public.user_role_history_id_seq', 56, true);


--
-- TOC entry 4416 (class 0 OID 0)
-- Dependencies: 222
-- Name: users_user_id_seq; Type: SEQUENCE SET; Schema: public; Owner: admin
--

SELECT pg_catalog.setval('public.users_user_id_seq', 9, true);


--
-- TOC entry 3868 (class 2606 OID 34714)
-- Name: action_telemetry action_telemetry_pkey; Type: CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.action_telemetry
    ADD CONSTRAINT action_telemetry_pkey PRIMARY KEY (id);


--
-- TOC entry 3853 (class 2606 OID 34660)
-- Name: admin_user_data admin_user_data_pkey; Type: CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.admin_user_data
    ADD CONSTRAINT admin_user_data_pkey PRIMARY KEY (id);


--
-- TOC entry 3855 (class 2606 OID 34662)
-- Name: admin_user_data admin_user_data_user_id_key; Type: CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.admin_user_data
    ADD CONSTRAINT admin_user_data_user_id_key UNIQUE (user_id);


--
-- TOC entry 3789 (class 2606 OID 18055)
-- Name: antivirus_scans antivirus_scans_pkey; Type: CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.antivirus_scans
    ADD CONSTRAINT antivirus_scans_pkey PRIMARY KEY (id);


--
-- TOC entry 3798 (class 2606 OID 34410)
-- Name: critical_actions_history critical_actions_history_pkey; Type: CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.critical_actions_history
    ADD CONSTRAINT critical_actions_history_pkey PRIMARY KEY (uuid);


--
-- TOC entry 3796 (class 2606 OID 34403)
-- Name: critical_actions critical_actions_pkey; Type: CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.critical_actions
    ADD CONSTRAINT critical_actions_pkey PRIMARY KEY (id);


--
-- TOC entry 3835 (class 2606 OID 34561)
-- Name: donation_access_attempts donation_access_attempts_pkey; Type: CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.donation_access_attempts
    ADD CONSTRAINT donation_access_attempts_pkey PRIMARY KEY (attempt_id);


--
-- TOC entry 3816 (class 2606 OID 34491)
-- Name: donation_activations donation_activations_pkey; Type: CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.donation_activations
    ADD CONSTRAINT donation_activations_pkey PRIMARY KEY (activation_id);


--
-- TOC entry 3822 (class 2606 OID 34517)
-- Name: donation_active_perks donation_active_perks_pkey; Type: CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.donation_active_perks
    ADD CONSTRAINT donation_active_perks_pkey PRIMARY KEY (active_perk_id);


--
-- TOC entry 3829 (class 2606 OID 34542)
-- Name: donation_check_log donation_check_log_pkey; Type: CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.donation_check_log
    ADD CONSTRAINT donation_check_log_pkey PRIMARY KEY (log_id);


--
-- TOC entry 3808 (class 2606 OID 34445)
-- Name: donation_package_perks donation_package_perks_pkey; Type: CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.donation_package_perks
    ADD CONSTRAINT donation_package_perks_pkey PRIMARY KEY (package_id, perk_id);


--
-- TOC entry 3804 (class 2606 OID 34440)
-- Name: donation_packages donation_packages_code_name_key; Type: CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.donation_packages
    ADD CONSTRAINT donation_packages_code_name_key UNIQUE (code_name);


--
-- TOC entry 3806 (class 2606 OID 34438)
-- Name: donation_packages donation_packages_pkey; Type: CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.donation_packages
    ADD CONSTRAINT donation_packages_pkey PRIMARY KEY (package_id);


--
-- TOC entry 3800 (class 2606 OID 34425)
-- Name: donation_perks donation_perks_code_name_key; Type: CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.donation_perks
    ADD CONSTRAINT donation_perks_code_name_key UNIQUE (code_name);


--
-- TOC entry 3802 (class 2606 OID 34423)
-- Name: donation_perks donation_perks_pkey; Type: CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.donation_perks
    ADD CONSTRAINT donation_perks_pkey PRIMARY KEY (perk_id);


--
-- TOC entry 3810 (class 2606 OID 34469)
-- Name: donation_requests donation_requests_pkey; Type: CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.donation_requests
    ADD CONSTRAINT donation_requests_pkey PRIMARY KEY (request_id);


--
-- TOC entry 3841 (class 2606 OID 34573)
-- Name: donation_settings donation_settings_pkey; Type: CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.donation_settings
    ADD CONSTRAINT donation_settings_pkey PRIMARY KEY (setting_key);


--
-- TOC entry 3783 (class 2606 OID 18015)
-- Name: file_settings file_settings_pkey; Type: CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.file_settings
    ADD CONSTRAINT file_settings_pkey PRIMARY KEY (id);


--
-- TOC entry 3785 (class 2606 OID 18024)
-- Name: files files_pkey; Type: CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.files
    ADD CONSTRAINT files_pkey PRIMARY KEY (id);


--
-- TOC entry 3787 (class 2606 OID 18033)
-- Name: files_single files_single_pkey; Type: CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.files_single
    ADD CONSTRAINT files_single_pkey PRIMARY KEY (id);


--
-- TOC entry 3779 (class 2606 OID 17989)
-- Name: incident_change_history incident_change_history_pkey; Type: CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.incident_change_history
    ADD CONSTRAINT incident_change_history_pkey PRIMARY KEY (record_id);


--
-- TOC entry 3781 (class 2606 OID 17995)
-- Name: incident_conditions_statuses incident_conditions_statuses_pkey; Type: CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.incident_conditions_statuses
    ADD CONSTRAINT incident_conditions_statuses_pkey PRIMARY KEY (status_id);


--
-- TOC entry 3765 (class 2606 OID 17940)
-- Name: incident_persone_connector incident_persone_connector_pkey; Type: CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.incident_persone_connector
    ADD CONSTRAINT incident_persone_connector_pkey PRIMARY KEY (id);


--
-- TOC entry 3763 (class 2606 OID 17934)
-- Name: incident_persones incident_persones_pkey; Type: CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.incident_persones
    ADD CONSTRAINT incident_persones_pkey PRIMARY KEY (person_id);


--
-- TOC entry 3759 (class 2606 OID 17922)
-- Name: incident_pvz incident_pvz_pkey; Type: CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.incident_pvz
    ADD CONSTRAINT incident_pvz_pkey PRIMARY KEY (pvz_id);


--
-- TOC entry 3750 (class 2606 OID 17887)
-- Name: incidents_data_dictionary incidents_data_dictionary_pkey; Type: CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.incidents_data_dictionary
    ADD CONSTRAINT incidents_data_dictionary_pkey PRIMARY KEY (element_id);


--
-- TOC entry 3753 (class 2606 OID 17893)
-- Name: incidents_main_info incidents_main_info_pkey; Type: CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.incidents_main_info
    ADD CONSTRAINT incidents_main_info_pkey PRIMARY KEY (incident_id);


--
-- TOC entry 3761 (class 2606 OID 17928)
-- Name: incident_pvz_connector incidents_pvz_connector_pkey; Type: CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.incident_pvz_connector
    ADD CONSTRAINT incidents_pvz_connector_pkey PRIMARY KEY (id);


--
-- TOC entry 3934 (class 2606 OID 56428)
-- Name: notification_admin_history notification_admin_history_pkey; Type: CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.notification_admin_history
    ADD CONSTRAINT notification_admin_history_pkey PRIMARY KEY (id);


--
-- TOC entry 3927 (class 2606 OID 56403)
-- Name: notification_channel_stats notification_channel_stats_channel_id_group_id_key; Type: CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.notification_channel_stats
    ADD CONSTRAINT notification_channel_stats_channel_id_group_id_key UNIQUE (channel_id, group_id);


--
-- TOC entry 3929 (class 2606 OID 56401)
-- Name: notification_channel_stats notification_channel_stats_pkey; Type: CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.notification_channel_stats
    ADD CONSTRAINT notification_channel_stats_pkey PRIMARY KEY (id);


--
-- TOC entry 3894 (class 2606 OID 56264)
-- Name: notification_channels notification_channels_code_key; Type: CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.notification_channels
    ADD CONSTRAINT notification_channels_code_key UNIQUE (code);


--
-- TOC entry 3896 (class 2606 OID 56262)
-- Name: notification_channels notification_channels_pkey; Type: CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.notification_channels
    ADD CONSTRAINT notification_channels_pkey PRIMARY KEY (id);


--
-- TOC entry 3910 (class 2606 OID 56334)
-- Name: notification_default_role_settings notification_default_role_set_role_code_group_id_channel_id_key; Type: CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.notification_default_role_settings
    ADD CONSTRAINT notification_default_role_set_role_code_group_id_channel_id_key UNIQUE (role_code, group_id, channel_id);


--
-- TOC entry 3912 (class 2606 OID 56332)
-- Name: notification_default_role_settings notification_default_role_settings_pkey; Type: CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.notification_default_role_settings
    ADD CONSTRAINT notification_default_role_settings_pkey PRIMARY KEY (id);


--
-- TOC entry 3902 (class 2606 OID 56295)
-- Name: notification_group_channels notification_group_channels_group_id_channel_id_key; Type: CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.notification_group_channels
    ADD CONSTRAINT notification_group_channels_group_id_channel_id_key UNIQUE (group_id, channel_id);


--
-- TOC entry 3904 (class 2606 OID 56293)
-- Name: notification_group_channels notification_group_channels_pkey; Type: CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.notification_group_channels
    ADD CONSTRAINT notification_group_channels_pkey PRIMARY KEY (id);


--
-- TOC entry 3898 (class 2606 OID 56284)
-- Name: notification_groups notification_groups_code_key; Type: CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.notification_groups
    ADD CONSTRAINT notification_groups_code_key UNIQUE (code);


--
-- TOC entry 3900 (class 2606 OID 56282)
-- Name: notification_groups notification_groups_pkey; Type: CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.notification_groups
    ADD CONSTRAINT notification_groups_pkey PRIMARY KEY (id);


--
-- TOC entry 3906 (class 2606 OID 56318)
-- Name: notification_templates notification_templates_group_id_channel_code_key; Type: CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.notification_templates
    ADD CONSTRAINT notification_templates_group_id_channel_code_key UNIQUE (group_id, channel_code);


--
-- TOC entry 3908 (class 2606 OID 56316)
-- Name: notification_templates notification_templates_pkey; Type: CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.notification_templates
    ADD CONSTRAINT notification_templates_pkey PRIMARY KEY (id);


--
-- TOC entry 3938 (class 2606 OID 56444)
-- Name: notification_user_settings_history notification_user_settings_history_pkey; Type: CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.notification_user_settings_history
    ADD CONSTRAINT notification_user_settings_history_pkey PRIMARY KEY (id);


--
-- TOC entry 3915 (class 2606 OID 56355)
-- Name: notification_user_settings notification_user_settings_pkey; Type: CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.notification_user_settings
    ADD CONSTRAINT notification_user_settings_pkey PRIMARY KEY (id);


--
-- TOC entry 3917 (class 2606 OID 56357)
-- Name: notification_user_settings notification_user_settings_user_id_group_id_channel_id_key; Type: CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.notification_user_settings
    ADD CONSTRAINT notification_user_settings_user_id_group_id_channel_id_key UNIQUE (user_id, group_id, channel_id);


--
-- TOC entry 3924 (class 2606 OID 56382)
-- Name: notifications notifications_pkey; Type: CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.notifications
    ADD CONSTRAINT notifications_pkey PRIMARY KEY (id);


--
-- TOC entry 3874 (class 2606 OID 34729)
-- Name: password_change_history password_change_history_pkey; Type: CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.password_change_history
    ADD CONSTRAINT password_change_history_pkey PRIMARY KEY (id);


--
-- TOC entry 3879 (class 2606 OID 56171)
-- Name: permissions permissions_code_key; Type: CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.permissions
    ADD CONSTRAINT permissions_code_key UNIQUE (code);


--
-- TOC entry 3881 (class 2606 OID 56169)
-- Name: permissions permissions_pkey; Type: CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.permissions
    ADD CONSTRAINT permissions_pkey PRIMARY KEY (id);


--
-- TOC entry 3773 (class 2606 OID 17968)
-- Name: persone_name_connector persone_name_connector_pkey; Type: CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.persone_name_connector
    ADD CONSTRAINT persone_name_connector_pkey PRIMARY KEY (id);


--
-- TOC entry 3771 (class 2606 OID 17962)
-- Name: persone_names persone_names_pkey; Type: CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.persone_names
    ADD CONSTRAINT persone_names_pkey PRIMARY KEY (name_id);


--
-- TOC entry 3767 (class 2606 OID 17946)
-- Name: persone_phone_connector persone_phone_connector_pkey; Type: CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.persone_phone_connector
    ADD CONSTRAINT persone_phone_connector_pkey PRIMARY KEY (id);


--
-- TOC entry 3769 (class 2606 OID 17954)
-- Name: persone_phones persone_phones_pkey; Type: CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.persone_phones
    ADD CONSTRAINT persone_phones_pkey PRIMARY KEY (phone_id);


--
-- TOC entry 3775 (class 2606 OID 17974)
-- Name: persone_telegramm_accaunt_connector persone_telegramm_accaunt_connector_pkey; Type: CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.persone_telegramm_accaunt_connector
    ADD CONSTRAINT persone_telegramm_accaunt_connector_pkey PRIMARY KEY (id);


--
-- TOC entry 3777 (class 2606 OID 17982)
-- Name: persone_telegramm_accaunts persone_telegramm_accaunts_pkey; Type: CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.persone_telegramm_accaunts
    ADD CONSTRAINT persone_telegramm_accaunts_pkey PRIMARY KEY (tg_id);


--
-- TOC entry 3740 (class 2606 OID 17847)
-- Name: policy policy_pkey; Type: CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.policy
    ADD CONSTRAINT policy_pkey PRIMARY KEY (id);


--
-- TOC entry 3742 (class 2606 OID 17854)
-- Name: policy_versions policy_versions_pkey; Type: CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.policy_versions
    ADD CONSTRAINT policy_versions_pkey PRIMARY KEY (id);


--
-- TOC entry 3851 (class 2606 OID 34637)
-- Name: rate_limits rate_limits_pkey; Type: CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.rate_limits
    ADD CONSTRAINT rate_limits_pkey PRIMARY KEY (key);


--
-- TOC entry 3883 (class 2606 OID 56177)
-- Name: role_permissions role_permissions_pkey; Type: CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.role_permissions
    ADD CONSTRAINT role_permissions_pkey PRIMARY KEY (status_code, permission_code);


--
-- TOC entry 3848 (class 2606 OID 34585)
-- Name: search_history search_history_pkey; Type: CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.search_history
    ADD CONSTRAINT search_history_pkey PRIMARY KEY (id);


--
-- TOC entry 3748 (class 2606 OID 17879)
-- Name: settings_history settings_history_pkey; Type: CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.settings_history
    ADD CONSTRAINT settings_history_pkey PRIMARY KEY (id);


--
-- TOC entry 3746 (class 2606 OID 17872)
-- Name: settings settings_pkey; Type: CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.settings
    ADD CONSTRAINT settings_pkey PRIMARY KEY (setting_id);


--
-- TOC entry 3794 (class 2606 OID 26207)
-- Name: stats_records stats_records_pkey; Type: CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.stats_records
    ADD CONSTRAINT stats_records_pkey PRIMARY KEY (section, metric_type, entity_id, time_bucket, bucket_type);


--
-- TOC entry 3877 (class 2606 OID 56139)
-- Name: system_scheduled_tasks system_scheduled_tasks_pkey; Type: CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.system_scheduled_tasks
    ADD CONSTRAINT system_scheduled_tasks_pkey PRIMARY KEY (id);


--
-- TOC entry 3744 (class 2606 OID 17863)
-- Name: system_versions system_versions_pkey; Type: CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.system_versions
    ADD CONSTRAINT system_versions_pkey PRIMARY KEY (version_id);


--
-- TOC entry 3738 (class 2606 OID 17836)
-- Name: user_auth_logins user_auth_logins_pkey; Type: CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.user_auth_logins
    ADD CONSTRAINT user_auth_logins_pkey PRIMARY KEY (user_auth_login_id);


--
-- TOC entry 3866 (class 2606 OID 34700)
-- Name: user_devices user_devices_pkey; Type: CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.user_devices
    ADD CONSTRAINT user_devices_pkey PRIMARY KEY (id);


--
-- TOC entry 3890 (class 2606 OID 56194)
-- Name: user_permission_history user_permission_history_pkey; Type: CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.user_permission_history
    ADD CONSTRAINT user_permission_history_pkey PRIMARY KEY (id);


--
-- TOC entry 3885 (class 2606 OID 56182)
-- Name: user_permission_overrides user_permission_overrides_pkey; Type: CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.user_permission_overrides
    ADD CONSTRAINT user_permission_overrides_pkey PRIMARY KEY (user_id, permission_code);


--
-- TOC entry 3736 (class 2606 OID 17829)
-- Name: user_refresh_tokens user_refresh_tokens_pkey; Type: CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.user_refresh_tokens
    ADD CONSTRAINT user_refresh_tokens_pkey PRIMARY KEY (token_id);


--
-- TOC entry 3861 (class 2606 OID 34679)
-- Name: user_role_history user_role_history_pkey; Type: CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.user_role_history
    ADD CONSTRAINT user_role_history_pkey PRIMARY KEY (id);


--
-- TOC entry 3892 (class 2606 OID 56230)
-- Name: user_security_settings user_security_settings_pkey; Type: CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.user_security_settings
    ADD CONSTRAINT user_security_settings_pkey PRIMARY KEY (id);


--
-- TOC entry 3733 (class 2606 OID 17821)
-- Name: user_statuses user_statuses_pkey; Type: CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.user_statuses
    ADD CONSTRAINT user_statuses_pkey PRIMARY KEY (status_id);


--
-- TOC entry 3755 (class 2606 OID 17904)
-- Name: users_emails users_emails_pkey; Type: CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.users_emails
    ADD CONSTRAINT users_emails_pkey PRIMARY KEY (email_id);


--
-- TOC entry 3731 (class 2606 OID 17814)
-- Name: users users_pkey; Type: CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_pkey PRIMARY KEY (user_id);


--
-- TOC entry 3757 (class 2606 OID 17914)
-- Name: users_tgs users_tgs_pkey; Type: CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.users_tgs
    ADD CONSTRAINT users_tgs_pkey PRIMARY KEY (tg_id);


--
-- TOC entry 3869 (class 1259 OID 34716)
-- Name: idx_action_telemetry_created_at; Type: INDEX; Schema: public; Owner: admin
--

CREATE INDEX idx_action_telemetry_created_at ON public.action_telemetry USING btree (created_at DESC);


--
-- TOC entry 3870 (class 1259 OID 34715)
-- Name: idx_action_telemetry_module_time; Type: INDEX; Schema: public; Owner: admin
--

CREATE INDEX idx_action_telemetry_module_time ON public.action_telemetry USING btree (module, created_at DESC);


--
-- TOC entry 3856 (class 1259 OID 34668)
-- Name: idx_admin_user_data_user_id; Type: INDEX; Schema: public; Owner: admin
--

CREATE INDEX idx_admin_user_data_user_id ON public.admin_user_data USING btree (user_id);


--
-- TOC entry 3836 (class 1259 OID 34565)
-- Name: idx_donation_access_attempts_created; Type: INDEX; Schema: public; Owner: admin
--

CREATE INDEX idx_donation_access_attempts_created ON public.donation_access_attempts USING btree (created_at DESC);


--
-- TOC entry 3837 (class 1259 OID 34562)
-- Name: idx_donation_access_attempts_email_hesh; Type: INDEX; Schema: public; Owner: admin
--

CREATE INDEX idx_donation_access_attempts_email_hesh ON public.donation_access_attempts USING btree (email_hesh) WHERE (email_hesh IS NOT NULL);


--
-- TOC entry 3838 (class 1259 OID 34563)
-- Name: idx_donation_access_attempts_ip; Type: INDEX; Schema: public; Owner: admin
--

CREATE INDEX idx_donation_access_attempts_ip ON public.donation_access_attempts USING btree (ip_address);


--
-- TOC entry 3839 (class 1259 OID 34564)
-- Name: idx_donation_access_attempts_success; Type: INDEX; Schema: public; Owner: admin
--

CREATE INDEX idx_donation_access_attempts_success ON public.donation_access_attempts USING btree (success);


--
-- TOC entry 3817 (class 1259 OID 34503)
-- Name: idx_donation_activations_active; Type: INDEX; Schema: public; Owner: admin
--

CREATE INDEX idx_donation_activations_active ON public.donation_activations USING btree (email_hesh, is_active);


--
-- TOC entry 3818 (class 1259 OID 34502)
-- Name: idx_donation_activations_email_hesh; Type: INDEX; Schema: public; Owner: admin
--

CREATE INDEX idx_donation_activations_email_hesh ON public.donation_activations USING btree (email_hesh);


--
-- TOC entry 3819 (class 1259 OID 34504)
-- Name: idx_donation_activations_expires; Type: INDEX; Schema: public; Owner: admin
--

CREATE INDEX idx_donation_activations_expires ON public.donation_activations USING btree (expires_at);


--
-- TOC entry 3820 (class 1259 OID 34505)
-- Name: idx_donation_activations_request; Type: INDEX; Schema: public; Owner: admin
--

CREATE INDEX idx_donation_activations_request ON public.donation_activations USING btree (request_id);


--
-- TOC entry 3823 (class 1259 OID 34531)
-- Name: idx_donation_active_perks_activation; Type: INDEX; Schema: public; Owner: admin
--

CREATE INDEX idx_donation_active_perks_activation ON public.donation_active_perks USING btree (activation_id);


--
-- TOC entry 3824 (class 1259 OID 34529)
-- Name: idx_donation_active_perks_active; Type: INDEX; Schema: public; Owner: admin
--

CREATE INDEX idx_donation_active_perks_active ON public.donation_active_perks USING btree (email_hesh, is_active);


--
-- TOC entry 3825 (class 1259 OID 34528)
-- Name: idx_donation_active_perks_email_hesh; Type: INDEX; Schema: public; Owner: admin
--

CREATE INDEX idx_donation_active_perks_email_hesh ON public.donation_active_perks USING btree (email_hesh);


--
-- TOC entry 3826 (class 1259 OID 34530)
-- Name: idx_donation_active_perks_expires; Type: INDEX; Schema: public; Owner: admin
--

CREATE INDEX idx_donation_active_perks_expires ON public.donation_active_perks USING btree (expires_at);


--
-- TOC entry 3827 (class 1259 OID 34532)
-- Name: idx_donation_active_perks_unique; Type: INDEX; Schema: public; Owner: admin
--

CREATE UNIQUE INDEX idx_donation_active_perks_unique ON public.donation_active_perks USING btree (email_hesh, perk_id) WHERE (is_active = true);


--
-- TOC entry 3830 (class 1259 OID 34551)
-- Name: idx_donation_check_log_activation; Type: INDEX; Schema: public; Owner: admin
--

CREATE INDEX idx_donation_check_log_activation ON public.donation_check_log USING btree (activation_id);


--
-- TOC entry 3831 (class 1259 OID 34550)
-- Name: idx_donation_check_log_created; Type: INDEX; Schema: public; Owner: admin
--

CREATE INDEX idx_donation_check_log_created ON public.donation_check_log USING btree (created_at DESC);


--
-- TOC entry 3832 (class 1259 OID 34548)
-- Name: idx_donation_check_log_email_hesh; Type: INDEX; Schema: public; Owner: admin
--

CREATE INDEX idx_donation_check_log_email_hesh ON public.donation_check_log USING btree (email_hesh);


--
-- TOC entry 3833 (class 1259 OID 34549)
-- Name: idx_donation_check_log_operation; Type: INDEX; Schema: public; Owner: admin
--

CREATE INDEX idx_donation_check_log_operation ON public.donation_check_log USING btree (operation);


--
-- TOC entry 3811 (class 1259 OID 34475)
-- Name: idx_donation_requests_email_hesh; Type: INDEX; Schema: public; Owner: admin
--

CREATE INDEX idx_donation_requests_email_hesh ON public.donation_requests USING btree (email_hesh);


--
-- TOC entry 3812 (class 1259 OID 34478)
-- Name: idx_donation_requests_package; Type: INDEX; Schema: public; Owner: admin
--

CREATE INDEX idx_donation_requests_package ON public.donation_requests USING btree (package_id);


--
-- TOC entry 3813 (class 1259 OID 34477)
-- Name: idx_donation_requests_requested_at; Type: INDEX; Schema: public; Owner: admin
--

CREATE INDEX idx_donation_requests_requested_at ON public.donation_requests USING btree (requested_at DESC);


--
-- TOC entry 3814 (class 1259 OID 34476)
-- Name: idx_donation_requests_status; Type: INDEX; Schema: public; Owner: admin
--

CREATE INDEX idx_donation_requests_status ON public.donation_requests USING btree (status);


--
-- TOC entry 3751 (class 1259 OID 34610)
-- Name: idx_incidents_parent_incident; Type: INDEX; Schema: public; Owner: admin
--

CREATE INDEX idx_incidents_parent_incident ON public.incidents_main_info USING btree (parent_incident_id) WHERE (type = 2);


--
-- TOC entry 3930 (class 1259 OID 56435)
-- Name: idx_notif_admin_history_actor; Type: INDEX; Schema: public; Owner: admin
--

CREATE INDEX idx_notif_admin_history_actor ON public.notification_admin_history USING btree (actor_user_id);


--
-- TOC entry 3931 (class 1259 OID 56434)
-- Name: idx_notif_admin_history_created; Type: INDEX; Schema: public; Owner: admin
--

CREATE INDEX idx_notif_admin_history_created ON public.notification_admin_history USING btree (created_at DESC);


--
-- TOC entry 3932 (class 1259 OID 56436)
-- Name: idx_notif_admin_history_type; Type: INDEX; Schema: public; Owner: admin
--

CREATE INDEX idx_notif_admin_history_type ON public.notification_admin_history USING btree (action_type);


--
-- TOC entry 3925 (class 1259 OID 56414)
-- Name: idx_notif_channel_stats_lookup; Type: INDEX; Schema: public; Owner: admin
--

CREATE INDEX idx_notif_channel_stats_lookup ON public.notification_channel_stats USING btree (channel_id, group_id);


--
-- TOC entry 3935 (class 1259 OID 56461)
-- Name: idx_notif_user_settings_history_changed; Type: INDEX; Schema: public; Owner: admin
--

CREATE INDEX idx_notif_user_settings_history_changed ON public.notification_user_settings_history USING btree (changed_at DESC);


--
-- TOC entry 3936 (class 1259 OID 56460)
-- Name: idx_notif_user_settings_history_user; Type: INDEX; Schema: public; Owner: admin
--

CREATE INDEX idx_notif_user_settings_history_user ON public.notification_user_settings_history USING btree (user_id);


--
-- TOC entry 3913 (class 1259 OID 56368)
-- Name: idx_notif_user_settings_user; Type: INDEX; Schema: public; Owner: admin
--

CREATE INDEX idx_notif_user_settings_user ON public.notification_user_settings USING btree (user_id);


--
-- TOC entry 3918 (class 1259 OID 56462)
-- Name: idx_notifications_channel_code; Type: INDEX; Schema: public; Owner: admin
--

CREATE INDEX idx_notifications_channel_code ON public.notifications USING btree (channel_code) WHERE (channel_code IS NOT NULL);


--
-- TOC entry 3919 (class 1259 OID 56391)
-- Name: idx_notifications_read_at; Type: INDEX; Schema: public; Owner: admin
--

CREATE INDEX idx_notifications_read_at ON public.notifications USING btree (read_at) WHERE ((is_read = true) AND (deleted_at IS NULL));


--
-- TOC entry 3920 (class 1259 OID 56389)
-- Name: idx_notifications_user_created; Type: INDEX; Schema: public; Owner: admin
--

CREATE INDEX idx_notifications_user_created ON public.notifications USING btree (user_id, created_at DESC) WHERE (deleted_at IS NULL);


--
-- TOC entry 3921 (class 1259 OID 56390)
-- Name: idx_notifications_user_type; Type: INDEX; Schema: public; Owner: admin
--

CREATE INDEX idx_notifications_user_type ON public.notifications USING btree (user_id, type) WHERE (deleted_at IS NULL);


--
-- TOC entry 3922 (class 1259 OID 56388)
-- Name: idx_notifications_user_unread; Type: INDEX; Schema: public; Owner: admin
--

CREATE INDEX idx_notifications_user_unread ON public.notifications USING btree (user_id, is_read) WHERE (deleted_at IS NULL);


--
-- TOC entry 3871 (class 1259 OID 34741)
-- Name: idx_password_history_created_at; Type: INDEX; Schema: public; Owner: admin
--

CREATE INDEX idx_password_history_created_at ON public.password_change_history USING btree (created_at);


--
-- TOC entry 3872 (class 1259 OID 34740)
-- Name: idx_password_history_user_id; Type: INDEX; Schema: public; Owner: admin
--

CREATE INDEX idx_password_history_user_id ON public.password_change_history USING btree (user_id);


--
-- TOC entry 3886 (class 1259 OID 56196)
-- Name: idx_perm_history_actor; Type: INDEX; Schema: public; Owner: admin
--

CREATE INDEX idx_perm_history_actor ON public.user_permission_history USING btree (actor_user_id);


--
-- TOC entry 3887 (class 1259 OID 56197)
-- Name: idx_perm_history_created; Type: INDEX; Schema: public; Owner: admin
--

CREATE INDEX idx_perm_history_created ON public.user_permission_history USING btree (created_at DESC);


--
-- TOC entry 3888 (class 1259 OID 56195)
-- Name: idx_perm_history_target; Type: INDEX; Schema: public; Owner: admin
--

CREATE INDEX idx_perm_history_target ON public.user_permission_history USING btree (target_user_id);


--
-- TOC entry 3849 (class 1259 OID 34638)
-- Name: idx_rate_limits_expire; Type: INDEX; Schema: public; Owner: admin
--

CREATE INDEX idx_rate_limits_expire ON public.rate_limits USING btree (expire);


--
-- TOC entry 3734 (class 1259 OID 34753)
-- Name: idx_refresh_tokens_device_revoked; Type: INDEX; Schema: public; Owner: admin
--

CREATE INDEX idx_refresh_tokens_device_revoked ON public.user_refresh_tokens USING btree (device_id, revoked, expires_at);


--
-- TOC entry 3857 (class 1259 OID 34681)
-- Name: idx_role_history_actor; Type: INDEX; Schema: public; Owner: admin
--

CREATE INDEX idx_role_history_actor ON public.user_role_history USING btree (actor_user_id, created_at DESC);


--
-- TOC entry 3858 (class 1259 OID 34682)
-- Name: idx_role_history_cleanup; Type: INDEX; Schema: public; Owner: admin
--

CREATE INDEX idx_role_history_cleanup ON public.user_role_history USING btree (created_at);


--
-- TOC entry 3859 (class 1259 OID 34680)
-- Name: idx_role_history_target; Type: INDEX; Schema: public; Owner: admin
--

CREATE INDEX idx_role_history_target ON public.user_role_history USING btree (target_user_id, created_at DESC);


--
-- TOC entry 3875 (class 1259 OID 56140)
-- Name: idx_scheduled_tasks_ready; Type: INDEX; Schema: public; Owner: admin
--

CREATE INDEX idx_scheduled_tasks_ready ON public.system_scheduled_tasks USING btree (task_type, status, scheduled_at) WHERE ((status)::text = 'scheduled'::text);


--
-- TOC entry 3842 (class 1259 OID 34589)
-- Name: idx_search_history_created; Type: INDEX; Schema: public; Owner: admin
--

CREATE INDEX idx_search_history_created ON public.search_history USING btree (created_at DESC);


--
-- TOC entry 3843 (class 1259 OID 34588)
-- Name: idx_search_history_device; Type: INDEX; Schema: public; Owner: admin
--

CREATE INDEX idx_search_history_device ON public.search_history USING btree (device_id, created_at DESC);


--
-- TOC entry 3844 (class 1259 OID 34586)
-- Name: idx_search_history_email_date; Type: INDEX; Schema: public; Owner: admin
--

CREATE INDEX idx_search_history_email_date ON public.search_history USING btree (user_email, created_at DESC);


--
-- TOC entry 3845 (class 1259 OID 34590)
-- Name: idx_search_history_status; Type: INDEX; Schema: public; Owner: admin
--

CREATE INDEX idx_search_history_status ON public.search_history USING btree (result_status, created_at DESC);


--
-- TOC entry 3846 (class 1259 OID 34587)
-- Name: idx_search_history_type_date; Type: INDEX; Schema: public; Owner: admin
--

CREATE INDEX idx_search_history_type_date ON public.search_history USING btree (search_type, created_at DESC);


--
-- TOC entry 3790 (class 1259 OID 26210)
-- Name: idx_stats_cleanup; Type: INDEX; Schema: public; Owner: admin
--

CREATE INDEX idx_stats_cleanup ON public.stats_records USING btree (bucket_type, time_bucket);


--
-- TOC entry 3791 (class 1259 OID 26208)
-- Name: idx_stats_lookup; Type: INDEX; Schema: public; Owner: admin
--

CREATE INDEX idx_stats_lookup ON public.stats_records USING btree (section, metric_type, entity_id, time_bucket DESC);


--
-- TOC entry 3792 (class 1259 OID 26209)
-- Name: idx_stats_time; Type: INDEX; Schema: public; Owner: admin
--

CREATE INDEX idx_stats_time ON public.stats_records USING btree (time_bucket);


--
-- TOC entry 3862 (class 1259 OID 34744)
-- Name: idx_user_devices_fingerprint; Type: INDEX; Schema: public; Owner: admin
--

CREATE INDEX idx_user_devices_fingerprint ON public.user_devices USING btree (user_id, device_fingerprint) WHERE (is_deleted = false);


--
-- TOC entry 3863 (class 1259 OID 56202)
-- Name: idx_user_devices_trusted; Type: INDEX; Schema: public; Owner: admin
--

CREATE INDEX idx_user_devices_trusted ON public.user_devices USING btree (user_id, is_trusted) WHERE (is_deleted = false);


--
-- TOC entry 3864 (class 1259 OID 34706)
-- Name: idx_user_devices_user_fp; Type: INDEX; Schema: public; Owner: admin
--

CREATE INDEX idx_user_devices_user_fp ON public.user_devices USING btree (user_id, device_fingerprint);


--
-- TOC entry 3948 (class 2606 OID 34663)
-- Name: admin_user_data admin_user_data_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.admin_user_data
    ADD CONSTRAINT admin_user_data_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(user_id) ON DELETE CASCADE;


--
-- TOC entry 3943 (class 2606 OID 34497)
-- Name: donation_activations donation_activations_package_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.donation_activations
    ADD CONSTRAINT donation_activations_package_id_fkey FOREIGN KEY (package_id) REFERENCES public.donation_packages(package_id);


--
-- TOC entry 3944 (class 2606 OID 34492)
-- Name: donation_activations donation_activations_request_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.donation_activations
    ADD CONSTRAINT donation_activations_request_id_fkey FOREIGN KEY (request_id) REFERENCES public.donation_requests(request_id);


--
-- TOC entry 3945 (class 2606 OID 34518)
-- Name: donation_active_perks donation_active_perks_activation_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.donation_active_perks
    ADD CONSTRAINT donation_active_perks_activation_id_fkey FOREIGN KEY (activation_id) REFERENCES public.donation_activations(activation_id) ON DELETE CASCADE;


--
-- TOC entry 3946 (class 2606 OID 34523)
-- Name: donation_active_perks donation_active_perks_perk_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.donation_active_perks
    ADD CONSTRAINT donation_active_perks_perk_id_fkey FOREIGN KEY (perk_id) REFERENCES public.donation_perks(perk_id);


--
-- TOC entry 3947 (class 2606 OID 34543)
-- Name: donation_check_log donation_check_log_activation_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.donation_check_log
    ADD CONSTRAINT donation_check_log_activation_id_fkey FOREIGN KEY (activation_id) REFERENCES public.donation_activations(activation_id);


--
-- TOC entry 3940 (class 2606 OID 34446)
-- Name: donation_package_perks donation_package_perks_package_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.donation_package_perks
    ADD CONSTRAINT donation_package_perks_package_id_fkey FOREIGN KEY (package_id) REFERENCES public.donation_packages(package_id) ON DELETE CASCADE;


--
-- TOC entry 3941 (class 2606 OID 34451)
-- Name: donation_package_perks donation_package_perks_perk_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.donation_package_perks
    ADD CONSTRAINT donation_package_perks_perk_id_fkey FOREIGN KEY (perk_id) REFERENCES public.donation_perks(perk_id) ON DELETE CASCADE;


--
-- TOC entry 3942 (class 2606 OID 34470)
-- Name: donation_requests donation_requests_package_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.donation_requests
    ADD CONSTRAINT donation_requests_package_id_fkey FOREIGN KEY (package_id) REFERENCES public.donation_packages(package_id);


--
-- TOC entry 3939 (class 2606 OID 34748)
-- Name: user_refresh_tokens fk_refresh_token_device; Type: FK CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.user_refresh_tokens
    ADD CONSTRAINT fk_refresh_token_device FOREIGN KEY (device_id) REFERENCES public.user_devices(id) ON DELETE CASCADE;


--
-- TOC entry 3962 (class 2606 OID 56429)
-- Name: notification_admin_history notification_admin_history_actor_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.notification_admin_history
    ADD CONSTRAINT notification_admin_history_actor_user_id_fkey FOREIGN KEY (actor_user_id) REFERENCES public.users(user_id) ON DELETE SET NULL;


--
-- TOC entry 3960 (class 2606 OID 56404)
-- Name: notification_channel_stats notification_channel_stats_channel_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.notification_channel_stats
    ADD CONSTRAINT notification_channel_stats_channel_id_fkey FOREIGN KEY (channel_id) REFERENCES public.notification_channels(id) ON DELETE CASCADE;


--
-- TOC entry 3961 (class 2606 OID 56409)
-- Name: notification_channel_stats notification_channel_stats_group_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.notification_channel_stats
    ADD CONSTRAINT notification_channel_stats_group_id_fkey FOREIGN KEY (group_id) REFERENCES public.notification_groups(id) ON DELETE CASCADE;


--
-- TOC entry 3955 (class 2606 OID 56340)
-- Name: notification_default_role_settings notification_default_role_settings_channel_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.notification_default_role_settings
    ADD CONSTRAINT notification_default_role_settings_channel_id_fkey FOREIGN KEY (channel_id) REFERENCES public.notification_channels(id) ON DELETE CASCADE;


--
-- TOC entry 3956 (class 2606 OID 56335)
-- Name: notification_default_role_settings notification_default_role_settings_group_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.notification_default_role_settings
    ADD CONSTRAINT notification_default_role_settings_group_id_fkey FOREIGN KEY (group_id) REFERENCES public.notification_groups(id) ON DELETE CASCADE;


--
-- TOC entry 3952 (class 2606 OID 56301)
-- Name: notification_group_channels notification_group_channels_channel_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.notification_group_channels
    ADD CONSTRAINT notification_group_channels_channel_id_fkey FOREIGN KEY (channel_id) REFERENCES public.notification_channels(id) ON DELETE CASCADE;


--
-- TOC entry 3953 (class 2606 OID 56296)
-- Name: notification_group_channels notification_group_channels_group_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.notification_group_channels
    ADD CONSTRAINT notification_group_channels_group_id_fkey FOREIGN KEY (group_id) REFERENCES public.notification_groups(id) ON DELETE CASCADE;


--
-- TOC entry 3954 (class 2606 OID 56319)
-- Name: notification_templates notification_templates_group_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.notification_templates
    ADD CONSTRAINT notification_templates_group_id_fkey FOREIGN KEY (group_id) REFERENCES public.notification_groups(id) ON DELETE CASCADE;


--
-- TOC entry 3957 (class 2606 OID 56363)
-- Name: notification_user_settings notification_user_settings_channel_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.notification_user_settings
    ADD CONSTRAINT notification_user_settings_channel_id_fkey FOREIGN KEY (channel_id) REFERENCES public.notification_channels(id) ON DELETE CASCADE;


--
-- TOC entry 3958 (class 2606 OID 56358)
-- Name: notification_user_settings notification_user_settings_group_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.notification_user_settings
    ADD CONSTRAINT notification_user_settings_group_id_fkey FOREIGN KEY (group_id) REFERENCES public.notification_groups(id) ON DELETE CASCADE;


--
-- TOC entry 3963 (class 2606 OID 56455)
-- Name: notification_user_settings_history notification_user_settings_history_channel_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.notification_user_settings_history
    ADD CONSTRAINT notification_user_settings_history_channel_id_fkey FOREIGN KEY (channel_id) REFERENCES public.notification_channels(id) ON DELETE SET NULL;


--
-- TOC entry 3964 (class 2606 OID 56450)
-- Name: notification_user_settings_history notification_user_settings_history_group_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.notification_user_settings_history
    ADD CONSTRAINT notification_user_settings_history_group_id_fkey FOREIGN KEY (group_id) REFERENCES public.notification_groups(id) ON DELETE SET NULL;


--
-- TOC entry 3965 (class 2606 OID 56445)
-- Name: notification_user_settings_history notification_user_settings_history_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.notification_user_settings_history
    ADD CONSTRAINT notification_user_settings_history_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(user_id) ON DELETE CASCADE;


--
-- TOC entry 3959 (class 2606 OID 56383)
-- Name: notifications notifications_group_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.notifications
    ADD CONSTRAINT notifications_group_id_fkey FOREIGN KEY (group_id) REFERENCES public.notification_groups(id) ON DELETE SET NULL;


--
-- TOC entry 3950 (class 2606 OID 34735)
-- Name: password_change_history password_change_history_actor_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.password_change_history
    ADD CONSTRAINT password_change_history_actor_user_id_fkey FOREIGN KEY (actor_user_id) REFERENCES public.users(user_id) ON DELETE SET NULL;


--
-- TOC entry 3951 (class 2606 OID 34730)
-- Name: password_change_history password_change_history_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.password_change_history
    ADD CONSTRAINT password_change_history_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(user_id) ON DELETE CASCADE;


--
-- TOC entry 3949 (class 2606 OID 34701)
-- Name: user_devices user_devices_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.user_devices
    ADD CONSTRAINT user_devices_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(user_id) ON DELETE CASCADE;


--
-- TOC entry 4212 (class 0 OID 0)
-- Dependencies: 5
-- Name: SCHEMA public; Type: ACL; Schema: -; Owner: pg_database_owner
--

GRANT ALL ON SCHEMA public TO user_sys;


--
-- TOC entry 4213 (class 0 OID 0)
-- Dependencies: 313
-- Name: FUNCTION increment_notification_channel_stat(p_channel_id integer, p_group_id integer); Type: ACL; Schema: public; Owner: admin
--

GRANT ALL ON FUNCTION public.increment_notification_channel_stat(p_channel_id integer, p_group_id integer) TO user_sys;


--
-- TOC entry 4214 (class 0 OID 0)
-- Dependencies: 281
-- Name: TABLE action_telemetry; Type: ACL; Schema: public; Owner: admin
--

GRANT ALL ON TABLE public.action_telemetry TO user_sys;


--
-- TOC entry 4215 (class 0 OID 0)
-- Dependencies: 280
-- Name: SEQUENCE action_telemetry_id_seq; Type: ACL; Schema: public; Owner: admin
--

GRANT ALL ON SEQUENCE public.action_telemetry_id_seq TO user_sys;


--
-- TOC entry 4216 (class 0 OID 0)
-- Dependencies: 275
-- Name: TABLE admin_user_data; Type: ACL; Schema: public; Owner: admin
--

GRANT ALL ON TABLE public.admin_user_data TO user_sys;


--
-- TOC entry 4218 (class 0 OID 0)
-- Dependencies: 274
-- Name: SEQUENCE admin_user_data_id_seq; Type: ACL; Schema: public; Owner: admin
--

GRANT ALL ON SEQUENCE public.admin_user_data_id_seq TO user_sys;


--
-- TOC entry 4219 (class 0 OID 0)
-- Dependencies: 252
-- Name: TABLE antivirus_scans; Type: ACL; Schema: public; Owner: admin
--

GRANT ALL ON TABLE public.antivirus_scans TO user_sys;


--
-- TOC entry 4220 (class 0 OID 0)
-- Dependencies: 254
-- Name: TABLE critical_actions; Type: ACL; Schema: public; Owner: admin
--

GRANT ALL ON TABLE public.critical_actions TO user_sys;


--
-- TOC entry 4221 (class 0 OID 0)
-- Dependencies: 255
-- Name: TABLE critical_actions_history; Type: ACL; Schema: public; Owner: admin
--

GRANT ALL ON TABLE public.critical_actions_history TO user_sys;


--
-- TOC entry 4225 (class 0 OID 0)
-- Dependencies: 270
-- Name: TABLE donation_access_attempts; Type: ACL; Schema: public; Owner: admin
--

GRANT ALL ON TABLE public.donation_access_attempts TO user_sys;


--
-- TOC entry 4227 (class 0 OID 0)
-- Dependencies: 269
-- Name: SEQUENCE donation_access_attempts_attempt_id_seq; Type: ACL; Schema: public; Owner: admin
--

GRANT ALL ON SEQUENCE public.donation_access_attempts_attempt_id_seq TO user_sys;


--
-- TOC entry 4233 (class 0 OID 0)
-- Dependencies: 264
-- Name: TABLE donation_activations; Type: ACL; Schema: public; Owner: admin
--

GRANT ALL ON TABLE public.donation_activations TO user_sys;


--
-- TOC entry 4235 (class 0 OID 0)
-- Dependencies: 263
-- Name: SEQUENCE donation_activations_activation_id_seq; Type: ACL; Schema: public; Owner: admin
--

GRANT ALL ON SEQUENCE public.donation_activations_activation_id_seq TO user_sys;


--
-- TOC entry 4239 (class 0 OID 0)
-- Dependencies: 266
-- Name: TABLE donation_active_perks; Type: ACL; Schema: public; Owner: admin
--

GRANT ALL ON TABLE public.donation_active_perks TO user_sys;


--
-- TOC entry 4241 (class 0 OID 0)
-- Dependencies: 265
-- Name: SEQUENCE donation_active_perks_active_perk_id_seq; Type: ACL; Schema: public; Owner: admin
--

GRANT ALL ON SEQUENCE public.donation_active_perks_active_perk_id_seq TO user_sys;


--
-- TOC entry 4246 (class 0 OID 0)
-- Dependencies: 268
-- Name: TABLE donation_check_log; Type: ACL; Schema: public; Owner: admin
--

GRANT ALL ON TABLE public.donation_check_log TO user_sys;


--
-- TOC entry 4248 (class 0 OID 0)
-- Dependencies: 267
-- Name: SEQUENCE donation_check_log_log_id_seq; Type: ACL; Schema: public; Owner: admin
--

GRANT ALL ON SEQUENCE public.donation_check_log_log_id_seq TO user_sys;


--
-- TOC entry 4250 (class 0 OID 0)
-- Dependencies: 260
-- Name: TABLE donation_package_perks; Type: ACL; Schema: public; Owner: admin
--

GRANT ALL ON TABLE public.donation_package_perks TO user_sys;


--
-- TOC entry 4256 (class 0 OID 0)
-- Dependencies: 259
-- Name: TABLE donation_packages; Type: ACL; Schema: public; Owner: admin
--

GRANT ALL ON TABLE public.donation_packages TO user_sys;


--
-- TOC entry 4258 (class 0 OID 0)
-- Dependencies: 258
-- Name: SEQUENCE donation_packages_package_id_seq; Type: ACL; Schema: public; Owner: admin
--

GRANT ALL ON SEQUENCE public.donation_packages_package_id_seq TO user_sys;


--
-- TOC entry 4266 (class 0 OID 0)
-- Dependencies: 257
-- Name: TABLE donation_perks; Type: ACL; Schema: public; Owner: admin
--

GRANT ALL ON TABLE public.donation_perks TO user_sys;


--
-- TOC entry 4268 (class 0 OID 0)
-- Dependencies: 256
-- Name: SEQUENCE donation_perks_perk_id_seq; Type: ACL; Schema: public; Owner: admin
--

GRANT ALL ON SEQUENCE public.donation_perks_perk_id_seq TO user_sys;


--
-- TOC entry 4278 (class 0 OID 0)
-- Dependencies: 262
-- Name: TABLE donation_requests; Type: ACL; Schema: public; Owner: admin
--

GRANT ALL ON TABLE public.donation_requests TO user_sys;


--
-- TOC entry 4280 (class 0 OID 0)
-- Dependencies: 261
-- Name: SEQUENCE donation_requests_request_id_seq; Type: ACL; Schema: public; Owner: admin
--

GRANT ALL ON SEQUENCE public.donation_requests_request_id_seq TO user_sys;


--
-- TOC entry 4282 (class 0 OID 0)
-- Dependencies: 271
-- Name: TABLE donation_settings; Type: ACL; Schema: public; Owner: admin
--

GRANT ALL ON TABLE public.donation_settings TO user_sys;


--
-- TOC entry 4283 (class 0 OID 0)
-- Dependencies: 248
-- Name: TABLE file_settings; Type: ACL; Schema: public; Owner: admin
--

GRANT ALL ON TABLE public.file_settings TO user_sys;


--
-- TOC entry 4284 (class 0 OID 0)
-- Dependencies: 249
-- Name: SEQUENCE file_settings_id_seq; Type: ACL; Schema: public; Owner: admin
--

GRANT ALL ON SEQUENCE public.file_settings_id_seq TO user_sys;


--
-- TOC entry 4285 (class 0 OID 0)
-- Dependencies: 250
-- Name: TABLE files; Type: ACL; Schema: public; Owner: admin
--

GRANT ALL ON TABLE public.files TO user_sys;


--
-- TOC entry 4286 (class 0 OID 0)
-- Dependencies: 251
-- Name: TABLE files_single; Type: ACL; Schema: public; Owner: admin
--

GRANT ALL ON TABLE public.files_single TO user_sys;


--
-- TOC entry 4287 (class 0 OID 0)
-- Dependencies: 246
-- Name: TABLE incident_change_history; Type: ACL; Schema: public; Owner: admin
--

GRANT ALL ON TABLE public.incident_change_history TO user_sys;


--
-- TOC entry 4288 (class 0 OID 0)
-- Dependencies: 247
-- Name: TABLE incident_conditions_statuses; Type: ACL; Schema: public; Owner: admin
--

GRANT ALL ON TABLE public.incident_conditions_statuses TO user_sys;


--
-- TOC entry 4289 (class 0 OID 0)
-- Dependencies: 239
-- Name: TABLE incident_persone_connector; Type: ACL; Schema: public; Owner: admin
--

GRANT ALL ON TABLE public.incident_persone_connector TO user_sys;


--
-- TOC entry 4290 (class 0 OID 0)
-- Dependencies: 238
-- Name: TABLE incident_persones; Type: ACL; Schema: public; Owner: admin
--

GRANT ALL ON TABLE public.incident_persones TO user_sys;


--
-- TOC entry 4291 (class 0 OID 0)
-- Dependencies: 236
-- Name: TABLE incident_pvz; Type: ACL; Schema: public; Owner: admin
--

GRANT ALL ON TABLE public.incident_pvz TO user_sys;


--
-- TOC entry 4292 (class 0 OID 0)
-- Dependencies: 237
-- Name: TABLE incident_pvz_connector; Type: ACL; Schema: public; Owner: admin
--

GRANT ALL ON TABLE public.incident_pvz_connector TO user_sys;


--
-- TOC entry 4293 (class 0 OID 0)
-- Dependencies: 231
-- Name: TABLE incidents_data_dictionary; Type: ACL; Schema: public; Owner: admin
--

GRANT ALL ON TABLE public.incidents_data_dictionary TO user_sys;


--
-- TOC entry 4294 (class 0 OID 0)
-- Dependencies: 232
-- Name: SEQUENCE incidents_data_dictionary_element_id_seq; Type: ACL; Schema: public; Owner: admin
--

GRANT ALL ON SEQUENCE public.incidents_data_dictionary_element_id_seq TO user_sys;


--
-- TOC entry 4298 (class 0 OID 0)
-- Dependencies: 233
-- Name: TABLE incidents_main_info; Type: ACL; Schema: public; Owner: admin
--

GRANT ALL ON TABLE public.incidents_main_info TO user_sys;


--
-- TOC entry 4299 (class 0 OID 0)
-- Dependencies: 310
-- Name: TABLE notification_admin_history; Type: ACL; Schema: public; Owner: admin
--

GRANT ALL ON TABLE public.notification_admin_history TO user_sys;


--
-- TOC entry 4301 (class 0 OID 0)
-- Dependencies: 309
-- Name: SEQUENCE notification_admin_history_id_seq; Type: ACL; Schema: public; Owner: admin
--

GRANT ALL ON SEQUENCE public.notification_admin_history_id_seq TO user_sys;


--
-- TOC entry 4302 (class 0 OID 0)
-- Dependencies: 308
-- Name: TABLE notification_channel_stats; Type: ACL; Schema: public; Owner: admin
--

GRANT ALL ON TABLE public.notification_channel_stats TO user_sys;


--
-- TOC entry 4304 (class 0 OID 0)
-- Dependencies: 307
-- Name: SEQUENCE notification_channel_stats_id_seq; Type: ACL; Schema: public; Owner: admin
--

GRANT ALL ON SEQUENCE public.notification_channel_stats_id_seq TO user_sys;


--
-- TOC entry 4305 (class 0 OID 0)
-- Dependencies: 294
-- Name: TABLE notification_channels; Type: ACL; Schema: public; Owner: admin
--

GRANT ALL ON TABLE public.notification_channels TO user_sys;


--
-- TOC entry 4307 (class 0 OID 0)
-- Dependencies: 293
-- Name: SEQUENCE notification_channels_id_seq; Type: ACL; Schema: public; Owner: admin
--

GRANT ALL ON SEQUENCE public.notification_channels_id_seq TO user_sys;


--
-- TOC entry 4308 (class 0 OID 0)
-- Dependencies: 302
-- Name: TABLE notification_default_role_settings; Type: ACL; Schema: public; Owner: admin
--

GRANT ALL ON TABLE public.notification_default_role_settings TO user_sys;


--
-- TOC entry 4310 (class 0 OID 0)
-- Dependencies: 301
-- Name: SEQUENCE notification_default_role_settings_id_seq; Type: ACL; Schema: public; Owner: admin
--

GRANT ALL ON SEQUENCE public.notification_default_role_settings_id_seq TO user_sys;


--
-- TOC entry 4311 (class 0 OID 0)
-- Dependencies: 298
-- Name: TABLE notification_group_channels; Type: ACL; Schema: public; Owner: admin
--

GRANT ALL ON TABLE public.notification_group_channels TO user_sys;


--
-- TOC entry 4313 (class 0 OID 0)
-- Dependencies: 297
-- Name: SEQUENCE notification_group_channels_id_seq; Type: ACL; Schema: public; Owner: admin
--

GRANT ALL ON SEQUENCE public.notification_group_channels_id_seq TO user_sys;


--
-- TOC entry 4314 (class 0 OID 0)
-- Dependencies: 296
-- Name: TABLE notification_groups; Type: ACL; Schema: public; Owner: admin
--

GRANT ALL ON TABLE public.notification_groups TO user_sys;


--
-- TOC entry 4316 (class 0 OID 0)
-- Dependencies: 295
-- Name: SEQUENCE notification_groups_id_seq; Type: ACL; Schema: public; Owner: admin
--

GRANT ALL ON SEQUENCE public.notification_groups_id_seq TO user_sys;


--
-- TOC entry 4317 (class 0 OID 0)
-- Dependencies: 300
-- Name: TABLE notification_templates; Type: ACL; Schema: public; Owner: admin
--

GRANT ALL ON TABLE public.notification_templates TO user_sys;


--
-- TOC entry 4319 (class 0 OID 0)
-- Dependencies: 299
-- Name: SEQUENCE notification_templates_id_seq; Type: ACL; Schema: public; Owner: admin
--

GRANT ALL ON SEQUENCE public.notification_templates_id_seq TO user_sys;


--
-- TOC entry 4320 (class 0 OID 0)
-- Dependencies: 304
-- Name: TABLE notification_user_settings; Type: ACL; Schema: public; Owner: admin
--

GRANT ALL ON TABLE public.notification_user_settings TO user_sys;


--
-- TOC entry 4321 (class 0 OID 0)
-- Dependencies: 312
-- Name: TABLE notification_user_settings_history; Type: ACL; Schema: public; Owner: admin
--

GRANT ALL ON TABLE public.notification_user_settings_history TO user_sys;


--
-- TOC entry 4323 (class 0 OID 0)
-- Dependencies: 311
-- Name: SEQUENCE notification_user_settings_history_id_seq; Type: ACL; Schema: public; Owner: admin
--

GRANT ALL ON SEQUENCE public.notification_user_settings_history_id_seq TO user_sys;


--
-- TOC entry 4325 (class 0 OID 0)
-- Dependencies: 303
-- Name: SEQUENCE notification_user_settings_id_seq; Type: ACL; Schema: public; Owner: admin
--

GRANT ALL ON SEQUENCE public.notification_user_settings_id_seq TO user_sys;


--
-- TOC entry 4326 (class 0 OID 0)
-- Dependencies: 306
-- Name: TABLE notifications; Type: ACL; Schema: public; Owner: admin
--

GRANT ALL ON TABLE public.notifications TO user_sys;


--
-- TOC entry 4328 (class 0 OID 0)
-- Dependencies: 305
-- Name: SEQUENCE notifications_id_seq; Type: ACL; Schema: public; Owner: admin
--

GRANT ALL ON SEQUENCE public.notifications_id_seq TO user_sys;


--
-- TOC entry 4329 (class 0 OID 0)
-- Dependencies: 283
-- Name: TABLE password_change_history; Type: ACL; Schema: public; Owner: admin
--

GRANT ALL ON TABLE public.password_change_history TO user_sys;


--
-- TOC entry 4331 (class 0 OID 0)
-- Dependencies: 282
-- Name: SEQUENCE password_change_history_id_seq; Type: ACL; Schema: public; Owner: admin
--

GRANT ALL ON SEQUENCE public.password_change_history_id_seq TO user_sys;


--
-- TOC entry 4332 (class 0 OID 0)
-- Dependencies: 287
-- Name: TABLE permissions; Type: ACL; Schema: public; Owner: admin
--

GRANT ALL ON TABLE public.permissions TO user_sys;


--
-- TOC entry 4334 (class 0 OID 0)
-- Dependencies: 286
-- Name: SEQUENCE permissions_id_seq; Type: ACL; Schema: public; Owner: admin
--

GRANT ALL ON SEQUENCE public.permissions_id_seq TO user_sys;


--
-- TOC entry 4335 (class 0 OID 0)
-- Dependencies: 243
-- Name: TABLE persone_name_connector; Type: ACL; Schema: public; Owner: admin
--

GRANT ALL ON TABLE public.persone_name_connector TO user_sys;


--
-- TOC entry 4336 (class 0 OID 0)
-- Dependencies: 242
-- Name: TABLE persone_names; Type: ACL; Schema: public; Owner: admin
--

GRANT ALL ON TABLE public.persone_names TO user_sys;


--
-- TOC entry 4337 (class 0 OID 0)
-- Dependencies: 240
-- Name: TABLE persone_phone_connector; Type: ACL; Schema: public; Owner: admin
--

GRANT ALL ON TABLE public.persone_phone_connector TO user_sys;


--
-- TOC entry 4338 (class 0 OID 0)
-- Dependencies: 241
-- Name: TABLE persone_phones; Type: ACL; Schema: public; Owner: admin
--

GRANT ALL ON TABLE public.persone_phones TO user_sys;


--
-- TOC entry 4339 (class 0 OID 0)
-- Dependencies: 244
-- Name: TABLE persone_telegramm_accaunt_connector; Type: ACL; Schema: public; Owner: admin
--

GRANT ALL ON TABLE public.persone_telegramm_accaunt_connector TO user_sys;


--
-- TOC entry 4340 (class 0 OID 0)
-- Dependencies: 245
-- Name: TABLE persone_telegramm_accaunts; Type: ACL; Schema: public; Owner: admin
--

GRANT ALL ON TABLE public.persone_telegramm_accaunts TO user_sys;


--
-- TOC entry 4341 (class 0 OID 0)
-- Dependencies: 223
-- Name: TABLE policy; Type: ACL; Schema: public; Owner: admin
--

GRANT ALL ON TABLE public.policy TO user_sys;


--
-- TOC entry 4342 (class 0 OID 0)
-- Dependencies: 224
-- Name: TABLE policy_versions; Type: ACL; Schema: public; Owner: admin
--

GRANT ALL ON TABLE public.policy_versions TO user_sys;


--
-- TOC entry 4343 (class 0 OID 0)
-- Dependencies: 225
-- Name: SEQUENCE policy_versions_id_seq; Type: ACL; Schema: public; Owner: admin
--

GRANT ALL ON SEQUENCE public.policy_versions_id_seq TO user_sys;


--
-- TOC entry 4344 (class 0 OID 0)
-- Dependencies: 273
-- Name: TABLE rate_limits; Type: ACL; Schema: public; Owner: admin
--

GRANT ALL ON TABLE public.rate_limits TO user_sys;


--
-- TOC entry 4345 (class 0 OID 0)
-- Dependencies: 288
-- Name: TABLE role_permissions; Type: ACL; Schema: public; Owner: admin
--

GRANT ALL ON TABLE public.role_permissions TO user_sys;


--
-- TOC entry 4357 (class 0 OID 0)
-- Dependencies: 272
-- Name: TABLE search_history; Type: ACL; Schema: public; Owner: admin
--

GRANT ALL ON TABLE public.search_history TO user_sys;


--
-- TOC entry 4358 (class 0 OID 0)
-- Dependencies: 228
-- Name: TABLE settings; Type: ACL; Schema: public; Owner: admin
--

GRANT ALL ON TABLE public.settings TO user_sys;


--
-- TOC entry 4359 (class 0 OID 0)
-- Dependencies: 229
-- Name: TABLE settings_history; Type: ACL; Schema: public; Owner: admin
--

GRANT ALL ON TABLE public.settings_history TO user_sys;


--
-- TOC entry 4360 (class 0 OID 0)
-- Dependencies: 230
-- Name: SEQUENCE settings_history_id_seq; Type: ACL; Schema: public; Owner: admin
--

GRANT ALL ON SEQUENCE public.settings_history_id_seq TO user_sys;


--
-- TOC entry 4361 (class 0 OID 0)
-- Dependencies: 253
-- Name: TABLE stats_records; Type: ACL; Schema: public; Owner: admin
--

GRANT ALL ON TABLE public.stats_records TO user_sys;


--
-- TOC entry 4362 (class 0 OID 0)
-- Dependencies: 285
-- Name: TABLE system_scheduled_tasks; Type: ACL; Schema: public; Owner: admin
--

GRANT ALL ON TABLE public.system_scheduled_tasks TO user_sys;


--
-- TOC entry 4364 (class 0 OID 0)
-- Dependencies: 284
-- Name: SEQUENCE system_scheduled_tasks_id_seq; Type: ACL; Schema: public; Owner: admin
--

GRANT ALL ON SEQUENCE public.system_scheduled_tasks_id_seq TO user_sys;


--
-- TOC entry 4365 (class 0 OID 0)
-- Dependencies: 226
-- Name: TABLE system_versions; Type: ACL; Schema: public; Owner: admin
--

GRANT ALL ON TABLE public.system_versions TO user_sys;


--
-- TOC entry 4366 (class 0 OID 0)
-- Dependencies: 227
-- Name: SEQUENCE system_versions_version_id_seq; Type: ACL; Schema: public; Owner: admin
--

GRANT ALL ON SEQUENCE public.system_versions_version_id_seq TO user_sys;


--
-- TOC entry 4367 (class 0 OID 0)
-- Dependencies: 220
-- Name: TABLE user_auth_logins; Type: ACL; Schema: public; Owner: admin
--

GRANT ALL ON TABLE public.user_auth_logins TO user_sys;


--
-- TOC entry 4368 (class 0 OID 0)
-- Dependencies: 221
-- Name: SEQUENCE user_auth_logins_user_auth_login_id_seq; Type: ACL; Schema: public; Owner: admin
--

GRANT ALL ON SEQUENCE public.user_auth_logins_user_auth_login_id_seq TO user_sys;


--
-- TOC entry 4369 (class 0 OID 0)
-- Dependencies: 279
-- Name: TABLE user_devices; Type: ACL; Schema: public; Owner: admin
--

GRANT ALL ON TABLE public.user_devices TO user_sys;


--
-- TOC entry 4370 (class 0 OID 0)
-- Dependencies: 278
-- Name: SEQUENCE user_devices_id_seq; Type: ACL; Schema: public; Owner: admin
--

GRANT ALL ON SEQUENCE public.user_devices_id_seq TO user_sys;


--
-- TOC entry 4371 (class 0 OID 0)
-- Dependencies: 291
-- Name: TABLE user_permission_history; Type: ACL; Schema: public; Owner: admin
--

GRANT ALL ON TABLE public.user_permission_history TO user_sys;


--
-- TOC entry 4373 (class 0 OID 0)
-- Dependencies: 290
-- Name: SEQUENCE user_permission_history_id_seq; Type: ACL; Schema: public; Owner: admin
--

GRANT ALL ON SEQUENCE public.user_permission_history_id_seq TO user_sys;


--
-- TOC entry 4374 (class 0 OID 0)
-- Dependencies: 289
-- Name: TABLE user_permission_overrides; Type: ACL; Schema: public; Owner: admin
--

GRANT ALL ON TABLE public.user_permission_overrides TO user_sys;


--
-- TOC entry 4375 (class 0 OID 0)
-- Dependencies: 219
-- Name: TABLE user_refresh_tokens; Type: ACL; Schema: public; Owner: admin
--

GRANT ALL ON TABLE public.user_refresh_tokens TO user_sys;


--
-- TOC entry 4376 (class 0 OID 0)
-- Dependencies: 277
-- Name: TABLE user_role_history; Type: ACL; Schema: public; Owner: admin
--

GRANT ALL ON TABLE public.user_role_history TO user_sys;


--
-- TOC entry 4378 (class 0 OID 0)
-- Dependencies: 276
-- Name: SEQUENCE user_role_history_id_seq; Type: ACL; Schema: public; Owner: admin
--

GRANT ALL ON SEQUENCE public.user_role_history_id_seq TO user_sys;


--
-- TOC entry 4379 (class 0 OID 0)
-- Dependencies: 292
-- Name: TABLE user_security_settings; Type: ACL; Schema: public; Owner: admin
--

GRANT ALL ON TABLE public.user_security_settings TO user_sys;


--
-- TOC entry 4380 (class 0 OID 0)
-- Dependencies: 218
-- Name: TABLE user_statuses; Type: ACL; Schema: public; Owner: admin
--

GRANT ALL ON TABLE public.user_statuses TO user_sys;


--
-- TOC entry 4381 (class 0 OID 0)
-- Dependencies: 217
-- Name: TABLE users; Type: ACL; Schema: public; Owner: admin
--

GRANT ALL ON TABLE public.users TO user_sys;


--
-- TOC entry 4382 (class 0 OID 0)
-- Dependencies: 234
-- Name: TABLE users_emails; Type: ACL; Schema: public; Owner: admin
--

GRANT ALL ON TABLE public.users_emails TO user_sys;


--
-- TOC entry 4383 (class 0 OID 0)
-- Dependencies: 235
-- Name: TABLE users_tgs; Type: ACL; Schema: public; Owner: admin
--

GRANT ALL ON TABLE public.users_tgs TO user_sys;


--
-- TOC entry 4384 (class 0 OID 0)
-- Dependencies: 222
-- Name: SEQUENCE users_user_id_seq; Type: ACL; Schema: public; Owner: admin
--

GRANT ALL ON SEQUENCE public.users_user_id_seq TO user_sys;


-- Completed on 2026-09-12 16:43:29 UTC

--
-- PostgreSQL database dump complete
--

\unrestrict hCOal4agfRNePfLPPxxTkU6eHSSXMsiBcacRicI9maQ8RjRJ38T0u2vLQHi5eUU

