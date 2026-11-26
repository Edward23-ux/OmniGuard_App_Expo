import "@supabase/functions-js/edge-runtime.d.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"
import { callGeminiWithFallback } from "../_shared/geminiClient.ts"

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
}

const schema = {
  type: "object",
  properties: {
    esDniPeruano: { type: "boolean" },
    tipoCaptura: {
      type: "string",
      enum: [
        "foto_documento_fisico",
        "impresion_papel",
        "foto_pantalla",
        "escaneo_digital_app",
        "imagen_editada_o_generada",
        "desconocido",
      ],
    },
    nivelConfianza: { type: "string", enum: ["alto", "medio", "bajo"] },
    puntuacionConfianza: { type: "number", description: "0 a 100" },
    dniExtraido: {
      type: "string",
      description: "El número de DNI de 8 dígitos detectado en el documento (solo los dígitos). Si no se detecta o no se lee claramente, dejar vacío."
    },
    indicadoresFisico: {
      type: "object",
      properties: {
        texturaLaminadoPlastico: { type: "boolean" },
        reflejosConsistentesConSuperficieCurvaORigida: { type: "boolean" },
        bordesDeTarjetaVisibles: { type: "boolean" },
        elementoHolograficoVisible: { type: "boolean" },
        fondoOContextoRealVisibleAlrededorDelDocumento: { type: "boolean" },
      },
      required: [
        "texturaLaminadoPlastico",
        "reflejosConsistentesConSuperficieCurvaORigida",
        "bordesDeTarjetaVisibles",
        "elementoHolograficoVisible",
        "fondoOContextoRealVisibleAlrededorDelDocumento"
      ]
    },
    indicadoresPantalla: {
      type: "object",
      properties: {
        patronMoire: { type: "boolean" },
        brilloUniformeTipoBacklight: { type: "boolean" },
        biselOMarcoDePantalla: { type: "boolean" },
        rejillaDePixeladoRegular: { type: "boolean" },
      },
      required: [
        "patronMoire",
        "brilloUniformeTipoBacklight",
        "biselOMarcoDePantalla",
        "rejillaDePixeladoRegular"
      ]
    },
    indicadoresImpresion: {
      type: "object",
      properties: {
        tramaDeSemitonos: { type: "boolean" },
        texturaDePapel: { type: "boolean" },
        coloresPlanosSinMicroVariacion: { type: "boolean" },
      },
      required: [
        "tramaDeSemitonos",
        "texturaDePapel",
        "coloresPlanosSinMicroVariacion"
      ]
    },
    indicadoresEscaneoOProcesamiento: {
      type: "object",
      properties: {
        marcaDeAguaOTextoDeAppDeEscaneo: { type: "boolean" },
        imagenCompuestaConVariasCarasOTomas: { type: "boolean" },
        recortePerfectamenteRectangularSinFondo: { type: "boolean" },
        iluminacionPlanaTipicaDeAppDeEscaneo: { type: "boolean" },
      },
      required: [
        "marcaDeAguaOTextoDeAppDeEscaneo",
        "imagenCompuestaConVariasCarasOTomas",
        "recortePerfectamenteRectangularSinFondo",
        "iluminacionPlanaTipicaDeAppDeEscaneo"
      ]
    },
    calidadImagen: {
      type: "object",
      properties: {
        iluminacionAdecuada: { type: "boolean" },
        imagenNitidaSinBorrosidad: { type: "boolean" },
        sinSombrasQueCubranTexto: { type: "boolean" },
        sinReflejosQueSaturenTexto: { type: "boolean" },
        contrasteTextoFondoSuficiente: { type: "boolean" },
      },
      required: [
        "iluminacionAdecuada",
        "imagenNitidaSinBorrosidad",
        "sinSombrasQueCubranTexto",
        "sinReflejosQueSaturenTexto",
        "contrasteTextoFondoSuficiente"
      ]
    },
    validacionLegibilidad: {
      type: "object",
      properties: {
        camposCriticosLegibles: { type: "boolean" },
        camposIlegibles: {
          type: "array",
          items: { type: "string" },
        },
      },
      required: [
        "camposCriticosLegibles",
        "camposIlegibles"
      ]
    },
    observaciones: {
      type: "array",
      items: { type: "string" },
    },
  },
  required: [
    "esDniPeruano",
    "tipoCaptura",
    "nivelConfianza",
    "puntuacionConfianza",
    "dniExtraido",
    "indicadoresFisico",
    "indicadoresPantalla",
    "indicadoresImpresion",
    "indicadoresEscaneoOProcesamiento",
    "calidadImagen",
    "validacionLegibilidad",
    "observaciones",
  ],
}

