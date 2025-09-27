/* eslint-disable */
import React, { useState, useEffect, createContext, useContext } from "react";
import { BrowserRouter, Routes, Route, Navigate, useLocation, useParams, Link } from "react-router-dom";
import axios from "axios";
import io from "socket.io-client";
import "./App.css";

// Context Providers
import { ThemeProvider, useTheme } from "./contexts/ThemeContext";
import { LanguageProvider, useLanguage } from "./contexts/LanguageContext";

// UI Components
import { Button } from "./components/ui/button";
import { Input } from "./components/ui/input";
import { Textarea } from "./components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "./components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "./components/ui/avatar";
import { Badge } from "./components/ui/badge";
import { Separator } from "./components/ui/separator";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "./components/ui/dialog";

// Icons
import { 
  Heart, MessageCircle, Search, User, Home, Settings, LogOut, Plus, Send, 
  Bell, Bookmark, Share, MoreHorizontal, Edit, Trash, Flag, UserX,
  Image as ImageIcon, Smile, Hash, AtSign, X, Users, Eye, EyeOff,
  MessageSquare, Compass, Menu, Upload, Camera, Loader2, Moon, Sun,
  Languages, Globe
} from "lucide-react";

// Toast notifications
import { toast } from "sonner";

// Pages
import SearchPage from "./pages/SearchPage";
import MessagesPage from "./pages/MessagesPage";
import ComposePage from "./pages/ComposePage";
import AdminPage from "./pages/AdminPage";
import ProfilePage from "./pages/ProfilePage";
import { TermsPage, PrivacyPage, ImprintPage, CookieBanner } from "./pages/LegalPages";

// Hooks
import { useInView } from "react-intersection-observer";
import ImageUploader from "./components/ImageUploader";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

// Socket.IO connection
let socket = null;

// Auth Context
const AuthContext = createContext();

export const useAuth = () => {
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
      initSocket();
    }

    return () => {
      if (socket) {
        socket.disconnect();
        socket = null;
      }
    };
  }, [user, token]);

  const initSocket = () => {
    socket = io(BACKEND_URL);
    
    socket.on('connect', () => {
      socket.emit('join_user', { user_id: user.id });
    });

    // expose for optional listeners
    window.__emergent_socketio = socket;

    socket.on('notification', (data) => {
      toast.info(data.notification.message);
    });

    socket.on('follow_updated', (data) => {
      // components can react; no-op here
    });
  };

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

export const useNotifications = () => useContext(NotificationContext);

const NotificationProvider = ({ children }) => {
  const [unreadCount, setUnreadCount] = useState(0);
  const { user } = useAuth();

  useEffect(() => {
    if (user) {
      fetchUnreadCount();
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
  const { t } = useLanguage();

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
            {isLogin ? t('auth.welcome_back') : t('auth.join_community')}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <Input
              type="email"
              name="email"
              placeholder={t('auth.email')}
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
                  placeholder={t('auth.username')}
                  value={formData.username}
                  onChange={handleInputChange}
                  required
                  data-testid="username-input"
                />
                <Input
                  type="text"
                  name="name"
                  placeholder={t('auth.name')}
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
              placeholder={t('auth.password')}
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
              {loading ? "Please wait..." : (isLogin ? t('auth.sign_in') : t('auth.create_account'))}
            </Button>
          </form>
          
          <div className="mt-4 text-center">
            <Button 
              variant="ghost" 
              onClick={() => setIsLogin(!isLogin)}
              data-testid="auth-toggle-btn"
            >
              {isLogin ? t('auth.need_account') : t('auth.have_account')}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

// Navigation Components
/* ... rest of file unchanged except CreatePostModal updates below ... */

// Post Creation Modal
const CreatePostModal = ({ isOpen, onClose }) => {
  const [content, setContent] = useState('');
  const [images, setImages] = useState([]);
  const [posting, setPosting] = useState(false);
  const [visibility, setVisibility] = useState('public');
  const { user } = useAuth();

  const extractHashtags = (text) => {
    const hashtags = text.match(/#\w+/g) || [];
    return hashtags.map(tag => tag.slice(1).toLowerCase());
  };

  const extractMentions = (text) => {
    const mentions = text.match(/@\w+/g) || [];
    return mentions.map(mention => mention.slice(1));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!content.trim() && images.length === 0) return;

    setPosting(true);
    try {
      const hashtags = extractHashtags(content);
      const mentions = extractMentions(content);

      await axios.post(`${API}/posts`, {
        content: content.trim(),
        images,
        visibility,
        hashtags,
        mentions
      });

      setContent('');
      setImages([]);
      setVisibility('public');
      toast.success("Post created!");
      onClose();
      if (window.location.pathname === '/feed') {
        window.location.reload();
      }
    } catch (error) {
      toast.error("Failed to create post");
    } finally {
      setPosting(false);
    }
  };

  const characterCount = content.length;
  const isValidPost = (content.trim() || images.length > 0) && characterCount <= 280;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Create Post</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
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
                className="min-h-[120px] border-0 resize-none focus:ring-0 p-0 text-base"
                data-testid="post-content-input"
              />
              <div className="flex justify-between items-center mt-2">
                <span className={`text-sm ${characterCount > 280 ? 'text-red-500' : 'text-gray-500'}`}>
                  {characterCount}/280
                </span>
              </div>
            </div>
          </div>

          {/* Dropzone + Preview */}
          <ImageUploader images={images} setImages={setImages} />

          {/* Actions Bar */}
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <select 
                value={visibility} 
                onChange={(e) => setVisibility(e.target.value)}
                className="text-sm border rounded px-2 py-1"
              >
                <option value="public">Public</option>
                <option value="followers">Followers Only</option>
              </select>
            </div>

            <Button 
              type="submit" 
              disabled={!isValidPost || posting}
              className="bg-gradient-to-r from-purple-600 to-pink-500 hover:from-purple-700 hover:to-pink-600"
              data-testid="create-post-btn"
            >
              {posting ? <Loader2 className="h-4 w-4 animate-spin" /> : "Post"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

/* rest of file unchanged */

export default App;