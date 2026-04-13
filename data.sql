SET session_replication_role = replica;

--
-- PostgreSQL database dump
--

-- \restrict 1b3hkqIa8SDlJ5pz1f55sU9FDzu4OqDmZgAxaIFcWjwsEcGp8zoYoTpgrYQLBnk

-- Dumped from database version 17.6
-- Dumped by pg_dump version 17.6

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
-- Data for Name: audit_log_entries; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--

INSERT INTO "auth"."audit_log_entries" ("instance_id", "id", "payload", "created_at", "ip_address") VALUES
	('00000000-0000-0000-0000-000000000000', 'cb70088c-8aa6-4802-a584-c99463b4a696', '{"action":"login","actor_id":"00000000-0000-0000-0000-000000000001","actor_username":"admin@empresa.com","actor_via_sso":false,"log_type":"account","traits":{"provider":"email"}}', '2026-03-02 00:30:58.728466+00', ''),
	('00000000-0000-0000-0000-000000000000', '84f6f942-4b47-4f36-a6a4-34f681e3fa12', '{"action":"token_refreshed","actor_id":"00000000-0000-0000-0000-000000000001","actor_username":"admin@empresa.com","actor_via_sso":false,"log_type":"token"}', '2026-03-02 01:30:13.852593+00', ''),
	('00000000-0000-0000-0000-000000000000', '975b31c2-7c96-4ffa-a99e-f37d987c5bc5', '{"action":"token_revoked","actor_id":"00000000-0000-0000-0000-000000000001","actor_username":"admin@empresa.com","actor_via_sso":false,"log_type":"token"}', '2026-03-02 01:30:13.854082+00', '');


--
-- Data for Name: custom_oauth_providers; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--



--
-- Data for Name: flow_state; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--



--
-- Data for Name: users; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--

INSERT INTO "auth"."users" ("instance_id", "id", "aud", "role", "email", "encrypted_password", "email_confirmed_at", "invited_at", "confirmation_token", "confirmation_sent_at", "recovery_token", "recovery_sent_at", "email_change_token_new", "email_change", "email_change_sent_at", "last_sign_in_at", "raw_app_meta_data", "raw_user_meta_data", "is_super_admin", "created_at", "updated_at", "phone", "phone_confirmed_at", "phone_change", "phone_change_token", "phone_change_sent_at", "email_change_token_current", "email_change_confirm_status", "banned_until", "reauthentication_token", "reauthentication_sent_at", "is_sso_user", "deleted_at", "is_anonymous") VALUES
	('00000000-0000-0000-0000-000000000000', '00000000-0000-0000-0000-000000000001', 'authenticated', 'authenticated', 'admin@empresa.com', '$2a$06$dGy.oUEVoKzTLxUyXUNmw.zxwtw7cCp.9fsz4PW1Y.D.419tv2dG.', '2026-03-02 00:30:37.191811+00', NULL, '', NULL, '', '2026-03-02 00:30:37.191811+00', '', '', NULL, '2026-03-02 00:30:58.729905+00', '{"provider": "email", "providers": ["email"]}', '{"name": "Administrador Teste"}', NULL, '2026-03-02 00:30:37.191811+00', '2026-03-02 01:30:13.859124+00', NULL, NULL, '', '', NULL, '', 0, NULL, '', NULL, false, NULL, false);


--
-- Data for Name: identities; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--



--
-- Data for Name: instances; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--



--
-- Data for Name: oauth_clients; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--



--
-- Data for Name: sessions; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--