const PROMPT = `
Actúa como un sistema forense de validación documental especializado en DNI peruanos (RENIEC).

Tu tarea principal es evaluar evidencia VISUAL/ÓPTICA de cómo fue capturada la imagen, la calidad de la toma, si los campos son legibles, y extraer únicamente el número de DNI de 8 dígitos visible.

Evalúa estas categorías:

A. Señales de documento físico capturado EN VIVO con cámara:
   - Textura de laminado plástico, reflejos no uniformes, bordes con perspectiva,
     elemento holográfico variable, fondo/contexto real visible alrededor.

B. Señales de foto tomada a una pantalla:
   - Patrón moiré, brillo tipo backlight, bisel/marco de pantalla, rejilla de píxeles.

C. Señales de impresión en papel:
   - Trama de semitonos, textura de papel, colores planos sin micro-variación.

D. Señales de escaneo o digitalización con app (CamScanner, Adobe Scan, etc.):
   - Marca de agua de app de escaneo, imagen COMPUESTA de varias tomas/caras juntas,
     recorte perfectamente rectangular sin fondo, iluminación plana de app de escaneo.

E. Señales de imagen editada o generada digitalmente:
   - Halos de recorte, iluminación inconsistente, tipografía distinta al layout oficial.

F. Calidad de la TOMA (iluminación, nitidez, sombras, reflejos) — SÉ ESTRICTO aquí,
   esto es independiente de si el documento es físico real:
   - ¿La imagen está oscura o subexpuesta? Marca "iluminacionAdecuada" en false si
     tuviste que esforzarte para distinguir el documento del fondo por falta de luz.
   - ¿Hay desenfoque por movimiento o falta de foco?
   - ¿Hay sombras (de la mano, el celular, o el entorno) que tapen parcial o
     totalmente algún campo de texto?
   - ¿Hay reflejos de luz directa que "queman" y vuelven ilegible alguna zona?
   - ¿El contraste entre el texto y el fondo es suficiente para leer con comodidad,
     sin tener que adivinar caracteres?

G. Legibilidad de campos críticos — SÉ ESTRICTO, no asumas ni "rellenes" lo que
   no se lee con total claridad:
   - Apellidos, prenombres, número de DNI/CUI, fecha de nacimiento, fecha de
     emisión, fecha de caducidad.
   - Si para leer un campo necesitas adivinar por baja luz, sombra parcial, brillo
     bajo, desenfoque o reflejo, márcalo como NO legible en "camposIlegibles" con
     su nombre genérico (ej. "fecha de nacimiento"), aunque creas reconocer el valor.
   - Esto es distinto de la censura intencional (pixelado uniforme tipo mosaico
     aplicado por el usuario): igual cuéntala como campo no legible, pero no la
     trates como señal de manipulación.

H. Extracción de DNI:
   - Identifica y extrae el número de DNI de 8 dígitos visible en el documento y colócalo en el campo "dniExtraido". Si no es legible o no se detecta, deja el campo vacío.

Reglas importantes:
- A excepción del número de DNI de 8 dígitos en "dniExtraido", no repitas en tu respuesta ningún dato personal legible (nombres, fechas, direcciones, MRZ). Limítate a evidencia óptica/estructural y nombres genéricos de campo.
- No inventes información que no sea visible.

Responde únicamente conforme al esquema de salida solicitado.
`

