#!/usr/bin/env python3

import requests
import sys
import json
from datetime import datetime
import uuid

class KrafinkAPITester:
    def __init__(self, base_url="https://krafthub.preview.emergentagent.com"):
        self.base_url = base_url
        self.api_url = f"{base_url}/api"
        self.token = None
        self.current_user = None
        self.tests_run = 0
        self.tests_passed = 0
        self.test_results = []

    def log_test(self, name, success, details=""):
        """Log test result"""
        self.tests_run += 1
        if success:
            self.tests_passed += 1
            print(f"✅ {name} - PASSED")
        else:
            print(f"❌ {name} - FAILED: {details}")
        
        self.test_results.append({
            "test": name,
            "success": success,
            "details": details
        })

    def run_test(self, name, method, endpoint, expected_status, data=None, headers=None):
        """Run a single API test"""
        url = f"{self.api_url}/{endpoint}"
        test_headers = {'Content-Type': 'application/json'}
        
        if self.token:
            test_headers['Authorization'] = f'Bearer {self.token}'
        
        if headers:
            test_headers.update(headers)

        try:
            if method == 'GET':
                response = requests.get(url, headers=test_headers, timeout=10)
            elif method == 'POST':
                response = requests.post(url, json=data, headers=test_headers, timeout=10)
            elif method == 'PUT':
                response = requests.put(url, json=data, headers=test_headers, timeout=10)
            elif method == 'DELETE':
                response = requests.delete(url, headers=test_headers, timeout=10)

            success = response.status_code == expected_status
            
            if success:
                self.log_test(name, True)
                try:
                    return True, response.json()
                except:
                    return True, {}
            else:
                self.log_test(name, False, f"Expected {expected_status}, got {response.status_code}. Response: {response.text[:200]}")
                return False, {}

        except Exception as e:
            self.log_test(name, False, f"Request failed: {str(e)}")
            return False, {}

    def test_user_registration(self):
        """Test user registration"""
        timestamp = datetime.now().strftime('%H%M%S')
        test_user_data = {
            "email": f"testuser{timestamp}@krafink.com",
            "username": f"testuser{timestamp}",
            "name": f"Test User {timestamp}",
            "password": "TestPass123!"
        }
        
        success, response = self.run_test(
            "User Registration",
            "POST",
            "auth/register",
            200,
            data=test_user_data
        )
        
        if success and 'access_token' in response:
            self.token = response['access_token']
            self.current_user = response['user']
            return True, test_user_data
        return False, test_user_data

    def test_user_login(self, user_data):
        """Test user login"""
        login_data = {
            "email": user_data["email"],
            "password": user_data["password"]
        }
        
        success, response = self.run_test(
            "User Login",
            "POST",
            "auth/login",
            200,
            data=login_data
        )
        
        if success and 'access_token' in response:
            self.token = response['access_token']
            self.current_user = response['user']
            return True
        return False

    def test_get_current_user(self):
        """Test getting current user profile"""
        success, response = self.run_test(
            "Get Current User",
            "GET",
            "auth/me",
            200
        )
        return success

    def test_create_post(self):
        """Test creating a post"""
        post_data = {
            "content": "This is a test post from the API testing suite! 🎨 #krafink #testing",
            "visibility": "public"
        }
        
        success, response = self.run_test(
            "Create Post",
            "POST",
            "posts",
            200,
            data=post_data
        )
        
        if success and 'id' in response:
            return True, response['id']
        return False, None

    def test_get_feed(self):
        """Test getting the user feed"""
        success, response = self.run_test(
            "Get Feed",
            "GET",
            "posts/feed",
            200
        )
        
        if success and isinstance(response, list):
            return True, response
        return False, []

    def test_like_post(self, post_id):
        """Test liking a post"""
        success, response = self.run_test(
            "Like Post",
            "POST",
            f"posts/{post_id}/like",
            200
        )
        
        if success and 'liked' in response:
            return True, response['liked']
        return False, False

    def test_comment_on_post(self, post_id):
        """Test commenting on a post"""
        comment_data = {
            "content": "Great post! This is a test comment from the API testing suite."
        }
        
        success, response = self.run_test(
            "Create Comment",
            "POST",
            f"posts/{post_id}/comments",
            200,
            data=comment_data
        )
        
        if success and 'id' in response:
            return True, response['id']
        return False, None

    def test_get_post_comments(self, post_id):
        """Test getting comments for a post"""
        success, response = self.run_test(
            "Get Post Comments",
            "GET",
            f"posts/{post_id}/comments",
            200
        )
        
        if success and isinstance(response, list):
            return True, response
        return False, []

    def test_search_users(self):
        """Test user search functionality"""
        success, response = self.run_test(
            "Search Users",
            "GET",
            "search?q=test&type=users&limit=5",
            200
        )
        
        if success and isinstance(response, dict) and 'users' in response:
            return True, response['users']
        return False, []

    def test_get_user_by_username(self):
        """Test getting user by username"""
        if not self.current_user:
            self.log_test("Get User by Username", False, "No current user available")
            return False
            
        username = self.current_user.get('username')
        if not username:
            self.log_test("Get User by Username", False, "No username in current user")
            return False
            
        success, response = self.run_test(
            "Get User by Username",
            "GET",
            f"users/{username}",
            200
        )
        return success

    def test_update_profile(self):
        """Test updating user profile"""
        profile_data = {
            "bio": "Updated bio from API testing suite! 🎨",
            "links": ["https://krafink.com", "https://github.com/testuser"]
        }
        
        success, response = self.run_test(
            "Update Profile",
            "PUT",
            "users/profile",
            200,
            data=profile_data
        )
        return success

    def test_follow_functionality(self):
        """Test follow/unfollow functionality"""
        # First, we need another user to follow
        # For now, we'll test the endpoint structure
        # In a real scenario, we'd create another user or use an existing one
        
        # Create a second user for follow testing
        timestamp = datetime.now().strftime('%H%M%S') + "2"
        second_user_data = {
            "email": f"followtest{timestamp}@krafink.com",
            "username": f"followtest{timestamp}",
            "name": f"Follow Test User {timestamp}",
            "password": "TestPass123!"
        }
        
        # Register second user
        success, response = self.run_test(
            "Register Second User for Follow Test",
            "POST",
            "auth/register",
            200,
            data=second_user_data
        )
        
        if success:
            second_username = second_user_data["username"]
            
            # Test follow
            success, response = self.run_test(
                "Follow User",
                "POST",
                f"users/{second_username}/follow",
                200
            )
            
            if success and 'following' in response:
                return True, response['following']
        
        return False, False

    def run_all_tests(self):
        """Run all API tests"""
        print("🚀 Starting Krafink API Testing Suite")
        print("=" * 50)
        
        # Test user registration and authentication
        reg_success, user_data = self.test_user_registration()
        if not reg_success:
            print("❌ Registration failed, stopping tests")
            return self.get_results()
        
        # Test login
        if not self.test_user_login(user_data):
            print("❌ Login failed, stopping tests")
            return self.get_results()
        
        # Test getting current user
        self.test_get_current_user()
        
        # Test profile update
        self.test_update_profile()
        
        # Test getting user by username
        self.test_get_user_by_username()
        
        # Test post creation
        post_success, post_id = self.test_create_post()
        
        # Test feed
        feed_success, feed_data = self.test_get_feed()
        
        if post_success and post_id:
            # Test liking the post
            like_success, liked = self.test_like_post(post_id)
            
            # Test commenting on the post
            comment_success, comment_id = self.test_comment_on_post(post_id)
            
            # Test getting comments
            self.test_get_post_comments(post_id)
        
        # Test user search
        self.test_search_users()
        
        # Test follow functionality
        self.test_follow_functionality()
        
        return self.get_results()

    def get_results(self):
        """Get test results summary"""
        print("\n" + "=" * 50)
        print(f"📊 Test Results: {self.tests_passed}/{self.tests_run} tests passed")
        
        if self.tests_passed == self.tests_run:
            print("🎉 All tests passed!")
        else:
            print(f"⚠️  {self.tests_run - self.tests_passed} tests failed")
            
        return {
            "total_tests": self.tests_run,
            "passed_tests": self.tests_passed,
            "success_rate": (self.tests_passed / self.tests_run * 100) if self.tests_run > 0 else 0,
            "detailed_results": self.test_results
        }

def main():
    """Main test execution"""
    tester = KrafinkAPITester()
    results = tester.run_all_tests()
    
    # Return appropriate exit code
    return 0 if results["passed_tests"] == results["total_tests"] else 1

if __name__ == "__main__":
    sys.exit(main())