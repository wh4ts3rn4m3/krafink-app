import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Textarea } from '../components/ui/textarea';
import { Avatar, AvatarFallback, AvatarImage } from '../components/ui/avatar';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { 
  Loader2, Edit, Globe, Users, 
  Hash, AtSign
} from 'lucide-react';
import { useAuth } from '../App';
import { useLanguage } from '../contexts/LanguageContext';
import { toast } from 'sonner';
import ImageUploader from '../components/ImageUploader';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const ComposePage = () => {
  const [content, setContent] = useState('');
  const [images, setImages] = useState([]);
  const [posting, setPosting] = useState(false);
  const [visibility, setVisibility] = useState('public');
  const { user } = useAuth();
  const { t } = useLanguage();
  const navigate = useNavigate();

  const extractHashtags = (text) => {
    const hashtags = text.match(/#\w+/g) || [];
    return hashtags.map(tag => tag.slice(1).toLowerCase());
  };

  const extractMentions = (text) => {
    const mentions = text.match(/@\w+/g) || [];
    return mentions.map(mention => mention.slice(1));
  };

  const renderContentWithLinks = (text) => {
    return text
      .replace(/#(\w+)/g, '<span class="text-blue-500 font-medium">#$1</span>')
      .replace(/@(\w+)/g, '<span class="text-purple-500 font-medium">@$1</span>');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if ((!content.trim() && images.length === 0) || posting) return;
    
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
      
      toast.success(t('post.created_successfully') || 'Post created!');
      navigate('/feed');
      
    } catch (error) {
      toast.error(t('post.create_failed') || 'Failed to create post');
    } finally {
      setPosting(false);
    }
  };

  const characterCount = content.length;
  const maxCharacters = 280;
  const isValidPost = (content.trim() || images.length > 0) && characterCount <= maxCharacters;
  const isNearLimit = characterCount > maxCharacters * 0.8;

  return (
    <div className="max-w-2xl mx-auto py-6 px-4">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center space-x-2">
              <Edit className="h-5 w-5" />
              <span>{t('post.create')}</span>
            </CardTitle>
            <Button 
              variant="outline" 
              onClick={() => navigate(-1)}
              data-testid="cancel-compose-btn"
            >
              {t('common.cancel')}
            </Button>
          </div>
        </CardHeader>
        
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* User Info */}
            <div className="flex items-center space-x-3">
              <Avatar className="h-12 w-12">
                <AvatarImage src={user?.avatar} />
                <AvatarFallback>{user?.name?.[0]?.toUpperCase()}</AvatarFallback>
              </Avatar>
              <div>
                <h3 className="font-semibold">{user?.name}</h3>
                <p className="text-sm text-gray-500">@{user?.username}</p>
              </div>
            </div>

            {/* Content Input */}
            <div className="space-y-2">
              <Textarea
                placeholder={t('post.whats_on_mind')}
                value={content}
                onChange={(e) => setContent(e.target.value)}
                className="min-h-[120px] text-lg resize-none border-0 focus:ring-0 p-0"
                data-testid="compose-content-input"
              />
              {content && (
                <div className="mt-2 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">Preview:</p>
                  <div 
                    className="prose prose-sm"
                    dangerouslySetInnerHTML={{ __html: renderContentWithLinks(content) }}
                  />
                </div>
              )}
            </div>

            {/* Character Counter */}
            <div className="flex justify-between items-center">
              <div className="flex items-center space-x-4 text-sm text-gray-500">
                <span className="flex items-center space-x-1">
                  <Hash className="h-4 w-4" />
                  <span>{extractHashtags(content).length} hashtags</span>
                </span>
                <span className="flex items-center space-x-1">
                  <AtSign className="h-4 w-4" />
                  <span>{extractMentions(content).length} mentions</span>
                </span>
              </div>
              
              <div className={`text-sm ${
                characterCount > maxCharacters 
                  ? 'text-red-500' 
                  : isNearLimit 
                    ? 'text-orange-500' 
                    : 'text-gray-500'
              }`}>
                {characterCount}/{maxCharacters}
              </div>
            </div>

            {/* Uploader */}
            <ImageUploader images={images} setImages={setImages} />
            
            {/* Actions Bar */}
            <div className="flex items-center justify-between pt-4 border-t">
              {/* Privacy Setting */}
              <Select value={visibility} onValueChange={setVisibility}>
                <SelectTrigger className="w-auto">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="public">
                    <div className="flex items-center space-x-2">
                      <Globe className="h-4 w-4" />
                      <span>{t('post.public')}</span>
                    </div>
                  </SelectItem>
                  <SelectItem value="followers">
                    <div className="flex items-center space-x-2">
                      <Users className="h-4 w-4" />
                      <span>{t('post.followers_only')}</span>
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>

              {/* Post Button */}
              <Button 
                type="submit" 
                disabled={!isValidPost || posting}
                className="bg-gradient-to-r from-purple-600 to-pink-500 hover:from-purple-700 hover:to-pink-600 min-w-[80px]"
                data-testid="compose-post-btn"
              >
                {posting ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  t('post.post')
                )}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default ComposePage;