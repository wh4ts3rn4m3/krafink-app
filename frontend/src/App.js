import React, { useState, useEffect, createContext, useContext } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import axios from "axios";
import "./App.css";
import { Button } from "./components/ui/button";
import { Input } from "./components/ui/input";
import { Textarea } from "./components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "./components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "./components/ui/avatar";
import { Badge } from "./components/ui/badge";
import { Separator } from "./components/ui/separator";
import { Heart, MessageCircle, Search, User, Home, Settings, LogOut, Plus, Send } from "lucide-react";
import { toast } from "sonner";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

// Auth Context
const AuthContext = createContext();

const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return context;
};

const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem('token'));
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (token) {
      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      fetchCurrentUser();
    } else {
      setLoading(false);
    }
  }, [token]);

  const fetchCurrentUser = async () => {
    try {
      const response = await axios.get(`${API}/auth/me`);
      setUser(response.data);
    } catch (error) {
      console.error('Failed to fetch user:', error);
      logout();
    } finally {
      setLoading(false);
    }
  };

  const login = async (email, password) => {
    try {
      const response = await axios.post(`${API}/auth/login`, { email, password });
      const { access_token, user } = response.data;
      
      localStorage.setItem('token', access_token);
      setToken(access_token);
      setUser(user);
      axios.defaults.headers.common['Authorization'] = `Bearer ${access_token}`;
      
      toast.success("Welcome back to krafink!");
      return true;
    } catch (error) {
      toast.error(error.response?.data?.detail || "Login failed");
      return false;
    }
  };

  const register = async (email, username, name, password) => {
    try {
      const response = await axios.post(`${API}/auth/register`, {
        email, username, name, password
      });
      const { access_token, user } = response.data;
      
      localStorage.setItem('token', access_token);
      setToken(access_token);
      setUser(user);
      axios.defaults.headers.common['Authorization'] = `Bearer ${access_token}`;
      
      toast.success("Welcome to krafink!");
      return true;
    } catch (error) {
      toast.error(error.response?.data?.detail || "Registration failed");
      return false;
    }
  };

  const logout = () => {
    localStorage.removeItem('token');
    setToken(null);
    setUser(null);
    delete axios.defaults.headers.common['Authorization'];
    toast.success("Logged out successfully");
  };

  return (
    <AuthContext.Provider value={{ user, login, register, logout, loading }}>
      {children}
    </AuthContext.Provider>
  );
};

// Auth Components
const AuthPage = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [formData, setFormData] = useState({
    email: '',
    username: '',
    name: '',
    password: ''
  });
  const [loading, setLoading] = useState(false);
  const { login, register } = useAuth();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    
    let success = false;
    if (isLogin) {
      success = await login(formData.email, formData.password);
    } else {
      success = await register(formData.email, formData.username, formData.name, formData.password);
    }
    
    setLoading(false);
  };

  const handleInputChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-600 via-fuchsia-500 to-pink-500 p-4">
      <Card className="w-full max-w-md bg-white/95 backdrop-blur shadow-xl border-0">
        <CardHeader className="text-center pb-2">
          <div className="text-4xl font-bold bg-gradient-to-r from-purple-600 to-pink-500 bg-clip-text text-transparent mb-2">
            krafink
          </div>
          <CardTitle className="text-xl text-gray-700">
            {isLogin ? "Welcome back" : "Join the community"}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <Input
              type="email"
              name="email"
              placeholder="Email"
              value={formData.email}
              onChange={handleInputChange}
              required
              data-testid="email-input"
            />
            
            {!isLogin && (
              <>
                <Input
                  type="text"
                  name="username"
                  placeholder="Username"
                  value={formData.username}
                  onChange={handleInputChange}
                  required
                  data-testid="username-input"
                />
                <Input
                  type="text"
                  name="name"
                  placeholder="Display Name"
                  value={formData.name}
                  onChange={handleInputChange}
                  required
                  data-testid="name-input"
                />
              </>
            )}
            
            <Input
              type="password"
              name="password"
              placeholder="Password"
              value={formData.password}
              onChange={handleInputChange}
              required
              data-testid="password-input"
            />
            
            <Button 
              type="submit" 
              className="w-full bg-gradient-to-r from-purple-600 to-pink-500 hover:from-purple-700 hover:to-pink-600"
              disabled={loading}
              data-testid="auth-submit-btn"
            >
              {loading ? "Please wait..." : (isLogin ? "Sign In" : "Create Account")}
            </Button>
          </form>
          
          <div className="mt-4 text-center">
            <Button 
              variant="ghost" 
              onClick={() => setIsLogin(!isLogin)}
              data-testid="auth-toggle-btn"
            >
              {isLogin ? "Need an account? Sign up" : "Already have an account? Sign in"}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

