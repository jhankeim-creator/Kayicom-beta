#!/usr/bin/env python3
"""
Debug test to identify the issue
"""

import requests
import json
import traceback

BASE_URL = "https://crypto-shop-4.preview.emergentagent.com/api"

class DebugTester:
    def __init__(self):
        self.session = requests.Session()
        
    def test_products(self):
        """Test product endpoints"""
        print("📦 Testing Products...")
        
        try:
            response = self.session.get(f"{BASE_URL}/products")
            print(f"Products list status: {response.status_code}")
            
            if response.status_code == 200:
                products = response.json()
                print(f"✅ Products retrieved successfully. Count: {len(products)}")
                return True
            else:
                print(f"❌ Products list failed: {response.text}")
                return False
                
        except Exception as e:
            print(f"❌ Products error: {str(e)}")
            traceback.print_exc()
            return False

if __name__ == "__main__":
    tester = DebugTester()
    
    # Test calling the method directly
    print("Testing method call...")
    try:
        result = tester.test_products()
        print(f"Result: {result}")
    except Exception as e:
        print(f"Exception: {e}")
        traceback.print_exc()
    
    # Test calling via list
    print("\nTesting via list...")
    try:
        test_methods = [('Products', tester.test_products)]
        for name, method in test_methods:
            print(f"Calling {name}...")
            result = method()
            print(f"Result: {result}")
    except Exception as e:
        print(f"Exception: {e}")
        traceback.print_exc()