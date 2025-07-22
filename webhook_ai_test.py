#!/usr/bin/env python3
"""
Test webhook message processing with AI
"""

import requests
import json
import time

# Configuration
BACKEND_URL = "https://7d1fd1b6-3784-4af6-9714-560c26782aea.preview.emergentagent.com/api"
TEST_INSTANCE_NAME = "test_instance_ai"

def test_webhook_ai_processing():
    """Test webhook processing with AI integration"""
    
    session = requests.Session()
    
    print("🤖 Testing Webhook AI Message Processing")
    print("=" * 50)
    
    # Test webhook with incoming message (AI processing)
    webhook_data = {
        "type": "messages.upsert",
        "instance": TEST_INSTANCE_NAME,
        "data": {
            "key": {
                "remoteJid": "5511999999999@s.whatsapp.net",
                "fromMe": False,
                "id": "test_message_id_" + str(int(time.time()))
            },
            "message": {
                "conversation": "Não quero mais receber essas mensagens, cancelar tudo!"
            }
        }
    }
    
    print(f"Sending webhook message: '{webhook_data['data']['message']['conversation']}'")
    
    try:
        response = session.post(f"{BACKEND_URL}/evolution/webhook", json=webhook_data)
        if response.status_code == 200:
            result = response.json()
            print(f"✅ Webhook processed successfully: {result}")
            
            # Wait a moment for processing
            time.sleep(2)
            
            # Check AI sessions to see if session was created
            sessions_response = session.get(f"{BACKEND_URL}/ai/sessions")
            if sessions_response.status_code == 200:
                sessions = sessions_response.json()
                print(f"📊 AI Sessions found: {len(sessions)}")
                for session_data in sessions:
                    if session_data.get('instanceName') == TEST_INSTANCE_NAME:
                        print(f"   - Session ID: {session_data.get('id')}")
                        print(f"   - Contact: {session_data.get('contactNumber')}")
                        print(f"   - Context messages: {len(session_data.get('context', []))}")
                        print(f"   - Sentiment: {session_data.get('sentimentAnalysis', {})}")
            
            # Check AI responses
            responses_response = session.get(f"{BACKEND_URL}/ai/responses?limit=5")
            if responses_response.status_code == 200:
                responses = responses_response.json()
                print(f"🤖 AI Responses found: {len(responses)}")
                for response_data in responses:
                    print(f"   - User: {response_data.get('userMessage', '')[:50]}...")
                    print(f"   - AI: {response_data.get('aiResponse', '')[:50]}...")
                    print(f"   - Sentiment: {response_data.get('sentiment', {}).get('sentiment_class', 'unknown')}")
            
        else:
            print(f"❌ Webhook failed: {response.status_code}")
            print(f"Response: {response.text}")
            
    except Exception as e:
        print(f"❌ Error: {str(e)}")

if __name__ == "__main__":
    test_webhook_ai_processing()