// Navigation Component
const Navbar = () => {
  const { user, logout } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');

  return (
    <nav className="bg-white/90 backdrop-blur-md border-b border-purple-100 sticky top-0 z-50">
      <div className="max-w-6xl mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          <div className="text-2xl font-bold bg-gradient-to-r from-purple-600 to-pink-500 bg-clip-text text-transparent">
            krafink
          </div>
          
          <div className="flex-1 max-w-md mx-8">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <Input
                type="text"
                placeholder="Search users..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
                data-testid="search-input"
              />
            </div>
          </div>
          
          <div className="flex items-center space-x-4">
            <Button variant="ghost" size="sm" data-testid="home-btn">
              <Home className="h-5 w-5" />
            </Button>
            <Button variant="ghost" size="sm" data-testid="profile-btn">
              <User className="h-5 w-5" />
            </Button>
            <Button variant="ghost" size="sm" onClick={logout} data-testid="logout-btn">
              <LogOut className="h-5 w-5" />
            </Button>
            <Avatar className="h-8 w-8">
              <AvatarImage src={user?.avatar} />
              <AvatarFallback>{user?.name?.[0]?.toUpperCase()}</AvatarFallback>
            </Avatar>
          </div>
        </div>
      </div>
    </nav>
  );
};

// Post Creation Component
const CreatePost = ({ onPostCreated }) => {
  const [content, setContent] = useState('');
  const [loading, setLoading] = useState(false);
  const { user } = useAuth();

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!content.trim()) return;
    
    setLoading(true);
    try {
      const response = await axios.post(`${API}/posts`, {
        content: content.trim(),
        visibility: 'public'
      });
      
      setContent('');
      toast.success("Post created!");
      if (onPostCreated) onPostCreated();
    } catch (error) {
      toast.error("Failed to create post");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="mb-6">
      <CardContent className="pt-6">
        <form onSubmit={handleSubmit}>
          <div className="flex space-x-4">
            <Avatar className="h-10 w-10">
              <AvatarImage src={user?.avatar} />
              <AvatarFallback>{user?.name?.[0]?.toUpperCase()}</AvatarFallback>
            </Avatar>
            <div className="flex-1">
              <Textarea
                placeholder="What's on your mind?"
                value={content}
                onChange={(e) => setContent(e.target.value)}
                className="min-h-[100px] border-0 resize-none focus:ring-0 p-0 text-base"
                data-testid="post-content-input"
              />
              <div className="flex justify-end mt-4">
                <Button 
                  type="submit" 
                  disabled={!content.trim() || loading}
                  className="bg-gradient-to-r from-purple-600 to-pink-500 hover:from-purple-700 hover:to-pink-600"
                  data-testid="create-post-btn"
                >
                  {loading ? "Posting..." : "Post"}
                </Button>
              </div>
            </div>
          </div>
        </form>
      </CardContent>
    </Card>
  );
};

