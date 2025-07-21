#!/usr/bin/env python3
"""
Focused AI Sentiment Analysis Testing
Tests the sentiment analysis functionality with Portuguese messages
"""

import requests
import json

# Configuration
BACKEND_URL = "https://214014b5-ace7-45cb-9a96-c040950b303d.preview.emergentagent.com/api"

def test_sentiment_analysis():
    """Test sentiment analysis with various Portuguese messages"""
    
    test_cases = [
        {
            "message": "Adorei o produto! Está perfeito, muito obrigado!",
            "expected_sentiment": "positive",
            "description": "Very positive message"
        },
        {
            "message": "Não quero mais isso, cancelar tudo agora!",
            "expected_sentiment": "negative",
            "expected_disinterest": True,
            "description": "Negative with disinterest"
        },
        {
            "message": "Não entendi como funciona isso, pode me explicar?",
            "expected_doubt": True,
            "description": "Confused/doubt message"
        },
        {
            "message": "Quanto custa o produto básico?",
            "expected_sentiment": "neutral",
            "description": "Neutral inquiry"
        },
        {
            "message": "Estou muito frustrado com esse serviço, é horrível!",
            "expected_sentiment": "negative",
            "description": "Strong negative sentiment"
        },
        {
            "message": "O que é isso? Como funciona? Estou confuso...",
            "expected_doubt": True,
            "description": "Multiple doubt indicators"
        }
    ]
    
    session = requests.Session()
    
    print("🧠 Testing AI Sentiment Analysis")
    print("=" * 50)
    
    for i, test_case in enumerate(test_cases, 1):
        print(f"\n{i}. {test_case['description']}")
        print(f"   Message: '{test_case['message']}'")
        
        try:
            params = {"message": test_case["message"]}
            response = session.post(f"{BACKEND_URL}/ai/test", params=params)
            
            if response.status_code == 200:
                result = response.json()
                sentiment = result.get("sentiment", {})
                ai_response = result.get("ai_response", "")
                
                print(f"   ✅ Status: SUCCESS")
                print(f"   📊 Sentiment Class: {sentiment.get('sentiment_class', 'unknown')}")
                print(f"   📈 Polarity: {sentiment.get('polarity', 0):.2f}")
                print(f"   🎯 Confidence: {sentiment.get('confidence', 0):.2f}")
                print(f"   ❓ Has Doubt: {sentiment.get('has_doubt', False)}")
                print(f"   😞 Has Disinterest: {sentiment.get('has_disinterest', False)}")
                print(f"   🤖 AI Response: {ai_response[:100]}...")
                
                # Validate expectations
                if "expected_sentiment" in test_case:
                    actual = sentiment.get('sentiment_class', 'unknown')
                    expected = test_case['expected_sentiment']
                    if actual == expected:
                        print(f"   ✅ Sentiment classification: CORRECT ({expected})")
                    else:
                        print(f"   ❌ Sentiment classification: INCORRECT (expected {expected}, got {actual})")
                
                if "expected_doubt" in test_case:
                    actual = sentiment.get('has_doubt', False)
                    expected = test_case['expected_doubt']
                    if actual == expected:
                        print(f"   ✅ Doubt detection: CORRECT ({expected})")
                    else:
                        print(f"   ❌ Doubt detection: INCORRECT (expected {expected}, got {actual})")
                
                if "expected_disinterest" in test_case:
                    actual = sentiment.get('has_disinterest', False)
                    expected = test_case['expected_disinterest']
                    if actual == expected:
                        print(f"   ✅ Disinterest detection: CORRECT ({expected})")
                    else:
                        print(f"   ❌ Disinterest detection: INCORRECT (expected {expected}, got {actual})")
                        
            else:
                print(f"   ❌ Status: FAILED ({response.status_code})")
                print(f"   Error: {response.text}")
                
        except Exception as e:
            print(f"   ❌ Status: ERROR")
            print(f"   Exception: {str(e)}")

if __name__ == "__main__":
    test_sentiment_analysis()