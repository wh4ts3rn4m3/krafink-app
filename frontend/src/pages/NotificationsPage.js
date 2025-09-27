import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '../components/ui/avatar';
import { Badge } from '../components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { Bell, Heart, MessageCircle, Users, Check, CheckCheck, Loader2 } from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';
import { useNotifications } from '../App';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const NotificationsPage = () => {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('all');
  const { t } = useLanguage();
  const { setUnreadCount } = useNotifications();
  const navigate = useNavigate();

  useEffect(() => {
    fetchNotifications();
    markAllAsRead();
  }, []);

  const fetchNotifications = async () => {
    try {
      const response = await axios.get(`${API}/notifications`);
      setNotifications(response.data);
    } catch (error) {
      toast.error('Failed to load notifications');
    } finally {
      setLoading(false);
    }
  };

  const markAllAsRead = async () => {
    try {
      await axios.post(`${API}/notifications/mark-all-read`);
      setUnreadCount(0);
      setNotifications(prev => prev.map(item => ({
        ...item,
        notification: { ...item.notification, is_read: true }
      })));
    } catch (error) {
      console.error('Failed to mark notifications as read');
    }
  };

  const markAsRead = async (notificationId) => {
    try {
      await axios.post(`${API}/notifications/${notificationId}/read`);
      setNotifications(prev => prev.map(item => 
        item.notification.id === notificationId 
          ? { ...item, notification: { ...item.notification, is_read: true }}
          : item
      ));
    } catch (error) {
      console.error('Failed to mark notification as read');
    }
  };

  const handleNotificationClick = (notification) => {
    if (!notification.is_read) {
      markAsRead(notification.id);
    }

    // Navigate based on notification type
    switch (notification.type) {
      case 'like':
      case 'comment':
        if (notification.post_id) {
          navigate(`/post/${notification.post_id}`);
        }
        break;
      case 'follow':
        if (notification.from_user_id) {
          // We need the username, but we have the sender info
          const sender = notifications.find(n => n.notification.id === notification.id)?.sender;
          if (sender) {
            navigate(`/@${sender.username}`);
          }
        }
        break;
      case 'message':
        navigate('/messages');
        break;
      default:
        break;
    }
  };

  const getNotificationIcon = (type) => {
    switch (type) {
      case 'like':
        return <Heart className="h-4 w-4 text-red-500" />;
      case 'comment':
        return <MessageCircle className="h-4 w-4 text-blue-500" />;
      case 'follow':
        return <Users className="h-4 w-4 text-purple-500" />;
      case 'message':
        return <MessageCircle className="h-4 w-4 text-green-500" />;
      default:
        return <Bell className="h-4 w-4 text-gray-500" />;
    }
  };

  const filterNotifications = (notifications, filter) => {
    if (filter === 'all') return notifications;
    return notifications.filter(({ notification }) => notification.type === filter);
  };

  const filteredNotifications = filterNotifications(notifications, activeTab);

  const NotificationItem = ({ notification, sender }) => (
    <div
      className={`flex items-start space-x-4 p-4 hover:bg-gray-50 dark:hover:bg-gray-800 cursor-pointer transition-colors ${
        !notification.is_read ? 'bg-blue-50 dark:bg-blue-900/20' : ''
      }`}
      onClick={() => handleNotificationClick(notification)}
      data-testid={`notification-${notification.id}`}
    >
      <Avatar className="h-10 w-10">
        <AvatarImage src={sender?.avatar} />
        <AvatarFallback>{sender?.name?.[0]?.toUpperCase()}</AvatarFallback>
      </Avatar>
      
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center space-x-2">
              {getNotificationIcon(notification.type)}
              <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                {notification.message}
              </p>
              {!notification.is_read && (
                <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
              )}
            </div>
            
            <p className="text-xs text-gray-500 mt-1">
              {new Date(notification.created_at).toLocaleString()}
            </p>
          </div>
          
          {notification.is_read ? (
            <CheckCheck className="h-4 w-4 text-gray-400" />
          ) : (
            <Check className="h-4 w-4 text-blue-500" />
          )}
        </div>
      </div>
    </div>
  );

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto py-6 px-4">
        <Card>
          <CardContent className="p-6 text-center">
            <Loader2 className="h-8 w-8 animate-spin mx-auto mb-2" />
            <p className="text-gray-500">{t('common.loading')}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto py-6 px-4">
      <Card className="mb-6">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center space-x-2">
              <Bell className="h-5 w-5" />
              <span>{t('notifications.title')}</span>
            </CardTitle>
            
            <Button 
              variant="outline" 
              size="sm"
              onClick={markAllAsRead}
              data-testid="mark-all-read-btn"
            >
              {t('notifications.mark_all_read')}
            </Button>
          </div>
        </CardHeader>
      </Card>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="all" className="flex items-center space-x-1">
            <Bell className="h-4 w-4" />
            <span>All</span>
            {notifications.length > 0 && (
              <Badge variant="secondary" className="ml-1">
                {notifications.length}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="like" className="flex items-center space-x-1">
            <Heart className="h-4 w-4" />
            <span>Likes</span>
          </TabsTrigger>
          <TabsTrigger value="comment" className="flex items-center space-x-1">
            <MessageCircle className="h-4 w-4" />
            <span>Comments</span>
          </TabsTrigger>
          <TabsTrigger value="follow" className="flex items-center space-x-1">
            <Users className="h-4 w-4" />
            <span>Follows</span>
          </TabsTrigger>
          <TabsTrigger value="message" className="flex items-center space-x-1">
            <MessageCircle className="h-4 w-4" />
            <span>Messages</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value={activeTab} className="mt-6">
          <Card>
            <CardContent className="p-0">
              {filteredNotifications.length === 0 ? (
                <div className="p-12 text-center">
                  <Bell className="h-16 w-16 mx-auto text-gray-400 mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">
                    {t('notifications.no_notifications')}
                  </h3>
                  <p className="text-gray-500 dark:text-gray-400">
                    {activeTab === 'all' 
                      ? "You'll see notifications here when people interact with your posts"
                      : `No ${activeTab} notifications yet`
                    }
                  </p>
                </div>
              ) : (
                <div className="divide-y dark:divide-gray-700">
                  {filteredNotifications.map(({ notification, sender }) => (
                    <NotificationItem
                      key={notification.id}
                      notification={notification}
                      sender={sender}
                    />
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default NotificationsPage;