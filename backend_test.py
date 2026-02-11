import requests
import sys
from datetime import datetime
import json

BACKEND_URL = "https://fintech-login-2.preview.emergentagent.com"
API_BASE = f"{BACKEND_URL}/api"

class TalentosAPITester:
    def __init__(self):
        self.tests_run = 0
        self.tests_passed = 0
        self.token = None
        self.user_id = None
        self.company_id = None

    def run_test(self, name, method, endpoint, expected_status, data=None, headers=None):
        """Run a single API test"""
        url = f"{API_BASE}/{endpoint}"
        request_headers = {'Content-Type': 'application/json'}
        
        if headers:
            request_headers.update(headers)
        
        if self.token:
            request_headers['Authorization'] = f'Bearer {self.token}'

        self.tests_run += 1
        print(f"\n🔍 Testing {name}...")
        print(f"   URL: {url}")
        
        try:
            if method == 'GET':
                response = requests.get(url, headers=request_headers, timeout=10)
            elif method == 'POST':
                response = requests.post(url, json=data, headers=request_headers, timeout=10)
            elif method == 'PUT':
                response = requests.put(url, json=data, headers=request_headers, timeout=10)
            elif method == 'DELETE':
                response = requests.delete(url, headers=request_headers, timeout=10)

            success = response.status_code == expected_status
            
            if success:
                self.tests_passed += 1
                print(f"✅ Passed - Status: {response.status_code}")
                try:
                    response_data = response.json()
                    print(f"   Response: {json.dumps(response_data, indent=2)[:200]}...")
                    return True, response_data
                except:
                    return True, {}
            else:
                print(f"❌ Failed - Expected {expected_status}, got {response.status_code}")
                try:
                    error_detail = response.json()
                    print(f"   Error: {error_detail}")
                except:
                    print(f"   Response text: {response.text}")
                return False, {}

        except Exception as e:
            print(f"❌ Failed - Connection Error: {str(e)}")
            return False, {}

    def test_root_endpoint(self):
        """Test API root endpoint"""
        return self.run_test("API Root", "GET", "", 200)

    def test_register(self):
        """Test user registration"""
        test_data = {
            "name": "Teste Usuario",
            "email": "teste@teste.com", 
            "password": "123456",
            "company_name": "Empresa Teste"
        }
        
        success, response = self.run_test(
            "User Registration", 
            "POST", 
            "auth/register", 
            200,
            data=test_data
        )
        
        if success and 'token' in response and 'user' in response:
            self.token = response['token']
            self.user_id = response['user']['id']
            self.company_id = response['user']['company_id']
            print(f"   Token obtained: {self.token[:50]}...")
            return True
        return False

    def test_login(self):
        """Test user login with test credentials"""
        test_data = {
            "email": "teste@teste.com",
            "password": "123456"
        }
        
        success, response = self.run_test(
            "User Login", 
            "POST", 
            "auth/login", 
            200,
            data=test_data
        )
        
        if success and 'token' in response and 'user' in response:
            self.token = response['token']
            self.user_id = response['user']['id']
            self.company_id = response['user']['company_id']
            print(f"   Login successful with token: {self.token[:50]}...")
            return True
        return False

    def test_dashboard_stats(self):
        """Test dashboard statistics endpoint"""
        return self.run_test("Dashboard Stats", "GET", "dashboard/stats", 200)

    def test_clients_crud(self):
        """Test clients CRUD operations"""
        # Get clients list
        success, _ = self.run_test("Get Clients", "GET", "clients", 200)
        if not success:
            return False
            
        # Create client
        client_data = {
            "name": "Cliente Teste",
            "email": "cliente@teste.com", 
            "phone": "11999999999",
            "cpf_cnpj": "12345678900"
        }
        
        success, response = self.run_test("Create Client", "POST", "clients", 200, data=client_data)
        if not success:
            return False
            
        client_id = response.get('id')
        if client_id:
            # Delete client
            success, _ = self.run_test(f"Delete Client", "DELETE", f"clients/{client_id}", 200)
            return success
        return False

    def test_products_crud(self):
        """Test products CRUD operations"""
        # Get products list
        success, _ = self.run_test("Get Products", "GET", "products", 200)
        if not success:
            return False
            
        # Create product
        product_data = {
            "name": "Produto Teste",
            "description": "Descricao do produto teste",
            "price": 19.99,
            "stock": 10,
            "expiry_date": "2024-12-31"
        }
        
        success, response = self.run_test("Create Product", "POST", "products", 200, data=product_data)
        if not success:
            return False
            
        product_id = response.get('id')
        if product_id:
            # Delete product
            success, _ = self.run_test(f"Delete Product", "DELETE", f"products/{product_id}", 200)
            return success
        return False

    def test_bills_crud(self):
        """Test bills CRUD operations"""
        # Get bills list
        success, _ = self.run_test("Get Bills", "GET", "bills", 200)
        if not success:
            return False
            
        # Create bill
        bill_data = {
            "description": "Conta Teste",
            "value": 100.50,
            "type": "payable",
            "status": "pending",
            "due_date": "2024-09-30",
            "category": "Utilities"
        }
        
        success, response = self.run_test("Create Bill", "POST", "bills", 200, data=bill_data)
        if not success:
            return False
            
        bill_id = response.get('id')
        if bill_id:
            # Update bill status
            update_data = {"status": "paid"}
            success, _ = self.run_test(f"Update Bill Status", "PUT", f"bills/{bill_id}", 200, data=update_data)
            if success:
                # Delete bill
                success, _ = self.run_test(f"Delete Bill", "DELETE", f"bills/{bill_id}", 200)
                return success
        return False

    def test_sales_crud(self):
        """Test sales CRUD operations - requires client and product setup"""
        # Get sales list
        success, _ = self.run_test("Get Sales", "GET", "sales", 200)
        if not success:
            return False
            
        # Create a client first for sale
        client_data = {"name": "Cliente Venda", "email": "venda@teste.com"}
        success, client_response = self.run_test("Create Client for Sale", "POST", "clients", 200, data=client_data)
        if not success:
            return False
            
        client_id = client_response.get('id')
        
        # Create a product for sale
        product_data = {
            "name": "Produto Venda",
            "price": 25.00,
            "stock": 50
        }
        success, product_response = self.run_test("Create Product for Sale", "POST", "products", 200, data=product_data)
        if not success:
            return False
            
        product_id = product_response.get('id')
        
        # Create sale
        sale_data = {
            "client_id": client_id,
            "items": [
                {
                    "product_id": product_id,
                    "quantity": 2
                }
            ]
        }
        
        success, sale_response = self.run_test("Create Sale", "POST", "sales", 200, data=sale_data)
        
        # Clean up created resources
        if client_id:
            self.run_test("Cleanup Client", "DELETE", f"clients/{client_id}", 200)
        if product_id:
            self.run_test("Cleanup Product", "DELETE", f"products/{product_id}", 200)
            
        return success

