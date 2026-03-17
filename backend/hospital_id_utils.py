import random
import re


HOSPITAL_ID_PATTERN = re.compile(r"^Noq-\d{6}$")


def is_valid_hospital_id(hospital_id: str) -> bool:
    if not hospital_id:
        return False
    return bool(HOSPITAL_ID_PATTERN.fullmatch(str(hospital_id).strip()))


def generate_hospital_id() -> str:
    return f"Noq-{random.randint(100000, 999999)}"
