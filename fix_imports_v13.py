import os

backend_root = "c:/Users/Win11_001/Desktop/agente_idiomas2/backend"

packages = [
    "core",
    "services",
    "services/ai",
    "services/chat",
    "services/learning",
    "services/memory",
    "services/review",
    "services/recommendations",
    "services/gamification",
    "services/audio",
    "services/translation",
    "repositories",
    "db",
    "learning",
    "models",
    "app/api",
    "app/api/routes",
    "app/api/deps",
    "utils",
    "prompts",
    "schemas"
]

for p in packages:
    pkg_path = os.path.join(backend_root, p)
    if os.path.exists(pkg_path):
        init_file = os.path.join(pkg_path, "__init__.py")
        if not os.path.exists(init_file):
            with open(init_file, "w") as f:
                pass
            print(f"Created: {init_file}")
    else:
        print(f"Directory not found: {pkg_path}")
