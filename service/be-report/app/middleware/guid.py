import random
from datetime import datetime

SYSTEM_CODE = "LTP"


def generate_guid() -> str:
    now = datetime.now()
    timestamp = now.strftime("%Y%m%d%H%M%S") + f"{now.microsecond // 1000:03d}"
    rand = str(random.randint(0, 9_999_999_999)).zfill(10)
    return f"{timestamp}{SYSTEM_CODE}{rand}"