def main():
    print("=" * 60)
    print("🧪 TALENTOS FINANCEIRO - BACKEND API TESTING")
    print("=" * 60)
    
    tester = TalentosAPITester()
    
    # Test API root
    print("\n📡 Testing API connectivity...")
    if not tester.test_root_endpoint():
        print("❌ API is not accessible, stopping tests")
        return 1
    
    # Test registration (in case user doesn't exist)
    print("\n👤 Testing User Registration...")
    register_success = tester.test_register()
    
    # Test login 
    print("\n🔐 Testing User Login...")
    if not tester.test_login():
        print("❌ Login failed, stopping authenticated tests")
        return 1
    
    # Test dashboard
    print("\n📊 Testing Dashboard...")
    tester.test_dashboard_stats()
    
    # Test CRUD operations
    print("\n👥 Testing Clients CRUD...")
    tester.test_clients_crud()
    
    print("\n📦 Testing Products CRUD...")
    tester.test_products_crud()
    
    print("\n📋 Testing Bills CRUD...")
    tester.test_bills_crud()
    
    print("\n💰 Testing Sales CRUD...")
    tester.test_sales_crud()
    
    # Print final results
    print("\n" + "=" * 60)
    print(f"📊 FINAL RESULTS: {tester.tests_passed}/{tester.tests_run} tests passed")
    success_rate = (tester.tests_passed / tester.tests_run * 100) if tester.tests_run > 0 else 0
    print(f"📈 Success Rate: {success_rate:.1f}%")
    print("=" * 60)
    
    return 0 if tester.tests_passed == tester.tests_run else 1

if __name__ == "__main__":
    sys.exit(main())