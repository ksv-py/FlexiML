from pymongo import MongoClient
import gridfs
from app.config import MONGO_URI, DATABASE_NAME

client = MongoClient(MONGO_URI)
db = client[DATABASE_NAME]
fs = gridfs.GridFS(db)

def get_db():
    return db

def get_gridfs():
    return fs