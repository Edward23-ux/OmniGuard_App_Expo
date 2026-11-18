


SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;


CREATE SCHEMA IF NOT EXISTS "public";


ALTER SCHEMA "public" OWNER TO "pg_database_owner";


COMMENT ON SCHEMA "public" IS 'standard public schema';



CREATE OR REPLACE FUNCTION "public"."asignar_compania_mas_cercana"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
DECLARE
    v_compania_id UUID;
BEGIN
    NEW.estado = LOWER(REPLACE(TRIM(COALESCE(NEW.estado, 'pendiente')), ' ', '_'));

    IF NEW.compania_asignada_id IS NULL AND NEW.latitud IS NOT NULL AND NEW.longitud IS NOT NULL THEN
        SELECT id INTO v_compania_id
        FROM companias_bomberos
        WHERE activa = TRUE
        ORDER BY (
            6371 * acos(
                LEAST(1.0, GREATEST(-1.0,
                    cos(radians(NEW.latitud)) * cos(radians(latitud)) *
                    cos(radians(longitud) - radians(NEW.longitud)) +
                    sin(radians(NEW.latitud)) * sin(radians(latitud))
                ))
            )
        ) ASC
        LIMIT 1;

        IF v_compania_id IS NOT NULL THEN
            NEW.compania_asignada_id = v_compania_id;
        END IF;
    END IF;

    -- Al asignar una unidad desde la Central Web, pasa automáticamente a 'asignado'
    IF NEW.unidad_asignada_id IS NOT NULL AND NEW.estado = 'pendiente' THEN
        NEW.estado = 'asignado';
    END IF;

    RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."asignar_compania_mas_cercana"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_todas_ubicaciones"() RETURNS TABLE("id" "uuid", "ubicacion_texto" "text")
    LANGUAGE "sql"
    AS $$
  SELECT id, 'POINT(' || longitud::TEXT || ' ' || latitud::TEXT || ')' AS ubicacion_texto
  FROM emergencias;
$$;


ALTER FUNCTION "public"."get_todas_ubicaciones"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."liberar_unidad_al_cerrar_emergencia"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
    IF NEW.estado IN ('culminado', 'falsa_alarma')
       AND (OLD.estado IS DISTINCT FROM NEW.estado)
       AND NEW.unidad_asignada_id IS NOT NULL THEN
        UPDATE unidades_bomberos
        SET estado = 'disponible'
        WHERE id = NEW.unidad_asignada_id;
    END IF;
    RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."liberar_unidad_al_cerrar_emergencia"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."normalizar_estado_emergencia"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
    NEW.estado = LOWER(REPLACE(TRIM(NEW.estado), ' ', '_'));
    RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."normalizar_estado_emergencia"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."set_actualizado_en"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
    NEW.actualizado_en = NOW();
    RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."set_actualizado_en"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."sincronizar_contadores_compania"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
DECLARE
    v_compania_id UUID;
BEGIN
    v_compania_id := COALESCE(NEW.compania_id, OLD.compania_id);

    UPDATE companias_bomberos
    SET unidades_totales = (
            SELECT COUNT(*) FROM unidades_bomberos
            WHERE compania_id = v_compania_id AND activa = TRUE
        ),
        unidades_disponibles = (
            SELECT COUNT(*) FROM unidades_bomberos
            WHERE compania_id = v_compania_id AND activa = TRUE AND estado = 'disponible'
        )
    WHERE id = v_compania_id;

    RETURN COALESCE(NEW, OLD);
END;
$$;


ALTER FUNCTION "public"."sincronizar_contadores_compania"() OWNER TO "postgres";

SET default_tablespace = '';

SET default_table_access_method = "heap";


CREATE TABLE IF NOT EXISTS "public"."companias_bomberos" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "nombre" "text" NOT NULL,
    "direccion" "text",
    "telefono" "text",
    "latitud" double precision NOT NULL,
    "longitud" double precision NOT NULL,
    "activa" boolean DEFAULT true NOT NULL,
    "unidades_disponibles" integer DEFAULT 3 NOT NULL,
    "unidades_totales" integer DEFAULT 3 NOT NULL,
    "creado_en" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."companias_bomberos" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."emergencias" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "usuario_id" "uuid",
    "compania_asignada_id" "uuid",
    "unidad_asignada_id" "uuid",
    "bombero_cierre_id" "uuid",
    "tipo" "text" NOT NULL,
    "descripcion" "text",
    "latitud" double precision NOT NULL,
    "longitud" double precision NOT NULL,
    "direccion_aproximada" "text",
    "estado" "text" DEFAULT 'pendiente'::"text" NOT NULL,
    "foto_url" "text",
    "foto_cierre_url" "text",
    "informe_bombero" "text",
    "nivel_confianza_ia" numeric(5,2),
    "etiqueta_ia" "text" DEFAULT 'pendiente_ia'::"text",
    "resumen_ia_cierre" "text",
    "testigos" integer DEFAULT 1 NOT NULL,
    "creado_en" timestamp with time zone DEFAULT "now"() NOT NULL,
    "actualizado_en" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."emergencias" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."testigos_emergencia" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "emergencia_id" "uuid" NOT NULL,
    "usuario_id" "uuid" NOT NULL,
    "foto_adicional_url" "text",
    "creado_en" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."testigos_emergencia" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."unidades_bomberos" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "compania_id" "uuid" NOT NULL,
    "codigo_unidad" "text" NOT NULL,
    "tipo_unidad" "text" NOT NULL,
    "estado" "text" DEFAULT 'disponible'::"text" NOT NULL,
    "activa" boolean DEFAULT true NOT NULL,
    "creado_en" timestamp with time zone DEFAULT "now"() NOT NULL,
    "capacidad_maxima" integer DEFAULT 4 NOT NULL,
    CONSTRAINT "unidades_bomberos_capacidad_maxima_check" CHECK ((("capacidad_maxima" >= 1) AND ("capacidad_maxima" <= 12)))
);


