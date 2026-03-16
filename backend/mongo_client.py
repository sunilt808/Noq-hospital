# backend/mongo_client.py - MongoDB Connection Manager

import os
import logging
from typing import Optional
from pymongo import MongoClient
from pymongo.errors import ConnectionFailure, ServerSelectionTimeoutError
from contextlib import contextmanager

logger = logging.getLogger(__name__)


class MongoConnectionManager:
    """Manages MongoDB connection with proper error handling and pooling."""
    
    _instance: Optional['MongoConnectionManager'] = None
    _client: Optional[MongoClient] = None
    _database = None

    def __new__(cls):
        if cls._instance is None:
            cls._instance = super().__new__(cls)
        return cls._instance

    @classmethod
    def initialize(cls):
        """Initialize MongoDB connection."""
        try:
            manager = cls()
            manager._connect()
            logger.info("✓ MongoDB connection pool initialized")
            return True
        except Exception as e:
            logger.error(f"✗ MongoDB initialization failed: {e}")
            return False

    def _connect(self):
        """Establish MongoDB connection."""
        mongo_uri = os.getenv("MONGO_URI", "mongodb://127.0.0.1:27017")
        db_name = os.getenv("MONGO_DB_NAME", "noq_hospital_local")
        
        # Connection pool settings
        max_pool_size = int(os.getenv("MONGO_MAX_POOL_SIZE", 50))
        min_pool_size = int(os.getenv("MONGO_MIN_POOL_SIZE", 10))
        connect_timeout = int(os.getenv("MONGO_CONNECT_TIMEOUT_MS", 10000))
        server_timeout = int(os.getenv("MONGO_SERVER_SELECTION_TIMEOUT_MS", 5000))

        try:
            self._client = MongoClient(
                mongo_uri,
                maxPoolSize=max_pool_size,
                minPoolSize=min_pool_size,
                connectTimeoutMS=connect_timeout,
                serverSelectionTimeoutMS=server_timeout,
                retryWrites=True,
                w="majority",
            )
            
            # Test connection
            self._client.admin.command("ping")
            self._database = self._client[db_name]
            logger.info(f"✓ Connected to MongoDB: {db_name}")
            
        except (ConnectionFailure, ServerSelectionTimeoutError) as e:
            logger.error(f"✗ MongoDB connection failed: {e}")
            raise
        except Exception as e:
            logger.error(f"✗ Unexpected MongoDB error: {e}")
            raise

    @property
    def client(self) -> MongoClient:
        """Get MongoDB client instance."""
        if self._client is None:
            self._connect()
        return self._client

    @property
    def database(self):
        """Get database instance."""
        if self._database is None:
            self._connect()
        return self._database

    def get_collection(self, collection_name: str):
        """Get a specific collection."""
        return self.database[collection_name]

    def close(self):
        """Close MongoDB connection."""
        if self._client:
            self._client.close()
            logger.info("✓ MongoDB connection closed")
            self._client = None
            self._database = None

    def health_check(self) -> bool:
        """Check if MongoDB connection is healthy."""
        try:
            self.client.admin.command("ping")
            return True
        except Exception as e:
            logger.error(f"MongoDB health check failed: {e}")
            return False

    @contextmanager
    def session(self):
        """Context manager for database sessions."""
        try:
            yield self.database
        except Exception as e:
            logger.error(f"Database session error: {e}")
            raise
        finally:
            pass


# Global MongoDB manager instance
_mongo_manager: Optional[MongoConnectionManager] = None


def get_mongo_manager() -> MongoConnectionManager:
    """Get or create MongoDB manager."""
    global _mongo_manager
    if _mongo_manager is None:
        _mongo_manager = MongoConnectionManager()
    return _mongo_manager


def get_database():
    """Get MongoDB database instance."""
    return get_mongo_manager().database


def get_collection(collection_name: str):
    """Get a specific collection from MongoDB."""
    return get_mongo_manager().get_collection(collection_name)


def close_mongo_connection():
    """Close MongoDB connection (call on app shutdown)."""
    manager = get_mongo_manager()
    manager.close()
