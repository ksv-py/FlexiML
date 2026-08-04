from pymongo import MongoClient
import gridfs
from app.config import settings

_client = None
_db = None
_fs = None


def _get_client():
    global _client
    if _client is None:
        _client = MongoClient(
            settings.mongo_uri,
            connectTimeoutMS=15000,
            serverSelectionTimeoutMS=15000,
        )
    return _client


class _LazyDB:
    """Proxy that defers MongoClient creation until first attribute access."""
    def __getattr__(self, name):
        return getattr(_get_client()[settings.mongo_db], name)

    def __getitem__(self, key):
        return _get_client()[settings.mongo_db][key]


class _LazyFS:
    """Proxy that defers GridFS creation until first attribute access."""
    def __getattr__(self, name):
        global _fs
        if _fs is None:
            _fs = gridfs.GridFS(_get_client()[settings.mongo_db])
        return getattr(_fs, name)


db = _LazyDB()
fs = _LazyFS()