ALTER TABLE "public"."unidades_bomberos" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."usuarios" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "dni" character varying(8) NOT NULL,
    "nombres" "text",
    "apellidos" "text",
    "fecha_nacimiento" "date",
    "foto_dni_url" "text",
    "verificado" boolean DEFAULT true NOT NULL,
    "creado_en" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."usuarios" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."usuarios_dashboard" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "email" "text" NOT NULL,
    "placa_servicio" "text",
    "password_hash" "text" NOT NULL,
    "nombre" "text" NOT NULL,
    "rol" "text" DEFAULT 'bombero'::"text" NOT NULL,
    "compania_id" "uuid",
    "unidad_asignada_id" "uuid",
    "activo" boolean DEFAULT true NOT NULL,
    "creado_en" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."usuarios_dashboard" OWNER TO "postgres";


ALTER TABLE ONLY "public"."companias_bomberos"
    ADD CONSTRAINT "companias_bomberos_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."emergencias"
    ADD CONSTRAINT "emergencias_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."testigos_emergencia"
    ADD CONSTRAINT "testigos_emergencia_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."unidades_bomberos"
    ADD CONSTRAINT "unidades_bomberos_codigo_unidad_key" UNIQUE ("codigo_unidad");



ALTER TABLE ONLY "public"."unidades_bomberos"
    ADD CONSTRAINT "unidades_bomberos_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."testigos_emergencia"
    ADD CONSTRAINT "uq_testigo_por_emergencia" UNIQUE ("emergencia_id", "usuario_id");



ALTER TABLE ONLY "public"."usuarios_dashboard"
    ADD CONSTRAINT "usuarios_dashboard_email_key" UNIQUE ("email");



ALTER TABLE ONLY "public"."usuarios_dashboard"
    ADD CONSTRAINT "usuarios_dashboard_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."usuarios_dashboard"
    ADD CONSTRAINT "usuarios_dashboard_placa_servicio_key" UNIQUE ("placa_servicio");



ALTER TABLE ONLY "public"."usuarios"
    ADD CONSTRAINT "usuarios_dni_key" UNIQUE ("dni");



ALTER TABLE ONLY "public"."usuarios"
    ADD CONSTRAINT "usuarios_pkey" PRIMARY KEY ("id");



CREATE INDEX "idx_emergencias_coords" ON "public"."emergencias" USING "btree" ("latitud", "longitud");



CREATE INDEX "idx_emergencias_estado" ON "public"."emergencias" USING "btree" ("estado");



CREATE INDEX "idx_emergencias_unidad" ON "public"."emergencias" USING "btree" ("unidad_asignada_id");



CREATE OR REPLACE TRIGGER "trg_asignar_compania_emergencia" BEFORE INSERT OR UPDATE ON "public"."emergencias" FOR EACH ROW EXECUTE FUNCTION "public"."asignar_compania_mas_cercana"();



CREATE OR REPLACE TRIGGER "trg_emergencias_actualizado_en" BEFORE UPDATE ON "public"."emergencias" FOR EACH ROW EXECUTE FUNCTION "public"."set_actualizado_en"();



CREATE OR REPLACE TRIGGER "trg_liberar_unidad_emergencia" AFTER UPDATE OF "estado" ON "public"."emergencias" FOR EACH ROW EXECUTE FUNCTION "public"."liberar_unidad_al_cerrar_emergencia"();



CREATE OR REPLACE TRIGGER "trg_sincronizar_contadores_unidades" AFTER INSERT OR DELETE OR UPDATE OF "estado", "activa" ON "public"."unidades_bomberos" FOR EACH ROW EXECUTE FUNCTION "public"."sincronizar_contadores_compania"();



