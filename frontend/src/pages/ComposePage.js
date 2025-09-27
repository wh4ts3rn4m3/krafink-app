import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Textarea } from '../components/ui/textarea';
import { Avatar, AvatarFallback, AvatarImage } from '../components/ui/avatar';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { 
  ImageIcon, X, Loader2, Edit, Globe, Users, 
  Hash, AtSign, Smile 
} from 'lucide-react';
import { useAuth } from '../App';
import { useLanguage } from '../contexts/LanguageContext';
import { toast } from 'sonner';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const ComposePage = () => {
  const [content, setContent] = useState('');
  const [images, setImages] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [posting, setPosting] = useState(false);
  const [visibility, setVisibility] = useState('public');
  const { user } = useAuth();
  const { t } = useLanguage();
  const navigate = useNavigate();

  const handleImageUpload = async (files) => {
    if (!files.length) return;
    
    setUploading(true);
    const uploadedImages = [];
    
    for (const file of files) {
      if (!file.type.startsWith('image/')) {
        toast.error(`${file.name} is not an image file`);
        continue;
      }
      
      if (file.size > 5 * 1024 * 1024) { // 5MB limit
        toast.error(`${file.name} is too large (max 5MB)`);
        continue;
      }
      
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

  const renderContentWithLinks = (text) => {
    return text
      .replace(/#(\w+)/g, '<span class="text-blue-500 font-medium">#$1</span>')
      .replace(/@(\w+)/g, '<span class="text-purple-500 font-medium">@$1</span>');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if ((!content.trim() && !images.length) || posting) return;
    
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
              
              {/* Live Preview */}
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

            {/* Image Preview */}
            {images.length > 0 && (
              <div className="space-y-2">
                <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Images ({images.length})
                </h4>
                <div className={`grid gap-2 ${
                  images.length === 1 ? 'grid-cols-1' : 
                  images.length === 2 ? 'grid-cols-2' : 
                  'grid-cols-2'
                }`}>
                  {images.map((image, index) => (
                    <div key={index} className="relative group">
                      <img 
                        src={`${BACKEND_URL}${image}`} 
                        alt={`Upload ${index + 1}`} 
                        className="w-full h-32 object-cover rounded-lg"
                      />
                      <Button
                        type="button"
                        variant="destructive"
                        size="sm"
                        className="absolute top-2 right-2 h-6 w-6 p-0 opacity-80 hover:opacity-100"
                        onClick={() => removeImage(index)}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            )}
            
            {/* Actions Bar */}
            <div className="flex items-center justify-between pt-4 border-t">
              <div className="flex items-center space-x-2">
                {/* Image Upload */}
                <label className="cursor-pointer">
                  <input
                    type="file"
                    multiple
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => handleImageUpload(Array.from(e.target.files))}
                    disabled={uploading}
                  />
                  <Button 
                    type="button" 
                    variant="ghost" 
                    size="sm" 
                    disabled={uploading}
                    data-testid="image-upload-btn"
                  >
                    {uploading ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <ImageIcon className="h-4 w-4" />
                    )}
                  </Button>
                </label>
                
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
              </div>
              
              {/* Post Button */}
              <Button 
                type="submit" 
                disabled={!isValidPost || posting || uploading}
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
            
            {/* Helpful Tips */}
            <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4">
              <h4 className="font-medium text-blue-900 dark:text-blue-100 mb-2">Tips:</h4>
              <ul className="text-sm text-blue-800 dark:text-blue-200 space-y-1">
                <li>• Use #hashtags to categorize your content</li>
                <li>• Mention other users with @username</li>
                <li>• Upload up to 4 images per post</li>
                <li>• Choose who can see your post with visibility settings</li>
              </ul>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default ComposePage;