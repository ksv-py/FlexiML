from pymongo import MongoClient
import gridfs
from app.config import settings

client = MongoClient(settings.mongo_uri)
db = client[settings.mongo_db]

fs = gridfs.GridFS(db)