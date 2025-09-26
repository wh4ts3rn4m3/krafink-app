import React, { useState, useEffect, createContext, useContext } from "react";
import { BrowserRouter, Routes, Route, Navigate, useLocation } from "react-router-dom";
import axios from "axios";
import io from "socket.io-client";
import "./App.css";
import { Button } from "./components/ui/button";
import { Input } from "./components/ui/input";
import { Textarea } from "./components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "./components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "./components/ui/avatar";
import { Badge } from "./components/ui/badge";
import { Separator } from "./components/ui/separator";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "./components/ui/dialog";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "./components/ui/sheet";
import { 
  Heart, MessageCircle, Search, User, Home, Settings, LogOut, Plus, Send, 
  Bell, Bookmark, Share, MoreHorizontal, Edit, Trash, Flag, UserX,
  Image as ImageIcon, Smile, Hash, AtSign, X, Users, Eye, EyeOff,
  MessageSquare, Compass, Menu, Upload, Camera, Loader2
} from "lucide-react";
import { toast } from "sonner";
import { useInView } from "react-intersection-observer";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

// Socket.IO connection
let socket = null;

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

  useEffect(() => {
    if (user && token && !socket) {
      // Initialize socket connection
      socket = io(BACKEND_URL);
      
      socket.on('connect', () => {
        console.log('Connected to server');
        // Join user room for notifications
        socket.emit('join_user', { user_id: user.id });
      });

      socket.on('notification', (data) => {
        toast.info(data.notification.message);
        // Update notification count if needed
      });

      socket.on('message_received', (data) => {
        // Handle real-time messages
        console.log('Message received:', data);
      });

      return () => {
        if (socket) {
          socket.disconnect();
          socket = null;
        }
      };
    }
  }, [user, token]);

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
    if (socket) {
      socket.disconnect();
      socket = null;
    }
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

// Notification Context
const NotificationContext = createContext();

const NotificationProvider = ({ children }) => {
  const [unreadCount, setUnreadCount] = useState(0);
  const { user } = useAuth();

  useEffect(() => {
    if (user) {
      fetchUnreadCount();
      // Set up real-time updates
      if (socket) {
        socket.on('notification', () => {
          setUnreadCount(prev => prev + 1);
        });
      }
    }
  }, [user]);

  const fetchUnreadCount = async () => {
    try {
      const response = await axios.get(`${API}/notifications/unread-count`);
      setUnreadCount(response.data.count);
    } catch (error) {
      console.error('Failed to fetch notification count:', error);
    }
  };

  return (
    <NotificationContext.Provider value={{ unreadCount, setUnreadCount, fetchUnreadCount }}>
      {children}
    </NotificationContext.Provider>
  );
};

const useNotifications = () => useContext(NotificationContext);

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

// Navigation Components
const DesktopNavigation = () => {
  const { user, logout } = useAuth();
  const { unreadCount } = useNotifications();
  const [showCreatePost, setShowCreatePost] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);

  return (
    <nav className="bg-white/90 backdrop-blur-md border-b border-purple-100 sticky top-0 z-50">
      <div className="max-w-6xl mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          <div className="text-2xl font-bold bg-gradient-to-r from-purple-600 to-pink-500 bg-clip-text text-transparent">
            krafink
          </div>
          
          <SearchBar />
          
          <div className="flex items-center space-x-4">
            <NavButton to="/feed" icon={Home} label="Home" />
            <NavButton to="/explore" icon={Compass} label="Explore" />
            
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={() => setShowCreatePost(true)}
              data-testid="create-post-nav-btn"
            >
              <Plus className="h-5 w-5" />
            </Button>
            
            <div className="relative">
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => setShowNotifications(!showNotifications)}
                data-testid="notifications-btn"
              >
                <Bell className="h-5 w-5" />
                {unreadCount > 0 && (
                  <Badge className="absolute -top-1 -right-1 h-5 w-5 p-0 text-xs bg-red-500">
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </Badge>
                )}
              </Button>
            </div>
            
            <NavButton to="/messages" icon={MessageSquare} label="Messages" />
            <NavButton to={`/@${user?.username}`} icon={User} label="Profile" />
            
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

      <CreatePostModal isOpen={showCreatePost} onClose={() => setShowCreatePost(false)} />
      {showNotifications && (
        <NotificationsDropdown onClose={() => setShowNotifications(false)} />
      )}
    </nav>
  );
};

