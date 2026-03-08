const host = window.location.hostname;
const origin = window.location.origin;

// URL real do backend no Easypanel
const PROD_API_URL = "https://agente-idiomas2-backend.gtalg3.easypanel.host";

let API_BASE;

// Ambiente local
if (host === "localhost" || host === "127.0.0.1") {
    API_BASE = "http://127.0.0.1:8000";
}
// Produção com subdomínios app/api
else if (host.startsWith("app.")) {
    API_BASE = origin.replace("://app.", "://api.");
}
// Produção / fallback
else {
    API_BASE = PROD_API_URL;
}

console.warn(`[AGENTE IDIOMAS] API_BASE: ${API_BASE}`);

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
