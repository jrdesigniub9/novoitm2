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
import openai
from textblob import TextBlob
import asyncio


ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# Evolution API Config
EVOLUTION_API_URL = os.environ['EVOLUTION_API_URL']
EVOLUTION_API_KEY = os.environ['EVOLUTION_API_KEY']

# OpenAI Config
OPENAI_API_KEY = os.environ['OPENAI_API_KEY']
openai.api_key = OPENAI_API_KEY

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

class ConversationSession(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    instanceName: str
    contactNumber: str
    context: List[Dict[str, Any]] = []
    lastActivity: datetime = Field(default_factory=datetime.utcnow)
    isActive: bool = True
    sentimentAnalysis: Optional[Dict[str, Any]] = None

class AIResponse(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    sessionId: str
    userMessage: str
    aiResponse: str
    sentiment: Dict[str, Any]  # Changed from Dict[str, float] to Dict[str, Any]
    triggeredActions: List[str] = []
    timestamp: datetime = Field(default_factory=datetime.utcnow)

# Evolution API Helper Functions
async def create_evolution_instance(instance_name: str):
    """Create a new WhatsApp instance in Evolution API following official documentation"""
    headers = {
        "apikey": EVOLUTION_API_KEY,
        "Content-Type": "application/json"
    }
    payload = {
        "instanceName": instance_name,
        "qrcode": True,
        "integration": "WHATSAPP-BAILEYS"
    }
    
    try:
        response = requests.post(
            f"{EVOLUTION_API_URL}/instance/create",
            headers=headers,
            json=payload
        )
        logging.info(f"Evolution API create instance response: {response.status_code} - {response.text}")
        if response.status_code == 201 or response.status_code == 200:
            return response.json()
        else:
            raise HTTPException(status_code=response.status_code, detail=f"Evolution API error: {response.text}")
    except requests.exceptions.RequestException as e:
        logging.error(f"Request failed to Evolution API: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to create instance: {str(e)}")
    except Exception as e:
        logging.error(f"Unexpected error creating instance: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to create instance: {str(e)}")

async def get_evolution_qr_code(instance_name: str):
    """Get QR Code for WhatsApp connection following official documentation"""
    headers = {"apikey": EVOLUTION_API_KEY}
    
    try:
        response = requests.get(
            f"{EVOLUTION_API_URL}/instance/connect/{instance_name}",
            headers=headers
        )
        logging.info(f"Evolution API QR code response: {response.status_code} - {response.text}")
        
        if response.status_code == 200:
            data = response.json()
            # According to Evolution API docs, QR code can be in different formats
            qr_code = None
            if 'qrcode' in data and 'base64' in data['qrcode']:
                qr_code = data['qrcode']['base64']
            elif 'base64' in data:
                qr_code = data['base64']
            elif 'qrcode' in data:
                qr_code = data['qrcode']
            
            return {
                "success": True,
                "qrcode": qr_code,
                "data": data
            }
        else:
            raise HTTPException(status_code=response.status_code, detail=f"Evolution API error: {response.text}")
            
    except requests.exceptions.RequestException as e:
        logging.error(f"Request failed to Evolution API: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to get QR code: {str(e)}")
    except Exception as e:
        logging.error(f"Unexpected error getting QR code: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to get QR code: {str(e)}")

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

# AI Helper Functions
async def analyze_sentiment(text: str) -> Dict[str, float]:
    """Analyze sentiment using TextBlob and return detailed analysis"""
    try:
        blob = TextBlob(text)
        polarity = blob.sentiment.polarity  # -1 (negative) to 1 (positive)
        subjectivity = blob.sentiment.subjectivity  # 0 (objective) to 1 (subjective)
        
        # Classify sentiment
        if polarity >= 0.1:
            sentiment_class = "positive"
        elif polarity <= -0.1:
            sentiment_class = "negative" 
        else:
            sentiment_class = "neutral"
        
        # Detect confusion/doubt indicators
        doubt_keywords = ["dúvida", "não entendi", "confuso", "como", "o que", "por que", "?"]
        has_doubt = any(keyword in text.lower() for keyword in doubt_keywords)
        
        # Detect disinterest indicators  
        disinterest_keywords = ["não quero", "desistir", "cancelar", "chato", "pare", "parar"]
        has_disinterest = any(keyword in text.lower() for keyword in disinterest_keywords)
        
        return {
            "polarity": polarity,
            "subjectivity": subjectivity,
            "sentiment_class": sentiment_class,
            "has_doubt": has_doubt,
            "has_disinterest": has_disinterest,
            "confidence": abs(polarity) if abs(polarity) > 0.1 else 0.5
        }
    except Exception as e:
        logging.error(f"Error analyzing sentiment: {str(e)}")
        return {
            "polarity": 0.0,
            "subjectivity": 0.0,
            "sentiment_class": "neutral",
            "has_doubt": False,
            "has_disinterest": False,
            "confidence": 0.0
        }

async def generate_ai_response(message: str, context: List[Dict[str, Any]] = None, prompt: str = None) -> str:
    """Generate AI response using OpenAI"""
    try:
        if not prompt:
            prompt = "Você é um assistente inteligente em português. Responda de forma útil e amigável."
        
        # Build conversation context
        messages = [{"role": "system", "content": prompt}]
        
        if context:
            for ctx in context[-5:]:  # Last 5 messages for context
                if ctx.get("role") and ctx.get("content"):
                    messages.append({"role": ctx["role"], "content": ctx["content"]})
        
        messages.append({"role": "user", "content": message})
        
        client = openai.OpenAI(api_key=OPENAI_API_KEY)
        
        response = client.chat.completions.create(
            model="gpt-4o-mini",  # Using the faster, cheaper model
            messages=messages,
            max_tokens=500,
            temperature=0.7
        )
        
        return response.choices[0].message.content.strip()
        
    except Exception as e:
        logging.error(f"Error generating AI response: {str(e)}")
        return "Desculpe, não consegui processar sua mensagem no momento. Pode tentar novamente?"

async def get_or_create_session(instance_name: str, contact_number: str) -> ConversationSession:
    """Get existing conversation session or create new one"""
    try:
        # Check for existing active session
        session_data = await db.sessions.find_one({
            "instanceName": instance_name,
            "contactNumber": contact_number,
            "isActive": True
        })
        
        if session_data:
            return ConversationSession(**session_data)
        
        # Create new session
        session = ConversationSession(
            instanceName=instance_name,
            contactNumber=contact_number
        )
        
        await db.sessions.insert_one(session.dict())
        return session
        
    except Exception as e:
        logging.error(f"Error getting/creating session: {str(e)}")
        # Return a default session if database fails
        return ConversationSession(
            instanceName=instance_name,
            contactNumber=contact_number
        )

async def process_incoming_message(instance_name: str, contact_number: str, message_text: str):
    """Process incoming message with AI and sentiment analysis"""
    try:
        # Get or create conversation session
        session = await get_or_create_session(instance_name, contact_number)
        
        # Analyze sentiment
        sentiment = await analyze_sentiment(message_text)
        
        # Generate AI response
        context = session.context
        ai_response = await generate_ai_response(message_text, context)
        
        # Update session context
        session.context.append({
            "role": "user",
            "content": message_text,
            "timestamp": datetime.utcnow().isoformat(),
            "sentiment": sentiment
        })
        
        session.context.append({
            "role": "assistant", 
            "content": ai_response,
            "timestamp": datetime.utcnow().isoformat()
        })
        
        session.lastActivity = datetime.utcnow()
        session.sentimentAnalysis = sentiment
        
        # Save updated session
        await db.sessions.update_one(
            {"id": session.id},
            {"$set": session.dict()},
            upsert=True
        )
        
        # Send AI response back
        await send_evolution_message(instance_name, contact_number, {
            "type": "text",
            "content": ai_response
        })
        
        # Check for triggers based on sentiment
        await check_sentiment_triggers(instance_name, contact_number, sentiment, session)
        
        # Save AI response record
        ai_response_record = AIResponse(
            sessionId=session.id,
            userMessage=message_text,
            aiResponse=ai_response,
            sentiment=sentiment
        )
        
        await db.ai_responses.insert_one(ai_response_record.dict())
        
        return {"success": True, "response": ai_response, "sentiment": sentiment}
        
    except Exception as e:
        logging.error(f"Error processing incoming message: {str(e)}")
        return {"success": False, "error": str(e)}

async def check_sentiment_triggers(instance_name: str, contact_number: str, sentiment: Dict[str, float], session: ConversationSession):
    """Check sentiment and trigger appropriate actions"""
    try:
        actions_triggered = []
        
        # Trigger for disinterest
        if sentiment.get("has_disinterest", False):
            # Send special offer or retention content
            await send_evolution_message(instance_name, contact_number, {
                "type": "text",
                "content": "🎯 Espere! Tenho uma oferta especial para você. Que tal receber um desconto exclusivo?"
            })
            actions_triggered.append("disinterest_retention")
        
        # Trigger for confusion/doubt
        elif sentiment.get("has_doubt", False):
            # Send helpful content or video
            await send_evolution_message(instance_name, contact_number, {
                "type": "text", 
                "content": "📺 Parece que você tem algumas dúvidas! Deixe-me enviar um vídeo explicativo que pode ajudar."
            })
            actions_triggered.append("doubt_help")
        
        # Trigger for very negative sentiment
        elif sentiment.get("sentiment_class") == "negative" and sentiment.get("confidence", 0) > 0.7:
            # Escalate to human or send empathy response
            await send_evolution_message(instance_name, contact_number, {
                "type": "text",
                "content": "😔 Percebo que você pode estar frustrado. Posso transferir você para um atendente humano ou há algo específico que posso fazer para ajudar?"
            })
            actions_triggered.append("negative_escalation")
        
        return actions_triggered
        
    except Exception as e:
        logging.error(f"Error checking sentiment triggers: {str(e)}")
        return []

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

# AI Configuration Routes
@api_router.get("/ai/sessions")
async def get_ai_sessions():
    """Get all AI conversation sessions"""
    try:
        sessions = []
        cursor = db.sessions.find({"isActive": True}).sort("lastActivity", -1)
        async for session in cursor:
            sessions.append(session)
        return sessions
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Failed to get sessions: {str(e)}")

@api_router.get("/ai/sessions/{session_id}")
async def get_ai_session(session_id: str):
    """Get specific AI session details"""
    try:
        session = await db.sessions.find_one({"id": session_id})
        if not session:
            raise HTTPException(status_code=404, detail="Session not found")
        return session
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Failed to get session: {str(e)}")

@api_router.get("/ai/responses")
async def get_ai_responses(limit: int = 50):
    """Get recent AI responses"""
    try:
        responses = []
        cursor = db.ai_responses.find().sort("timestamp", -1).limit(limit)
        async for response in cursor:
            responses.append(response)
        return responses
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Failed to get responses: {str(e)}")

@api_router.post("/ai/test")
async def test_ai_response(message: str, prompt: str = None):
    """Test AI response generation"""
    try:
        if not message:
            raise HTTPException(status_code=400, detail="Message is required")
        
        # Analyze sentiment
        sentiment = await analyze_sentiment(message)
        
        # Generate AI response
        ai_response = await generate_ai_response(message, prompt=prompt)
        
        return {
            "input_message": message,
            "ai_response": ai_response,
            "sentiment": sentiment
        }
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Failed to test AI: {str(e)}")

class AISettingsModel(BaseModel):
    defaultPrompt: str = "Você é um assistente inteligente em português. Responda de forma útil e amigável."
    enableSentimentAnalysis: bool = True
    enableAutoResponse: bool = True
    confidenceThreshold: float = 0.5
    maxContextMessages: int = 5
    disinterestTriggers: List[str] = ["não quero", "desistir", "cancelar", "chato", "pare"]
    doubtTriggers: List[str] = ["dúvida", "não entendi", "confuso", "como", "o que", "por que"]

@api_router.post("/ai/settings")
async def update_ai_settings(settings: AISettingsModel):
    """Update AI settings"""
    try:
        settings_dict = settings.dict()
        settings_dict["id"] = "default"
        settings_dict["updatedAt"] = datetime.utcnow()
        
        await db.ai_settings.update_one(
            {"id": "default"},
            {"$set": settings_dict},
            upsert=True
        )
        
        return {"success": True, "message": "AI settings updated successfully"}
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Failed to update settings: {str(e)}")

@api_router.get("/ai/settings")
async def get_ai_settings():
    """Get current AI settings"""
    try:
        settings = await db.ai_settings.find_one({"id": "default"})
        if not settings:
            # Return default settings
            default_settings = AISettingsModel()
            return default_settings.dict()
        return settings
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Failed to get settings: {str(e)}")

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
    event_type = request_data.get("type") or request_data.get("event")
    instance_name = request_data.get("instance") or request_data.get("instanceName")
    
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
    elif event_type == "messages.upsert" or event_type == "MESSAGES_UPSERT":
        # Process incoming messages with AI
        try:
            messages = request_data.get("data", [])
            if isinstance(messages, list):
                for msg in messages:
                    await process_message_event(instance_name, msg)
            else:
                await process_message_event(instance_name, messages)
        except Exception as e:
            logging.error(f"Error processing message event: {str(e)}")
    
    return {"status": "ok"}

async def process_message_event(instance_name: str, message_data: Dict[str, Any]):
    """Process individual message from webhook"""
    try:
        # Extract message information
        key = message_data.get("key", {})
        message = message_data.get("message", {})
        
        # Skip if message is from the bot itself
        if key.get("fromMe", False):
            return
        
        # Extract sender number (remove @s.whatsapp.net suffix)
        contact_number = key.get("remoteJid", "").replace("@s.whatsapp.net", "")
        
        # Extract message text
        message_text = None
        if "conversation" in message:
            message_text = message["conversation"]
        elif "extendedTextMessage" in message:
            message_text = message["extendedTextMessage"].get("text")
        elif "textMessage" in message:
            message_text = message["textMessage"].get("text")
        
        # Only process text messages for now
        if message_text and contact_number:
            logging.info(f"Processing incoming message from {contact_number}: {message_text}")
            
            # Process with AI in background to avoid blocking webhook response
            asyncio.create_task(process_incoming_message(instance_name, contact_number, message_text))
            
    except Exception as e:
        logging.error(f"Error processing message event: {str(e)}")

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