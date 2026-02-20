#!/usr/bin/env python3
"""
Backend API Testing for Talentos Financial Management System
Tests all endpoints with session-based authentication
"""

import requests
import sys
import json
from datetime import datetime, timedelta
from typing import Dict, Any, Optional

# Use the public URL from frontend/.env
BACKEND_URL = "https://frontend-preview-12.preview.emergentagent.com"
API_BASE = f"{BACKEND_URL}/api"

class TalentosAPITester:
    def __init__(self):
        self.session = requests.Session()
        self.session.headers.update({
            'Content-Type': 'application/json'
        })
        self.user_data = None
        self.company_data = None
        self.test_results = {
            'total': 0,
            'passed': 0,
            'failed': 0,
            'errors': []
        }
    
    def log_test(self, name: str, success: bool, error: str = ""):
        """Log test result"""
        self.test_results['total'] += 1
        if success:
            self.test_results['passed'] += 1
            print(f"✅ {name}")
        else:
            self.test_results['failed'] += 1
            self.test_results['errors'].append(f"{name}: {error}")
            print(f"❌ {name}: {error}")
    
    def make_request(self, method: str, endpoint: str, data: Optional[Dict] = None, 
                    headers: Optional[Dict] = None, expected_status: int = 200) -> tuple[bool, Dict]:
        """Make HTTP request and handle response"""
        url = f"{API_BASE}/{endpoint.lstrip('/')}"
        
        # Add company header if available
        if self.company_data and headers is None:
            headers = {}
        if self.company_data and headers is not None:
            headers['X-Company-ID'] = self.company_data['id']
        
        try:
            if method == 'GET':
                response = self.session.get(url, headers=headers)
            elif method == 'POST':
                response = self.session.post(url, json=data, headers=headers)
            elif method == 'PUT':
                response = self.session.put(url, json=data, headers=headers)
            elif method == 'DELETE':
                response = self.session.delete(url, headers=headers)
            else:
                return False, {"error": f"Unsupported method: {method}"}
            
            if response.status_code != expected_status:
                return False, {
                    "error": f"Expected {expected_status}, got {response.status_code}",
                    "response": response.text[:200]
                }
            
            try:
                return True, response.json()
            except:
                return True, {"message": "Success (no JSON response)"}
                
        except Exception as e:
            return False, {"error": str(e)}
    
    def test_root_endpoint(self):
        """Test API root endpoint"""
        success, data = self.make_request('GET', '/')
        self.log_test("API Root Endpoint", success, 
                     data.get('error', '') if not success else "")
        return success
    
    def test_user_registration(self):
        """Test user registration"""
        timestamp = datetime.now().strftime("%H%M%S")
        user_data = {
            "email": f"test_{timestamp}@talentos.com",
            "password": "TestPass123!",
            "name": f"Test User {timestamp}"
        }
        
        success, data = self.make_request('POST', '/auth/register', user_data)
        if success:
            self.user_data = data
        
        self.log_test("User Registration", success, 
                     data.get('error', '') if not success else "")
        return success
    
    def test_user_login(self):
        """Test user login with registered credentials"""
        if not self.user_data:
            self.log_test("User Login", False, "No user data from registration")
            return False
        
        login_data = {
            "email": self.user_data['email'],
            "password": "TestPass123!"
        }
        
        success, data = self.make_request('POST', '/auth/login', login_data)
        self.log_test("User Login", success, 
                     data.get('error', '') if not success else "")
        return success
    
    def test_get_user_profile(self):
        """Test getting user profile"""
        success, data = self.make_request('GET', '/auth/me')
        self.log_test("Get User Profile", success, 
                     data.get('error', '') if not success else "")
        return success
    
    def test_company_creation(self):
        """Test company creation with CNPJ"""
        timestamp = datetime.now().strftime("%H%M%S")
        company_data = {
            "name": f"Test Company {timestamp}",
            "cnpj": "12345678901234"  # Valid 14-digit CNPJ
        }
        
        success, data = self.make_request('POST', '/companies', company_data, expected_status=200)
        if success:
            self.company_data = data
        
        self.log_test("Company Creation", success, 
                     data.get('error', '') if not success else "")
        return success
    
    def test_get_companies(self):
        """Test getting user's companies"""
        success, data = self.make_request('GET', '/companies')
        self.log_test("Get Companies", success and len(data) > 0, 
                     data.get('error', 'No companies found') if not success or len(data) == 0 else "")
        return success and len(data) > 0
    
    def test_product_crud(self):
        """Test complete product CRUD operations"""
        if not self.company_data:
            self.log_test("Product CRUD", False, "No company selected")
            return False
        
        # Create product
        product_data = {
            "name": "Test Product",
            "price": 49.90,
            "cost": 20.00,
            "stock": 100,
            "min_stock": 10,
            "category": "Test Category"
        }
        
        success, data = self.make_request('POST', '/products', product_data)
        if not success:
            self.log_test("Product Create", False, data.get('error', ''))
            return False
        
        product_id = data.get('id')
        if not product_id:
            self.log_test("Product Create", False, "No product ID returned")
            return False
        
        self.log_test("Product Create", True)
        
        # Get products
        success, data = self.make_request('GET', '/products')
        if not success or len(data) == 0:
            self.log_test("Product List", False, "Failed to list products")
            return False
        
        self.log_test("Product List", True)
        
        # Update product
        update_data = {
            "name": "Updated Test Product",
            "price": 59.90,
            "stock": 90
        }
        
        success, data = self.make_request('PUT', f'/products/{product_id}', update_data)
        self.log_test("Product Update", success, data.get('error', '') if not success else "")
        
        # Delete product
        success, data = self.make_request('DELETE', f'/products/{product_id}')
        self.log_test("Product Delete", success, data.get('error', '') if not success else "")
        
        return True
    
    def test_sales_crud(self):
        """Test sales operations with inventory checking"""
        if not self.company_data:
            self.log_test("Sales CRUD", False, "No company selected")
            return False
        
        # First create a product for sales
        product_data = {
            "name": "Sales Test Product",
            "price": 29.90,
            "cost": 15.00,
            "stock": 50,
            "min_stock": 5,
            "category": "Sales Test"
        }
        
        success, product = self.make_request('POST', '/products', product_data)
        if not success:
            self.log_test("Sales - Product Setup", False, "Failed to create test product")
            return False
        
        product_id = product.get('id')
        
        # Create sale
        sale_data = {
            "product_id": product_id,
            "quantity": 5
        }
        
        success, data = self.make_request('POST', '/sales', sale_data, expected_status=200)
        if not success:
            self.log_test("Sale Create", False, data.get('error', ''))
            return False
        
        sale_id = data.get('id')
        self.log_test("Sale Create", True)
        
        # Get sales
        success, data = self.make_request('GET', '/sales')
        if not success or len(data) == 0:
            self.log_test("Sales List", False, "Failed to list sales")
            return False
        
        self.log_test("Sales List", True)
        
        # Test inventory check - try to sell more than available
        oversale_data = {
            "product_id": product_id,
            "quantity": 100  # More than stock
        }
        
        success, data = self.make_request('POST', '/sales', oversale_data, expected_status=400)
        if success:  # Should fail with 400
            self.log_test("Inventory Check", False, "Should have failed with insufficient stock")
        else:
            self.log_test("Inventory Check", True)
        
        # Delete sale (should restore inventory)
        success, data = self.make_request('DELETE', f'/sales/{sale_id}')
        self.log_test("Sale Delete", success, data.get('error', '') if not success else "")
        
        # Cleanup product
        self.make_request('DELETE', f'/products/{product_id}')
        
        return True
    
    def test_bills_crud(self):
        """Test bills/accounts CRUD operations"""
        if not self.company_data:
            self.log_test("Bills CRUD", False, "No company selected")
            return False
        
        # Create bill
        due_date = (datetime.now() + timedelta(days=7)).isoformat()
        bill_data = {
            "description": "Test Bill Payment",
            "amount": 350.00,
            "due_date": due_date,
            "category": "Test"
        }
        
        success, data = self.make_request('POST', '/bills', bill_data)
        if not success:
            self.log_test("Bill Create", False, data.get('error', ''))
            return False
        
        bill_id = data.get('id')
        self.log_test("Bill Create", True)
        
        # Get bills
        success, data = self.make_request('GET', '/bills')
        if not success or len(data) == 0:
            self.log_test("Bills List", False, "Failed to list bills")
            return False
        
        self.log_test("Bills List", True)
        
        # Mark bill as paid
        success, data = self.make_request('PUT', f'/bills/{bill_id}/pay')
        self.log_test("Mark Bill as Paid", success, data.get('error', '') if not success else "")
        
        # Delete bill
        success, data = self.make_request('DELETE', f'/bills/{bill_id}')
        self.log_test("Bill Delete", success, data.get('error', '') if not success else "")
        
        return True
    
    def test_dashboard_stats(self):
        """Test dashboard statistics"""
        if not self.company_data:
            self.log_test("Dashboard Stats", False, "No company selected")
            return False
        
        success, data = self.make_request('GET', '/dashboard/stats')
        if success:
            required_fields = ['sales_today', 'sales_month', 'bills_to_pay', 'profit_month', 'low_stock_count']
            missing_fields = [field for field in required_fields if field not in data]
            if missing_fields:
                self.log_test("Dashboard Stats", False, f"Missing fields: {missing_fields}")
                return False
        
        self.log_test("Dashboard Stats", success, data.get('error', '') if not success else "")
        return success
    
    def test_notifications(self):
        """Test notifications endpoint"""
        success, data = self.make_request('GET', '/notifications')
        if success:
            has_notifications = 'notifications' in data and isinstance(data['notifications'], list)
            self.log_test("Notifications", has_notifications, 
                         "Invalid notifications format" if not has_notifications else "")
            return has_notifications
        
        self.log_test("Notifications", False, data.get('error', ''))
        return False
    
    def test_data_export(self):
        """Test CSV data export functionality"""
        if not self.company_data:
            self.log_test("Data Export", False, "No company selected")
            return False
        
        # Test export endpoints
        endpoints = ['sales', 'products', 'bills']
        all_success = True
        
        for endpoint in endpoints:
            # Note: Using requests instead of session for blob response
            url = f"{API_BASE}/export/{endpoint}?format=csv"
            headers = {'X-Company-ID': self.company_data['id']}
            
            try:
                response = self.session.get(url, headers=headers)
                success = response.status_code == 200
                self.log_test(f"Export {endpoint.title()}", success, 
                             f"Status: {response.status_code}" if not success else "")
                if not success:
                    all_success = False
            except Exception as e:
                self.log_test(f"Export {endpoint.title()}", False, str(e))
                all_success = False
        
        return all_success
    
    def test_seed_data(self):
        """Test demo data loading"""
        if not self.company_data:
            self.log_test("Seed Data", False, "No company selected")
            return False
        
        success, data = self.make_request('POST', '/seed')
        self.log_test("Load Demo Data", success, data.get('error', '') if not success else "")
        return success
    
    def test_clear_data(self):
        """Test data clearing"""
        if not self.company_data:
            self.log_test("Clear Data", False, "No company selected")
            return False
        
        success, data = self.make_request('POST', '/clear')
        self.log_test("Clear Data", success, data.get('error', '') if not success else "")
        return success
    
    def test_logout(self):
        """Test user logout"""
        success, data = self.make_request('POST', '/auth/logout')
        self.log_test("User Logout", success, data.get('error', '') if not success else "")
        return success
    
    def run_all_tests(self):
        """Run complete test suite"""
        print("🧪 Starting Talentos Financial System Backend Tests")
        print("=" * 60)
        
        # Authentication flow
        if not self.test_root_endpoint():
            return False
        
        if not self.test_user_registration():
            return False
        
        if not self.test_user_login():
            return False
        
        self.test_get_user_profile()
        
        # Company setup
        if not self.test_company_creation():
            return False
        
        self.test_get_companies()
        
        # Business operations
        self.test_product_crud()
        self.test_sales_crud()
        self.test_bills_crud()
        
        # Analytics and reporting
        self.test_dashboard_stats()
        self.test_notifications()
        self.test_data_export()
        
        # Data management
        self.test_seed_data()
        self.test_clear_data()
        
        # Cleanup
        self.test_logout()
        
        return True
    
    def print_summary(self):
        """Print test summary"""
        print("\n" + "=" * 60)
        print("📊 TEST SUMMARY")
        print("=" * 60)
        print(f"Total Tests: {self.test_results['total']}")
        print(f"Passed: {self.test_results['passed']} ✅")
        print(f"Failed: {self.test_results['failed']} ❌")
        print(f"Success Rate: {(self.test_results['passed']/self.test_results['total']*100):.1f}%")
        
        if self.test_results['errors']:
            print("\n🚨 FAILED TESTS:")
            for error in self.test_results['errors']:
                print(f"  • {error}")
        
        return self.test_results['failed'] == 0

def main():
    """Main test execution"""
    tester = TalentosAPITester()
    
    try:
        tester.run_all_tests()
        success = tester.print_summary()
        
        # Save results to file for reference
        with open('/app/test_results_backend.json', 'w') as f:
            json.dump(tester.test_results, f, indent=2)
        
        return 0 if success else 1
    
    except Exception as e:
        print(f"💥 Critical error during testing: {e}")
        return 1

if __name__ == "__main__":
    sys.exit(main())