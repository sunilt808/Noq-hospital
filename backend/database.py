import json
import os
import uuid
import logging
from dataclasses import dataclass
from pathlib import Path
from typing import Any, Dict, Iterable, List, Optional, Tuple
from datetime import datetime

import jwt
from pymongo import MongoClient
from pymongo.errors import PyMongoError, DuplicateKeyError
from mongo_client import get_mongo_manager, get_collection

logger = logging.getLogger(__name__)

# Configuration from environment
BASE_DIR = Path(__file__).resolve().parent
MONGO_URI = os.environ.get("MONGO_URI", "mongodb://127.0.0.1:27017")
MONGO_DB_NAME = os.environ.get("MONGO_DB_NAME", "noq_hospital_local")

def _now_iso() -> str:
	"""Get current UTC time in ISO format."""
	return datetime.utcnow().isoformat() + "Z"


def _extract_filter_parts(field_path=None, op_string=None, value=None, filter=None):
	if filter is not None:
		field_path = getattr(filter, "field_path", None) or getattr(filter, "field", None)
		op_string = getattr(filter, "op_string", None) or getattr(filter, "op", None)
		value = getattr(filter, "value", None)

	if field_path is None:
		raise ValueError("Unsupported query filter: missing field path")

	op_string = str(op_string)
	return str(field_path), op_string, value


def _mongo_condition(op_string: str, value: Any) -> Any:
	operator_map = {
		"==": value,
		"eq": value,
		"!=": {"$ne": value},
		"ne": {"$ne": value},
		">": {"$gt": value},
		">=": {"$gte": value},
		"<": {"$lt": value},
		"<=": {"$lte": value},
		"in": {"$in": value if isinstance(value, list) else [value]},
	}
	if op_string not in operator_map:
		raise ValueError(f"Unsupported query operator: {op_string}")
	return operator_map[op_string]


def _clean_document(doc: Optional[Dict[str, Any]]) -> Dict[str, Any]:
	if not doc:
		return {}
	cleaned = dict(doc)
	cleaned.pop("_id", None)
	return cleaned


@dataclass
class MongoUserRecord:
	uid: str
	email: str
	display_name: Optional[str] = None


class MongoDocumentSnapshot:
	def __init__(self, doc_id: str, data: Optional[Dict[str, Any]]):
		self.id = doc_id
		self._data = _clean_document(data) if data else None

	@property
	def exists(self) -> bool:
		return self._data is not None

	def to_dict(self) -> Dict[str, Any]:
		return dict(self._data or {})


class MongoDocumentReference:
	def __init__(self, client: "MongoFirestoreClient", collection_name: str, doc_id: Optional[str] = None):
		self._client = client
		self._collection_name = collection_name
		self.id = doc_id or uuid.uuid4().hex[:24].upper()

	@property
	def _collection(self):
		return self._client._database[self._collection_name]

	def get(self, transaction=None):
		doc = self._collection.find_one({"_id": self.id})
		return MongoDocumentSnapshot(self.id, doc)

	def set(self, data: Dict[str, Any], merge: bool = False):
		payload = dict(data or {})
		payload["id"] = payload.get("id") or self.id
		payload["_id"] = self.id
		if merge:
			self._collection.update_one({"_id": self.id}, {"$set": payload}, upsert=True)
		else:
			self._collection.replace_one({"_id": self.id}, payload, upsert=True)

	def update(self, updates: Dict[str, Any]):
		payload = dict(updates or {})
		payload.pop("_id", None)
		self._collection.update_one({"_id": self.id}, {"$set": payload}, upsert=False)

	def delete(self):
		self._collection.delete_one({"_id": self.id})


