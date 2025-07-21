from fastapi import FastAPI, APIRouter, UploadFile, File, HTTPException, Form
from fastapi.responses import JSONResponse
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any
import uuid
from datetime import datetime
import aiofiles
import base64
import requests
import json


ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# Evolution API Config
EVOLUTION_API_URL = os.environ['EVOLUTION_API_URL']
EVOLUTION_API_KEY = os.environ['EVOLUTION_API_KEY']

# Create the main app without a prefix
app = FastAPI()

# Create a router with the /api prefix
api_router = APIRouter(prefix="/api")

# Ensure uploads directory exists
UPLOADS_DIR = Path("uploads")
UPLOADS_DIR.mkdir(exist_ok=True)

# Models
class FlowNode(BaseModel):
    id: str
    type: str
    position: Dict[str, float]
    data: Dict[str, Any]

class FlowEdge(BaseModel):
    id: str
    source: str
    target: str
    sourceHandle: Optional[str] = None
    targetHandle: Optional[str] = None

class Flow(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    description: Optional[str] = ""
    nodes: List[FlowNode] = []
    edges: List[FlowEdge] = []
    isActive: bool = False
    createdAt: datetime = Field(default_factory=datetime.utcnow)
    updatedAt: datetime = Field(default_factory=datetime.utcnow)

class FlowCreate(BaseModel):
    name: str
    description: Optional[str] = ""
    nodes: List[FlowNode] = []
    edges: List[FlowEdge] = []

class FlowUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    nodes: Optional[List[FlowNode]] = None
    edges: Optional[List[FlowEdge]] = None
    isActive: Optional[bool] = None

class FlowExecution(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    flowId: str
    status: str = "running"  # running, completed, failed
    currentNodeId: Optional[str] = None
    startedAt: datetime = Field(default_factory=datetime.utcnow)
    completedAt: Optional[datetime] = None
    log: List[Dict[str, Any]] = []

class EvolutionInstance(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    instanceName: str
    instanceKey: str
    qrCode: Optional[str] = None
    status: str = "disconnected"
    createdAt: datetime = Field(default_factory=datetime.utcnow)

# Evolution API Helper Functions
async def create_evolution_instance(instance_name: str):
    """Create a new WhatsApp instance in Evolution API"""
    headers = {
        "apikey": EVOLUTION_API_KEY,
        "Content-Type": "application/json"
    }
    payload = {
        "instanceName": instance_name,
        "integration": "WHATSAPP-BUSINESS",
        "webhookUrl": f"{os.environ.get('BACKEND_URL', 'http://localhost:8000')}/api/evolution/webhook"
    }
    
    try:
        response = requests.post(
            f"{EVOLUTION_API_URL}/instance/create",
            headers=headers,
            json=payload
        )
        return response.json()
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Failed to create instance: {str(e)}")

async def get_evolution_qr_code(instance_name: str):
    """Get QR Code for WhatsApp connection"""
    headers = {"apikey": EVOLUTION_API_KEY}
    
    try:
        response = requests.get(
            f"{EVOLUTION_API_URL}/instance/connect/{instance_name}",
            headers=headers
        )
        return response.json()
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Failed to get QR code: {str(e)}")

async def send_evolution_message(instance_name: str, recipient: str, message_data: Dict[str, Any]):
    """Send message through Evolution API"""
    headers = {
        "apikey": EVOLUTION_API_KEY,
        "Content-Type": "application/json"
    }
    
    try:
        if message_data["type"] == "text":
            endpoint = f"{EVOLUTION_API_URL}/message/sendText/{instance_name}"
            payload = {
                "number": recipient,
                "textMessage": {
                    "text": message_data["content"]
                }
            }
        elif message_data["type"] == "media":
            endpoint = f"{EVOLUTION_API_URL}/message/sendMedia/{instance_name}"
            payload = {
                "number": recipient,
                "mediaMessage": {
                    "mediaType": message_data.get("mediaType", "image"),
                    "media": message_data["content"],
                    "caption": message_data.get("caption", "")
                }
            }
        else:
            raise ValueError(f"Unsupported message type: {message_data['type']}")
        
        response = requests.post(endpoint, headers=headers, json=payload)
        return response.json()
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Failed to send message: {str(e)}")

# Flow Management Routes
@api_router.post("/flows", response_model=Flow)
async def create_flow(flow_data: FlowCreate):
    """Create a new flow"""
    flow = Flow(**flow_data.dict())
    await db.flows.insert_one(flow.dict())
    return flow

@api_router.get("/flows", response_model=List[Flow])
async def get_flows():
    """Get all flows"""
    flows = await db.flows.find().to_list(1000)
    return [Flow(**flow) for flow in flows]

@api_router.get("/flows/{flow_id}", response_model=Flow)
async def get_flow(flow_id: str):
    """Get a specific flow"""
    flow = await db.flows.find_one({"id": flow_id})
    if not flow:
        raise HTTPException(status_code=404, detail="Flow not found")
    return Flow(**flow)

@api_router.put("/flows/{flow_id}", response_model=Flow)
async def update_flow(flow_id: str, flow_data: FlowUpdate):
    """Update a flow"""
    update_data = {k: v for k, v in flow_data.dict().items() if v is not None}
    update_data["updatedAt"] = datetime.utcnow()
    
    result = await db.flows.update_one({"id": flow_id}, {"$set": update_data})
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="Flow not found")
    
    flow = await db.flows.find_one({"id": flow_id})
    return Flow(**flow)

@api_router.delete("/flows/{flow_id}")
async def delete_flow(flow_id: str):
    """Delete a flow"""
    result = await db.flows.delete_one({"id": flow_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Flow not found")
    return {"message": "Flow deleted successfully"}

@api_router.post("/flows/{flow_id}/execute")
async def execute_flow(flow_id: str, recipient: str = Form(...), instance_name: str = Form(...)):
    """Execute a flow for a specific recipient"""
    flow = await db.flows.find_one({"id": flow_id})
    if not flow:
        raise HTTPException(status_code=404, detail="Flow not found")
    
    if not flow.get("isActive", False):
        raise HTTPException(status_code=400, detail="Flow is not active")
    
    flow_obj = Flow(**flow)
    execution = FlowExecution(flowId=flow_id)
    
    try:
        # Find start node (trigger node)
        start_nodes = [node for node in flow_obj.nodes if node.type == "trigger"]
        if not start_nodes:
            raise HTTPException(status_code=400, detail="No trigger node found in flow")
        
        current_node = start_nodes[0]
        execution.currentNodeId = current_node.id
        
        # Execute nodes sequentially
        while current_node:
            execution.log.append({
                "nodeId": current_node.id,
                "nodeType": current_node.type,
                "timestamp": datetime.utcnow(),
                "status": "executing"
            })
            
            # Process current node
            if current_node.type == "message":
                message_data = {
                    "type": "text",
                    "content": current_node.data.get("message", "")
                }
                await send_evolution_message(instance_name, recipient, message_data)
            elif current_node.type == "media":
                message_data = {
                    "type": "media",
                    "mediaType": current_node.data.get("mediaType", "image"),
                    "content": current_node.data.get("mediaUrl", ""),
                    "caption": current_node.data.get("caption", "")
                }
                await send_evolution_message(instance_name, recipient, message_data)
            elif current_node.type == "delay":
                import asyncio
                delay_seconds = current_node.data.get("seconds", 1)
                await asyncio.sleep(delay_seconds)
            
            execution.log[-1]["status"] = "completed"
            
            # Find next node
            next_edges = [edge for edge in flow_obj.edges if edge.source == current_node.id]
            if next_edges:
                next_node_id = next_edges[0].target
                current_node = next((node for node in flow_obj.nodes if node.id == next_node_id), None)
            else:
                current_node = None
        
        execution.status = "completed"
        execution.completedAt = datetime.utcnow()
        
    except Exception as e:
        execution.status = "failed"
        execution.log.append({
            "error": str(e),
            "timestamp": datetime.utcnow()
        })
    
    await db.flow_executions.insert_one(execution.dict())
    return execution

# File Upload Routes
@api_router.post("/upload")
async def upload_file(file: UploadFile = File(...)):
    """Upload a file and return base64 encoded data"""
    try:
        # Read file content
        content = await file.read()
        
        # Convert to base64
        base64_content = base64.b64encode(content).decode('utf-8')
        
        # Save file locally as backup
        file_path = UPLOADS_DIR / f"{uuid.uuid4()}_{file.filename}"
        async with aiofiles.open(file_path, 'wb') as f:
            await f.write(content)
        
        return {
            "filename": file.filename,
            "base64": base64_content,
            "contentType": file.content_type,
            "size": len(content),
            "path": str(file_path)
        }
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Upload failed: {str(e)}")

# Evolution API Instance Management
@api_router.post("/evolution/instances", response_model=EvolutionInstance)
async def create_instance(instance_name: str = Form(...)):
    """Create a new WhatsApp instance"""
    # Create instance in Evolution API
    evolution_response = await create_evolution_instance(instance_name)
    
    instance = EvolutionInstance(
        instanceName=instance_name,
        instanceKey=evolution_response.get("hash", ""),
        status="created"
    )
    
    await db.evolution_instances.insert_one(instance.dict())
    return instance

@api_router.get("/evolution/instances", response_model=List[EvolutionInstance])
async def get_instances():
    """Get all WhatsApp instances"""
    instances = await db.evolution_instances.find().to_list(1000)
    return [EvolutionInstance(**instance) for instance in instances]

@api_router.get("/evolution/instances/{instance_name}/qr")
async def get_instance_qr(instance_name: str):
    """Get QR code for WhatsApp connection"""
    qr_response = await get_evolution_qr_code(instance_name)
    return qr_response

@api_router.post("/evolution/webhook")
async def evolution_webhook(request_data: dict):
    """Webhook endpoint for Evolution API events"""
    logging.info(f"Evolution webhook received: {request_data}")
    
    # Process webhook events here
    event_type = request_data.get("type")
    instance_name = request_data.get("instance")
    
    if event_type == "qrcode.updated":
        # Update QR code in database
        qr_code = request_data.get("data", {}).get("qrcode")
        await db.evolution_instances.update_one(
            {"instanceName": instance_name},
            {"$set": {"qrCode": qr_code}}
        )
    elif event_type == "connection.update":
        # Update connection status
        status = request_data.get("data", {}).get("state")
        await db.evolution_instances.update_one(
            {"instanceName": instance_name},
            {"$set": {"status": status}}
        )
    
    return {"status": "ok"}

# Test route
@api_router.get("/")
async def root():
    return {"message": "Flow Builder API"}

# Include the router in the main app
app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()