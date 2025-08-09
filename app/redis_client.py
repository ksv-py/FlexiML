import redis 
from config import REDIS_HOST, REDIS_PASSWORD, REDIS_PORT

redis_client = redis.Redis(
    host=REDIS_HOST,
    password=REDIS_PASSWORD,
    port=REDIS_PORT,
    decode_responses=True
)

try:
    redis_client.ping()
    print("Redis Connected")

except Exception as e:
    print("Redis Connection Failed.", str(e))