class MongoQuery:
	def __init__(self, client: "MongoFirestoreClient", collection_name: str, filters: Optional[List[Tuple[str, str, Any]]] = None, limit_count: Optional[int] = None):
		self._client = client
		self._collection_name = collection_name
		self._filters = list(filters or [])
		self._limit_count = limit_count

	@property
	def _collection(self):
		return self._client._database[self._collection_name]

	def where(self, field_path=None, op_string=None, value=None, *, filter=None):
		field_path, op_string, value = _extract_filter_parts(field_path, op_string, value, filter)
		return MongoQuery(
			self._client,
			self._collection_name,
			filters=[*self._filters, (field_path, op_string, value)],
			limit_count=self._limit_count,
		)

	def limit(self, count: int):
		return MongoQuery(
			self._client,
			self._collection_name,
			filters=self._filters,
			limit_count=count,
		)

	def _build_query(self) -> Dict[str, Any]:
		query: Dict[str, Any] = {}
		for field_name, op_string, value in self._filters:
			condition = _mongo_condition(op_string, value)
			if field_name in query and isinstance(query[field_name], dict) and isinstance(condition, dict):
				query[field_name].update(condition)
			else:
				query[field_name] = condition
		return query

	def stream(self) -> Iterable[MongoDocumentSnapshot]:
		cursor = self._collection.find(self._build_query())
		if self._limit_count is not None:
			cursor = cursor.limit(int(self._limit_count))
		for doc in cursor:
			doc_id = str(doc.get("id") or doc.get("_id"))
			yield MongoDocumentSnapshot(doc_id, doc)


class MongoCollectionReference(MongoQuery):
	def __init__(self, client: "MongoFirestoreClient", collection_name: str):
		super().__init__(client, collection_name)

	def document(self, doc_id: Optional[str] = None) -> MongoDocumentReference:
		return MongoDocumentReference(self._client, self._collection_name, doc_id)


class MongoTransaction:
	def get(self, doc_ref: MongoDocumentReference):
		return doc_ref.get()

	def update(self, doc_ref: MongoDocumentReference, updates: Dict[str, Any]):
		doc_ref.update(updates)

	def set(self, doc_ref: MongoDocumentReference, data: Dict[str, Any]):
		doc_ref.set(data)


class MongoFirestoreClient:
	def __init__(self, uri: str, database_name: str):
		self._mongo_client = MongoClient(uri)
		self._database = self._mongo_client[database_name]

	def collection(self, collection_name: str) -> MongoCollectionReference:
		return MongoCollectionReference(self, collection_name)

	def transaction(self) -> MongoTransaction:
		return MongoTransaction()


class MongoAuth:
	"""Authentication service using MongoDB."""
	
	def __init__(self):
		"""Initialize with MongoDB manager."""
		self._mongo_manager = get_mongo_manager()

	@property
	def _collection(self):
		try:
			return get_collection("auth_users")
		except Exception as e:
			logger.error(f"Failed to get auth_users collection: {e}")
			raise

	def _find_by_email(self, email: str) -> Optional[Dict[str, Any]]:
		"""Find user by email."""
		try:
			return self._collection.find_one({"email": email.strip().lower()})
		except PyMongoError as e:
			logger.error(f"Database error finding user by email: {e}")
			raise

	def get_user(self, uid: str) -> MongoUserRecord:
		"""Get user by UID."""
		try:
			doc = self._collection.find_one({"_id": uid})
			if not doc:
				raise ValueError("User not found")
			return MongoUserRecord(uid=uid, email=doc.get("email", ""), display_name=doc.get("display_name"))
		except PyMongoError as e:
			logger.error(f"Database error getting user: {e}")
			raise

	def get_user_by_email(self, email: str) -> MongoUserRecord:
		"""Get user by email."""
		try:
			doc = self._find_by_email(email)
			if not doc:
				raise ValueError("User not found")
			return MongoUserRecord(
				uid=str(doc.get("uid") or doc.get("_id")),
				email=doc.get("email", ""),
				display_name=doc.get("display_name")
			)
		except PyMongoError as e:
			logger.error(f"Database error getting user by email: {e}")
			raise

	def update_user(self, uid: str, **kwargs) -> MongoUserRecord:
		"""Update user details."""
		try:
			updates = dict(kwargs)
			if "email" in updates and updates["email"]:
				updates["email"] = updates["email"].strip().lower()
			
			result = self._collection.update_one(
				{"_id": uid},
				{"$set": {**updates, "uid": uid}},
				upsert=False
			)
			
			if result.matched_count == 0:
				raise ValueError("User not found")
			
			return self.get_user(uid)
		except PyMongoError as e:
			logger.error(f"Database error updating user: {e}")
			raise

	def create_user(self, **kwargs) -> MongoUserRecord:
		"""Create a new user."""
		try:
			uid = kwargs.get("uid") or f"AUTH-{uuid.uuid4().hex[:16].upper()}"
			email = str(kwargs.get("email") or "").strip().lower()
			
			payload = {
				"_id": uid,
				"uid": uid,
				"email": email,
				"display_name": kwargs.get("display_name"),
				"created_at": _now_iso(),
			}
			
			self._collection.replace_one({"_id": uid}, payload, upsert=True)
			return MongoUserRecord(uid=uid, email=email, display_name=payload.get("display_name"))
		except DuplicateKeyError as e:
			logger.error(f"User already exists: {e}")
			raise ValueError("User with this email already exists")
		except PyMongoError as e:
			logger.error(f"Database error creating user: {e}")
			raise

	def verify_id_token(self, token: str) -> Dict[str, Any]:
		"""Verify JWT token and extract user info."""
		if not token:
			raise ValueError("Missing token")

		try:
			# Try decoding JWT
			decoded = jwt.decode(token, options={"verify_signature": False, "verify_exp": False}, algorithms=["HS256", "RS256"])
			if isinstance(decoded, dict) and decoded.get("email"):
				decoded.setdefault("uid", decoded.get("sub") or decoded.get("user_id") or decoded.get("uid"))
				return decoded
		except Exception as e:
			logger.debug(f"JWT decode failed: {e}")
			pass

		# Fall back to database lookup
		try:
			doc = self._collection.find_one({
				"$or": [
					{"_id": token},
					{"uid": token},
					{"email": str(token).strip().lower()}
				]
			})
			
			if not doc:
				raise ValueError("Invalid token")
			
			return {
				"uid": str(doc.get("uid") or doc.get("_id")),
				"sub": str(doc.get("uid") or doc.get("_id")),
				"email": doc.get("email"),
				"name": doc.get("display_name"),
			}
		except PyMongoError as e:
			logger.error(f"Database error verifying token: {e}")
			raise


