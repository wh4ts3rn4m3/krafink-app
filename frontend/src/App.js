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
import NotificationsPage from "./pages/NotificationsPage";
import ComposePage from "./pages/ComposePage";
import AdminPage from "./pages/AdminPage";
import { TermsPage, PrivacyPage, ImprintPage, CookieBanner } from "./pages/LegalPages";

// Hooks
import { useInView } from "react-intersection-observer";

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

    socket.on('notification', (data) => {
      toast.info(data.notification.message);
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
const Navigation = () => {
  const { user, logout } = useAuth();
  const { unreadCount } = useNotifications();
  const { theme, toggleTheme } = useTheme();
  const { language, switchLanguage, t } = useLanguage();
  const location = useLocation();
  const [showMobileMenu, setShowMobileMenu] = useState(false);

  const navItems = [
    { path: '/feed', icon: Home, label: t('nav.home'), testId: 'nav-home' },
    { path: '/explore', icon: Compass, label: t('nav.explore'), testId: 'nav-explore' },
    { path: '/search', icon: Search, label: t('nav.search'), testId: 'nav-search' },
    { path: '/messages', icon: MessageSquare, label: t('nav.messages'), testId: 'nav-messages' },
    { 
      path: '/notifications', 
      icon: Bell, 
      label: t('nav.notifications'),
      badge: unreadCount,
      testId: 'nav-notifications'
    },
    { path: '/compose', icon: Plus, label: t('nav.create'), testId: 'nav-create' },
  ];

  const NavButton = ({ item, isMobile = false }) => {
    const isActive = location.pathname === item.path;
    
    return (
      <Link
        to={item.path}
        className={`flex items-center space-x-2 p-2 rounded-lg transition-colors relative ${
          isActive 
            ? 'bg-purple-100 text-purple-600 dark:bg-purple-900 dark:text-purple-300' 
            : 'hover:bg-gray-100 dark:hover:bg-gray-800'
        } ${isMobile ? 'flex-col space-x-0 space-y-1' : ''}`}
        data-testid={item.testId}
      >
        <item.icon className="h-5 w-5" />
        <span className={isMobile ? 'text-xs' : ''}>{item.label}</span>
        {item.badge > 0 && (
          <Badge className="absolute -top-1 -right-1 h-5 w-5 p-0 text-xs bg-red-500">
            {item.badge > 9 ? '9+' : item.badge}
          </Badge>
        )}
      </Link>
    );
  };

  return (
    <>
      {/* Desktop Navigation */}
      <nav className="hidden md:block bg-white/90 dark:bg-gray-900/90 backdrop-blur-md border-b border-purple-100 dark:border-gray-700 sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-4">
          <div className="flex items-center justify-between h-16">
            <Link to="/feed" className="text-2xl font-bold bg-gradient-to-r from-purple-600 to-pink-500 bg-clip-text text-transparent">
              krafink
            </Link>
            
            <div className="flex items-center space-x-6">
              {navItems.map((item) => (
                <NavButton key={item.path} item={item} />
              ))}
            </div>
            
            <div className="flex items-center space-x-4">
              {/* Theme Toggle */}
              <Button variant="ghost" size="sm" onClick={toggleTheme} data-testid="theme-toggle">
                {theme === 'light' ? <Moon className="h-5 w-5" /> : <Sun className="h-5 w-5" />}
              </Button>
              
              {/* Language Toggle */}
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => switchLanguage(language === 'en' ? 'de' : 'en')}
                data-testid="language-toggle"
              >
                <Languages className="h-4 w-4 mr-1" />
                {language.toUpperCase()}
              </Button>
              
              {/* Profile Menu */}
              <Link to={`/@${user?.username}`}>
                <Avatar className="h-8 w-8">
                  <AvatarImage src={user?.avatar} />
                  <AvatarFallback>{user?.name?.[0]?.toUpperCase()}</AvatarFallback>
                </Avatar>
              </Link>
              
              <Button variant="ghost" size="sm" onClick={logout} data-testid="logout-btn">
                <LogOut className="h-5 w-5" />
              </Button>
            </div>
          </div>
        </div>
      </nav>

      {/* Mobile Navigation */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white/95 dark:bg-gray-900/95 backdrop-blur-md border-t border-purple-100 dark:border-gray-700 z-50">
        <div className="flex items-center justify-around py-2">
          {navItems.slice(0, 5).map((item) => (
            <NavButton key={item.path} item={item} isMobile={true} />
          ))}
          <Button
            variant="ghost"
            size="sm"
            className="flex flex-col items-center space-y-1"
            onClick={() => setShowMobileMenu(true)}
            data-testid="mobile-menu"
          >
            <Menu className="h-5 w-5" />
            <span className="text-xs">Menu</span>
          </Button>
        </div>
      </nav>

      {/* Mobile Menu Dialog */}
      <Dialog open={showMobileMenu} onOpenChange={setShowMobileMenu}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Menu</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <Link 
              to={`/@${user?.username}`} 
              className="flex items-center space-x-3 p-3 rounded-lg hover:bg-gray-100"
              onClick={() => setShowMobileMenu(false)}
            >
              <Avatar className="h-10 w-10">
                <AvatarImage src={user?.avatar} />
                <AvatarFallback>{user?.name?.[0]?.toUpperCase()}</AvatarFallback>
              </Avatar>
              <div>
                <p className="font-medium">{user?.name}</p>
                <p className="text-sm text-gray-500">@{user?.username}</p>
              </div>
            </Link>
            
            <Separator />
            
            <Button 
              variant="ghost" 
              className="w-full justify-start" 
              onClick={toggleTheme}
            >
              {theme === 'light' ? <Moon className="h-4 w-4 mr-2" /> : <Sun className="h-4 w-4 mr-2" />}
              {t('theme.toggle')}
            </Button>
            
            <Button 
              variant="ghost" 
              className="w-full justify-start"
              onClick={() => switchLanguage(language === 'en' ? 'de' : 'en')}
            >
              <Languages className="h-4 w-4 mr-2" />
              {language === 'en' ? 'Deutsch' : 'English'}
            </Button>
            
            <Separator />
            
            <Button 
              variant="ghost" 
              className="w-full justify-start text-red-600" 
              onClick={() => {
                logout();
                setShowMobileMenu(false);
              }}
            >
              <LogOut className="h-4 w-4 mr-2" />
              {t('nav.logout')}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};

// Feed Components
const CreatePostCard = ({ onPostCreated }) => {
  const [showComposer, setShowComposer] = useState(false);
  const { user } = useAuth();
  const { t } = useLanguage();

  return (
    <Card className="mb-6">
      <CardContent className="pt-6">
        <div className="flex space-x-4">
          <Avatar className="h-10 w-10">
            <AvatarImage src={user?.avatar} />
            <AvatarFallback>{user?.name?.[0]?.toUpperCase()}</AvatarFallback>
          </Avatar>
          <Button
            variant="outline"
            className="flex-1 justify-start text-gray-500"
            onClick={() => setShowComposer(true)}
            data-testid="quick-compose-btn"
          >
            {t('post.whats_on_mind')}
          </Button>
        </div>
        
        <div className="flex items-center justify-between mt-4 pt-4 border-t">
          <div className="flex items-center space-x-4">
            <Button variant="ghost" size="sm">
              <ImageIcon className="h-4 w-4 mr-2" />
              Photo
            </Button>
            <Button variant="ghost" size="sm">
              <Hash className="h-4 w-4 mr-2" />
              Tag
            </Button>
          </div>
          <Link to="/compose">
            <Button size="sm" data-testid="compose-link">
              <Edit className="h-4 w-4 mr-2" />
              {t('post.create')}
            </Button>
          </Link>
        </div>
      </CardContent>
    </Card>
  );
};

const PostCard = ({ post, author, userLiked, userSaved, onUpdate }) => {
  const [showComments, setShowComments] = useState(false);
  const [comments, setComments] = useState([]);
  const [newComment, setNewComment] = useState('');
  const [commentLoading, setCommentLoading] = useState(false);
  const [showOptions, setShowOptions] = useState(false);
  const { user } = useAuth();
  const { t } = useLanguage();

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
      const response = await axios.post(`${API}/posts/${post.id}/like`);
      const newLikedState = response.data.liked;
      
      if (onUpdate) {
        onUpdate(post.id, {
          likes_count: post.likes_count + (newLikedState ? 1 : -1),
          user_liked: newLikedState
        });
      }
    } catch (error) {
      toast.error("Failed to like post");
    }
  };

  const handleSave = async () => {
    try {
      const response = await axios.post(`${API}/posts/${post.id}/save`);
      const newSavedState = response.data.saved;
      
      if (onUpdate) {
        onUpdate(post.id, {
          saves_count: post.saves_count + (newSavedState ? 1 : -1),
          user_saved: newSavedState
        });
      }
      
      toast.success(newSavedState ? "Post saved" : "Post unsaved");
    } catch (error) {
      toast.error("Failed to save post");
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
      
      if (onUpdate) {
        onUpdate(post.id, {
          comments_count: post.comments_count + 1
        });
      }
    } catch (error) {
      toast.error("Failed to add comment");
    } finally {
      setCommentLoading(false);
    }
  };

  const handleShare = () => {
    if (navigator.share) {
      navigator.share({
        title: `Post by ${author.name}`,
        text: post.content,
        url: `${window.location.origin}/post/${post.id}`
      });
    } else {
      navigator.clipboard.writeText(`${window.location.origin}/post/${post.id}`);
      toast.success("Link copied to clipboard");
    }
  };

  const renderContent = (content) => {
    return content
      .replace(/#(\w+)/g, '<span class="text-blue-500 font-medium cursor-pointer">#$1</span>')
      .replace(/@(\w+)/g, '<span class="text-purple-500 font-medium cursor-pointer">@$1</span>');
  };

  useEffect(() => {
    if (showComments) {
      fetchComments();
    }
  }, [showComments]);

  return (
    <Card className="mb-6 hover-lift" data-testid={`post-${post.id}`}>
      <CardContent className="pt-6">
        <div className="flex items-start space-x-4">
          <Link to={`/@${author?.username}`}>
            <Avatar className="h-10 w-10">
              <AvatarImage src={author?.avatar} />
              <AvatarFallback>{author?.name?.[0]?.toUpperCase()}</AvatarFallback>
            </Avatar>
          </Link>
          
          <div className="flex-1">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2 mb-2">
                <Link to={`/@${author?.username}`} className="font-semibold text-gray-900 dark:text-gray-100 hover:underline">
                  {author?.name}
                </Link>
                <span className="text-gray-500 dark:text-gray-400">@{author?.username}</span>
                <span className="text-gray-400">·</span>
                <span className="text-gray-500 text-sm">
                  {new Date(post.created_at).toLocaleDateString()}
                </span>
                {post.visibility === 'followers' && (
                  <Badge variant="outline" className="text-xs">
                    <Users className="h-3 w-3 mr-1" />
                    {t('post.followers_only')}
                  </Badge>
                )}
              </div>
              
              {user?.id === author?.id && (
                <div className="relative">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowOptions(!showOptions)}
                  >
                    <MoreHorizontal className="h-4 w-4" />
                  </Button>
                  
                  {showOptions && (
                    <div className="absolute right-0 top-full mt-1 bg-white dark:bg-gray-800 border rounded-lg shadow-lg z-10">
                      <Button variant="ghost" size="sm" className="w-full justify-start">
                        <Edit className="h-4 w-4 mr-2" />
                        {t('post.edit')}
                      </Button>
                      <Button variant="ghost" size="sm" className="w-full justify-start text-red-600">
                        <Trash className="h-4 w-4 mr-2" />
                        {t('post.delete')}
                      </Button>
                    </div>
                  )}
                </div>
              )}
            </div>
            
            <div 
              className="text-gray-800 dark:text-gray-200 mb-4 whitespace-pre-wrap"
              dangerouslySetInnerHTML={{ __html: renderContent(post.content) }}
            />
            
            {/* Image Gallery */}
            {post.images && post.images.length > 0 && (
              <div className={`grid gap-2 mb-4 rounded-lg overflow-hidden ${
                post.images.length === 1 ? 'grid-cols-1' : 
                post.images.length === 2 ? 'grid-cols-2' : 
                'grid-cols-2'
              }`}>
                {post.images.map((image, index) => (
                  <img
                    key={index}
                    src={`${BACKEND_URL}${image}`}
                    alt={`Post image ${index + 1}`}
                    className="w-full h-48 object-cover cursor-pointer hover:opacity-90 transition-opacity"
                    onClick={() => {
                      // Open image modal
                      window.open(`${BACKEND_URL}${image}`, '_blank');
                    }}
                  />
                ))}
              </div>
            )}
            
            {/* Action Buttons */}
            <div className="flex items-center justify-between text-gray-500">
              <div className="flex items-center space-x-6">
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
                
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleSave}
                  className={`flex items-center space-x-1 ${userSaved ? 'text-blue-500' : ''}`}
                >
                  <Bookmark className={`h-4 w-4 ${userSaved ? 'fill-current' : ''}`} />
                </Button>
                
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleShare}
                  className="flex items-center space-x-1"
                >
                  <Share className="h-4 w-4" />
                </Button>
              </div>
            </div>
            
            {/* Comments Section */}
            {showComments && (
              <div className="mt-4 space-y-4">
                <Separator />
                
                {/* Comment form */}
                <form onSubmit={handleComment} className="flex space-x-2">
                  <Avatar className="h-8 w-8">
                    <AvatarImage src={user?.avatar} />
                    <AvatarFallback>{user?.name?.[0]?.toUpperCase()}</AvatarFallback>
                  </Avatar>
                  <div className="flex-1 flex space-x-2">
                    <Input
                      type="text"
                      placeholder={t('comment.add')}
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
                      {commentLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                    </Button>
                  </div>
                </form>
                
                {/* Comments list */}
                <div className="space-y-3">
                  {comments.map(({ comment, author: commentAuthor, replies }) => (
                    <div key={comment.id} className="space-y-2">
                      <div className="flex space-x-2">
                        <Link to={`/@${commentAuthor?.username}`}>
                          <Avatar className="h-6 w-6">
                            <AvatarImage src={commentAuthor?.avatar} />
                            <AvatarFallback className="text-xs">{commentAuthor?.name?.[0]?.toUpperCase()}</AvatarFallback>
                          </Avatar>
                        </Link>
                        <div className="flex-1">
                          <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-3">
                            <div className="flex items-center space-x-1 mb-1">
                              <Link to={`/@${commentAuthor?.username}`} className="font-medium text-sm hover:underline">
                                {commentAuthor?.name}
                              </Link>
                              <span className="text-gray-500 text-xs">@{commentAuthor?.username}</span>
                            </div>
                            <p className="text-sm text-gray-800 dark:text-gray-200">{comment.content}</p>
                          </div>
                        </div>
                      </div>
                      
                      {/* Replies */}
                      {replies && replies.length > 0 && (
                        <div className="ml-8 space-y-2">
                          {replies.map(({ comment: reply, author: replyAuthor }) => (
                            <div key={reply.id} className="flex space-x-2">
                              <Link to={`/@${replyAuthor?.username}`}>
                                <Avatar className="h-5 w-5">
                                  <AvatarImage src={replyAuthor?.avatar} />
                                  <AvatarFallback className="text-xs">{replyAuthor?.name?.[0]?.toUpperCase()}</AvatarFallback>
                                </Avatar>
                              </Link>
                              <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-2 flex-1">
                                <div className="flex items-center space-x-1 mb-1">
                                  <Link to={`/@${replyAuthor?.username}`} className="font-medium text-xs hover:underline">
                                    {replyAuthor?.name}
                                  </Link>
                                </div>
                                <p className="text-xs text-gray-800 dark:text-gray-200">{reply.content}</p>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
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

// Post Creation Modal
const CreatePostModal = ({ isOpen, onClose }) => {
  const [content, setContent] = useState('');
  const [images, setImages] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [posting, setPosting] = useState(false);
  const [visibility, setVisibility] = useState('public');
  const { user } = useAuth();

  const handleImageUpload = async (files) => {
    if (!files.length) return;
    
    setUploading(true);
    const uploadedImages = [];
    
    for (const file of files) {
      try {
        const formData = new FormData();
        formData.append('file', file);
        
        const response = await axios.post(`${API}/upload/image`, formData, {
          headers: { 'Content-Type': 'multipart/form-data' }
        });
        
        uploadedImages.push(response.data.url);
      } catch (error) {
        toast.error(`Failed to upload ${file.name}`);
      }
    }
    
    setImages(prev => [...prev, ...uploadedImages]);
    setUploading(false);
  };

  const removeImage = (index) => {
    setImages(prev => prev.filter((_, i) => i !== index));
  };

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
    if (!content.trim() && !images.length) return;
    
    setPosting(true);
    try {
      const hashtags = extractHashtags(content);
      const mentions = extractMentions(content);
      
      const response = await axios.post(`${API}/posts`, {
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
      
      // Refresh feed if on feed page
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
              
              {/* Character Counter */}
              <div className="flex justify-between items-center mt-2">
                <span className={`text-sm ${characterCount > 280 ? 'text-red-500' : 'text-gray-500'}`}>
                  {characterCount}/280
                </span>
              </div>
            </div>
          </div>

          {/* Image Preview */}
          {images.length > 0 && (
            <div className="grid grid-cols-2 gap-2">
              {images.map((image, index) => (
                <div key={index} className="relative">
                  <img 
                    src={`${BACKEND_URL}${image}`} 
                    alt={`Upload ${index + 1}`} 
                    className="w-full h-32 object-cover rounded-lg"
                  />
                  <Button
                    type="button"
                    variant="destructive"
                    size="sm"
                    className="absolute top-2 right-2 h-6 w-6 p-0"
                    onClick={() => removeImage(index)}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          )}
          
          {/* Actions Bar */}
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <label className="cursor-pointer">
                <input
                  type="file"
                  multiple
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => handleImageUpload(Array.from(e.target.files))}
                  disabled={uploading}
                />
                <Button type="button" variant="ghost" size="sm" disabled={uploading}>
                  {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <ImageIcon className="h-4 w-4" />}
                </Button>
              </label>
              
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
              disabled={!isValidPost || posting || uploading}
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

// Notifications Dropdown
const NotificationsDropdown = ({ onClose }) => {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const { setUnreadCount } = useNotifications();

  useEffect(() => {
    fetchNotifications();
  }, []);

  const fetchNotifications = async () => {
    try {
      const response = await axios.get(`${API}/notifications`);
      setNotifications(response.data);
    } catch (error) {
      toast.error("Failed to load notifications");
    } finally {
      setLoading(false);
    }
  };

  const markAllRead = async () => {
    try {
      await axios.post(`${API}/notifications/mark-all-read`);
      setNotifications(prev => prev.map(notif => ({
        ...notif,
        notification: { ...notif.notification, is_read: true }
      })));
      setUnreadCount(0);
    } catch (error) {
      toast.error("Failed to mark notifications as read");
    }
  };

  return (
    <Card className="absolute top-full right-0 mt-2 w-80 max-h-96 overflow-y-auto z-50">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">Notifications</CardTitle>
          <div className="flex space-x-2">
            <Button variant="ghost" size="sm" onClick={markAllRead}>
              Mark all read
            </Button>
            <Button variant="ghost" size="sm" onClick={onClose}>
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        {loading ? (
          <div className="p-4 text-center">
            <Loader2 className="h-6 w-6 animate-spin mx-auto" />
          </div>
        ) : notifications.length === 0 ? (
          <div className="p-4 text-center text-gray-500">
            No notifications yet
          </div>
        ) : (
          notifications.map(({ notification, sender }) => (
            <div 
              key={notification.id} 
              className={`p-4 border-b hover:bg-gray-50 ${!notification.is_read ? 'bg-blue-50' : ''}`}
            >
              <div className="flex items-start space-x-3">
                <Avatar className="h-8 w-8">
                  <AvatarImage src={sender.avatar} />
                  <AvatarFallback>{sender.name[0]}</AvatarFallback>
                </Avatar>
                <div className="flex-1">
                  <p className="text-sm">{notification.message}</p>
                  <p className="text-xs text-gray-500 mt-1">
                    {new Date(notification.created_at).toLocaleString()}
                  </p>
                </div>
              </div>
            </div>
          ))
        )}
      </CardContent>
    </Card>
  );
};

// Post Component with full functionality
const PostCard = ({ post, author, userLiked, userSaved, onUpdate }) => {
  const [showComments, setShowComments] = useState(false);
  const [comments, setComments] = useState([]);
  const [newComment, setNewComment] = useState('');
  const [commentLoading, setCommentLoading] = useState(false);
  const [showOptions, setShowOptions] = useState(false);
  const { user } = useAuth();

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
      const response = await axios.post(`${API}/posts/${post.id}/like`);
      const newLikedState = response.data.liked;
      
      // Optimistic update
      if (onUpdate) {
        onUpdate(post.id, {
          likes_count: post.likes_count + (newLikedState ? 1 : -1),
          user_liked: newLikedState
        });
      }
    } catch (error) {
      toast.error("Failed to like post");
    }
  };

  const handleSave = async () => {
    try {
      const response = await axios.post(`${API}/posts/${post.id}/save`);
      const newSavedState = response.data.saved;
      
      if (onUpdate) {
        onUpdate(post.id, {
          saves_count: post.saves_count + (newSavedState ? 1 : -1),
          user_saved: newSavedState
        });
      }
      
      toast.success(newSavedState ? "Post saved" : "Post unsaved");
    } catch (error) {
      toast.error("Failed to save post");
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
      
      if (onUpdate) {
        onUpdate(post.id, {
          comments_count: post.comments_count + 1
        });
      }
    } catch (error) {
      toast.error("Failed to add comment");
    } finally {
      setCommentLoading(false);
    }
  };

  const handleShare = () => {
    if (navigator.share) {
      navigator.share({
        title: `Post by ${author.name}`,
        text: post.content,
        url: `${window.location.origin}/post/${post.id}`
      });
    } else {
      navigator.clipboard.writeText(`${window.location.origin}/post/${post.id}`);
      toast.success("Link copied to clipboard");
    }
  };

  const handleDelete = async () => {
    if (!window.confirm("Are you sure you want to delete this post?")) return;
    
    try {
      await axios.delete(`${API}/posts/${post.id}`);
      toast.success("Post deleted");
      // Remove from UI
      if (onUpdate) {
        onUpdate(post.id, null); // null means delete
      }
    } catch (error) {
      toast.error("Failed to delete post");
    }
  };

  useEffect(() => {
    if (showComments) {
      fetchComments();
    }
  }, [showComments]);

  const renderContent = (content) => {
    // Simple hashtag and mention linking
    return content.replace(/#(\w+)/g, '<span class="text-blue-500 cursor-pointer">#$1</span>')
                  .replace(/@(\w+)/g, '<span class="text-purple-500 cursor-pointer">@$1</span>');
  };

  return (
    <Card className="mb-6 hover-lift" data-testid={`post-${post.id}`}>
      <CardContent className="pt-6">
        <div className="flex items-start space-x-4">
          <Avatar className="h-10 w-10">
            <AvatarImage src={author?.avatar} />
            <AvatarFallback>{author?.name?.[0]?.toUpperCase()}</AvatarFallback>
          </Avatar>
          
          <div className="flex-1">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2 mb-2">
                <span className="font-semibold text-gray-900">{author?.name}</span>
                <span className="text-gray-500">@{author?.username}</span>
                <span className="text-gray-400">·</span>
                <span className="text-gray-500 text-sm">
                  {new Date(post.created_at).toLocaleDateString()}
                </span>
              </div>
              
              {user?.id === author?.id && (
                <div className="relative">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowOptions(!showOptions)}
                  >
                    <MoreHorizontal className="h-4 w-4" />
                  </Button>
                  
                  {showOptions && (
                    <div className="absolute right-0 top-full mt-1 bg-white border rounded-lg shadow-lg z-10">
                      <Button variant="ghost" size="sm" onClick={() => {/* Edit functionality */}}>
                        <Edit className="h-4 w-4 mr-2" />
                        Edit
                      </Button>
                      <Button variant="ghost" size="sm" onClick={handleDelete} className="text-red-600">
                        <Trash className="h-4 w-4 mr-2" />
                        Delete
                      </Button>
                    </div>
                  )}
                </div>
              )}
            </div>
            
            <div 
              className="text-gray-800 mb-4 whitespace-pre-wrap"
              dangerouslySetInnerHTML={{ __html: renderContent(post.content) }}
            />
            
            {/* Image Gallery */}
            {post.images && post.images.length > 0 && (
              <div className={`grid gap-2 mb-4 ${
                post.images.length === 1 ? 'grid-cols-1' : 
                post.images.length === 2 ? 'grid-cols-2' : 
                'grid-cols-2'
              }`}>
                {post.images.map((image, index) => (
                  <img
                    key={index}
                    src={`${BACKEND_URL}${image}`}
                    alt={`Post image ${index + 1}`}
                    className="rounded-lg object-cover w-full h-48"
                  />
                ))}
              </div>
            )}
            
            {/* Action Buttons */}
            <div className="flex items-center justify-between text-gray-500">
              <div className="flex items-center space-x-6">
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
                
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleSave}
                  className={`flex items-center space-x-1 ${userSaved ? 'text-blue-500' : ''}`}
                >
                  <Bookmark className={`h-4 w-4 ${userSaved ? 'fill-current' : ''}`} />
                </Button>
                
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleShare}
                  className="flex items-center space-x-1"
                >
                  <Share className="h-4 w-4" />
                </Button>
              </div>
            </div>
            
            {/* Comments Section */}
            {showComments && (
              <div className="mt-4 space-y-4">
                <Separator />
                
                {/* Comment form */}
                <form onSubmit={handleComment} className="flex space-x-2">
                  <Avatar className="h-8 w-8">
                    <AvatarImage src={user?.avatar} />
                    <AvatarFallback>{user?.name?.[0]?.toUpperCase()}</AvatarFallback>
                  </Avatar>
                  <div className="flex-1 flex space-x-2">
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
                      {commentLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                    </Button>
                  </div>
                </form>
                
                {/* Comments list */}
                <div className="space-y-3">
                  {comments.map(({ comment, author: commentAuthor, replies }) => (
                    <div key={comment.id} className="space-y-2">
                      <div className="flex space-x-2">
                        <Avatar className="h-6 w-6">
                          <AvatarImage src={commentAuthor?.avatar} />
                          <AvatarFallback className="text-xs">{commentAuthor?.name?.[0]?.toUpperCase()}</AvatarFallback>
                        </Avatar>
                        <div className="flex-1">
                          <div className="bg-gray-50 rounded-lg p-3">
                            <div className="flex items-center space-x-1 mb-1">
                              <span className="font-medium text-sm">{commentAuthor?.name}</span>
                              <span className="text-gray-500 text-xs">@{commentAuthor?.username}</span>
                            </div>
                            <p className="text-sm text-gray-800">{comment.content}</p>
                          </div>
                        </div>
                      </div>
                      
                      {/* Replies */}
                      {replies && replies.length > 0 && (
                        <div className="ml-8 space-y-2">
                          {replies.map(({ comment: reply, author: replyAuthor }) => (
                            <div key={reply.id} className="flex space-x-2">
                              <Avatar className="h-5 w-5">
                                <AvatarImage src={replyAuthor?.avatar} />
                                <AvatarFallback className="text-xs">{replyAuthor?.name?.[0]?.toUpperCase()}</AvatarFallback>
                              </Avatar>
                              <div className="bg-gray-50 rounded-lg p-2 flex-1">
                                <div className="flex items-center space-x-1 mb-1">
                                  <span className="font-medium text-xs">{replyAuthor?.name}</span>
                                </div>
                                <p className="text-xs text-gray-800">{reply.content}</p>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
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

// Feed Components
const InfiniteScrollFeed = ({ fetchFunction, emptyMessage = "No posts to show" }) => {
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [hasMore, setHasMore] = useState(true);
  const [skip, setSkip] = useState(0);
  
  const { ref, inView } = useInView({
    threshold: 0,
  });

  const fetchPosts = async (skipCount = 0, reset = false) => {
    if (!hasMore && !reset) return;
    
    try {
      const response = await fetchFunction(20, skipCount);
      const newPosts = response.data;
      
      if (reset) {
        setPosts(newPosts);
      } else {
        setPosts(prev => [...prev, ...newPosts]);
      }
      
      if (newPosts.length < 20) {
        setHasMore(false);
      }
      
      setSkip(skipCount + newPosts.length);
    } catch (error) {
      toast.error("Failed to load posts");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPosts(0, true);
  }, []);

  useEffect(() => {
    if (inView && hasMore && !loading) {
      fetchPosts(skip);
    }
  }, [inView, hasMore, loading, skip]);

  const handlePostUpdate = (postId, updates) => {
    if (updates === null) {
      // Delete post
      setPosts(prev => prev.filter(item => item.post.id !== postId));
    } else {
      // Update post
      setPosts(prev => prev.map(item => {
        if (item.post.id === postId) {
          return {
            ...item,
            post: { ...item.post, ...updates },
            user_liked: updates.user_liked !== undefined ? updates.user_liked : item.user_liked,
            user_saved: updates.user_saved !== undefined ? updates.user_saved : item.user_saved
          };
        }
        return item;
      }));
    }
  };

  if (loading && posts.length === 0) {
    return (
      <div className="space-y-6">
        {Array.from({ length: 3 }).map((_, i) => (
          <Card key={i} className="animate-pulse">
            <CardContent className="pt-6">
              <div className="flex space-x-4">
                <div className="rounded-full bg-gray-300 h-10 w-10"></div>
                <div className="flex-1 space-y-3">
                  <div className="bg-gray-300 h-4 w-1/3 rounded"></div>
                  <div className="bg-gray-300 h-4 w-full rounded"></div>
                  <div className="bg-gray-300 h-4 w-2/3 rounded"></div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div data-testid="feed-posts">
      {posts.length === 0 ? (
        <Card>
          <CardContent className="text-center py-12">
            <p className="text-gray-500 mb-4">{emptyMessage}</p>
          </CardContent>
        </Card>
      ) : (
        <>
          {posts.map(({ post, author, user_liked, user_saved }) => (
            <PostCard
              key={post.id}
              post={post}
              author={author}
              userLiked={user_liked}
              userSaved={user_saved}
              onUpdate={handlePostUpdate}
            />
          ))}
          
          {/* Loading indicator */}
          {hasMore && (
            <div ref={ref} className="flex justify-center py-4">
              <Loader2 className="h-6 w-6 animate-spin" />
            </div>
          )}
        </>
      )}
    </div>
  );
};

const HomeFeed = () => {
  return (
    <div className="max-w-2xl mx-auto py-6 px-4">
      <InfiniteScrollFeed
        fetchFunction={(limit, skip) => axios.get(`${API}/posts/feed?limit=${limit}&skip=${skip}`)}
        emptyMessage="Your feed is empty! Start following some creators or create your first post."
      />
    </div>
  );
};

const ExploreFeed = () => {
  return (
    <div className="max-w-2xl mx-auto py-6 px-4">
      <InfiniteScrollFeed
        fetchFunction={(limit, skip) => axios.get(`${API}/posts/explore?limit=${limit}&skip=${skip}`)}
        emptyMessage="No public posts to explore yet."
      />
    </div>
  );
};

// Profile Components
const UserProfile = ({ username }) => {
  const [profileUser, setProfileUser] = useState(null);
  const [isFollowing, setIsFollowing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('posts');
  const [showFollowers, setShowFollowers] = useState(false);
  const [showFollowing, setShowFollowing] = useState(false);
  const { user: currentUser } = useAuth();

  useEffect(() => {
    fetchProfile();
  }, [username]);

  const fetchProfile = async () => {
    try {
      const response = await axios.get(`${API}/users/${username}`);
      setProfileUser(response.data);
      
      // Check if following
      if (currentUser && response.data.id !== currentUser.id) {
        // This would need a separate endpoint to check follow status
        // For now, we'll assume not following
        setIsFollowing(false);
      }
    } catch (error) {
      toast.error("User not found");
    } finally {
      setLoading(false);
    }
  };

  const handleFollow = async () => {
    try {
      const response = await axios.post(`${API}/users/${username}/follow`);
      setIsFollowing(response.data.following);
      
      // Update follower count
      setProfileUser(prev => ({
        ...prev,
        followers_count: prev.followers_count + (response.data.following ? 1 : -1)
      }));
      
    } catch (error) {
      toast.error("Failed to follow user");
    }
  };

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto py-6 px-4">
        <div className="animate-pulse">
          <div className="bg-gray-300 h-32 w-full rounded-lg mb-4"></div>
          <div className="flex items-center space-x-4">
            <div className="bg-gray-300 rounded-full h-20 w-20"></div>
            <div className="space-y-2 flex-1">
              <div className="bg-gray-300 h-6 w-1/3 rounded"></div>
              <div className="bg-gray-300 h-4 w-1/2 rounded"></div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!profileUser) {
    return (
      <div className="max-w-4xl mx-auto py-6 px-4">
        <Card>
          <CardContent className="text-center py-12">
            <p className="text-gray-500">User not found</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const isOwnProfile = currentUser?.id === profileUser.id;

  return (
    <div className="max-w-4xl mx-auto py-6 px-4">
      {/* Profile Header */}
      <Card className="mb-6">
        <CardContent className="p-0">
          {/* Banner */}
          <div className="h-32 bg-gradient-to-r from-purple-400 via-pink-500 to-red-500 rounded-t-lg relative">
            {profileUser.banner && (
              <img 
                src={`${BACKEND_URL}${profileUser.banner}`} 
                alt="Profile banner"
                className="w-full h-full object-cover rounded-t-lg"
              />
            )}
          </div>
          
          {/* Profile Info */}
          <div className="px-6 pb-6">
            <div className="flex items-end justify-between -mt-10 mb-4">
              <Avatar className="h-20 w-20 border-4 border-white">
                <AvatarImage src={profileUser.avatar} />
                <AvatarFallback className="text-2xl">{profileUser.name[0]?.toUpperCase()}</AvatarFallback>
              </Avatar>
              
              {!isOwnProfile && (
                <div className="flex space-x-2">
                  <Button 
                    onClick={handleFollow}
                    variant={isFollowing ? "outline" : "default"}
                    className={isFollowing ? "" : "bg-gradient-to-r from-purple-600 to-pink-500"}
                  >
                    {isFollowing ? "Unfollow" : "Follow"}
                  </Button>
                  <Button variant="outline">
                    <MessageSquare className="h-4 w-4" />
                  </Button>
                </div>
              )}
              
              {isOwnProfile && (
                <Button variant="outline">
                  <Edit className="h-4 w-4 mr-2" />
                  Edit Profile
                </Button>
              )}
            </div>
            
            <div>
              <h1 className="text-2xl font-bold">{profileUser.name}</h1>
              <p className="text-gray-600">@{profileUser.username}</p>
              
              {profileUser.bio && (
                <p className="mt-3 text-gray-800">{profileUser.bio}</p>
              )}
              
              <div className="flex items-center space-x-6 mt-4">
                <button 
                  onClick={() => setShowFollowing(true)}
                  className="hover:underline"
                >
                  <span className="font-bold">{profileUser.following_count}</span>
                  <span className="text-gray-600 ml-1">Following</span>
                </button>
                <button 
                  onClick={() => setShowFollowers(true)}
                  className="hover:underline"
                >
                  <span className="font-bold">{profileUser.followers_count}</span>
                  <span className="text-gray-600 ml-1">Followers</span>
                </button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
      
      {/* Tabs */}
      <div className="border-b border-gray-200 mb-6">
        <div className="flex space-x-8">
          <button
            onClick={() => setActiveTab('posts')}
            className={`pb-4 border-b-2 font-medium ${
              activeTab === 'posts' 
                ? 'border-purple-500 text-purple-600' 
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            Posts
          </button>
          <button
            onClick={() => setActiveTab('about')}
            className={`pb-4 border-b-2 font-medium ${
              activeTab === 'about' 
                ? 'border-purple-500 text-purple-600' 
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            About
          </button>
        </div>
      </div>
      
      {/* Tab Content */}
      {activeTab === 'posts' && (
        <InfiniteScrollFeed
          fetchFunction={(limit, skip) => 
            axios.get(`${API}/posts/feed?limit=${limit}&skip=${skip}&user=${profileUser.username}`)
          }
          emptyMessage={`${isOwnProfile ? 'You haven\'t' : `${profileUser.name} hasn't`} posted anything yet.`}
        />
      )}
      
      {activeTab === 'about' && (
        <Card>
          <CardContent className="p-6">
            <h3 className="text-lg font-semibold mb-4">About</h3>
            {profileUser.bio ? (
              <p className="text-gray-700">{profileUser.bio}</p>
            ) : (
              <p className="text-gray-500 italic">No bio available</p>
            )}
            
            {profileUser.links && profileUser.links.length > 0 && (
              <div className="mt-6">
                <h4 className="font-medium mb-2">Links</h4>
                <div className="space-y-1">
                  {profileUser.links.map((link, index) => (
                    <a 
                      key={index}
                      href={link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-500 hover:underline block"
                    >
                      {link}
                    </a>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Followers Modal */}
      <FollowersModal 
        isOpen={showFollowers}
        onClose={() => setShowFollowers(false)}
        userId={profileUser.id}
        title="Followers"
      />
      
      {/* Following Modal */}
      <FollowersModal 
        isOpen={showFollowing}
        onClose={() => setShowFollowing(false)}
        userId={profileUser.id}
        title="Following"
        isFollowing={true}
      />
    </div>
  );
};

const FollowersModal = ({ isOpen, onClose, userId, title, isFollowing = false }) => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (isOpen) {
      fetchUsers();
    }
  }, [isOpen]);

  const fetchUsers = async () => {
    try {
      const endpoint = isFollowing ? `/users/${userId}/following` : `/users/${userId}/followers`;
      const response = await axios.get(`${API}${endpoint}`);
      setUsers(response.data);
    } catch (error) {
      toast.error(`Failed to load ${title.toLowerCase()}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        
        <div className="max-h-96 overflow-y-auto">
          {loading ? (
            <div className="flex justify-center py-4">
              <Loader2 className="h-6 w-6 animate-spin" />
            </div>
          ) : users.length === 0 ? (
            <p className="text-center text-gray-500 py-4">
              No {title.toLowerCase()} yet
            </p>
          ) : (
            <div className="space-y-3">
              {users.map((user) => (
                <div key={user.id} className="flex items-center justify-between">
                  <div 
                    className="flex items-center space-x-3 cursor-pointer flex-1"
                    onClick={() => {
                      window.location.href = `/@${user.username}`;
                      onClose();
                    }}
                  >
                    <Avatar className="h-10 w-10">
                      <AvatarImage src={user.avatar} />
                      <AvatarFallback>{user.name[0]}</AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="font-medium">{user.name}</p>
                      <p className="text-sm text-gray-500">@{user.username}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

// Messages Component (Basic UI - Real-time functionality would need WebSocket integration)
const Messages = () => {
  return (
    <div className="max-w-4xl mx-auto py-6 px-4">
      <Card>
        <CardHeader>
          <CardTitle>Messages</CardTitle>
        </CardHeader>
        <CardContent className="text-center py-12">
          <MessageSquare className="h-12 w-12 mx-auto text-gray-400 mb-4" />
          <p className="text-gray-500 mb-4">Direct messaging coming soon!</p>
          <p className="text-sm text-gray-400">
            Send and receive private messages with other krafink users
          </p>
        </CardContent>
      </Card>
    </div>
  );
};

// Notifications Page
const NotificationsPage = () => {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const { setUnreadCount } = useNotifications();

  useEffect(() => {
    fetchNotifications();
    markAllRead();
  }, []);

  const fetchNotifications = async () => {
    try {
      const response = await axios.get(`${API}/notifications`);
      setNotifications(response.data);
    } catch (error) {
      toast.error("Failed to load notifications");
    } finally {
      setLoading(false);
    }
  };

  const markAllRead = async () => {
    try {
      await axios.post(`${API}/notifications/mark-all-read`);
      setUnreadCount(0);
    } catch (error) {
      console.error("Failed to mark notifications as read");
    }
  };

  return (
    <div className="max-w-2xl mx-auto py-6 px-4">
      <Card>
        <CardHeader>
          <CardTitle>Notifications</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="p-6 text-center">
              <Loader2 className="h-8 w-8 animate-spin mx-auto" />
            </div>
          ) : notifications.length === 0 ? (
            <div className="p-6 text-center">
              <Bell className="h-12 w-12 mx-auto text-gray-400 mb-4" />
              <p className="text-gray-500">No notifications yet</p>
            </div>
          ) : (
            <div className="divide-y">
              {notifications.map(({ notification, sender }) => (
                <div key={notification.id} className="p-4 hover:bg-gray-50">
                  <div className="flex items-start space-x-3">
                    <Avatar className="h-10 w-10">
                      <AvatarImage src={sender.avatar} />
                      <AvatarFallback>{sender.name[0]}</AvatarFallback>
                    </Avatar>
                    <div className="flex-1">
                      <p className="text-sm">{notification.message}</p>
                      <p className="text-xs text-gray-500 mt-1">
                        {new Date(notification.created_at).toLocaleString()}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

// Main App Component
const AppContent = () => {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-500 mx-auto mb-4"></div>
          <div className="text-2xl font-bold bg-gradient-to-r from-purple-600 to-pink-500 bg-clip-text text-transparent">
            krafink
          </div>
        </div>
      </div>
    );
  }

  if (!user) {
    return <AuthPage />;
  }

  const isMobile = window.innerWidth < 768;

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-pink-50 pb-16 md:pb-0">
      <DesktopNavigation />
      <MobileNavigation />
      
      <main className="min-h-screen">
        <Routes>
          <Route path="/" element={<Navigate to="/feed" replace />} />
          <Route path="/feed" element={<HomeFeed />} />
          <Route path="/explore" element={<ExploreFeed />} />
          <Route path="/messages" element={<Messages />} />
          <Route path="/notifications" element={<NotificationsPage />} />
          <Route path="/@:username" element={<UserProfileWrapper />} />
          <Route path="*" element={<Navigate to="/feed" replace />} />
        </Routes>
      </main>
    </div>
  );
};

const UserProfileWrapper = () => {
  const { username } = useParams();
  return <UserProfile username={username} />;
};

function App() {
  return (
    <AuthProvider>
      <NotificationProvider>
        <BrowserRouter>
          <AppContent />
        </BrowserRouter>
      </NotificationProvider>
    </AuthProvider>
  );
}

export default App;

// Continue in next message due to length...