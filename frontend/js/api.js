// detect environment
const host = window.location.hostname;
const isLocal = host === "localhost" || host === "127.0.0.1";

let API_BASE = isLocal ? "http://127.0.0.1:8000" : window.location.origin;

if (!isLocal) {
    // If the hostname starts with 'app.', swap it for 'api.'
    if (host.startsWith("app.")) {
        API_BASE = window.location.origin.replace("://app.", "://api.");
    }
}

console.log(`[API_BASE DETECTED]: ${API_BASE}`);

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
