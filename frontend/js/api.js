const host = window.location.hostname;
const isLocal = host === "localhost" || host === "127.0.0.1";

// URL verificada do Backend no Easypanel
const PROD_API_URL = "https://agente-idiomas2-backend.gtalg3.easypanel.host";

let API_BASE = isLocal ? "http://127.0.0.1:8000" : PROD_API_URL;

// Lógica de fallback para subdomínios (troca 'frontend' por 'backend' no host)
if (!isLocal && host.includes("-frontend.")) {
    API_BASE = window.location.origin.replace("-frontend.", "-backend.");
}

console.warn(`[AGENTE IDIOMAS] API_BASE vinculada: ${API_BASE}`);

export async function apiCall(endpoint, method = "GET", body = null) {
    const headers = {};
    const config = { method, headers };

    if (!(body instanceof FormData)) {
        headers["Content-Type"] = "application/json; charset=utf-8";
    }

    if (body) {
        config.body = body instanceof FormData ? body : JSON.stringify(body);
    }

    try {
        const res = await fetch(`${API_BASE}${endpoint}`, config);

        if (!res.ok) {
            const text = await res.text();
            throw new Error(`API Error ${res.status}: ${text}`);
        }

        const contentType = res.headers.get("content-type") || "";
        if (contentType.includes("application/json")) {
            return await res.json();
        }

        return await res.text();
    } catch (err) {
        console.error(`API Call Failed [${endpoint}]:`, err);
        throw err;
    }
}
