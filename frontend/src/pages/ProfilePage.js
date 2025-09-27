import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import axios from 'axios';
import { Card, CardContent } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Textarea } from '../components/ui/textarea';
import { Avatar, AvatarFallback, AvatarImage } from '../components/ui/avatar';
import { Badge } from '../components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { 
  Edit, MessageSquare, Users, Link as LinkIcon, 
  Loader2, X, Save, Upload
} from 'lucide-react';
import { useAuth } from '../App';
import { useLanguage } from '../contexts/LanguageContext';
import { toast } from 'sonner';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const resolveUrl = (url) => {
  if (!url) return '';
  return url.startsWith('http') ? url : `${BACKEND_URL}${url}`;
};

// Post component for profile posts
const ProfilePostCard = ({ post, author, userLiked, userSaved, onUpdate }) => {
  const navigate = useNavigate();
  
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
      toast.error('Failed to like post');
    }
  };

  const renderContent = (content) => {
    return content
      .replace(/#(\w+)/g, '<span class="text-blue-500 font-medium cursor-pointer">#$1</span>')
      .replace(/@(\w+)/g, '<span class="text-purple-500 font-medium cursor-pointer">@$1</span>');
  };

  return (
    <Card className="mb-4 hover-lift">
      <CardContent className="pt-6">
        <div className="flex items-start space-x-4">
          <Link to={`/@${author?.username}`}>
            <Avatar className="h-10 w-10">
              <AvatarImage src={resolveUrl(author?.avatar)} />
              <AvatarFallback>{author?.name?.[0]?.toUpperCase()}</AvatarFallback>
            </Avatar>
          </Link>
          
          <div className="flex-1">
            <div className="flex items-center space-x-2 mb-2">
              <Link to={`/@${author?.username}`} className="font-semibold hover:underline">
                {author?.name}
              </Link>
              <span className="text-gray-500">@{author?.username}</span>
              <span className="text-gray-400">·</span>
              <span className="text-gray-500 text-sm">
                {new Date(post.created_at).toLocaleDateString()}
              </span>
            </div>
            
            <div 
              className="text-gray-800 dark:text-gray-200 mb-4 whitespace-pre-wrap"
              dangerouslySetInnerHTML={{ __html: renderContent(post.content) }}
            />
            
            {post.images && post.images.length > 0 && (
              <div className={`grid gap-2 mb-4 rounded-lg overflow-hidden ${
                post.images.length === 1 ? 'grid-cols-1' : 'grid-cols-2'
              }`}>
                {post.images.map((image, index) => (
                  <img
                    key={index}
                    src={`${BACKEND_URL}${image}`}
                    alt={`Post image ${index + 1}`}
                    className="w-full h-48 object-cover cursor-pointer hover:opacity-90 transition-opacity"
                  />
                ))}
              </div>
            )}
            
            <div className="flex items-center space-x-6 text-gray-500">
              <Button
                variant="ghost"
                size="sm"
                onClick={handleLike}
                className={`flex items-center space-x-1 ${userLiked ? 'text-pink-500' : ''}`}
              >
                <span>❤️</span>
                <span>{post.likes_count}</span>
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

const LinksEditor = ({ value, onChange }) => {
  const addLink = () => onChange([...(value || []), { label: '', url: '' }]);
  const removeLink = (idx) => onChange((value || []).filter((_, i) => i !== idx));
  const updateLink = (idx, field, v) => onChange((value || []).map((item, i) => i === idx ? { ...item, [field]: v } : item));

  return (
    <div className="space-y-2">
      {(value || []).map((item, idx) => (
        <div key={idx} className="flex space-x-2">
          <Input
            placeholder="Label"
            value={item.label}
            onChange={(e) => updateLink(idx, 'label', e.target.value)}
          />
          <Input
            placeholder="https://example.com"
            value={item.url}
            onChange={(e) => updateLink(idx, 'url', e.target.value)}
          />
          <Button type="button" variant="ghost" onClick={() => removeLink(idx)}>
            <X className="h-4 w-4" />
          </Button>
        </div>
      ))}
      <Button type="button" variant="outline" onClick={addLink}>
        + Add Link
      </Button>
    </div>
  );
};

const EditProfileModal = ({ isOpen, onClose, user, onUpdate }) => {
  const fileInputAvatar = useRef(null);
  const fileInputBanner = useRef(null);
  const [formData, setFormData] = useState({
    name: user?.name || '',
    bio: user?.bio || '',
    avatar: user?.avatar || '',
    banner: user?.banner || '',
    links: []
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (user) {
      let links = [];
      if (Array.isArray(user.links)) {
        links = user.links.map((l, idx) => {
          if (typeof l === 'string') return { label: `Link ${idx + 1}`, url: l };
          return l;
        });
      }
      setFormData({
        name: user.name || '',
        bio: user.bio || '',
        avatar: user.avatar || '',
        banner: user.banner || '',
        links
      });
    }
  }, [user]);

  const handleUpload = async (file, field) => {
    if (!file) return;
    try {
      const fd = new FormData();
      fd.append('file', file);
      const res = await axios.post(`${API}/upload/image`, fd, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      setFormData(prev => ({ ...prev, [field]: res.data.url }));
      toast.success(`${field === 'avatar' ? 'Avatar' : 'Banner'} updated`);
    } catch (e) {
      toast.error('Upload failed');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      // sanitize links
      const links = (formData.links || [])
        .filter(l => (l.url || '').trim())
        .map(l => ({ label: l.label?.trim() || l.url, url: l.url.trim() }));

      const payload = {
        name: formData.name,
        bio: formData.bio,
        links,
        avatar: formData.avatar || null,
        banner: formData.banner || null
      };

      const response = await axios.put(`${API}/users/profile`, payload);
      onUpdate(response.data);
      toast.success('Profile updated successfully!');
      onClose();
    } catch (error) {
      toast.error('Failed to update profile');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Edit Profile</DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Avatar & Banner */}
          <div className="space-y-3">
            <div className="flex items-center space-x-3">
              <Avatar className="h-16 w-16">
                <AvatarImage src={resolveUrl(formData.avatar)} />
                <AvatarFallback>{formData.name?.[0]?.toUpperCase()}</AvatarFallback>
              </Avatar>
              <div>
                <input ref={fileInputAvatar} type="file" accept="image/*" className="hidden" onChange={(e) => handleUpload(e.target.files[0], 'avatar')} />
                <Button type="button" variant="outline" onClick={() => fileInputAvatar.current?.click()}>
                  Change Avatar
                </Button>
              </div>
            </div>
            <div>
              {formData.banner && (
                <img src={resolveUrl(formData.banner)} alt="Banner" className="w-full h-24 object-cover rounded" />
              )}
              <div className="mt-2">
                <input ref={fileInputBanner} type="file" accept="image/*" className="hidden" onChange={(e) => handleUpload(e.target.files[0], 'banner')} />
                <Button type="button" variant="outline" onClick={() => fileInputBanner.current?.click()}>
                  Change Banner
                </Button>
              </div>
            </div>
          </div>

          <div>
            <label className="text-sm font-medium mb-2 block">Display Name</label>
            <Input
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="Your display name"
              maxLength={50}
              data-testid="edit-name-input"
            />
          </div>
          
          <div>
            <label className="text-sm font-medium mb-2 block">Bio</label>
            <Textarea
              value={formData.bio}
              onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
              placeholder="Tell us about yourself..."
              maxLength={160}
              rows={3}
              data-testid="edit-bio-input"
            />
          </div>

          <div>
            <label className="text-sm font-medium mb-2 block">Links</label>
            <LinksEditor value={formData.links} onChange={(links) => setFormData(prev => ({ ...prev, links }))} />
          </div>
          
          <div className="flex justify-end space-x-2">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button 
              type="submit" 
              disabled={saving}
              data-testid="save-profile-btn"
            >
              {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
              Save Changes
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

const FollowersModal = ({ isOpen, onClose, userId, title, isFollowing = false }) => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (isOpen && userId) {
      fetchUsers();
    }
  }, [isOpen, userId]);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const endpoint = isFollowing ? `users/${userId}/following` : `users/${userId}/followers`;
      const response = await axios.get(`${API}/${endpoint}`);
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
            <div className="flex justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin" />
            </div>
          ) : users.length === 0 ? (
            <p className="text-center text-gray-500 py-8">
              No {title.toLowerCase()} yet
            </p>
          ) : (
            <div className="space-y-3">
              {users.map((user) => (
                <Link
                  key={user.id}
                  to={`/@${user.username}`}
                  onClick={onClose}
                  className="flex items-center space-x-3 p-3 hover:bg-gray-50 dark:hover:bg-gray-800 rounded-lg transition-colors"
                >
                  <Avatar className="h-10 w-10">
                    <AvatarImage src={resolveUrl(user.avatar)} />
                    <AvatarFallback>{user.name[0]?.toUpperCase()}</AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="font-medium">{user.name}</p>
                    <p className="text-sm text-gray-500">@{user.username}</p>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

const ProfilePage = () => {
  const { username } = useParams();
  const { user: currentUser } = useAuth();
  const { t } = useLanguage();
  const navigate = useNavigate();
  
  const [profileUser, setProfileUser] = useState(null);
  const [posts, setPosts] = useState([]);
  const [isFollowing, setIsFollowing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [postsLoading, setPostsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('posts');
  const [showEditProfile, setShowEditProfile] = useState(false);
  const [showFollowers, setShowFollowers] = useState(false);
  const [showFollowing, setShowFollowing] = useState(false);
  const [followLoading, setFollowLoading] = useState(false);

  useEffect(() => {
    if (username) {
      fetchProfile();
    }
  }, [username]);

  useEffect(() => {
    if (profileUser && activeTab === 'posts') {
      fetchUserPosts();
    }
  }, [profileUser, activeTab]);

  useEffect(() => {
    // Live follow updates via socket
    if (window && window.io && !window.__krafinkFollowListener) {
      window.__krafinkFollowListener = true;
      try {
        const s = window.__krafinkSocketInstance; // not set currently; safe no-op
      } catch (e) {}
    }
    if (window && !window.__followUpdatedHandler) {
      window.__followUpdatedHandler = (data) => {
        if (!profileUser) return;
        const { follower_id, following_id, following, following_counts } = data || {};
        if (following_id === profileUser.id) {
          setProfileUser(prev => ({
            ...prev,
            followers_count: following_counts?.followers_count ?? prev.followers_count
          }));
        }
        if (follower_id === profileUser.id && currentUser?.id === profileUser.id) {
          // my following count changed
          setProfileUser(prev => ({
            ...prev,
            following_count: data?.follower_counts?.following_count ?? prev.following_count
          }));
        }
      };
      if (window && window.__emergent_socketio) {
        window.__emergent_socketio.on('follow_updated', window.__followUpdatedHandler);
      }
    }
    return () => {
      try {
        if (window && window.__emergent_socketio && window.__followUpdatedHandler) {
          window.__emergent_socketio.off('follow_updated', window.__followUpdatedHandler);
        }
      } catch (e) {}
    };
  }, [profileUser, currentUser]);

  const fetchProfile = async () => {
    setLoading(true);
    try {
      const response = await axios.get(`${API}/users/${username}`);
      setProfileUser(response.data);
      
      // Check follow status
      if (currentUser && response.data.id !== currentUser.id) {
        checkFollowStatus(response.data.id);
      }
    } catch (error) {
      toast.error('User not found');
      navigate('/feed');
    } finally {
      setLoading(false);
    }
  };

  const checkFollowStatus = async (userId) => {
    try {
      const response = await axios.get(`${API}/users/${userId}/followers`);
      const isUserFollowing = response.data.some(follower => follower.id === currentUser.id);
      setIsFollowing(isUserFollowing);
    } catch (error) {
      console.error('Failed to check follow status:', error);
    }
  };

  const fetchUserPosts = async () => {
    setPostsLoading(true);
    try {
      const response = await axios.get(`${API}/users/${username}/posts?limit=50`);
      setPosts(response.data || []);
    } catch (error) {
      console.error('Failed to fetch user posts:', error);
      setPosts([]);
    } finally {
      setPostsLoading(false);
    }
  };

  const handleFollow = async () => {
    if (followLoading) return;
    
    setFollowLoading(true);
    try {
      const response = await axios.post(`${API}/users/${username}/follow`);
      const newFollowState = response.data.following;
      const updatedFollowers = response.data.followers_count ?? (profileUser.followers_count + (newFollowState ? 1 : -1));

      setIsFollowing(newFollowState);
      setProfileUser(prev => ({
        ...prev,
        followers_count: updatedFollowers
      }));
      
      toast.success(newFollowState ? `Following ${profileUser.name}` : `Unfollowed ${profileUser.name}`);
    } catch (error) {
      toast.error('Failed to follow user');
    } finally {
      setFollowLoading(false);
    }
  };

  const handlePostUpdate = (postId, updates) => {
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
  };

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto py-6 px-4">
        <Card className="animate-pulse">
          <CardContent className="p-6">
            <div className="flex items-center space-x-4">
              <div className="bg-gray-300 dark:bg-gray-600 rounded-full h-20 w-20"></div>
              <div className="space-y-2 flex-1">
                <div className="bg-gray-300 dark:bg-gray-600 h-6 w-1/3 rounded"></div>
                <div className="bg-gray-300 dark:bg-gray-600 h-4 w-1/2 rounded"></div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!profileUser) {
    return (
      <div className="max-w-4xl mx-auto py-6 px-4">
        <Card>
          <CardContent className="text-center py-12">
            <p className="text-gray-500">User not found</p>
            <Button onClick={() => navigate('/feed')}>
              Return to Feed
            </Button>
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
                src={resolveUrl(profileUser.banner)} 
                alt="Profile banner"
                className="w-full h-full object-cover rounded-t-lg"
              />
            )}
          </div>
          
          {/* Profile Info */}
          <div className="px-6 pb-6">
            <div className="flex items-end justify-between -mt-10 mb-4">
              <Avatar className="h-20 w-20 border-4 border-white dark:border-gray-800">
                <AvatarImage src={resolveUrl(profileUser.avatar)} />
                <AvatarFallback className="text-2xl">{profileUser.name[0]?.toUpperCase()}</AvatarFallback>
              </Avatar>
              
              <div className="flex space-x-2">
                {!isOwnProfile && (
                  <>
                    <Button 
                      onClick={handleFollow}
                      variant={isFollowing ? 'outline' : 'default'}
                      className={isFollowing ? '' : 'bg-gradient-to-r from-purple-600 to-pink-500'}
                      disabled={followLoading}
                      data-testid="follow-btn"
                    >
                      {followLoading ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        isFollowing ? t('profile.unfollow') : t('profile.follow')
                      )}
                    </Button>
                    <Link to="/messages">
                      <Button variant="outline">
                        <MessageSquare className="h-4 w-4" />
                      </Button>
                    </Link>
                  </>
                )}
                
                {isOwnProfile && (
                  <Button 
                    variant="outline" 
                    onClick={() => setShowEditProfile(true)}
                    data-testid="edit-profile-btn"
                  >
                    <Edit className="h-4 w-4 mr-2" />
                    {t('profile.edit')}
                  </Button>
                )}
              </div>
            </div>
            
            <div>
              <h1 className="text-2xl font-bold">{profileUser.name}</h1>
              <p className="text-gray-600 dark:text-gray-400">@{profileUser.username}</p>
              
              {profileUser.bio && (
                <p className="mt-3 text-gray-800 dark:text-gray-200">{profileUser.bio}</p>
              )}
              
              {profileUser.links && profileUser.links.length > 0 && (
                <div className="flex flex-wrap items-center gap-4 mt-2">
                  {profileUser.links.map((lnk, index) => {
                    const label = typeof lnk === 'string' ? lnk.replace(/^https?:\/\//, '') : lnk.label || lnk.url;
                    const url = typeof lnk === 'string' ? lnk : lnk.url;
                    return (
                      <a 
                        key={index}
                        href={url.startsWith('http') ? url : `https://${url}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-500 hover:underline text-sm flex items-center"
                      >
                        <LinkIcon className="h-3 w-3 mr-1" />
                        {label}
                      </a>
                    );
                  })}
                </div>
              )}
              
              <div className="flex items-center space-x-6 mt-4">
                <button 
                  onClick={() => setShowFollowing(true)}
                  className="hover:underline"
                  data-testid="following-count"
                >
                  <span className="font-bold">{profileUser.following_count}</span>
                  <span className="text-gray-600 dark:text-gray-400 ml-1">{t('profile.following')}</span>
                </button>
                <button 
                  onClick={() => setShowFollowers(true)}
                  className="hover:underline"
                  data-testid="followers-count"
                >
                  <span className="font-bold">{profileUser.followers_count}</span>
                  <span className="text-gray-600 dark:text-gray-400 ml-1">{t('profile.followers')}</span>
                </button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
      
      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-2 mb-6">
          <TabsTrigger value="posts" data-testid="posts-tab">
            {t('profile.posts')}
          </TabsTrigger>
          <TabsTrigger value="about" data-testid="about-tab">
            {t('profile.about')}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="posts">
          {postsLoading ? (
            <div className="space-y-4">
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
          ) : posts.length === 0 ? (
            <Card>
              <CardContent className="text-center py-12">
                <p className="text-gray-500 mb-4">
                  {isOwnProfile ? "You haven't posted anything yet." : `${profileUser.name} hasn't posted anything yet.`}
                </p>
                {isOwnProfile && (
                  <Link to="/compose">
                    <Button>Create your first post</Button>
                  </Link>
                )}
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {posts.map(({ post, author, user_liked, user_saved }) => (
                <ProfilePostCard
                  key={post.id}
                  post={post}
                  author={author || profileUser}
                  userLiked={user_liked}
                  userSaved={user_saved}
                  onUpdate={handlePostUpdate}
                />
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="about">
          <Card>
            <CardContent className="p-6">
              <h3 className="text-lg font-semibold mb-4">{t('profile.about')}</h3>
              
              {profileUser.bio ? (
                <div className="space-y-4">
                  <div>
                    <h4 className="font-medium mb-2">Bio</h4>
                    <p className="text-gray-700 dark:text-gray-300">{profileUser.bio}</p>
                  </div>
                </div>
              ) : (
                <p className="text-gray-500 italic">{t('profile.no_bio')}</p>
              )}
              
              {profileUser.links && profileUser.links.length > 0 && (
                <div className="mt-6">
                  <h4 className="font-medium mb-3">{t('profile.links')}</h4>
                  <div className="space-y-2">
                    {profileUser.links.map((lnk, index) => {
                      const label = typeof lnk === 'string' ? lnk : (lnk.label || lnk.url);
                      const url = typeof lnk === 'string' ? lnk : lnk.url;
                      return (
                        <a 
                          key={index}
                          href={url.startsWith('http') ? url : `https://${url}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center text-blue-500 hover:underline"
                        >
                          <LinkIcon className="h-4 w-4 mr-2" />
                          {label}
                        </a>
                      );
                    })}
                  </div>
                </div>
              )}
              
              <div className="mt-6 pt-6 border-t">
                <div className="text-sm text-gray-500">
                  Joined {new Date(profileUser.created_at).toLocaleDateString()}
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Modals */}
      {isOwnProfile && (
        <EditProfileModal
          isOpen={showEditProfile}
          onClose={() => setShowEditProfile(false)}
          user={profileUser}
          onUpdate={setProfileUser}
        />
      )}
      
      <FollowersModal 
        isOpen={showFollowers}
        onClose={() => setShowFollowers(false)}
        userId={profileUser?.id}
        title="Followers"
      />
      
      <FollowersModal 
        isOpen={showFollowing}
        onClose={() => setShowFollowing(false)}
        userId={profileUser?.id}
        title="Following"
        isFollowing={true}
      />
    </div>
  );
};

export default ProfilePage;