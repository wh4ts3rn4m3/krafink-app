#!/usr/bin/env python3

import requests
import sys
import json
from datetime import datetime
import uuid

class KrafinkAPITester:
    def __init__(self, base_url="https://krafink-social.preview.emergentagent.com"):
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

    def create_test_image(self):
        """Create a small test image in memory"""
        from PIL import Image
        import io
        
        # Create a small 100x100 red image
        img = Image.new('RGB', (100, 100), color='red')
        img_bytes = io.BytesIO()
        img.save(img_bytes, format='JPEG')
        img_bytes.seek(0)
        return img_bytes.getvalue()

    def test_profiles_milestone_comprehensive(self):
        """Comprehensive test for Profiles milestone backend endpoints"""
        print("\n🎯 Starting Profiles Milestone Comprehensive Test")
        print("=" * 60)
        
        # Step 1: Register specific user as requested
        user_data = {
            "email": "user1+profiles@example.com",
            "username": "user1profiles", 
            "name": "User One",
            "password": "Pass123!"
        }
        
        print("Step 1: Registering user...")
        success, response = self.run_test(
            "Register User1 for Profiles Test",
            "POST", 
            "auth/register",
            200,
            data=user_data
        )
        
        if not success:
            print("❌ Registration failed, stopping profiles test")
            return False
            
        # Store token for subsequent calls
        if 'access_token' in response:
            self.token = response['access_token']
            self.current_user = response['user']
            print(f"✅ User registered with ID: {self.current_user.get('id')}")
        else:
            print("❌ No access token in registration response")
            return False
        
        # Step 2: Set Authorization header (already done via self.token)
        print("Step 2: Authorization header set")
        
        # Step 3: GET /api/auth/me
        print("Step 3: Testing GET /api/auth/me...")
        success, me_response = self.run_test(
            "Get Current User Profile",
            "GET",
            "auth/me", 
            200
        )
        
        if success:
            # Verify required fields
            required_fields = ['id', 'username', 'name', 'links']
            missing_fields = []
            for field in required_fields:
                if field not in me_response:
                    missing_fields.append(field)
            
            if missing_fields:
                self.log_test("Verify /auth/me fields", False, f"Missing fields: {missing_fields}")
            else:
                self.log_test("Verify /auth/me fields", True)
                print(f"✅ User fields verified: {list(me_response.keys())}")
        
        # Step 4: PUT /api/users/profile with links
        print("Step 4: Testing profile update with links...")
        profile_update_data = {
            "name": "User One Updated",
            "bio": "Bio for user one", 
            "links": [
                {"label": "Site", "url": "https://example.com"},
                {"label": "GitHub", "url": "github.com/u1"}
            ],
            "avatar": None,
            "banner": None
        }
        
        success, profile_response = self.run_test(
            "Update Profile with Links",
            "PUT",
            "users/profile",
            200,
            data=profile_update_data
        )
        
        if success:
            # Verify response contains updated data
            if profile_response.get('name') == "User One Updated":
                self.log_test("Profile name update", True)
            else:
                self.log_test("Profile name update", False, f"Expected 'User One Updated', got {profile_response.get('name')}")
            
            # Verify links array
            links = profile_response.get('links', [])
            if isinstance(links, list) and len(links) == 2:
                self.log_test("Profile links update", True)
                print(f"✅ Links updated: {links}")
            else:
                self.log_test("Profile links update", False, f"Expected 2 links, got {links}")
        
        # Step 5: Upload image
        print("Step 5: Testing image upload...")
        try:
            import requests
            
            # Create test image
            image_data = self.create_test_image()
            
            # Upload image using multipart/form-data
            files = {'file': ('test.jpg', image_data, 'image/jpeg')}
            headers = {'Authorization': f'Bearer {self.token}'}
            
            upload_response = requests.post(
                f"{self.api_url}/upload/image",
                files=files,
                headers=headers,
                timeout=10
            )
            
            if upload_response.status_code == 200:
                upload_data = upload_response.json()
                if 'url' in upload_data and upload_data['url'].startswith('/uploads/'):
                    self.log_test("Image Upload", True)
                    uploaded_url = upload_data['url']
                    print(f"✅ Image uploaded: {uploaded_url}")
                else:
                    self.log_test("Image Upload", False, f"Invalid upload response: {upload_data}")
                    uploaded_url = None
            else:
                self.log_test("Image Upload", False, f"Upload failed with status {upload_response.status_code}: {upload_response.text}")
                uploaded_url = None
                
        except Exception as e:
            self.log_test("Image Upload", False, f"Upload exception: {str(e)}")
            uploaded_url = None
        
        # Step 6: Update profile with avatar and banner
        if uploaded_url:
            print("Step 6: Testing profile update with avatar/banner...")
            avatar_banner_data = {
                "avatar": uploaded_url,
                "banner": uploaded_url
            }
            
            success, avatar_response = self.run_test(
                "Update Profile with Avatar/Banner",
                "PUT",
                "users/profile",
                200,
                data=avatar_banner_data
            )
            
            if success:
                if avatar_response.get('avatar') == uploaded_url and avatar_response.get('banner') == uploaded_url:
                    self.log_test("Avatar/Banner Update", True)
                    print(f"✅ Avatar and banner set to: {uploaded_url}")
                else:
                    self.log_test("Avatar/Banner Update", False, f"Avatar: {avatar_response.get('avatar')}, Banner: {avatar_response.get('banner')}")
        else:
            print("⚠️ Skipping avatar/banner update due to upload failure")
        
        # Step 7: Create two posts
        print("Step 7: Creating test posts...")
        
        # First post with image
        post1_data = {
            "content": "My first post #intro",
            "images": [uploaded_url] if uploaded_url else [],
            "visibility": "public",
            "hashtags": ["intro"],
            "mentions": []
        }
        
        success1, post1_response = self.run_test(
            "Create First Post",
            "POST",
            "posts",
            200,
            data=post1_data
        )
        
        post1_id = post1_response.get('id') if success1 else None
        
        # Second post without image
        post2_data = {
            "content": "Second post",
            "images": [],
            "visibility": "public", 
            "hashtags": [],
            "mentions": []
        }
        
        success2, post2_response = self.run_test(
            "Create Second Post",
            "POST",
            "posts",
            200,
            data=post2_data
        )
        
        post2_id = post2_response.get('id') if success2 else None
        
        if success1 and success2:
            print(f"✅ Created posts with IDs: {post1_id}, {post2_id}")
        
        # Step 8: Fetch user posts
        print("Step 8: Testing user posts endpoint...")
        success, posts_response = self.run_test(
            "Get User Posts",
            "GET",
            f"users/user1profiles/posts?limit=50",
            200
        )
        
        if success:
            if isinstance(posts_response, list):
                self.log_test("User Posts Response Type", True)
                print(f"✅ Retrieved {len(posts_response)} posts")
                
                # Verify post structure
                if len(posts_response) >= 2:
                    self.log_test("User Posts Count", True, f"Found {len(posts_response)} posts")
                    
                    # Check first post structure
                    first_post = posts_response[0]
                    required_keys = ['post', 'author', 'user_liked', 'user_saved']
                    if all(key in first_post for key in required_keys):
                        self.log_test("Post Structure", True)
                        
                        # Verify author username
                        author = first_post.get('author', {})
                        if author.get('username') == 'user1profiles':
                            self.log_test("Post Author Username", True)
                        else:
                            self.log_test("Post Author Username", False, f"Expected 'user1profiles', got {author.get('username')}")
                        
                        # Check images format
                        post_data = first_post.get('post', {})
                        images = post_data.get('images', [])
                        if images:
                            valid_images = all(isinstance(img, str) and img.startswith('/uploads') for img in images)
                            if valid_images:
                                self.log_test("Post Images Format", True)
                            else:
                                self.log_test("Post Images Format", False, f"Invalid image format: {images}")
                        else:
                            self.log_test("Post Images Format", True, "No images to validate")
                            
                    else:
                        missing_keys = [key for key in required_keys if key not in first_post]
                        self.log_test("Post Structure", False, f"Missing keys: {missing_keys}")
                else:
                    self.log_test("User Posts Count", False, f"Expected >= 2 posts, got {len(posts_response)}")
            else:
                self.log_test("User Posts Response Type", False, f"Expected list, got {type(posts_response)}")
        
        # Step 9: GET user by username
        print("Step 9: Testing GET user by username...")
        success, user_response = self.run_test(
            "Get User by Username",
            "GET",
            "users/user1profiles",
            200
        )
        
        if success:
            # Verify links array preserved
            links = user_response.get('links', [])
            if isinstance(links, list) and len(links) == 2:
                # Check if links have label/url structure
                valid_links = True
                for link in links:
                    if isinstance(link, dict):
                        if 'label' not in link or 'url' not in link:
                            valid_links = False
                            break
                    elif not isinstance(link, str):
                        valid_links = False
                        break
                
                if valid_links:
                    self.log_test("User Links Preserved", True)
                else:
                    self.log_test("User Links Preserved", False, f"Invalid link structure: {links}")
            else:
                self.log_test("User Links Preserved", False, f"Expected 2 links, got {links}")
            
            # Verify avatar/banner present
            avatar = user_response.get('avatar')
            banner = user_response.get('banner')
            if avatar and banner:
                self.log_test("Avatar/Banner Present", True)
                print(f"✅ Avatar: {avatar}, Banner: {banner}")
            else:
                self.log_test("Avatar/Banner Present", False, f"Avatar: {avatar}, Banner: {banner}")
        
        # Step 10: Test followers endpoint
        print("Step 10: Testing followers endpoint...")
        user_id = self.current_user.get('id')
        if user_id:
            success, followers_response = self.run_test(
                "Get User Followers",
                "GET",
                f"users/{user_id}/followers",
                200
            )
            
            if success:
                if isinstance(followers_response, list):
                    self.log_test("Followers Response Type", True)
                    print(f"✅ Followers endpoint returned array with {len(followers_response)} followers")
                else:
                    self.log_test("Followers Response Type", False, f"Expected list, got {type(followers_response)}")
        else:
            self.log_test("Get User Followers", False, "No user ID available")
        
        print("\n🎯 Profiles Milestone Test Complete")
        return True

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

    def run_profiles_milestone_test(self):
        """Run only the Profiles milestone comprehensive test"""
        print("🚀 Starting Profiles Milestone Test Suite")
        print("=" * 50)
        
        # Run the comprehensive profiles test
        self.test_profiles_milestone_comprehensive()
        
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