// Post Component
const PostCard = ({ post, author, userLiked, onLikeToggle, onCommentAdded }) => {
  const [showComments, setShowComments] = useState(false);
  const [comments, setComments] = useState([]);
  const [newComment, setNewComment] = useState('');
  const [commentLoading, setCommentLoading] = useState(false);

  const fetchComments = async () => {
    try {
      const response = await axios.get(`${API}/posts/${post.id}/comments`);
      setComments(response.data);
    } catch (error) {
      toast.error("Failed to load comments");
    }
  };

  const handleLike = async () => {
    try {
      await axios.post(`${API}/posts/${post.id}/like`);
      if (onLikeToggle) onLikeToggle(post.id);
    } catch (error) {
      toast.error("Failed to like post");
    }
  };

  const handleComment = async (e) => {
    e.preventDefault();
    if (!newComment.trim()) return;
    
    setCommentLoading(true);
    try {
      await axios.post(`${API}/posts/${post.id}/comments`, {
        content: newComment.trim()
      });
      
      setNewComment('');
      fetchComments();
      toast.success("Comment added!");
      if (onCommentAdded) onCommentAdded(post.id);
    } catch (error) {
      toast.error("Failed to add comment");
    } finally {
      setCommentLoading(false);
    }
  };

  useEffect(() => {
    if (showComments) {
      fetchComments();
    }
  }, [showComments]);

  return (
    <Card className="mb-6" data-testid={`post-${post.id}`}>
      <CardContent className="pt-6">
        <div className="flex items-start space-x-4">
          <Avatar className="h-10 w-10">
            <AvatarImage src={author?.avatar} />
            <AvatarFallback>{author?.name?.[0]?.toUpperCase()}</AvatarFallback>
          </Avatar>
          
          <div className="flex-1">
            <div className="flex items-center space-x-2 mb-2">
              <span className="font-semibold text-gray-900">{author?.name}</span>
              <span className="text-gray-500">@{author?.username}</span>
              <span className="text-gray-400">·</span>
              <span className="text-gray-500 text-sm">
                {new Date(post.created_at).toLocaleDateString()}
              </span>
            </div>
            
            <p className="text-gray-800 mb-4 whitespace-pre-wrap">{post.content}</p>
            
            <div className="flex items-center space-x-6 text-gray-500">
              <Button
                variant="ghost"
                size="sm"
                onClick={handleLike}
                className={`flex items-center space-x-1 ${userLiked ? 'text-pink-500' : ''}`}
                data-testid={`like-btn-${post.id}`}
              >
                <Heart className={`h-4 w-4 ${userLiked ? 'fill-current' : ''}`} />
                <span>{post.likes_count}</span>
              </Button>
              
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowComments(!showComments)}
                className="flex items-center space-x-1"
                data-testid={`comment-btn-${post.id}`}
              >
                <MessageCircle className="h-4 w-4" />
                <span>{post.comments_count}</span>
              </Button>
            </div>
            
            {showComments && (
              <div className="mt-4 space-y-4">
                <Separator />
                
                {/* Comment form */}
                <form onSubmit={handleComment} className="flex space-x-2">
                  <Input
                    type="text"
                    placeholder="Add a comment..."
                    value={newComment}
                    onChange={(e) => setNewComment(e.target.value)}
                    className="flex-1"
                    data-testid={`comment-input-${post.id}`}
                  />
                  <Button 
                    type="submit" 
                    size="sm" 
                    disabled={!newComment.trim() || commentLoading}
                    data-testid={`comment-submit-${post.id}`}
                  >
                    <Send className="h-4 w-4" />
                  </Button>
                </form>
                
                {/* Comments list */}
                <div className="space-y-3">
                  {comments.map(({ comment, author }) => (
                    <div key={comment.id} className="flex space-x-2">
                      <Avatar className="h-6 w-6">
                        <AvatarImage src={author?.avatar} />
                        <AvatarFallback className="text-xs">{author?.name?.[0]?.toUpperCase()}</AvatarFallback>
                      </Avatar>
                      <div className="flex-1">
                        <div className="bg-gray-50 rounded-lg p-3">
                          <div className="flex items-center space-x-1 mb-1">
                            <span className="font-medium text-sm">{author?.name}</span>
                            <span className="text-gray-500 text-xs">@{author?.username}</span>
                          </div>
                          <p className="text-sm text-gray-800">{comment.content}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

// Feed Component
const Feed = () => {
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchFeed = async () => {
    try {
      const response = await axios.get(`${API}/posts/feed`);
      setPosts(response.data);
    } catch (error) {
      toast.error("Failed to load feed");
    } finally {
      setLoading(false);
    }
  };

  const handleLikeToggle = (postId) => {
    setPosts(posts.map(item => {
      if (item.post.id === postId) {
        return {
          ...item,
          post: {
            ...item.post,
            likes_count: item.user_liked ? item.post.likes_count - 1 : item.post.likes_count + 1
          },
          user_liked: !item.user_liked
        };
      }
      return item;
    }));
  };

  const handleCommentAdded = (postId) => {
    setPosts(posts.map(item => {
      if (item.post.id === postId) {
        return {
          ...item,
          post: {
            ...item.post,
            comments_count: item.post.comments_count + 1
          }
        };
      }
      return item;
    }));
  };

  useEffect(() => {
    fetchFeed();
  }, []);

  return (
    <div className="max-w-2xl mx-auto py-6 px-4">
      <CreatePost onPostCreated={fetchFeed} />
      
      {loading ? (
        <div className="text-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-500 mx-auto"></div>
          <p className="mt-2 text-gray-500">Loading your feed...</p>
        </div>
      ) : posts.length === 0 ? (
        <Card>
          <CardContent className="text-center py-12">
            <p className="text-gray-500 mb-4">Your feed is empty!</p>
            <p className="text-gray-400 text-sm">
              Start following some creators or create your first post.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div data-testid="feed-posts">
          {posts.map(({ post, author, user_liked }) => (
            <PostCard
              key={post.id}
              post={post}
              author={author}
              userLiked={user_liked}
              onLikeToggle={handleLikeToggle}
              onCommentAdded={handleCommentAdded}
            />
          ))}
        </div>
      )}
    </div>
  );
};

// Main App Component
const AppContent = () => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-500"></div>
      </div>
    );
  }

  if (!user) {
    return <AuthPage />;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-pink-50">
      <Navbar />
      <main>
        <Routes>
          <Route path="/" element={<Feed />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
    </div>
  );
};

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <AppContent />
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;