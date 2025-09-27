import React, { useState, useEffect, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import axios from 'axios';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Input } from '../components/ui/input';
import { Button } from '../components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '../components/ui/avatar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { Search, Loader2, Users, FileText } from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';
import { useNavigate } from 'react-router-dom';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const SearchPage = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [query, setQuery] = useState(searchParams.get('q') || '');
  const [results, setResults] = useState({ users: [], posts: [] });
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('people');
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const { t } = useLanguage();
  const navigate = useNavigate();
  const inputRef = useRef();
  const resultsRef = useRef();

  useEffect(() => {
    const q = searchParams.get('q');
    if (q) {
      setQuery(q);
      performSearch(q);
    }
  }, [searchParams]);

  useEffect(() => {
    // Focus input on mount
    if (inputRef.current) {
      inputRef.current.focus();
    }
  }, []);

  const performSearch = async (searchQuery) => {
    setSelectedIndex(-1);
    if (!searchQuery.trim()) {
      setResults({ users: [], posts: [] });
      return;
    }

    setLoading(true);
    try {
      const response = await axios.get(`${API}/search`, {
        params: { q: searchQuery, type: 'all' }
      });
      setResults(response.data);
      setSelectedIndex(-1);
    } catch (error) {
      console.error('Search failed:', error);
      setResults({ users: [], posts: [] });
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (e) => {
    e.preventDefault();
    const trimmedQuery = query.trim();
    if (trimmedQuery) {
      setSearchParams({ q: trimmedQuery });
      performSearch(trimmedQuery);
    }
  };

  const handleKeyDown = (e) => {
    const currentResults = activeTab === 'people' ? results.users : results.posts;
    
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex(prev => Math.min(prev + 1, currentResults.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex(prev => Math.max(prev - 1, -1));
    } else if (e.key === 'Enter' && selectedIndex >= 0) {
      e.preventDefault();
      const selected = currentResults[selectedIndex];
      if (activeTab === 'people') {
        navigate(`/@${selected.username}`);
      } else {
        navigate(`/post/${selected.post.id}`);
      }
    }
  };

  const UserResult = ({ user, isSelected, onClick }) => {
    const [isFollowing, setIsFollowing] = useState(false);
    const [counts, setCounts] = useState({ followers: user.followers_count, following: user.following_count });

    useEffect(() => {
      // socket live updates
      const handler = (data) => {
        if (data?.following_id === user.id) {
          setCounts((prev) => ({ ...prev, followers: data?.following_counts?.followers_count ?? prev.followers }));
        }
        if (data?.follower_id === user.id) {
          setCounts((prev) => ({ ...prev, following: data?.follower_counts?.following_count ?? prev.following }));
        }
      };
      if (window.__emergent_socketio) {
        window.__emergent_socketio.on('follow_updated', handler);
      }
      return () => {
        if (window.__emergent_socketio) {
          window.__emergent_socketio.off('follow_updated', handler);
        }
      };
    }, [user.id]);

    const handleFollowToggle = async (e) => {
      e.stopPropagation();
      try {
        const resp = await axios.post(`${API}/users/${user.username}/follow`);
        const following = resp.data.following;
        const followersCount = resp.data.followers_count ?? (counts.followers + (following ? 1 : -1));
        setIsFollowing(following);
        setCounts((prev) => ({ ...prev, followers: followersCount }));
      } catch (err) {
        console.error('Follow toggle failed', err);
      }
    };

    return (
      <div 
        className={`flex items-center space-x-3 p-4 rounded-lg cursor-pointer transition-colors ${
          isSelected ? 'bg-purple-50 dark:bg-purple-900/20' : 'hover:bg-gray-50 dark:hover:bg-gray-800'
        }`}
        onClick={onClick}
      >
        <Avatar className="h-12 w-12">
          <AvatarImage src={user.avatar} />
          <AvatarFallback>{user.name[0]?.toUpperCase()}</AvatarFallback>
        </Avatar>
        <div className="flex-1">
          <h3 className="font-semibold text-gray-900 dark:text-gray-100">{user.name}</h3>
          <p className="text-gray-600 dark:text-gray-400">@{user.username}</p>
          {user.bio && (
            <p className="text-sm text-gray-500 dark:text-gray-500 mt-1 line-clamp-2">
              {user.bio}
            </p>
          )}
          <div className="flex items-center space-x-4 mt-2 text-sm text-gray-500">
            <span>{counts.followers} {t('profile.followers')}</span>
            <span>{counts.following} {t('profile.following')}</span>
          </div>
        </div>
        <div>
          <Button size="sm" variant={isFollowing ? 'outline' : 'default'} onClick={handleFollowToggle}>
            {isFollowing ? t('profile.unfollow') : t('profile.follow')}
          </Button>
        </div>
      </div>
    );
  };

  const PostResult = ({ post, author, isSelected, onClick }) => (
    <div 
      className={`p-4 rounded-lg cursor-pointer transition-colors ${
        isSelected ? 'bg-purple-50 dark:bg-purple-900/20' : 'hover:bg-gray-50 dark:hover:bg-gray-800'
      }`}
      onClick={onClick}
    >
      <div className="flex items-start space-x-3">
        <Avatar className="h-8 w-8">
          <AvatarImage src={author.avatar} />
          <AvatarFallback>{author.name[0]?.toUpperCase()}</AvatarFallback>
        </Avatar>
        <div className="flex-1">
          <div className="flex items-center space-x-2 mb-1">
            <span className="font-medium text-gray-900 dark:text-gray-100">{author.name}</span>
            <span className="text-gray-500 dark:text-gray-400">@{author.username}</span>
            <span className="text-gray-400">·</span>
            <span className="text-gray-500 text-sm">
              {new Date(post.created_at).toLocaleDateString()}
            </span>
          </div>
          <p className="text-gray-800 dark:text-gray-200 line-clamp-3">
            {post.content}
          </p>
          <div className="flex items-center space-x-4 mt-2 text-sm text-gray-500">
            <span>{post.likes_count} {t('post.like')}</span>
            <span>{post.comments_count} {t('post.comment')}</span>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div className="max-w-4xl mx-auto py-6 px-4">
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Search className="h-5 w-5" />
            <span>{t('search.title')}</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSearch} className="relative">
            <div className="flex space-x-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <Input
                  ref={inputRef}
                  type="text"
                  placeholder={t('search.placeholder')}
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  onKeyDown={handleKeyDown}
                  className="pl-10"
                  data-testid="search-input"
                />
                {loading && (
                  <Loader2 className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 animate-spin" />
                )}
              </div>
              <Button type="submit" disabled={loading}>
                {t('search.title')}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {query && (
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="people" className="flex items-center space-x-2">
              <Users className="h-4 w-4" />
              <span>{t('search.people')}</span>
              {results.users.length > 0 && (
                <span className="bg-purple-100 text-purple-600 rounded-full px-2 py-0.5 text-xs">
                  {results.users.length}
                </span>
              )}
            </TabsTrigger>
            <TabsTrigger value="posts" className="flex items-center space-x-2">
              <FileText className="h-4 w-4" />
              <span>{t('search.posts')}</span>
              {results.posts.length > 0 && (
                <span className="bg-purple-100 text-purple-600 rounded-full px-2 py-0.5 text-xs">
                  {results.posts.length}
                </span>
              )}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="people" className="mt-6" ref={resultsRef}>
            <Card>
              <CardContent className="p-0">
                {loading ? (
                  <div className="p-6 text-center">
                    <Loader2 className="h-8 w-8 animate-spin mx-auto mb-2" />
                    <p className="text-gray-500">{t('common.loading')}</p>
                  </div>
                ) : results.users.length === 0 ? (
                  <div className="p-6 text-center">
                    <Users className="h-12 w-12 mx-auto text-gray-400 mb-4" />
                    <p className="text-gray-500">
                      {query ? `${t('search.no_results')} "${query}"` : t('search.no_results')}
                    </p>
                  </div>
                ) : (
                  <div className="divide-y dark:divide-gray-700">
                    {results.users.map((user, index) => (
                      <UserResult
                        key={user.id}
                        user={user}
                        isSelected={index === selectedIndex}
                        onClick={() => navigate(`/@${user.username}`)}
                      />
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="posts" className="mt-6">
            <Card>
              <CardContent className="p-0">
                {loading ? (
                  <div className="p-6 text-center">
                    <Loader2 className="h-8 w-8 animate-spin mx-auto mb-2" />
                    <p className="text-gray-500">{t('common.loading')}</p>
                  </div>
                ) : results.posts.length === 0 ? (
                  <div className="p-6 text-center">
                    <FileText className="h-12 w-12 mx-auto text-gray-400 mb-4" />
                    <p className="text-gray-500">
                      {query ? `${t('search.no_results')} "${query}"` : t('search.no_results')}
                    </p>
                  </div>
                ) : (
                  <div className="divide-y dark:divide-gray-700">
                    {results.posts.map(({ post, author }, index) => (
                      <PostResult
                        key={post.id}
                        post={post}
                        author={author}
                        isSelected={index === selectedIndex}
                        onClick={() => navigate(`/post/${post.id}`)}
                      />
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
};

export default SearchPage;