ALTER TABLE ONLY "public"."emergencias"
    ADD CONSTRAINT "emergencias_bombero_cierre_id_fkey" FOREIGN KEY ("bombero_cierre_id") REFERENCES "public"."usuarios_dashboard"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."emergencias"
    ADD CONSTRAINT "emergencias_compania_asignada_id_fkey" FOREIGN KEY ("compania_asignada_id") REFERENCES "public"."companias_bomberos"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."emergencias"
    ADD CONSTRAINT "emergencias_unidad_asignada_id_fkey" FOREIGN KEY ("unidad_asignada_id") REFERENCES "public"."unidades_bomberos"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."emergencias"
    ADD CONSTRAINT "emergencias_usuario_id_fkey" FOREIGN KEY ("usuario_id") REFERENCES "public"."usuarios"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."testigos_emergencia"
    ADD CONSTRAINT "testigos_emergencia_emergencia_id_fkey" FOREIGN KEY ("emergencia_id") REFERENCES "public"."emergencias"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."testigos_emergencia"
    ADD CONSTRAINT "testigos_emergencia_usuario_id_fkey" FOREIGN KEY ("usuario_id") REFERENCES "public"."usuarios"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."unidades_bomberos"
    ADD CONSTRAINT "unidades_bomberos_compania_id_fkey" FOREIGN KEY ("compania_id") REFERENCES "public"."companias_bomberos"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."usuarios_dashboard"
    ADD CONSTRAINT "usuarios_dashboard_compania_id_fkey" FOREIGN KEY ("compania_id") REFERENCES "public"."companias_bomberos"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."usuarios_dashboard"
    ADD CONSTRAINT "usuarios_dashboard_unidad_asignada_id_fkey" FOREIGN KEY ("unidad_asignada_id") REFERENCES "public"."unidades_bomberos"("id") ON DELETE SET NULL;



GRANT USAGE ON SCHEMA "public" TO "postgres";
GRANT USAGE ON SCHEMA "public" TO "anon";
GRANT USAGE ON SCHEMA "public" TO "authenticated";
GRANT USAGE ON SCHEMA "public" TO "service_role";



GRANT ALL ON FUNCTION "public"."asignar_compania_mas_cercana"() TO "anon";
GRANT ALL ON FUNCTION "public"."asignar_compania_mas_cercana"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."asignar_compania_mas_cercana"() TO "service_role";



GRANT ALL ON FUNCTION "public"."get_todas_ubicaciones"() TO "anon";
GRANT ALL ON FUNCTION "public"."get_todas_ubicaciones"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_todas_ubicaciones"() TO "service_role";



GRANT ALL ON FUNCTION "public"."liberar_unidad_al_cerrar_emergencia"() TO "anon";
GRANT ALL ON FUNCTION "public"."liberar_unidad_al_cerrar_emergencia"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."liberar_unidad_al_cerrar_emergencia"() TO "service_role";



GRANT ALL ON FUNCTION "public"."normalizar_estado_emergencia"() TO "anon";
GRANT ALL ON FUNCTION "public"."normalizar_estado_emergencia"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."normalizar_estado_emergencia"() TO "service_role";



GRANT ALL ON FUNCTION "public"."set_actualizado_en"() TO "anon";
GRANT ALL ON FUNCTION "public"."set_actualizado_en"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."set_actualizado_en"() TO "service_role";



GRANT ALL ON FUNCTION "public"."sincronizar_contadores_compania"() TO "anon";
GRANT ALL ON FUNCTION "public"."sincronizar_contadores_compania"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."sincronizar_contadores_compania"() TO "service_role";



GRANT ALL ON TABLE "public"."companias_bomberos" TO "anon";
GRANT ALL ON TABLE "public"."companias_bomberos" TO "authenticated";
GRANT ALL ON TABLE "public"."companias_bomberos" TO "service_role";



GRANT ALL ON TABLE "public"."emergencias" TO "anon";
GRANT ALL ON TABLE "public"."emergencias" TO "authenticated";
GRANT ALL ON TABLE "public"."emergencias" TO "service_role";



GRANT ALL ON TABLE "public"."testigos_emergencia" TO "anon";
GRANT ALL ON TABLE "public"."testigos_emergencia" TO "authenticated";
GRANT ALL ON TABLE "public"."testigos_emergencia" TO "service_role";



GRANT ALL ON TABLE "public"."unidades_bomberos" TO "anon";
GRANT ALL ON TABLE "public"."unidades_bomberos" TO "authenticated";
GRANT ALL ON TABLE "public"."unidades_bomberos" TO "service_role";



GRANT ALL ON TABLE "public"."usuarios" TO "anon";
GRANT ALL ON TABLE "public"."usuarios" TO "authenticated";
GRANT ALL ON TABLE "public"."usuarios" TO "service_role";



GRANT ALL ON TABLE "public"."usuarios_dashboard" TO "anon";
GRANT ALL ON TABLE "public"."usuarios_dashboard" TO "authenticated";
GRANT ALL ON TABLE "public"."usuarios_dashboard" TO "service_role";



ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "service_role";







