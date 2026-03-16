from pathlib import Path
import firebase_admin
from firebase_admin import credentials, firestore, auth


def _get_service_account_path() -> Path:
	env_path = Path(__file__).resolve().parent / "serviceAccountKey.json"
	return env_path


service_account_path = _get_service_account_path()

if not service_account_path.exists():
	raise RuntimeError(
		f"Firebase service account file not found: {service_account_path}"
	)

if not firebase_admin._apps:
	cred = credentials.Certificate(str(service_account_path))
	firebase_admin.initialize_app(cred)

db = firestore.client()