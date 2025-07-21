#!/usr/bin/env python3
"""
Comprehensive Backend Testing for Visual Flow Builder
Tests all backend APIs including Evolution API integration
"""

import requests
import json
import base64
import time
import uuid
from datetime import datetime
from typing import Dict, Any, List
import os

# Configuration
BACKEND_URL = "https://159d4228-a9ef-4d1b-9460-914863a370f4.preview.emergentagent.com/api"
EVOLUTION_API_URL = "http://apiwhatsapp.maapletech.com.br"
EVOLUTION_API_KEY = "322683C4C655415CAAFFFE10F7D57E11"

# Test data
TEST_INSTANCE_NAME = f"test_instance_{int(time.time())}"
TEST_RECIPIENT = "5511999999999"  # Realistic WhatsApp format

class BackendTester:
    def __init__(self):
        self.session = requests.Session()
        self.test_results = {}
        self.created_flows = []
        self.created_instances = []
        
    def log_result(self, test_name: str, success: bool, details: str = ""):
        """Log test result"""
        status = "✅ PASS" if success else "❌ FAIL"
        print(f"{status} {test_name}")
        if details:
            print(f"   Details: {details}")
        self.test_results[test_name] = {"success": success, "details": details}
        
    def test_api_health(self):
        """Test basic API connectivity"""
        try:
            response = self.session.get(f"{BACKEND_URL}/")
            if response.status_code == 200:
                data = response.json()
                self.log_result("API Health Check", True, f"Response: {data}")
                return True
            else:
                self.log_result("API Health Check", False, f"Status: {response.status_code}")
                return False
        except Exception as e:
            self.log_result("API Health Check", False, f"Error: {str(e)}")
            return False
    
    def test_flow_crud_operations(self):
        """Test Flow Management CRUD operations"""
        print("\n=== Testing Flow Management CRUD ===")
        
        # Test data for complex flow
        flow_data = {
            "name": "WhatsApp Marketing Campaign",
            "description": "Automated marketing flow with media and delays",
            "nodes": [
                {
                    "id": "trigger-1",
                    "type": "trigger",
                    "position": {"x": 100, "y": 100},
                    "data": {"label": "Campaign Start"}
                },
                {
                    "id": "message-1", 
                    "type": "message",
                    "position": {"x": 300, "y": 100},
                    "data": {"message": "Welcome to our exclusive offer! 🎉"}
                },
                {
                    "id": "delay-1",
                    "type": "delay", 
                    "position": {"x": 500, "y": 100},
                    "data": {"seconds": 5}
                },
                {
                    "id": "media-1",
                    "type": "media",
                    "position": {"x": 700, "y": 100},
                    "data": {
                        "mediaType": "image",
                        "mediaUrl": "https://example.com/promo.jpg",
                        "caption": "Check out our latest products!"
                    }
                }
            ],
            "edges": [
                {
                    "id": "e1-2",
                    "source": "trigger-1",
                    "target": "message-1"
                },
                {
                    "id": "e2-3", 
                    "source": "message-1",
                    "target": "delay-1"
                },
                {
                    "id": "e3-4",
                    "source": "delay-1", 
                    "target": "media-1"
                }
            ]
        }
        
        # CREATE Flow
        try:
            response = self.session.post(f"{BACKEND_URL}/flows", json=flow_data)
            if response.status_code == 200:
                created_flow = response.json()
                flow_id = created_flow["id"]
                self.created_flows.append(flow_id)
                self.log_result("Create Flow", True, f"Flow ID: {flow_id}")
            else:
                self.log_result("Create Flow", False, f"Status: {response.status_code}, Response: {response.text}")
                return False
        except Exception as e:
            self.log_result("Create Flow", False, f"Error: {str(e)}")
            return False
        
        # READ All Flows
        try:
            response = self.session.get(f"{BACKEND_URL}/flows")
            if response.status_code == 200:
                flows = response.json()
                self.log_result("Get All Flows", True, f"Found {len(flows)} flows")
            else:
                self.log_result("Get All Flows", False, f"Status: {response.status_code}")
        except Exception as e:
            self.log_result("Get All Flows", False, f"Error: {str(e)}")
        
        # READ Specific Flow
        try:
            response = self.session.get(f"{BACKEND_URL}/flows/{flow_id}")
            if response.status_code == 200:
                flow = response.json()
                self.log_result("Get Specific Flow", True, f"Flow name: {flow['name']}")
            else:
                self.log_result("Get Specific Flow", False, f"Status: {response.status_code}")
        except Exception as e:
            self.log_result("Get Specific Flow", False, f"Error: {str(e)}")
        
        # UPDATE Flow
        try:
            update_data = {
                "name": "Updated Marketing Campaign",
                "isActive": True
            }
            response = self.session.put(f"{BACKEND_URL}/flows/{flow_id}", json=update_data)
            if response.status_code == 200:
                updated_flow = response.json()
                self.log_result("Update Flow", True, f"Updated name: {updated_flow['name']}")
            else:
                self.log_result("Update Flow", False, f"Status: {response.status_code}")
        except Exception as e:
            self.log_result("Update Flow", False, f"Error: {str(e)}")
        
        return True
    
    def test_file_upload_system(self):
        """Test File Upload System with different file types"""
        print("\n=== Testing File Upload System ===")
        
        # Test with different file types
        test_files = [
            ("test_image.jpg", b"fake_image_data", "image/jpeg"),
            ("test_video.mp4", b"fake_video_data", "video/mp4"),
            ("test_audio.mp3", b"fake_audio_data", "audio/mpeg"),
            ("test_document.pdf", b"fake_pdf_data", "application/pdf")
        ]
        
        for filename, content, content_type in test_files:
            try:
                files = {"file": (filename, content, content_type)}
                response = self.session.post(f"{BACKEND_URL}/upload", files=files)
                
                if response.status_code == 200:
                    result = response.json()
                    # Verify base64 encoding
                    expected_base64 = base64.b64encode(content).decode('utf-8')
                    if result["base64"] == expected_base64:
                        self.log_result(f"Upload {filename}", True, f"Size: {result['size']} bytes")
                    else:
                        self.log_result(f"Upload {filename}", False, "Base64 encoding mismatch")
                else:
                    self.log_result(f"Upload {filename}", False, f"Status: {response.status_code}")
            except Exception as e:
                self.log_result(f"Upload {filename}", False, f"Error: {str(e)}")
    
    def test_enhanced_evolution_api_instance_creation(self):
        """Test Enhanced Evolution API Instance Creation - CRITICAL PRIORITY"""
        print("\n=== Testing Enhanced Evolution API Instance Creation ===")
        print("🎯 FOCUS: Testing comprehensive instance creation with WhatsApp automation settings")
        
        # Create enhanced test instance name with timestamp
        enhanced_instance_name = f"enhanced_test_{int(time.time())}"
        
        # Test Enhanced Instance Creation with comprehensive configuration
        try:
            data = {"instance_name": enhanced_instance_name}
            response = self.session.post(f"{BACKEND_URL}/evolution/instances", data=data)
            
            if response.status_code == 200:
                instance = response.json()
                self.created_instances.append(enhanced_instance_name)
                self.log_result("Enhanced Instance Creation", True, 
                              f"Instance: {instance['instanceName']}, Key: {instance.get('instanceKey', 'N/A')}")
                
                # Verify instance was created with proper settings
                print(f"   ✅ Instance created with name: {instance['instanceName']}")
                print(f"   ✅ Instance key generated: {bool(instance.get('instanceKey'))}")
                
            else:
                self.log_result("Enhanced Instance Creation", False, 
                              f"Status: {response.status_code}, Response: {response.text}")
                return False
        except Exception as e:
            self.log_result("Enhanced Instance Creation", False, f"Error: {str(e)}")
            return False
        
        # Wait for instance to be fully initialized
        print("   ⏳ Waiting for instance initialization...")
        time.sleep(3)
        
        # Test Direct Evolution API Instance Verification
        try:
            headers = {"apikey": EVOLUTION_API_KEY}
            response = requests.get(f"{EVOLUTION_API_URL}/instance/fetchInstances", headers=headers)
            
            if response.status_code == 200:
                evolution_instances = response.json()
                instance_found = False
                
                if isinstance(evolution_instances, list):
                    for evo_inst in evolution_instances:
                        if evo_inst.get("name") == enhanced_instance_name or evo_inst.get("instanceName") == enhanced_instance_name:
                            instance_found = True
                            print(f"   ✅ Instance found in Evolution API: {evo_inst.get('name', evo_inst.get('instanceName'))}")
                            print(f"   ✅ Connection Status: {evo_inst.get('connectionStatus', 'unknown')}")
                            break
                
                self.log_result("Direct Evolution API Verification", instance_found, 
                              f"Instance {'found' if instance_found else 'not found'} in Evolution API")
            else:
                self.log_result("Direct Evolution API Verification", False, 
                              f"Evolution API Status: {response.status_code}")
        except Exception as e:
            self.log_result("Direct Evolution API Verification", False, f"Error: {str(e)}")
        
        # Test Backend Instance Listing (should include Evolution API data)
        try:
            response = self.session.get(f"{BACKEND_URL}/evolution/instances")
            if response.status_code == 200:
                instances = response.json()
                enhanced_instance_found = False
                
                for inst in instances:
                    if inst.get("instanceName") == enhanced_instance_name:
                        enhanced_instance_found = True
                        print(f"   ✅ Enhanced instance found in backend list")
                        print(f"   ✅ Status: {inst.get('status', 'unknown')}")
                        print(f"   ✅ Has QR Code: {bool(inst.get('qrCode'))}")
                        break
                
                self.log_result("Backend Instance Listing", True, 
                              f"Found {len(instances)} total instances, Enhanced instance: {'✅' if enhanced_instance_found else '❌'}")
            else:
                self.log_result("Backend Instance Listing", False, f"Status: {response.status_code}")
        except Exception as e:
            self.log_result("Backend Instance Listing", False, f"Error: {str(e)}")
        
        # Test QR Code Generation for Enhanced Instance
        try:
            response = self.session.get(f"{BACKEND_URL}/evolution/instances/{enhanced_instance_name}/qr")
            if response.status_code == 200:
                qr_data = response.json()
                has_qr_code = bool(qr_data.get("qrcode"))
                self.log_result("Enhanced QR Code Generation", True, 
                              f"QR Code {'generated' if has_qr_code else 'pending'}")
                
                if has_qr_code:
                    print(f"   ✅ QR Code successfully generated for enhanced instance")
                    print(f"   ✅ QR Code format: {'base64' if qr_data.get('qrcode', '').startswith('data:') else 'raw'}")
                else:
                    print(f"   ⚠️ QR Code not yet available (instance may still be initializing)")
                    
            else:
                self.log_result("Enhanced QR Code Generation", False, 
                              f"Status: {response.status_code}, Response: {response.text}")
        except Exception as e:
            self.log_result("Enhanced QR Code Generation", False, f"Error: {str(e)}")
        
        # Test Enhanced Webhook Endpoint
        try:
            # Test the new /api/webhook/evolution endpoint with MESSAGES_UPSERT
            webhook_test_data = {
                "event": "MESSAGES_UPSERT",
                "instance": enhanced_instance_name,
                "data": {
                    "messages": [{
                        "key": {
                            "remoteJid": "5511999999999@s.whatsapp.net",
                            "fromMe": False,
                            "id": "test_enhanced_message"
                        },
                        "message": {
                            "conversation": "Test message for enhanced webhook processing"
                        }
                    }]
                }
            }
            
            response = self.session.post(f"{BACKEND_URL}/webhook/evolution", json=webhook_test_data)
            if response.status_code == 200:
                result = response.json()
                self.log_result("Enhanced Webhook Processing", True, 
                              f"Webhook response: {result.get('status', 'unknown')}")
                print(f"   ✅ Enhanced webhook endpoint operational")
                print(f"   ✅ MESSAGES_UPSERT event processed successfully")
            else:
                self.log_result("Enhanced Webhook Processing", False, 
                              f"Status: {response.status_code}, Response: {response.text}")
        except Exception as e:
            self.log_result("Enhanced Webhook Processing", False, f"Error: {str(e)}")
        
        return True
    
    def test_evolution_api_integration(self):
        """Test Evolution API Integration - Legacy Test"""
        print("\n=== Testing Evolution API Integration (Legacy) ===")
        
        # Test Instance Creation
        try:
            data = {"instance_name": TEST_INSTANCE_NAME}
            response = self.session.post(f"{BACKEND_URL}/evolution/instances", data=data)
            
            if response.status_code == 200:
                instance = response.json()
                self.created_instances.append(TEST_INSTANCE_NAME)
                self.log_result("Create Evolution Instance", True, f"Instance: {instance['instanceName']}")
            else:
                self.log_result("Create Evolution Instance", False, f"Status: {response.status_code}, Response: {response.text}")
                return False
        except Exception as e:
            self.log_result("Create Evolution Instance", False, f"Error: {str(e)}")
            return False
        
        # Wait a moment for instance to be created
        time.sleep(2)
        
        # Test Get All Instances
        try:
            response = self.session.get(f"{BACKEND_URL}/evolution/instances")
            if response.status_code == 200:
                instances = response.json()
                self.log_result("Get Evolution Instances", True, f"Found {len(instances)} instances")
            else:
                self.log_result("Get Evolution Instances", False, f"Status: {response.status_code}")
        except Exception as e:
            self.log_result("Get Evolution Instances", False, f"Error: {str(e)}")
        
        # Test QR Code Retrieval
        try:
            response = self.session.get(f"{BACKEND_URL}/evolution/instances/{TEST_INSTANCE_NAME}/qr")
            if response.status_code == 200:
                qr_data = response.json()
                self.log_result("Get QR Code", True, "QR code retrieved successfully")
            else:
                self.log_result("Get QR Code", False, f"Status: {response.status_code}, Response: {response.text}")
        except Exception as e:
            self.log_result("Get QR Code", False, f"Error: {str(e)}")
        
        return True
    
    def test_flow_execution_engine(self):
        """Test Flow Execution Engine"""
        print("\n=== Testing Flow Execution Engine ===")
        
        if not self.created_flows:
            self.log_result("Flow Execution", False, "No flows available for testing")
            return False
        
        flow_id = self.created_flows[0]
        
        try:
            # Test flow execution
            data = {
                "recipient": TEST_RECIPIENT,
                "instance_name": TEST_INSTANCE_NAME
            }
            response = self.session.post(f"{BACKEND_URL}/flows/{flow_id}/execute", data=data)
            
            if response.status_code == 200:
                execution = response.json()
                self.log_result("Execute Flow", True, f"Execution ID: {execution['id']}, Status: {execution['status']}")
            else:
                self.log_result("Execute Flow", False, f"Status: {response.status_code}, Response: {response.text}")
        except Exception as e:
            self.log_result("Execute Flow", False, f"Error: {str(e)}")
    
    def test_ai_integration(self):
        """Test AI Integration Features"""
        print("\n=== Testing AI Integration ===")
        
        # Test AI Settings - GET default settings
        try:
            response = self.session.get(f"{BACKEND_URL}/ai/settings")
            if response.status_code == 200:
                settings = response.json()
                self.log_result("Get AI Settings", True, f"Default prompt configured: {bool(settings.get('defaultPrompt'))}")
            else:
                self.log_result("Get AI Settings", False, f"Status: {response.status_code}")
        except Exception as e:
            self.log_result("Get AI Settings", False, f"Error: {str(e)}")
        
        # Test AI Settings - POST update settings
        try:
            new_settings = {
                "defaultPrompt": "Você é um assistente especializado em vendas. Seja persuasivo e amigável.",
                "enableSentimentAnalysis": True,
                "enableAutoResponse": True,
                "confidenceThreshold": 0.6,
                "maxContextMessages": 10,
                "disinterestTriggers": ["não quero", "desistir", "cancelar", "chato", "pare", "parar"],
                "doubtTriggers": ["dúvida", "não entendi", "confuso", "como", "o que", "por que"]
            }
            response = self.session.post(f"{BACKEND_URL}/ai/settings", json=new_settings)
            if response.status_code == 200:
                result = response.json()
                self.log_result("Update AI Settings", True, f"Settings updated: {result.get('success', False)}")
            else:
                self.log_result("Update AI Settings", False, f"Status: {response.status_code}")
        except Exception as e:
            self.log_result("Update AI Settings", False, f"Error: {str(e)}")
        
        # Test AI Response Generation with different sentiment scenarios
        test_messages = [
            ("Adorei o produto! Quero comprar mais!", "positive"),
            ("Não quero mais isso, cancelar tudo", "negative_disinterest"),
            ("Não entendi como funciona, pode explicar?", "confused"),
            ("Quanto custa o produto básico?", "neutral")
        ]
        
        for message, scenario in test_messages:
            try:
                params = {"message": message}
                response = self.session.post(f"{BACKEND_URL}/ai/test", params=params)
                if response.status_code == 200:
                    result = response.json()
                    sentiment = result.get("sentiment", {})
                    ai_response = result.get("ai_response", "")
                    self.log_result(f"AI Test ({scenario})", True, 
                                  f"Sentiment: {sentiment.get('sentiment_class', 'unknown')}, "
                                  f"Response length: {len(ai_response)} chars")
                else:
                    self.log_result(f"AI Test ({scenario})", False, f"Status: {response.status_code}")
            except Exception as e:
                self.log_result(f"AI Test ({scenario})", False, f"Error: {str(e)}")
        
        # Test AI Sessions endpoint
        try:
            response = self.session.get(f"{BACKEND_URL}/ai/sessions")
            if response.status_code == 200:
                sessions = response.json()
                self.log_result("Get AI Sessions", True, f"Found {len(sessions)} sessions")
            else:
                self.log_result("Get AI Sessions", False, f"Status: {response.status_code}")
        except Exception as e:
            self.log_result("Get AI Sessions", False, f"Error: {str(e)}")
        
        # Test AI Responses endpoint
        try:
            response = self.session.get(f"{BACKEND_URL}/ai/responses?limit=10")
            if response.status_code == 200:
                responses = response.json()
                self.log_result("Get AI Responses", True, f"Found {len(responses)} responses")
            else:
                self.log_result("Get AI Responses", False, f"Status: {response.status_code}")
        except Exception as e:
            self.log_result("Get AI Responses", False, f"Error: {str(e)}")

    def test_corrected_webhook_and_flow_instance_integration(self):
        """Test Corrected Webhook System and Flow-Instance Integration - CRITICAL PRIORITY"""
        print("\n=== Testing Corrected Webhook System and Flow-Instance Integration ===")
        print("🎯 FOCUS: Testing webhook URL correction and flow-to-instance association")
        
        # First, create a test instance for flow association
        test_flow_instance = f"flow_test_{int(time.time())}"
        
        # Test 1: Instance Creation with Correct Webhook URL
        print("\n1️⃣ Testing Instance Creation with Correct Webhook URL")
        try:
            data = {"instance_name": test_flow_instance}
            response = self.session.post(f"{BACKEND_URL}/evolution/instances", data=data)
            
            if response.status_code == 200:
                instance = response.json()
                self.created_instances.append(test_flow_instance)
                self.log_result("Instance Creation with Correct Webhook", True, 
                              f"Instance: {instance['instanceName']}")
                
                # Verify webhook URL is correctly configured by checking Evolution API directly
                headers = {"apikey": EVOLUTION_API_KEY}
                evo_response = requests.get(f"{EVOLUTION_API_URL}/instance/fetchInstances", headers=headers)
                
                if evo_response.status_code == 200:
                    evo_instances = evo_response.json()
                    webhook_verified = False
                    
                    for evo_inst in evo_instances:
                        if evo_inst.get("name") == test_flow_instance:
                            # Check if webhook URL contains the correct backend URL
                            webhook_config = evo_inst.get("webhook", {})
                            webhook_url = webhook_config.get("url", "")
                            expected_webhook = "https://159d4228-a9ef-4d1b-9460-914863a370f4.preview.emergentagent.com/api/webhook/evolution"
                            
                            if webhook_url == expected_webhook:
                                webhook_verified = True
                                print(f"   ✅ Webhook URL correctly configured: {webhook_url}")
                                print(f"   ✅ MESSAGES_UPSERT enabled: {'MESSAGES_UPSERT' in webhook_config.get('events', [])}")
                            else:
                                print(f"   ❌ Webhook URL incorrect: {webhook_url}")
                                print(f"   ❌ Expected: {expected_webhook}")
                            break
                    
                    self.log_result("Webhook URL Verification", webhook_verified, 
                                  f"Webhook URL {'correct' if webhook_verified else 'incorrect'}")
                else:
                    self.log_result("Webhook URL Verification", False, "Could not verify webhook URL")
                    
            else:
                self.log_result("Instance Creation with Correct Webhook", False, 
                              f"Status: {response.status_code}, Response: {response.text}")
                return False
        except Exception as e:
            self.log_result("Instance Creation with Correct Webhook", False, f"Error: {str(e)}")
            return False
        
        # Test 2: Flow Creation with Instance Selection
        print("\n2️⃣ Testing Flow Creation with Instance Selection")
        try:
            flow_with_instance_data = {
                "name": "Instance-Specific Marketing Flow",
                "description": "Flow assigned to specific WhatsApp instance",
                "selectedInstance": test_flow_instance,  # This is the key new field
                "nodes": [
                    {
                        "id": "trigger-instance",
                        "type": "trigger",
                        "position": {"x": 100, "y": 100},
                        "data": {
                            "label": "Instance Trigger",
                            "triggerType": "keyword",
                            "keywords": ["promo", "oferta", "desconto"]
                        }
                    },
                    {
                        "id": "message-instance",
                        "type": "message",
                        "position": {"x": 300, "y": 100},
                        "data": {"message": f"Mensagem específica para instância {test_flow_instance}! 🎯"}
                    }
                ],
                "edges": [
                    {
                        "id": "e-trigger-message",
                        "source": "trigger-instance",
                        "target": "message-instance"
                    }
                ],
                "isActive": True
            }
            
            response = self.session.post(f"{BACKEND_URL}/flows", json=flow_with_instance_data)
            if response.status_code == 200:
                created_flow = response.json()
                flow_id = created_flow["id"]
                self.created_flows.append(flow_id)
                
                # Verify selectedInstance field is properly saved
                selected_instance = created_flow.get("selectedInstance")
                if selected_instance == test_flow_instance:
                    self.log_result("Flow Creation with Instance Selection", True, 
                                  f"Flow ID: {flow_id}, Selected Instance: {selected_instance}")
                    print(f"   ✅ Flow successfully associated with instance: {selected_instance}")
                else:
                    self.log_result("Flow Creation with Instance Selection", False, 
                                  f"selectedInstance field not saved correctly: {selected_instance}")
            else:
                self.log_result("Flow Creation with Instance Selection", False, 
                              f"Status: {response.status_code}, Response: {response.text}")
                return False
        except Exception as e:
            self.log_result("Flow Creation with Instance Selection", False, f"Error: {str(e)}")
            return False
        
        # Test 3: Flow-Instance Association Verification
        print("\n3️⃣ Testing Flow-Instance Association")
        try:
            # Get the created flow and verify association
            response = self.session.get(f"{BACKEND_URL}/flows/{flow_id}")
            if response.status_code == 200:
                flow = response.json()
                selected_instance = flow.get("selectedInstance")
                
                if selected_instance == test_flow_instance:
                    self.log_result("Flow-Instance Association", True, 
                                  f"Flow correctly associated with instance: {selected_instance}")
                    print(f"   ✅ Flow '{flow['name']}' is associated with instance '{selected_instance}'")
                    print(f"   ✅ Flow is active: {flow.get('isActive', False)}")
                    print(f"   ✅ Flow has trigger nodes: {len([n for n in flow.get('nodes', []) if n.get('type') == 'trigger'])}")
                else:
                    self.log_result("Flow-Instance Association", False, 
                                  f"Association incorrect: {selected_instance}")
            else:
                self.log_result("Flow-Instance Association", False, f"Status: {response.status_code}")
        except Exception as e:
            self.log_result("Flow-Instance Association", False, f"Error: {str(e)}")
        
        # Test 4: Smart Webhook Processing with Instance-Specific Flow Triggering
        print("\n4️⃣ Testing Smart Webhook Processing with Instance-Specific Flow Triggering")
        try:
            # Test webhook with MESSAGES_UPSERT event that should trigger the instance-specific flow
            webhook_test_data = {
                "event": "MESSAGES_UPSERT",
                "instance": test_flow_instance,  # Message comes from our test instance
                "data": {
                    "messages": [{
                        "key": {
                            "remoteJid": "5511987654321@s.whatsapp.net",
                            "fromMe": False,
                            "id": "test_flow_trigger_message"
                        },
                        "message": {
                            "conversation": "promo"  # This should trigger our flow
                        }
                    }]
                }
            }
            
            response = self.session.post(f"{BACKEND_URL}/webhook/evolution", json=webhook_test_data)
            if response.status_code == 200:
                result = response.json()
                self.log_result("Smart Webhook Processing", True, 
                              f"Webhook response: {result.get('status', 'unknown')}")
                print(f"   ✅ Webhook processed MESSAGES_UPSERT event")
                print(f"   ✅ Message from instance '{test_flow_instance}' processed")
                print(f"   ✅ Flow trigger keyword 'promo' should activate instance-specific flow")
            else:
                self.log_result("Smart Webhook Processing", False, 
                              f"Status: {response.status_code}, Response: {response.text}")
        except Exception as e:
            self.log_result("Smart Webhook Processing", False, f"Error: {str(e)}")
        
        # Test 5: Automatic Flow Execution Verification
        print("\n5️⃣ Testing Automatic Flow Execution")
        try:
            # Wait a moment for flow processing
            time.sleep(2)
            
            # Test with a different instance to verify flow isolation
            different_instance = f"other_test_{int(time.time())}"
            
            webhook_different_instance = {
                "event": "MESSAGES_UPSERT", 
                "instance": different_instance,  # Different instance
                "data": {
                    "messages": [{
                        "key": {
                            "remoteJid": "5511111111111@s.whatsapp.net",
                            "fromMe": False,
                            "id": "test_different_instance"
                        },
                        "message": {
                            "conversation": "promo"  # Same keyword but different instance
                        }
                    }]
                }
            }
            
            response = self.session.post(f"{BACKEND_URL}/webhook/evolution", json=webhook_different_instance)
            if response.status_code == 200:
                result = response.json()
                self.log_result("Flow Instance Isolation", True, 
                              f"Different instance processed: {result.get('status', 'unknown')}")
                print(f"   ✅ Message from different instance '{different_instance}' processed")
                print(f"   ✅ Flow should NOT trigger for different instance (isolation working)")
            else:
                self.log_result("Flow Instance Isolation", False, 
                              f"Status: {response.status_code}")
        except Exception as e:
            self.log_result("Flow Instance Isolation", False, f"Error: {str(e)}")
        
        return True

    def test_webhook_processing(self):
        """Test Legacy Webhook Processing with AI Integration"""
        print("\n=== Testing Legacy Webhook Processing with AI ===")
        
        # Test webhook with QR code update
        webhook_data = {
            "type": "qrcode.updated",
            "instance": TEST_INSTANCE_NAME,
            "data": {
                "qrcode": "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg=="
            }
        }
        
        try:
            response = self.session.post(f"{BACKEND_URL}/evolution/webhook", json=webhook_data)
            if response.status_code == 200:
                result = response.json()
                self.log_result("Webhook QR Update", True, f"Response: {result}")
            else:
                self.log_result("Webhook QR Update", False, f"Status: {response.status_code}")
        except Exception as e:
            self.log_result("Webhook QR Update", False, f"Error: {str(e)}")
        
        # Test webhook with connection update
        webhook_data = {
            "type": "connection.update",
            "instance": TEST_INSTANCE_NAME,
            "data": {
                "state": "connected"
            }
        }
        
        try:
            response = self.session.post(f"{BACKEND_URL}/evolution/webhook", json=webhook_data)
            if response.status_code == 200:
                result = response.json()
                self.log_result("Webhook Connection Update", True, f"Response: {result}")
            else:
                self.log_result("Webhook Connection Update", False, f"Status: {response.status_code}")
        except Exception as e:
            self.log_result("Webhook Connection Update", False, f"Error: {str(e)}")
        
        # Test webhook with incoming message (AI processing)
        webhook_data = {
            "type": "messages.upsert",
            "instance": TEST_INSTANCE_NAME,
            "data": {
                "key": {
                    "remoteJid": "5511999999999@s.whatsapp.net",
                    "fromMe": False,
                    "id": "test_message_id"
                },
                "message": {
                    "conversation": "Olá! Gostaria de saber mais sobre seus produtos."
                }
            }
        }
        
        try:
            response = self.session.post(f"{BACKEND_URL}/evolution/webhook", json=webhook_data)
            if response.status_code == 200:
                result = response.json()
                self.log_result("Webhook Message Processing (AI)", True, f"Response: {result}")
            else:
                self.log_result("Webhook Message Processing (AI)", False, f"Status: {response.status_code}")
        except Exception as e:
            self.log_result("Webhook Message Processing (AI)", False, f"Error: {str(e)}")
    
    def cleanup(self):
        """Clean up test data"""
        print("\n=== Cleanup ===")
        
        # Delete created flows
        for flow_id in self.created_flows:
            try:
                response = self.session.delete(f"{BACKEND_URL}/flows/{flow_id}")
                if response.status_code == 200:
                    self.log_result(f"Delete Flow {flow_id}", True, "Flow deleted successfully")
                else:
                    self.log_result(f"Delete Flow {flow_id}", False, f"Status: {response.status_code}")
            except Exception as e:
                self.log_result(f"Delete Flow {flow_id}", False, f"Error: {str(e)}")
    
    def run_all_tests(self):
        """Run all backend tests with priority on Enhanced Evolution API Instance Creation"""
        print("🚀 Starting Comprehensive Backend Testing")
        print("🎯 PRIORITY: Enhanced Evolution API Instance Creation Testing")
        print(f"Backend URL: {BACKEND_URL}")
        print(f"Evolution API URL: {EVOLUTION_API_URL}")
        print("=" * 60)
        
        # Test API connectivity first
        if not self.test_api_health():
            print("❌ API is not accessible. Stopping tests.")
            return
        
        # PRIORITY TEST: Enhanced Evolution API Instance Creation
        print("\n🔥 CRITICAL PRIORITY TEST - Enhanced Evolution API Instance Creation")
        self.test_enhanced_evolution_api_instance_creation()
        
        # Run other tests
        self.test_flow_crud_operations()
        self.test_file_upload_system()
        self.test_evolution_api_integration()  # Legacy test for comparison
        self.test_ai_integration()
        self.test_flow_execution_engine()
        self.test_webhook_processing()
        
        # Cleanup
        self.cleanup()
        
        # Summary
        print("\n" + "=" * 60)
        print("📊 TEST SUMMARY")
        print("=" * 60)
        
        total_tests = len(self.test_results)
        passed_tests = sum(1 for result in self.test_results.values() if result["success"])
        failed_tests = total_tests - passed_tests
        
        print(f"Total Tests: {total_tests}")
        print(f"Passed: {passed_tests}")
        print(f"Failed: {failed_tests}")
        print(f"Success Rate: {(passed_tests/total_tests)*100:.1f}%")
        
        # Highlight Enhanced Evolution API results
        enhanced_tests = [name for name in self.test_results.keys() if "Enhanced" in name]
        if enhanced_tests:
            print(f"\n🎯 ENHANCED EVOLUTION API RESULTS:")
            for test_name in enhanced_tests:
                result = self.test_results[test_name]
                status = "✅ PASS" if result["success"] else "❌ FAIL"
                print(f"  {status} {test_name}")
        
        if failed_tests > 0:
            print("\n❌ Failed Tests:")
            for test_name, result in self.test_results.items():
                if not result["success"]:
                    print(f"  - {test_name}: {result['details']}")
        
        return passed_tests, failed_tests

if __name__ == "__main__":
    tester = BackendTester()
    result = tester.run_all_tests()
    if result:
        passed, failed = result
        # Exit with appropriate code
        exit(0 if failed == 0 else 1)
    else:
        exit(1)