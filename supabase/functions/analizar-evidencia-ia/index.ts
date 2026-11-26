import "@supabase/functions-js/edge-runtime.d.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"
import { decodeBase64 } from "https://deno.land/std@0.224.0/encoding/base64.ts"
import { callGeminiWithFallback } from "../_shared/geminiClient.ts"

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
}

const schema = {
  type: "object",
  properties: {
    descripcionGenerada: {
      type: "string",
      description:
        "Descripción objetiva y concisa en español de lo que se visualiza en la imagen, sin inventar datos.",
    },
    nivelConfianzaIA: {
      type: "number",
      description:
        "Nivel de confianza de 0 a 100 de que la imagen muestra una situación de emergencia real o relevante.",
    },
    tipoEmergenciaDetectado: {
      type: "string",
      description:
        "Tipo de emergencia detectado si aplica (Incendio, Accidente Vehicular, Fuga de Gas, Rescate, Derrumbe, Inundación, Explosión, Otro o Ninguno).",
    },
  },
  required: ["descripcionGenerada", "nivelConfianzaIA"],
}

const PROMPT = `Analiza la siguiente imagen capturada como evidencia de una emergencia reportada en OmniGuard.
Tu tarea es:
1. Describir de manera objetiva y concisa en español lo que se visualiza en la imagen (por ejemplo: "Incendio en vivienda con humo negro denso saliendo del segundo piso", "Choque frontal entre dos vehículos en una avenida", etc.). Si la imagen no muestra una emergencia, describe brevemente lo que realmente se ve. No inventes información que no esté en la foto.
2. Estimar el nivel de confianza (0 a 100) de que esta imagen realmente muestra una situación de emergencia real o relevante. Asigna valores menores a 30 si es una imagen cotidiana sin emergencia, borrosa/oscura sin contenido claro, o irrelevante.
3. Clasificar el tipo de emergencia si es posible (Incendio, Accidente Vehicular, Fuga de Gas, Rescate, Derrumbe, Inundación, Explosión, Otro o Ninguno).

Responde únicamente conforme al esquema JSON solicitado.`

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders })
  }

  try {
    const body = await req.json()
    const rawBase64 = String(body?.imagenBase64 || "")
      .replace(/^data:[^;]+;base64,/, "")
      .trim()
    const emergenciaId = body?.emergenciaId ? String(body.emergenciaId).trim() : null

    if (!rawBase64) {
      return new Response(
        JSON.stringify({ exito: false, error: "Falta imagenBase64" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      )
    }

    const apiKey = Deno.env.get("GEMINI_API_KEY")
    if (!apiKey) {
      console.error("[ANALIZAR-EVIDENCIA-IA] GEMINI_API_KEY no configurada")
      return new Response(
        JSON.stringify({ exito: false, error: "Configuración del servidor incompleta" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      )
    }

    const imageSizeKB = Math.round((rawBase64.length * 3) / 4 / 1024)
    console.log(`[ANALIZAR-EVIDENCIA-IA] Tamaño imagen recibida: ${imageSizeKB} KB`)

    if (rawBase64.length > 5_500_000) {
      return new Response(
        JSON.stringify({
          exito: false,
          motivo:
            "La imagen es demasiado pesada. Toma una foto con menor resolución o aléjate un poco.",
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      )
    }

    // 1. Analizar evidencia con Gemini usando cliente compartido con fallback automático
    const geminiResult = await callGeminiWithFallback({
      apiKey,
      prompt: PROMPT,
      imagenBase64: rawBase64,
      mimeType: "image/jpeg",
      responseSchema: schema,
      temperature: 0.0,
      timeoutMs: 25_000,
      logPrefix: "[ANALIZAR-EVIDENCIA-IA]",
    })

    if (!geminiResult.ok) {
      return new Response(
        JSON.stringify({
          exito: false,
          motivo: `Error de análisis IA (${geminiResult.status}): ${geminiResult.errorDetail}`,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      )
    }

    const data = geminiResult.data
    if (data.candidates?.length === 0 || data.candidates?.[0]?.finishReason === "SAFETY") {
      console.error("[ANALIZAR-EVIDENCIA-IA] Respuesta bloqueada por filtros de seguridad")
      return new Response(
        JSON.stringify({
          exito: false,
          motivo: "Análisis cancelado por filtros de seguridad. Intenta con otra toma.",
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      )
    }

    const respuestaIA = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim() ?? ""
    let parsed: any
    try {
      parsed = JSON.parse(respuestaIA)
    } catch {
      console.error("[ANALIZAR-EVIDENCIA-IA] Respuesta no JSON:", respuestaIA)
      return new Response(
        JSON.stringify({
          exito: false,
          motivo: "Error al interpretar el análisis de la IA. Intenta de nuevo.",
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      )
    }

    const descripcionGenerada =
      String(parsed.descripcionGenerada || "").trim() || "Evidencia analizada"
    const nivelConfianzaIA = Math.max(
      0,
      Math.min(100, Number(parsed.nivelConfianzaIA ?? 85))
    )
    const tipoEmergenciaDetectado = String(parsed.tipoEmergenciaDetectado || "").trim()

    let etiquetaIa = "revision_manual"
    if (nivelConfianzaIA >= 80) etiquetaIa = "aprobado"
    else if (nivelConfianzaIA < 30) etiquetaIa = "rechazado"

    let fotoUrl: string | null = null

    // 2. Si se envió emergenciaId (flujo post-creación), subir foto y actualizar registro
    if (emergenciaId) {
      const supabaseUrl = Deno.env.get("SUPABASE_URL")!
      const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
      const supabase = createClient(supabaseUrl, supabaseKey)

      const imageBytes = decodeBase64(rawBase64)
      const randomSuffix = Math.floor(Math.random() * 1_000_000)
      const filename = `iniciales/evidence_${Date.now()}_${randomSuffix}.jpg`

      const { error: uploadError } = await supabase.storage
        .from("evidencias-emergencias")
        .upload(filename, imageBytes, {
          contentType: "image/jpeg",
          upsert: false,
        })

      if (uploadError) {
        console.error("[ANALIZAR-EVIDENCIA-IA] Error al subir a Storage:", uploadError)
        return new Response(
          JSON.stringify({
            exito: false,
            motivo: `Error al subir la imagen: ${uploadError.message}`,
          }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        )
      }

      const { data: urlData } = supabase.storage
        .from("evidencias-emergencias")
        .getPublicUrl(filename)
      fotoUrl = urlData.publicUrl

      const { error: updateError } = await supabase
        .from("emergencias")
        .update({
          foto_url: fotoUrl,
          descripcion: descripcionGenerada,
          nivel_confianza_ia: nivelConfianzaIA,
          etiqueta_ia: etiquetaIa,
        })
        .eq("id", emergenciaId)

      if (updateError) {
        console.error("[ANALIZAR-EVIDENCIA-IA] Error al actualizar emergencias:", updateError)
        return new Response(
          JSON.stringify({
            exito: false,
            motivo: `Error al actualizar el registro: ${updateError.message}`,
          }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        )
      }
    }

    return new Response(
      JSON.stringify({
        exito: true,
        motivo: "",
        foto_url: fotoUrl,
        descripcion: descripcionGenerada,
        nivel_confianza_ia: nivelConfianzaIA,
        etiqueta_ia: etiquetaIa,
        tipo_emergencia_detectado: tipoEmergenciaDetectado,
        modelo_usado: geminiResult.modelUsed,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    )
  } catch (error: any) {
    console.error("[ANALIZAR-EVIDENCIA-IA] Error general:", error?.message)
    return new Response(
      JSON.stringify({ exito: false, error: "Error interno", detalle: error?.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    )
  }
})
