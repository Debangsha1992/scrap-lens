#!/usr/bin/env python3
"""
Test script for Railway deployed SAM2 service endpoints
"""

import requests
import json
import sys

def test_endpoint(url, endpoint_name):
    """Test a single endpoint"""
    try:
        print(f"\n🔍 Testing {endpoint_name}: {url}")
        response = requests.get(url, timeout=10)
        
        print(f"Status Code: {response.status_code}")
        
        if response.status_code == 200:
            print("✅ SUCCESS")
            try:
                json_response = response.json()
                print(f"Response: {json.dumps(json_response, indent=2)}")
            except:
                print(f"Response: {response.text}")
        else:
            print(f"❌ FAILED - Status: {response.status_code}")
            print(f"Response: {response.text}")
            
    except requests.exceptions.RequestException as e:
        print(f"❌ ERROR: {e}")

def main():
    # Replace this with your actual Railway URL
    BASE_URL = input("Enter your Railway URL (e.g., https://scrap-lens-production.up.railway.app): ").strip()
    
    if not BASE_URL.startswith('http'):
        BASE_URL = f"https://{BASE_URL}"
    
    print(f"\n🚀 Testing SAM2 Service at: {BASE_URL}")
    print("=" * 60)
    
    # Test all endpoints
    endpoints = [
        ("/ping", "Ping Endpoint"),
        ("/health", "Health Check"),
        ("/", "Root Endpoint")
    ]
    
    for path, name in endpoints:
        test_endpoint(f"{BASE_URL}{path}", name)
    
    print("\n" + "=" * 60)
    print("🏁 Testing complete!")

if __name__ == "__main__":
    main() 