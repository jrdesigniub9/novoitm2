#!/usr/bin/env python3
"""
Focused Evolution API Integration Testing
Tests the specific fixes implemented for Evolution API integration
"""

import requests
import json
import time
import uuid
from datetime import datetime

# Configuration
BACKEND_URL = "https://187c0a07-644e-4020-bd91-a200d3d93fdc.preview.emergentagent.com/api"
EVOLUTION_API_URL = "http://apiwhatsapp.maapletech.com.br"
EVOLUTION_API_KEY = "322683C4C655415CAAFFFE10F7D57E11"

# Test data
TEST_INSTANCE_NAME = f"test_instance_{int(time.time())}"

class EvolutionAPITester:
    def __init__(self):
        self.session = requests.Session()
        self.test_results = {}
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
    
    def test_instance_creation(self):
        """Test POST /api/evolution/instances - Instance Creation"""
        print("\n=== Testing Instance Creation ===")
        
        try:
            data = {"instance_name": TEST_INSTANCE_NAME}
            response = self.session.post(f"{BACKEND_URL}/evolution/instances", data=data)
            
            print(f"Request URL: {BACKEND_URL}/evolution/instances")
            print(f"Request Data: {data}")
            print(f"Response Status: {response.status_code}")
            print(f"Response Text: {response.text}")
            
            if response.status_code == 200:
                instance = response.json()
                self.created_instances.append(TEST_INSTANCE_NAME)
                self.log_result("Create Evolution Instance", True, 
                              f"Instance: {instance.get('instanceName')}, Key: {instance.get('instanceKey', 'N/A')}")
                return True
            else:
                self.log_result("Create Evolution Instance", False, 
                              f"Status: {response.status_code}, Response: {response.text}")
                return False
        except Exception as e:
            self.log_result("Create Evolution Instance", False, f"Error: {str(e)}")
            return False
    
    def test_instance_listing(self):
        """Test GET /api/evolution/instances - Instance Listing"""
        print("\n=== Testing Instance Listing ===")
        
        try:
            response = self.session.get(f"{BACKEND_URL}/evolution/instances")
            
            print(f"Request URL: {BACKEND_URL}/evolution/instances")
            print(f"Response Status: {response.status_code}")
            print(f"Response Text: {response.text}")
            
            if response.status_code == 200:
                instances = response.json()
                self.log_result("Get Evolution Instances", True, 
                              f"Found {len(instances)} instances. Instance names: {[inst.get('instanceName') for inst in instances]}")
                return True
            else:
                self.log_result("Get Evolution Instances", False, 
                              f"Status: {response.status_code}, Response: {response.text}")
                return False
        except Exception as e:
            self.log_result("Get Evolution Instances", False, f"Error: {str(e)}")
            return False
    
    def test_qr_code_generation(self):
        """Test GET /api/evolution/instances/{instance_name}/qr - QR Code Generation"""
        print("\n=== Testing QR Code Generation ===")
        
        if not self.created_instances:
            self.log_result("Get QR Code", False, "No instances available for QR code testing")
            return False
        
        instance_name = self.created_instances[0]
        
        try:
            response = self.session.get(f"{BACKEND_URL}/evolution/instances/{instance_name}/qr")
            
            print(f"Request URL: {BACKEND_URL}/evolution/instances/{instance_name}/qr")
            print(f"Response Status: {response.status_code}")
            print(f"Response Text: {response.text}")
            
            if response.status_code == 200:
                qr_data = response.json()
                has_qr = bool(qr_data.get("qrcode"))
                success = qr_data.get("success", False)
                self.log_result("Get QR Code", True, 
                              f"Success: {success}, Has QR Code: {has_qr}, Data keys: {list(qr_data.keys())}")
                return True
            else:
                self.log_result("Get QR Code", False, 
                              f"Status: {response.status_code}, Response: {response.text}")
                return False
        except Exception as e:
            self.log_result("Get QR Code", False, f"Error: {str(e)}")
            return False
    
    def test_direct_evolution_api(self):
        """Test direct Evolution API calls to verify credentials"""
        print("\n=== Testing Direct Evolution API ===")
        
        # Test direct instance creation
        headers = {
            "apikey": EVOLUTION_API_KEY,
            "Content-Type": "application/json"
        }
        payload = {
            "instanceName": f"direct_test_{int(time.time())}",
            "qrcode": True,
            "integration": "WHATSAPP-BAILEYS"
        }
        
        try:
            response = requests.post(
                f"{EVOLUTION_API_URL}/instance/create",
                headers=headers,
                json=payload
            )
            
            print(f"Direct Evolution API URL: {EVOLUTION_API_URL}/instance/create")
            print(f"Direct API Response Status: {response.status_code}")
            print(f"Direct API Response: {response.text}")
            
            if response.status_code in [200, 201]:
                self.log_result("Direct Evolution API Test", True, 
                              f"Direct API working. Status: {response.status_code}")
                return True
            else:
                self.log_result("Direct Evolution API Test", False, 
                              f"Direct API failed. Status: {response.status_code}, Response: {response.text}")
                return False
        except Exception as e:
            self.log_result("Direct Evolution API Test", False, f"Error: {str(e)}")
            return False
    
    def run_evolution_tests(self):
        """Run focused Evolution API tests"""
        print("🚀 Starting Evolution API Integration Testing")
        print(f"Backend URL: {BACKEND_URL}")
        print(f"Evolution API URL: {EVOLUTION_API_URL}")
        print(f"Test Instance Name: {TEST_INSTANCE_NAME}")
        print("=" * 60)
        
        # Test API connectivity first
        if not self.test_api_health():
            print("❌ Backend API is not accessible. Stopping tests.")
            return False
        
        # Test direct Evolution API first
        self.test_direct_evolution_api()
        
        # Test the three critical areas
        instance_created = self.test_instance_creation()
        
        # Wait a moment for instance to be processed
        if instance_created:
            print("⏳ Waiting 3 seconds for instance to be processed...")
            time.sleep(3)
        
        self.test_instance_listing()
        self.test_qr_code_generation()
        
        # Summary
        print("\n" + "=" * 60)
        print("📊 EVOLUTION API TEST SUMMARY")
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
        else:
            print("\n✅ All Evolution API tests passed!")
        
        return failed_tests == 0

if __name__ == "__main__":
    tester = EvolutionAPITester()
    success = tester.run_evolution_tests()
    exit(0 if success else 1)