const MobileNavigation = () => {
  const { user } = useAuth();
  const { unreadCount } = useNotifications();
  const location = useLocation();
  const [showCreatePost, setShowCreatePost] = useState(false);

  const navItems = [
    { to: "/feed", icon: Home, label: "Home" },
    { to: "/explore", icon: Compass, label: "Explore" },
    { action: () => setShowCreatePost(true), icon: Plus, label: "Create" },
    { to: "/messages", icon: MessageSquare, label: "Messages" },
    { to: `/@${user?.username}`, icon: User, label: "Profile" }
  ];

  return (
    <>
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur-md border-t border-purple-100 z-50">
        <div className="flex items-center justify-around py-2">
          {navItems.map((item, index) => (
            <Button
              key={index}
              variant="ghost"
              size="sm"
              className={`flex flex-col items-center space-y-1 ${
                item.to === location.pathname ? 'text-purple-600' : 'text-gray-600'
              }`}
              onClick={item.action || (() => window.location.href = item.to)}
            >
              <item.icon className="h-5 w-5" />
              <span className="text-xs">{item.label}</span>
              {item.label === "Messages" && unreadCount > 0 && (
                <Badge className="absolute top-0 right-0 h-4 w-4 p-0 text-xs bg-red-500">
                  {unreadCount > 9 ? '9+' : unreadCount}
                </Badge>
              )}
            </Button>
          ))}
        </div>
      </nav>
      
      <CreatePostModal isOpen={showCreatePost} onClose={() => setShowCreatePost(false)} />
    </>
  );
};

const NavButton = ({ to, icon: Icon, label }) => {
  const location = useLocation();
  const isActive = location.pathname === to;
  
  return (
    <Button 
      variant="ghost" 
      size="sm" 
      className={isActive ? 'text-purple-600' : ''}
      onClick={() => window.location.href = to}
    >
      <Icon className="h-5 w-5" />
      <span className="sr-only">{label}</span>
    </Button>
  );
};

const SearchBar = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState({ users: [], posts: [] });
  const [showResults, setShowResults] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSearch = async (query) => {
    if (!query.trim()) {
      setSearchResults({ users: [], posts: [] });
      setShowResults(false);
      return;
    }

    setLoading(true);
    try {
      const response = await axios.get(`${API}/search?q=${encodeURIComponent(query)}`);
      setSearchResults(response.data);
      setShowResults(true);
    } catch (error) {
      toast.error("Search failed");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const debounce = setTimeout(() => {
      handleSearch(searchQuery);
    }, 300);

    return () => clearTimeout(debounce);
  }, [searchQuery]);

  return (
    <div className="flex-1 max-w-md mx-8 relative">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
        <Input
          type="text"
          placeholder="Search users and posts..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-10"
          data-testid="search-input"
        />
        {loading && (
          <Loader2 className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 animate-spin" />
        )}
      </div>

      {showResults && (
        <Card className="absolute top-full mt-2 w-full max-h-96 overflow-y-auto z-50">
          <CardContent className="p-0">
            {searchResults.users.length > 0 && (
              <div className="p-4">
                <h3 className="font-semibold text-sm text-gray-600 mb-2">People</h3>
                {searchResults.users.map((user) => (
                  <div 
                    key={user.id} 
                    className="flex items-center space-x-2 p-2 hover:bg-gray-50 rounded cursor-pointer"
                    onClick={() => {
                      window.location.href = `/@${user.username}`;
                      setShowResults(false);
                    }}
                  >
                    <Avatar className="h-8 w-8">
                      <AvatarImage src={user.avatar} />
                      <AvatarFallback>{user.name[0]}</AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="font-medium text-sm">{user.name}</p>
                      <p className="text-gray-500 text-xs">@{user.username}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
            
            {searchResults.posts.length > 0 && (
              <div className="p-4 border-t">
                <h3 className="font-semibold text-sm text-gray-600 mb-2">Posts</h3>
                {searchResults.posts.map(({ post, author }) => (
                  <div 
                    key={post.id} 
                    className="p-2 hover:bg-gray-50 rounded cursor-pointer"
                    onClick={() => {
                      window.location.href = `/post/${post.id}`;
                      setShowResults(false);
                    }}
                  >
                    <p className="text-sm truncate">{post.content}</p>
                    <p className="text-xs text-gray-500">by @{author.username}</p>
                  </div>
                ))}
              </div>
            )}
            
            {searchResults.users.length === 0 && searchResults.posts.length === 0 && searchQuery && (
              <div className="p-4 text-center text-gray-500">
                No results found for "{searchQuery}"
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
};

// Continue with more components in next message...