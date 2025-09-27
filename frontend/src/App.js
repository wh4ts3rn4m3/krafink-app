/* eslint-disable */
import React, { useState, useEffect, createContext, useContext } from "react";
import { BrowserRouter, Routes, Route, Navigate, Link, useNavigate } from "react-router-dom";
import axios from "axios";
import io from "socket.io-client";
import "./App.css";

// Context Providers
import { ThemeProvider } from "./contexts/ThemeContext";
import { LanguageProvider, useLanguage } from "./contexts/LanguageContext";

// UI Components
import { Button } from "./components/ui/button";
import { Input } from "./components/ui/input";
import { Textarea } from "./components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "./components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "./components/ui/avatar";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "./components/ui/dialog";
import { Toaster } from "./components/ui/toaster";

// Icons
import { 
  Heart, MessageCircle, Search as SearchIcon, User as UserIcon, Home, Settings, LogOut, Plus,
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

// Image uploader
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
    window.__emergent_socketio = socket;
    socket.on('notification', (data) => {
      toast.info(data.notification.message);
    });
    socket.on('follow_updated', () => {});
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
      const response = await axios.post(`${API}/auth/register`, { email, username, name, password });
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

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        Loading...
      </div>
    );
  }

  return (
    <AuthContext.Provider value={{ user, login, register, logout, loading }}>
      {children}
    </AuthContext.Provider>
  );
};

// Auth Components
const AuthPage = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [formData, setFormData] = useState({ email: '', username: '', name: '', password: '' });
  const [loading, setLoading] = useState(false);
  const { login, register } = useAuth();
  const { t } = useLanguage();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    let success = false;
    if (isLogin) success = await login(formData.email, formData.password);
    else success = await register(formData.email, formData.username, formData.name, formData.password);
    setLoading(false);
  };

  const handleInputChange = (e) => setFormData({ ...formData, [e.target.name]: e.target.value });

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-600 via-fuchsia-500 to-pink-500 p-4">
      <Card className="w-full max-w-md bg-white/95 backdrop-blur shadow-xl border-0">
        <CardHeader className="text-center pb-2">
          <div className="text-4xl font-bold bg-gradient-to-r from-purple-600 to-pink-500 bg-clip-text text-transparent mb-2">krafink</div>
          <CardTitle className="text-xl text-gray-700">{isLogin ? t('auth.welcome_back') : t('auth.join_community')}</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <Input type="email" name="email" placeholder={t('auth.email')} value={formData.email} onChange={handleInputChange} required data-testid="email-input" />
            {!isLogin && (
              <>
                <Input type="text" name="username" placeholder={t('auth.username')} value={formData.username} onChange={handleInputChange} required data-testid="username-input" />
                <Input type="text" name="name" placeholder={t('auth.name')} value={formData.name} onChange={handleInputChange} required data-testid="name-input" />
              </>
            )}
            <Input type="password" name="password" placeholder={t('auth.password')} value={formData.password} onChange={handleInputChange} required data-testid="password-input" />
            <Button type="submit" className="w-full bg-gradient-to-r from-purple-600 to-pink-500 hover:from-purple-700 hover:to-pink-600" disabled={loading} data-testid="auth-submit-btn">{loading ? "Please wait..." : (isLogin ? t('auth.sign_in') : t('auth.create_account'))}</Button>
          </form>
          <div className="mt-4 text-center">
            <Button variant="ghost" onClick={() => setIsLogin(!isLogin)} data-testid="auth-toggle-btn">{isLogin ? t('auth.need_account') : t('auth.have_account')}</Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

