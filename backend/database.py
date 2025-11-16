"""
Cosmos DB database connection and initialization
"""
import os
from azure.cosmos import CosmosClient, PartitionKey, exceptions
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Cosmos DB configuration
COSMOS_ENDPOINT = os.getenv("COSMOS_ENDPOINT")
COSMOS_KEY = os.getenv("COSMOS_KEY")
COSMOS_DATABASE_NAME = os.getenv("COSMOS_DATABASE_NAME", "my-app-db")

# Container names
TIMERS_CONTAINER = "timers"
TAGS_CONTAINER = "tags"
SETTINGS_CONTAINER = "settings"
RECORDS_CONTAINER = "records"

# Initialize Cosmos Client
cosmos_client = CosmosClient(COSMOS_ENDPOINT, COSMOS_KEY)

# Database and container references
database = None
timers_container = None
tags_container = None
settings_container = None
records_container = None


def initialize_database():
    """
    Initialize Cosmos DB database and containers
    """
    global database, timers_container, tags_container, settings_container, records_container
    
    try:
        # Create database if it doesn't exist
        database = cosmos_client.create_database_if_not_exists(id=COSMOS_DATABASE_NAME)
        print(f"Database '{COSMOS_DATABASE_NAME}' initialized")
        
        # Create timers container (サーバーレスではoffer_throughputを指定しない)
        timers_container = database.create_container_if_not_exists(
            id=TIMERS_CONTAINER,
            partition_key=PartitionKey(path="/id")
        )
        print(f"Container '{TIMERS_CONTAINER}' initialized")
        
        # Create tags container
        tags_container = database.create_container_if_not_exists(
            id=TAGS_CONTAINER,
            partition_key=PartitionKey(path="/id")
        )
        print(f"Container '{TAGS_CONTAINER}' initialized")
        
        # Create settings container
        settings_container = database.create_container_if_not_exists(
            id=SETTINGS_CONTAINER,
            partition_key=PartitionKey(path="/id")
        )
        print(f"Container '{SETTINGS_CONTAINER}' initialized")
        
        # Create records container
        records_container = database.create_container_if_not_exists(
            id=RECORDS_CONTAINER,
            partition_key=PartitionKey(path="/id")
        )
        print(f"Container '{RECORDS_CONTAINER}' initialized")
        
        # Initialize default settings if not exists
        initialize_default_settings()
        
        # Initialize default stopwatch timer if not exists
        initialize_default_stopwatch()
        
    except exceptions.CosmosHttpResponseError as e:
        print(f"Failed to initialize database: {e.message}")
        raise


def initialize_default_settings():
    """
    Initialize default settings document
    """
    try:
        settings_container.read_item(item="app-settings", partition_key="app-settings")
        print("Settings already exist")
    except exceptions.CosmosResourceNotFoundError:
        default_settings = {
            "id": "app-settings",
            "theme": "purple"
        }
        settings_container.create_item(body=default_settings)
        print("Default settings created")


def initialize_default_stopwatch():
    """
    Initialize default stopwatch timer
    """
    try:
        timers_container.read_item(item="stopwatch-fixed", partition_key="stopwatch-fixed")
        print("Stopwatch timer already exists")
    except exceptions.CosmosResourceNotFoundError:
        stopwatch = {
            "id": "stopwatch-fixed",
            "name": "ストップウォッチ",
            "duration": 0,
            "type": "stopwatch",
            "image": None
        }
        timers_container.create_item(body=stopwatch)
        print("Default stopwatch created")


# Initialize on module import
initialize_database()