function generarMensajesCalidad(d: any): string[] {
  const mensajes: string[] = []
  const calidad = d.calidadImagen || {}

  if (calidad.iluminacionAdecuada === false) {
    mensajes.push("La foto está oscura. Si vuelves a tomarla, acércate a una fuente de luz.")
  }
  if (calidad.imagenNitidaSinBorrosidad === false) {
    mensajes.push("La imagen tiene algo de desenfoque. Mantén el celular firme y espera a que enfoque.")
  }
  if (calidad.sinSombrasQueCubranTexto === false) {
    mensajes.push("Hay sombras sobre el documento. Ilumínalo de manera más uniforme.")
  }
  if (calidad.sinReflejosQueSaturenTexto === false) {
    mensajes.push("Hay reflejos de luz sobre el documento. Inclínalo ligeramente para evitar el brillo directo.")
  }
  if (calidad.contrasteTextoFondoSuficiente === false) {
    mensajes.push("El contraste entre el texto y el documento es bajo.")
  }

  return mensajes
}

function evaluarResultadoFinal(d: any, coincideDni: boolean, dniExtraido: string, dniEsperado: string) {
  const motivos: string[] = []

  if (!d.esDniPeruano) {
    motivos.push("No se identifica como DNI peruano.")
  }

  if (d.tipoCaptura !== "foto_documento_fisico") {
    let tipo = d.tipoCaptura
    if (tipo === "foto_pantalla") tipo = "Foto de una pantalla"
    else if (tipo === "impresion_papel") tipo = "Impresión en papel"
    else if (tipo === "escaneo_digital_app") tipo = "Escaneo o procesamiento de app"
    else if (tipo === "imagen_editada_o_generada") tipo = "Imagen editada o generada digitalmente"
    else tipo = "No es una foto en vivo"
    motivos.push(`Tipo de captura no permitido: ${tipo} (se requiere foto del documento físico real).`)
  }

  const pantalla = d.indicadoresPantalla || {}
  if (Object.values(pantalla).some(Boolean)) {
    motivos.push("Se detectaron señales de foto tomada a una pantalla.")
  }

  const impresion = d.indicadoresImpresion || {}
  if (Object.values(impresion).some(Boolean)) {
    motivos.push("Se detectaron señales de impresión en papel.")
  }

  const escaneo = d.indicadoresEscaneoOProcesamiento || {}
  if (Object.values(escaneo).some(Boolean)) {
    motivos.push("Se detectaron señales de escaneo o digitalización por aplicación.")
  }

  const fisico = d.indicadoresFisico || {}
  if (fisico.fondoOContextoRealVisibleAlrededorDelDocumento === false) {
    motivos.push("Por seguridad, debes mostrar el fondo o contexto real alrededor del documento.")
  }

  const legibilidad = d.validacionLegibilidad || {}
  if (legibilidad.camposCriticosLegibles === false) {
    const campos = (legibilidad.camposIlegibles || []).join(", ") || "campos críticos"
    motivos.push(`Campos ilegibles o borrosos: ${campos}.`)
  }

  if (d.nivelConfianza === "bajo") {
    motivos.push("El nivel de confianza del análisis es bajo.")
  }

  if (!dniExtraido) {
    motivos.push("No se pudo leer el número de DNI.")
  } else if (!coincideDni) {
    motivos.push(`El número de DNI detectado (${dniExtraido}) no coincide con el DNI registrado (${dniEsperado}).`)
  }

  const mensajesCalidad = generarMensajesCalidad(d)
  const aprobado = motivos.length === 0

  let sugerencias: string[] = []
  if (!aprobado) {
    sugerencias = [...motivos, ...mensajesCalidad]
    if (sugerencias.length === 0) {
      sugerencias.push("Vuelve a tomar la foto del documento asegurando buena iluminación y nitidez.")
    }
  }

  return {
    aprobado,
    motivos,
    sugerenciasParaUsuario: sugerencias,
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders })
  }

  try {
    const { imagenBase64, dniEsperado } = await req.json()

    if (!imagenBase64 || !dniEsperado) {
      return new Response(
        JSON.stringify({ error: "Faltan datos: imagenBase64 y dniEsperado" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      )
    }

    const apiKey = Deno.env.get("GEMINI_API_KEY")
    if (!apiKey) {
      console.error("GEMINI_API_KEY no está configurada en los secrets de Supabase")
      return new Response(
        JSON.stringify({ error: "Configuración del servidor incompleta" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      )
    }

    const imageSizeKB = Math.round((imagenBase64.length * 3) / 4 / 1024)
    console.log(`Tamaño imagen recibida: ${imageSizeKB} KB`)

    if (imagenBase64.length > 5_500_000) {
      return new Response(
        JSON.stringify({ valido: false, motivo: "La imagen es demasiado pesada. Acerca más el DNI." }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      )
    }

    const geminiResult = await callGeminiWithFallback({
      apiKey,
      prompt: PROMPT,
      imagenBase64,
      mimeType: "image/jpeg",
      responseSchema: schema,
      temperature: 0.0,
      thinkingLevel: Deno.env.get("THINKING_LEVEL") || "low",
      preferredModel: Deno.env.get("GEMINI_MODEL"),
      timeoutMs: 20_000,
      logPrefix: "[VALIDAR-DNI-IA]",
    })

    if (!geminiResult.ok) {
      return new Response(
        JSON.stringify({
          valido: false,
          motivo: `Error de Gemini (${geminiResult.status}): ${geminiResult.errorDetail}`,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      )
    }

    const data = geminiResult.data
    console.log(
      `[VALIDAR-DNI-IA] Respuesta recibida con modelo ${geminiResult.modelUsed} en ${geminiResult.elapsedMs}ms.`
    )

    if (data.candidates?.length === 0 || data.candidates?.[0]?.finishReason === "SAFETY") {
      console.error("Gemini bloqueó la respuesta por filtros de seguridad:", JSON.stringify(data))
      return new Response(
        JSON.stringify({ valido: false, motivo: "No se pudo analizar la imagen. Intenta con mejor iluminación." }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      )
    }

    const respuestaIA = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim() ?? ""
    let parsed: any
    try {
      parsed = JSON.parse(respuestaIA)
    } catch (e) {
      console.error("La respuesta no fue JSON válido. Salida cruda:", respuestaIA)
      return new Response(
        JSON.stringify({ valido: false, motivo: "Error al procesar el análisis de la imagen. Intenta de nuevo." }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      )
    }

    const dniExtraido = (parsed.dniExtraido || "").trim()
    const coincideDni = dniExtraido === dniEsperado

    const resultadoFinal = evaluarResultadoFinal(parsed, coincideDni, dniExtraido, dniEsperado)

    if (resultadoFinal.aprobado) {
      const supabaseUrl = Deno.env.get("SUPABASE_URL")!
      const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
      const supabase = createClient(supabaseUrl, supabaseKey)

      const { error: updateError } = await supabase
        .from("usuarios")
        .update({ verificado: true })
        .eq("dni", dniEsperado)

      if (updateError) {
        console.error("Error al actualizar Supabase:", updateError)
      } else {
        console.log("Usuario verificado exitosamente en Supabase")
      }
    }

    return new Response(
      JSON.stringify({
        valido: resultadoFinal.aprobado,
        motivo: resultadoFinal.aprobado
          ? ""
          : resultadoFinal.sugerenciasParaUsuario.join("\n"),
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    )

  } catch (error) {
    console.error("Error general:", error.message)
    return new Response(
      JSON.stringify({ error: "Error interno", detalle: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    )
  }
})