INSERT INTO "auth"."sessions" ("id", "user_id", "created_at", "updated_at", "factor_id", "aal", "not_after", "refreshed_at", "user_agent", "ip", "tag", "oauth_client_id", "refresh_token_hmac_key", "refresh_token_counter", "scopes") VALUES
	('db6e5682-9159-4d56-a641-59ca9ac0e391', '00000000-0000-0000-0000-000000000001', '2026-03-02 00:30:58.729953+00', '2026-03-02 01:30:13.862167+00', NULL, 'aal1', NULL, '2026-03-02 01:30:13.862098', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36 Edg/145.0.0.0', '172.18.0.1', NULL, NULL, NULL, NULL, NULL);


--
-- Data for Name: mfa_amr_claims; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--

INSERT INTO "auth"."mfa_amr_claims" ("session_id", "created_at", "updated_at", "authentication_method", "id") VALUES
	('db6e5682-9159-4d56-a641-59ca9ac0e391', '2026-03-02 00:30:58.733048+00', '2026-03-02 00:30:58.733048+00', 'password', '58c4133e-7e54-40b4-a009-186920313713');


--
-- Data for Name: mfa_factors; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--



--
-- Data for Name: mfa_challenges; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--



--
-- Data for Name: oauth_authorizations; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--



--
-- Data for Name: oauth_client_states; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--



--
-- Data for Name: oauth_consents; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--



--
-- Data for Name: one_time_tokens; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--



--
-- Data for Name: refresh_tokens; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--

INSERT INTO "auth"."refresh_tokens" ("instance_id", "id", "token", "user_id", "revoked", "created_at", "updated_at", "parent", "session_id") VALUES
	('00000000-0000-0000-0000-000000000000', 1, '3nlsq2z77xuc', '00000000-0000-0000-0000-000000000001', true, '2026-03-02 00:30:58.731565+00', '2026-03-02 01:30:13.854636+00', NULL, 'db6e5682-9159-4d56-a641-59ca9ac0e391'),
	('00000000-0000-0000-0000-000000000000', 2, '6hjqek2himjn', '00000000-0000-0000-0000-000000000001', false, '2026-03-02 01:30:13.857155+00', '2026-03-02 01:30:13.857155+00', '3nlsq2z77xuc', 'db6e5682-9159-4d56-a641-59ca9ac0e391');


--
-- Data for Name: sso_providers; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--



--
-- Data for Name: saml_providers; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--



--
-- Data for Name: saml_relay_states; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--



--
-- Data for Name: sso_domains; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--



--
-- Data for Name: users; Type: TABLE DATA; Schema: public; Owner: postgres
--

INSERT INTO "public"."users" ("id", "name", "email", "role", "created_at") VALUES
	('00000000-0000-0000-0000-000000000001', 'Administrador Teste', 'admin@empresa.com', 'SUPER_ADMIN', '2026-03-02 00:30:37.191811+00');


--
-- Data for Name: campaigns; Type: TABLE DATA; Schema: public; Owner: postgres
--

INSERT INTO "public"."campaigns" ("id", "name", "platforms", "google_campaign_id", "meta_campaign_id", "google_start_date", "meta_start_date", "created_by", "created_at") VALUES
	('c0000000-0000-0000-0000-000000000001', 'Campanha Verão 2026 - Lançamento', '{GOOGLE_ADS,META_ADS}', 'g-123456789', 'm-987654321', '2026-01-01', '2026-01-01', '00000000-0000-0000-0000-000000000001', '2026-03-02 00:30:37.191811+00'),
	('0324fb00-63aa-447f-9579-0739c2ae5865', 'teste', '{GOOGLE_ADS}', 'dfqweqwe', NULL, '2026-03-11', NULL, NULL, '2026-03-02 01:39:42.748296+00');


--
-- Data for Name: logs; Type: TABLE DATA; Schema: public; Owner: postgres
--

INSERT INTO "public"."logs" ("id", "user_id", "action", "metadata", "created_at") VALUES
	('23310347-7533-4215-ac9e-defb8551768c', '00000000-0000-0000-0000-000000000001', 'CREATE_CAMPAIGN', '{"campaign_name": "Campanha Verão 2026 - Lançamento"}', '2026-03-02 00:30:37.191811+00'),
	('aa12c5e8-e8aa-4ee2-8d01-f7db2f0fe02a', NULL, 'CREATE_CAMPAIGN', '{"campaign_name": "teste"}', '2026-03-02 00:31:11.045701+00'),
	('42a1492f-45cd-49ce-906e-2d1774223ba2', NULL, 'CREATE_CAMPAIGN', '{"campaign_name": "teste2"}', '2026-03-02 01:32:52.56671+00'),
	('d4a038bb-c6dd-4b2d-b05c-d741f110005d', NULL, 'DELETE_CAMPAIGN', '{"campaign_id": "fd7c9114-d96e-489f-8767-673ad974a3d3", "campaign_name": "teste2"}', '2026-03-02 01:39:25.75339+00'),
	('81625dd4-a09e-4be6-8ab2-9de1b35bf4f3', NULL, 'DELETE_CAMPAIGN', '{"campaign_id": "951980e7-27b2-4ec3-b238-94965f01eccd", "campaign_name": "teste"}', '2026-03-02 01:39:29.127987+00'),
	('ee45f42a-4279-4717-9610-7e3a884265ca', NULL, 'CREATE_CAMPAIGN', '{"campaign_name": "teste"}', '2026-03-02 01:39:42.755913+00'),
	('2d570509-1bca-449e-b082-f4cfadb8b817', NULL, 'UPDATE_CAMPAIGN', '{"campaign_id": "0324fb00-63aa-447f-9579-0739c2ae5865", "campaign_name": "teste"}', '2026-03-02 01:42:18.812966+00'),
	('e1a6a066-c70e-48e2-b25b-cb0f894f1a06', NULL, 'UPDATE_CAMPAIGN', '{"campaign_id": "0324fb00-63aa-447f-9579-0739c2ae5865", "campaign_name": "teste"}', '2026-03-02 01:43:32.663456+00'),
	('dbbe29a1-373e-4c64-b7ef-f3a6f2d6cb38', NULL, 'UPDATE_CAMPAIGN', '{"campaign_id": "0324fb00-63aa-447f-9579-0739c2ae5865", "campaign_name": "teste"}', '2026-03-02 01:46:30.614196+00'),
	('9b89d8b8-45d4-4e09-9ab3-9947149ba00d', NULL, 'UPDATE_CAMPAIGN', '{"campaign_id": "0324fb00-63aa-447f-9579-0739c2ae5865", "campaign_name": "teste"}', '2026-03-02 01:48:53.142557+00'),
	('da0fc09b-30e5-49f2-8daf-781a2c8d049b', NULL, 'UPDATE_CAMPAIGN', '{"campaign_id": "0324fb00-63aa-447f-9579-0739c2ae5865", "campaign_name": "teste"}', '2026-03-02 01:49:05.476263+00'),
	('d4c75945-009e-4d1d-bdb8-0271b0f04876', NULL, 'UPDATE_CAMPAIGN', '{"campaign_id": "0324fb00-63aa-447f-9579-0739c2ae5865", "campaign_name": "teste"}', '2026-03-02 01:52:52.785752+00'),
	('507255b0-c5a4-470e-98aa-28e42ab326d0', NULL, 'UPDATE_CAMPAIGN', '{"campaign_id": "0324fb00-63aa-447f-9579-0739c2ae5865", "campaign_name": "teste"}', '2026-03-02 01:53:07.935245+00'),
	('a390e4cf-395c-4ed2-970e-dbed1529cdb4', NULL, 'UPDATE_CAMPAIGN', '{"campaign_id": "0324fb00-63aa-447f-9579-0739c2ae5865", "campaign_name": "teste"}', '2026-03-02 02:04:28.013403+00');


--
-- Data for Name: buckets; Type: TABLE DATA; Schema: storage; Owner: supabase_storage_admin
--



--
-- Data for Name: buckets_analytics; Type: TABLE DATA; Schema: storage; Owner: supabase_storage_admin
--



--
-- Data for Name: buckets_vectors; Type: TABLE DATA; Schema: storage; Owner: supabase_storage_admin
--



--
-- Data for Name: iceberg_namespaces; Type: TABLE DATA; Schema: storage; Owner: supabase_storage_admin
--



--
-- Data for Name: iceberg_tables; Type: TABLE DATA; Schema: storage; Owner: supabase_storage_admin
--



--
-- Data for Name: objects; Type: TABLE DATA; Schema: storage; Owner: supabase_storage_admin
--



--
-- Data for Name: s3_multipart_uploads; Type: TABLE DATA; Schema: storage; Owner: supabase_storage_admin
--



--
-- Data for Name: s3_multipart_uploads_parts; Type: TABLE DATA; Schema: storage; Owner: supabase_storage_admin
--



--
-- Data for Name: vector_indexes; Type: TABLE DATA; Schema: storage; Owner: supabase_storage_admin
--



--
-- Data for Name: hooks; Type: TABLE DATA; Schema: supabase_functions; Owner: supabase_functions_admin
--



--
-- Name: refresh_tokens_id_seq; Type: SEQUENCE SET; Schema: auth; Owner: supabase_auth_admin
--

SELECT pg_catalog.setval('"auth"."refresh_tokens_id_seq"', 2, true);


--
-- Name: hooks_id_seq; Type: SEQUENCE SET; Schema: supabase_functions; Owner: supabase_functions_admin
--

SELECT pg_catalog.setval('"supabase_functions"."hooks_id_seq"', 1, false);


--
-- PostgreSQL database dump complete
--

-- \unrestrict 1b3hkqIa8SDlJ5pz1f55sU9FDzu4OqDmZgAxaIFcWjwsEcGp8zoYoTpgrYQLBnk

RESET ALL;
