export const API_BASE = "/api"

async function handleResponse(res: Response): Promise<never> {
  let message = "Unknown error"

  try {
    const body = await res.json()
    message = body.error || body.message || JSON.stringify(body)
  } catch {
    message = res.statusText || message
  }

  throw new Error(message)
}

export async function apiGet<T>(path: string, headers?: Record<string, string>): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    cache: "no-store",
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      ...(headers || {}),
    },
  })
  if (!res.ok) return handleResponse(res)
  return res.json()
}

export async function apiPatch<T>(path: string, data: any): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    method: "PATCH",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  })
  if (!res.ok) return handleResponse(res)
  return res.json()
}

export async function apiPost<T>(path: string, data: any): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  })
  if (!res.ok) return handleResponse(res)
  return res.json()
}

export async function apiPut<T>(path: string, data: any): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    method: "PUT",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  })
  if (!res.ok) return handleResponse(res)
  return res.json()
}

export async function apiDelete<T>(path: string): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    method: "DELETE",
    credentials: "include",
  })
  if (!res.ok) return handleResponse(res)
  return res.json()
}
