const host = window.location.hostname;
const isLocal = host === "localhost" || host === "127.0.0.1";

// URL verificada do Backend no Easypanel
const PROD_API_URL = "https://agente-idiomas2-backend.gtalg3.easypanel.host";

let API_BASE = isLocal ? "http://127.0.0.1:8000" : PROD_API_URL;

// Lógica de fallback para subdomínios (troca 'frontend' por 'backend' no host)
if (!isLocal && host.includes("-frontend.")) {
    API_BASE = window.location.origin.replace("-frontend.", "-backend.");
}

console.info(`[AGENTE IDIOMAS] API_BASE vinculada: ${API_BASE}`);

export async function apiCall(endpoint, method = "GET", body = null) {
    const token = localStorage.getItem("access_token");
    const headers = {};
    if (token) {
        headers["Authorization"] = `Bearer ${token}`;
    }

    if (!(body instanceof FormData)) {
        headers["Content-Type"] = "application/json; charset=utf-8";
    }

    const config = { method, headers };
    if (body) {
        config.body = body instanceof FormData ? body : JSON.stringify(body);
    }

    const url = `${API_BASE}${endpoint}`;
    console.debug(`[API Call] ${method} ${url}`, { headers, body });

    try {
        const res = await fetch(url, config);
        console.debug(`[API Response] ${res.status} ${res.statusText}`);

        if (!res.ok) {
            const text = await res.text();
            let errorMsg = `API Error ${res.status}: ${text}`;
            try {
                const json = JSON.parse(text);
                if (json.detail) errorMsg = json.detail;
            } catch (e) { }
            throw new Error(errorMsg);
        }

        const contentType = res.headers.get("content-type") || "";
        if (contentType.includes("application/json")) {
            return await res.json();
        }

        return await res.text();
    } catch (err) {
        console.error(`[API Exception] ${method} ${url}:`, err);
        // Se falhar o fetch, pode ser CORS ou rede.
        if (err.message === "Failed to fetch") {
            throw new Error(`Erro de conexão: Verifique se o backend está online em ${API_BASE}`);
        }
        throw err;
    }
}
