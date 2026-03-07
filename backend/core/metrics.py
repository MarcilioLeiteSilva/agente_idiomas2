import time
import json
from datetime import datetime

class MetricsCollector:
    _instance = None
    
    def __new__(cls):
        if cls._instance is None:
            cls._instance = super(MetricsCollector, cls).__new__(cls)
            cls._instance.reset()
        return cls._instance
        
    def reset(self):
        self.counts = {}
        self.total_time = {}
        self.cache_hits = 0
        self.cache_misses = 0
        self.start_time = time.time()
        
    def observe_request(self, endpoint: str, duration: float):
        if endpoint not in self.counts:
            self.counts[endpoint] = 0
            self.total_time[endpoint] = 0.0
        self.counts[endpoint] += 1
        self.total_time[endpoint] += duration
        
    def observe_cache(self, hit: bool):
        if hit:
            self.cache_hits += 1
        else:
            self.cache_misses += 1
            
    def get_metrics(self):
        now = time.time()
        uptime = now - self.start_time
        avg_latency = {}
        for ep, count in self.counts.items():
            if count > 0:
                avg_latency[ep] = round((self.total_time[ep] / count) * 1000, 2) # ms
            else:
                avg_latency[ep] = 0
            
        return {
            "uptime_seconds": int(uptime),
            "total_requests": sum(self.counts.values()),
            "per_endpoint_counts": self.counts.copy(),
            "per_endpoint_avg_latency_ms": avg_latency,
            "cache_hits": self.cache_hits,
            "cache_misses": self.cache_misses,
            "timestamp": datetime.now().isoformat()
        }

metrics = MetricsCollector()
