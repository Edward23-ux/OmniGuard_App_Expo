/**
 * Cliente compartido de Gemini con fallback automático entre modelos Flash Lite
 * de alta cuota (500 RPD / 15 RPM).
 *
 * Reutilizable desde cualquier Edge Function (ej. validar-dni-ia, analizar-evidencia-ia).
 */

export interface GeminiRequestOptions {
  apiKey: string
  prompt: string
  imagenBase64?: string
  mimeType?: string
  responseSchema: Record<string, unknown>
  temperature?: number
  thinkingLevel?: string
  preferredModel?: string
  timeoutMs?: number
  logPrefix?: string
}

export interface GeminiCallSuccess {
  ok: true
  data: any
  modelUsed: string
  elapsedMs: number
}

export interface GeminiCallFailure {
  ok: false
  status: number
  errorDetail: string
  lastModelTried: string
}

export type GeminiCallResult = GeminiCallSuccess | GeminiCallFailure

const SAFETY_SETTINGS = [
  { category: "HARM_CATEGORY_HARASSMENT", threshold: "BLOCK_NONE" },
  { category: "HARM_CATEGORY_HATE_SPEECH", threshold: "BLOCK_NONE" },
  { category: "HARM_CATEGORY_SEXUALLY_EXPLICIT", threshold: "BLOCK_NONE" },
  { category: "HARM_CATEGORY_DANGEROUS_CONTENT", threshold: "BLOCK_NONE" },
]

/**
 * Devuelve la lista ordenada de modelos Flash Lite de alta cuota a intentar.
 * Si falla el primero (cuota, timeout, 5xx, etc.), se intenta automáticamente el siguiente.
 */
export function getModelsToTry(preferredModel?: string): string[] {
  const normalized = (preferredModel || Deno.env.get("GEMINI_MODEL") || "")
    .trim()
    .toLowerCase()

  const targetModel = normalized.includes("3.5")
    ? "gemini-3.5-flash-lite"
    : "gemini-3.1-flash-lite"

  return [
    targetModel,
    targetModel === "gemini-3.1-flash-lite"
      ? "gemini-3.5-flash-lite"
      : "gemini-3.1-flash-lite",
  ]
}

export async function callGeminiWithFallback(
  options: GeminiRequestOptions
): Promise<GeminiCallResult> {
  const {
    apiKey,
    prompt,
    imagenBase64,
    mimeType = "image/jpeg",
    responseSchema,
    temperature = 0.0,
    thinkingLevel = Deno.env.get("THINKING_LEVEL") || "low",
    preferredModel,
    timeoutMs = 20_000,
    logPrefix = "[GEMINI]",
  } = options

  const modelsToTry = getModelsToTry(preferredModel)
  console.log(`${logPrefix} Modelos a intentar (con fallback): ${modelsToTry.join(" -> ")}`)

  const parts: Array<Record<string, unknown>> = [{ text: prompt }]
  if (imagenBase64) {
    parts.push({
      inline_data: {
        mime_type: mimeType,
        data: imagenBase64,
      },
    })
  }

  let lastStatus = 500
  let lastErrorDetail = "No se pudo obtener respuesta de ningún modelo de Gemini."
  let lastModelTried = modelsToTry[0]

  for (const currentModel of modelsToTry) {
    lastModelTried = currentModel

    const generationConfig: Record<string, unknown> = {
      temperature,
      responseMimeType: "application/json",
      responseSchema,
    }

    if (currentModel.startsWith("gemini-3")) {
      generationConfig.thinkingConfig = {
        thinkingLevel: thinkingLevel.toUpperCase(),
      }
    }

    const payload = {
      contents: [{ parts }],
      safetySettings: SAFETY_SETTINGS,
      generationConfig,
    }

    const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${currentModel}:generateContent?key=${apiKey}`
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), timeoutMs)
    const startTime = Date.now()

    try {
      console.log(`${logPrefix} Enviando petición a modelo: ${currentModel}...`)

      const response = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
        signal: controller.signal,
      })

      const elapsedMs = Date.now() - startTime
      console.log(
        `${logPrefix} Respuesta de ${currentModel} en ${elapsedMs}ms. HTTP: ${response.status}`
      )

      if (!response.ok) {
        const errorText = await response.text()
        console.error(
          `${logPrefix} Error HTTP (${response.status}) en ${currentModel}:`,
          errorText.substring(0, 300)
        )

        lastStatus = response.status
        try {
          const errorJson = JSON.parse(errorText)
          lastErrorDetail = errorJson.error?.message || errorText.substring(0, 200)
        } catch {
          lastErrorDetail = errorText.substring(0, 200)
        }

        // Intenta con el siguiente modelo de fallback
        continue
      }

      const data = await response.json()
      return {
        ok: true,
        data,
        modelUsed: currentModel,
        elapsedMs,
      }
    } catch (err: any) {
      const elapsedMs = Date.now() - startTime
      const isTimeout = err?.name === "AbortError"
      lastStatus = isTimeout ? 504 : 502
      lastErrorDetail = isTimeout
        ? `Tiempo de espera agotado (${timeoutMs}ms) en ${currentModel}`
        : err?.message || "Error de red al consultar Gemini"

      console.error(
        `${logPrefix} Excepción en ${currentModel} (${elapsedMs}ms): ${lastErrorDetail}`
      )
      // Intenta con el siguiente modelo de fallback
      continue
    } finally {
      clearTimeout(timer)
    }
  }

  return {
    ok: false,
    status: lastStatus,
    errorDetail: lastErrorDetail,
    lastModelTried,
  }
}
