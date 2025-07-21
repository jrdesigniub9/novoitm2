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
BACKEND_URL = "https://c44aa712-8cd0-4523-921f-e3523a9c7602.preview.emergentagent.com/api"
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
    
    def test_evolution_api_integration(self):
        """Test Evolution API Integration"""
        print("\n=== Testing Evolution API Integration ===")
        
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
    
    def test_webhook_processing(self):
        """Test Webhook Processing"""
        print("\n=== Testing Webhook Processing ===")
        
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
        """Run all backend tests"""
        print("🚀 Starting Comprehensive Backend Testing")
        print(f"Backend URL: {BACKEND_URL}")
        print(f"Evolution API URL: {EVOLUTION_API_URL}")
        print("=" * 60)
        
        # Test API connectivity first
        if not self.test_api_health():
            print("❌ API is not accessible. Stopping tests.")
            return
        
        # Run all tests
        self.test_flow_crud_operations()
        self.test_file_upload_system()
        self.test_evolution_api_integration()
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
        
        if failed_tests > 0:
            print("\n❌ Failed Tests:")
            for test_name, result in self.test_results.items():
                if not result["success"]:
                    print(f"  - {test_name}: {result['details']}")
        
        return passed_tests, failed_tests

if __name__ == "__main__":
    tester = BackendTester()
    passed, failed = tester.run_all_tests()
    
    # Exit with appropriate code
    exit(0 if failed == 0 else 1)