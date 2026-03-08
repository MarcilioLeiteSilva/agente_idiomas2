// detect environment
const host = window.location.hostname;
const isLocal = host === "localhost" || host === "127.0.0.1";

// Special handling for Easypanel subdomains
let API_BASE = isLocal ? "http://127.0.0.1:8000" : window.location.origin;

if (host.includes("app.agente-idiomas2-backend")) {
    API_BASE = "https://api.agente-idiomas2-backend." + host.split("app.agente-idiomas2-backend.")[1];
} else if (!isLocal) {
    // If we're on a generic subdomain, try to see if we should use 'api' instead of 'app'
    API_BASE = window.location.origin.replace("://app.", "://api.");
}

export async function apiCall(endpoint, method = "GET", body = null) {
    const headers = { "Content-Type": "application/json; charset=utf-8" };
    const config = { method, headers };

    if (body) {
        if (body instanceof FormData) {
            delete headers["Content-Type"]; // Let browser set boundary
            config.body = body;
        } else {
            config.body = JSON.stringify(body);
        }
    }

    try {
        const res = await fetch(`${API_BASE}${endpoint}`, config);
        if (!res.ok) {
            const text = await res.text();
            throw new Error(`API Error ${res.status}: ${text}`);
        }
        return await res.json();
    } catch (err) {
        console.error(`API Call Failed [${endpoint}]:`, err);
        throw err;
    }
}