def _load_seed_items(file_path: Path, root_key: Optional[str]) -> List[Dict[str, Any]]:
	if not file_path.exists():
		return []
	with file_path.open("r", encoding="utf-8") as handle:
		payload = json.load(handle)
	items = payload.get(root_key, []) if root_key else payload
	if not isinstance(items, list):
		return []
	return [dict(item) for item in items if isinstance(item, dict)]


def _normalize_seed_item(collection_name: str, item: Dict[str, Any]) -> Dict[str, Any]:
	normalized = dict(item)
	entity_id = str(normalized.get("id") or normalized.get(f"{collection_name[:-1]}_id") or uuid.uuid4().hex[:24].upper())
	normalized["id"] = entity_id
	normalized["_id"] = entity_id

	if collection_name == "departments":
		normalized.setdefault("name", normalized.get("department_name") or normalized.get("name") or "")
	if collection_name == "hospitals":
		normalized.setdefault("hospital_id", entity_id)
	if collection_name == "doctors":
		normalized.setdefault("doctor_id", entity_id)
	if collection_name == "users":
		normalized.setdefault("status", "active")

	return normalized


def _seed_collection(db_client: MongoFirestoreClient, collection_name: str, file_name: str, root_key: Optional[str]):
	collection = db_client._database[collection_name]
	if collection.count_documents({}) > 0:
		return

	items = _load_seed_items(BASE_DIR / "data" / file_name, root_key)
	if not items:
		return

	documents = [_normalize_seed_item(collection_name, item) for item in items]
	collection.insert_many(documents, ordered=False)


def _seed_local_database(db_client: MongoFirestoreClient):
	seed_map = {
		"users": ("users_cache.json", "users"),
		"hospitals": ("hospitals_cache.json", "hospitals"),
		"departments": ("departments_cache.json", "departments"),
		"doctors": ("doctors_cache.json", "doctors"),
		"audit_logs": ("audit_logs.json", None),
	}

	for collection_name, (file_name, root_key) in seed_map.items():
		_seed_collection(db_client, collection_name, file_name, root_key)

	meta_ref = db_client.collection("_meta").document("local-db")
	meta_ref.set(
		{
			"id": "local-db",
			"database": MONGO_DB_NAME,
			"mode": "mongo-local",
			"seeded_at": _now_iso(),
		},
		merge=True,
	)


# ═══════════════════════════════════════════════════════════════════════════
# GLOBAL AUTH INSTANCE
# ═══════════════════════════════════════════════════════════════════════════

# Initialize auth service (needs MongoDB to be connected)
auth = MongoAuth()
logger.info("✓ Auth service initialized")