// Feed and Post components
const renderContent = (content) => {
  return content
    .replace(/#(\w+)/g, '<span class="text-blue-500 font-medium cursor-pointer">#$1</span>')
    .replace(/@(\w+)/g, '<span class="text-purple-500 font-medium cursor-pointer">@$1</span>');
};

const PostCard = ({ item, onUpdate }) => {
  const { post, author, user_liked, user_saved } = item;
  const [liked, setLiked] = useState(user_liked);
  const [likesCount, setLikesCount] = useState(post.likes_count);

  const handleLike = async () => {
    try {
      const response = await axios.post(`${API}/posts/${post.id}/like`);
      const newLiked = response.data.liked;
      setLiked(newLiked);
      setLikesCount((c) => c + (newLiked ? 1 : -1));
      if (onUpdate) onUpdate(post.id, { likes_count: likesCount + (newLiked ? 1 : -1) });
    } catch (e) {
      toast.error('Failed to like post');
    }
  };

  return (
    <Card className="mb-4">
      <CardContent className="pt-6">
        <div className="flex items-start space-x-4">
          <Link to={`/@${author?.username}`}>
            <Avatar className="h-10 w-10">
              <AvatarImage src={author?.avatar ? `${BACKEND_URL}${author.avatar}` : undefined} />
              <AvatarFallback>{author?.name?.[0]?.toUpperCase()}</AvatarFallback>
            </Avatar>
          </Link>
          <div className="flex-1">
            <div className="flex items-center space-x-2 mb-2">
              <Link to={`/@${author?.username}`} className="font-semibold hover:underline">{author?.name}</Link>
              <span className="text-gray-500">@{author?.username}</span>
              <span className="text-gray-400">·</span>
              <span className="text-gray-500 text-sm">{new Date(post.created_at).toLocaleDateString()}</span>
            </div>
            <div className="text-gray-800 dark:text-gray-200 mb-4 whitespace-pre-wrap" dangerouslySetInnerHTML={{ __html: renderContent(post.content) }} />
            {post.images && post.images.length > 0 && (
              <div className={`grid gap-2 mb-4 rounded-lg overflow-hidden ${post.images.length === 1 ? 'grid-cols-1' : 'grid-cols-2'}`}>
                {post.images.map((img, i) => (
                  <img key={i} src={`${BACKEND_URL}${img}`} alt={`Post image ${i + 1}`} className="w-full h-48 object-cover" />
                ))}
              </div>
            )}
            <div className="flex items-center space-x-6 text-gray-500">
              <Button variant="ghost" size="sm" onClick={handleLike} className={`flex items-center space-x-1 ${liked ? 'text-pink-500' : ''}`}>
                <span>❤️</span>
                <span>{likesCount}</span>
              </Button>
              <Button variant="ghost" size="sm" className="flex items-center space-x-1">
                <span>💬</span>
                <span>{post.comments_count}</span>
              </Button>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

const FeedPage = () => {
  const [feed, setFeed] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchFeed = async () => {
    setLoading(true);
    try {
      const response = await axios.get(`${API}/posts/feed?limit=50`);
      setFeed(response.data || []);
    } catch (e) {
      console.error('Failed to load feed', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFeed();
  }, []);

  const handleUpdate = (postId, updates) => {
    setFeed((prev) => prev.map((it) => it.post.id === postId ? { ...it, post: { ...it.post, ...updates } } : it));
  };

  if (loading) {
    return (
      <div className="max-w-2xl mx-auto py-6 px-4">
        <Card className="animate-pulse"><CardContent className="p-6">Loading feed…</CardContent></Card>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto py-6 px-4">
      {feed.length === 0 ? (
        <Card><CardContent className="p-6 text-center text-gray-500">Follow people to see posts here.</CardContent></Card>
      ) : (
        feed.map((item) => <PostCard key={item.post.id} item={item} onUpdate={handleUpdate} />)
      )}
    </div>
  );
};

// Post Creation Modal using ImageUploader
const CreatePostModal = ({ isOpen, onClose }) => {
  const [content, setContent] = useState('');
  const [images, setImages] = useState([]);
  const [posting, setPosting] = useState(false);
  const [visibility, setVisibility] = useState('public');
  const { user } = useAuth();

  const extractHashtags = (text) => (text.match(/#\w+/g) || []).map(tag => tag.slice(1).toLowerCase());
  const extractMentions = (text) => (text.match(/@\w+/g) || []).map(m => m.slice(1));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!content.trim() && images.length === 0) return;
    setPosting(true);
    try {
      const hashtags = extractHashtags(content);
      const mentions = extractMentions(content);
      await axios.post(`${API}/posts`, { content: content.trim(), images, visibility, hashtags, mentions });
      setContent(''); setImages([]); setVisibility('public'); toast.success("Post created!"); onClose();
      if (window.location.pathname === '/feed') window.location.reload();
    } catch (e) {
      toast.error('Failed to create post');
    } finally {
      setPosting(false);
    }
  };

  const characterCount = content.length;
  const isValidPost = (content.trim() || images.length > 0) && characterCount <= 280;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader><DialogTitle>Create Post</DialogTitle></DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="flex space-x-4">
            <Avatar className="h-10 w-10">
              <AvatarImage src={user?.avatar ? `${BACKEND_URL}${user.avatar}` : undefined} />
              <AvatarFallback>{user?.name?.[0]?.toUpperCase()}</AvatarFallback>
            </Avatar>
            <div className="flex-1">
              <Textarea placeholder="What's on your mind?" value={content} onChange={(e) => setContent(e.target.value)} className="min-h-[120px] border-0 resize-none focus:ring-0 p-0 text-base" data-testid="post-content-input" />
              <div className="flex justify-between items-center mt-2">
                <span className={`text-sm ${characterCount > 280 ? 'text-red-500' : 'text-gray-500'}`}>{characterCount}/280</span>
              </div>
            </div>
          </div>
          <ImageUploader images={images} setImages={setImages} />
          <div className="flex items-center justify-between">
            <div>
              <select value={visibility} onChange={(e) => setVisibility(e.target.value)} className="text-sm border rounded px-2 py-1">
                <option value="public">Public</option>
                <option value="followers">Followers Only</option>
              </select>
            </div>
            <Button type="submit" disabled={!isValidPost || posting} className="bg-gradient-to-r from-purple-600 to-pink-500 hover:from-purple-700 hover:to-pink-600" data-testid="create-post-btn">{posting ? <Loader2 className="h-4 w-4 animate-spin" /> : "Post"}</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

// Navigation Layout
const Layout = ({ children }) => {
  const { user, logout } = useAuth();
  const [showCreate, setShowCreate] = useState(false);
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <header className="bg-white dark:bg-gray-950 border-b sticky top-0 z-30">
        <div className="max-w-5xl mx-auto px-4 py-2 flex items-center justify-between">
          <Link to="/feed" className="flex items-center space-x-2" data-testid="nav-home">
            <Home className="h-5 w-5" />
            <span className="font-semibold">Home</span>
          </Link>
          <div className="flex items-center space-x-3">
            <Link to="/search" data-testid="nav-search" className="px-2 py-1 rounded hover:bg-gray-100 dark:hover:bg-gray-800 flex items-center space-x-1"><SearchIcon className="h-4 w-4" /><span>Search</span></Link>
            <button onClick={() => setShowCreate(true)} data-testid="nav-compose" className="px-2 py-1 rounded hover:bg-gray-100 dark:hover:bg-gray-800 flex items-center space-x-1"><Plus className="h-4 w-4" /><span>Compose</span></button>
            <Link to={`/@${user?.username}`} className="flex items-center space-x-2">
              <Avatar className="h-8 w-8">
                <AvatarImage src={user?.avatar ? `${BACKEND_URL}${user.avatar}` : undefined} />
                <AvatarFallback>{user?.name?.[0]?.toUpperCase()}</AvatarFallback>
              </Avatar>
            </Link>
            <Button variant="ghost" size="sm" onClick={logout}>Logout</Button>
          </div>
        </div>
      </header>
      <main>{children}</main>
      <CreatePostModal isOpen={showCreate} onClose={() => setShowCreate(false)} />
    </div>
  );
};

// Main App
function App() {
  return (
    <ThemeProvider>
      <LanguageProvider>
        <BrowserRouter>
          <AuthProvider>
            <Routes>
              <Route path="/" element={<Navigate to="/feed" replace />} />
              <Route path="/feed" element={<Layout><FeedPage /></Layout>} />
              <Route path="/search" element={<Layout><SearchPage /></Layout>} />
              <Route path="/messages" element={<Layout><MessagesPage /></Layout>} />
              <Route path="/compose" element={<Layout><ComposePage /></Layout>} />
              <Route path="/@:username" element={<Layout><ProfilePage /></Layout>} />
              <Route path="/admin" element={<Layout><AdminPage /></Layout>} />
              <Route path="/terms" element={<Layout><TermsPage /></Layout>} />
              <Route path="/privacy" element={<Layout><PrivacyPage /></Layout>} />
              <Route path="/imprint" element={<Layout><ImprintPage /></Layout>} />
              <Route path="*" element={<AuthPage />} />
            </Routes>
          </AuthProvider>
          <Toaster />
          <CookieBanner />
        </BrowserRouter>
      </LanguageProvider>
    </ThemeProvider>
  );
}

export default App;