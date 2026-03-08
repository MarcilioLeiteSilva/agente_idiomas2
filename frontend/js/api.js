// detect environment
const isLocal = window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1";
const API_BASE = isLocal ? "http://127.0.0.1:8000" : window.location.origin;
// If using the Nginx proxy from docker-compose, both are on the same origin (port 8080 or domain)
// So window.location.origin works well for production.

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
