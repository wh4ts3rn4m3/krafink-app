import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Input } from '../components/ui/input';
import { Button } from '../components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '../components/ui/avatar';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../components/ui/dialog';
import { Badge } from '../components/ui/badge';
import { 
  MessageSquare, Search, Send, Plus, Loader2, Users, 
  Circle, Edit, MoreHorizontal 
} from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';
import { useAuth } from '../App';
import { toast } from 'sonner';
import io from 'socket.io-client';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

let socket = null;

const MessagesPage = () => {
  const [conversations, setConversations] = useState([]);
  const [activeConversation, setActiveConversation] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [showNewMessage, setShowNewMessage] = useState(false);
  const [userSearch, setUserSearch] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [typingUsers, setTypingUsers] = useState(new Set());
  const [onlineUsers, setOnlineUsers] = useState(new Set());
  const { user } = useAuth();
  const { t } = useLanguage();
  const messagesEndRef = useRef();
  const typingTimeoutRef = useRef();

  useEffect(() => {
    fetchConversations();
    initSocket();
    
    return () => {
      if (socket) {
        socket.disconnect();
        socket = null;
      }
    };
  }, []);

  useEffect(() => {
    if (activeConversation) {
      fetchMessages(activeConversation.conversation.id);
      
      // Join conversation room
      if (socket) {
        socket.emit('join_room', { 
          room: `conversation_${activeConversation.conversation.id}` 
        });
      }
    }
  }, [activeConversation]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const initSocket = () => {
    if (!socket && user) {
      socket = io(BACKEND_URL);
      
      socket.on('connect', () => {
        socket.emit('join_user', { user_id: user.id });
      });

      socket.on('message_received', (data) => {
        if (data.conversation_id === activeConversation?.conversation.id) {
          setMessages(prev => [...prev, data.message]);
          
          // Mark as read if conversation is active
          markMessagesAsRead(data.conversation_id);
        }
        
        // Update conversation list
        fetchConversations();
      });

      socket.on('typing_start', (data) => {
        if (data.conversation_id === activeConversation?.conversation.id && data.user_id !== user.id) {
          setTypingUsers(prev => new Set(prev).add(data.user_id));
        }
      });

      socket.on('typing_stop', (data) => {
        if (data.conversation_id === activeConversation?.conversation.id) {
          setTypingUsers(prev => {
            const newSet = new Set(prev);
            newSet.delete(data.user_id);
            return newSet;
          });
        }
      });

      socket.on('messages_read', (data) => {
        if (data.conversation_id === activeConversation?.conversation.id) {
          setMessages(prev => prev.map(msg => ({
            ...msg,
            is_read: msg.receiver_id === data.user_id ? true : msg.is_read
          })));
        }
      });

      socket.on('user_status', (data) => {
        if (data.status === 'online') {
          setOnlineUsers(prev => new Set(prev).add(data.user_id));
        } else {
          setOnlineUsers(prev => {
            const newSet = new Set(prev);
            newSet.delete(data.user_id);
            return newSet;
          });
        }
      });
    }
  };

  const fetchConversations = async () => {
    try {
      const response = await axios.get(`${API}/conversations`);
      setConversations(response.data);
    } catch (error) {
      toast.error('Failed to load conversations');
    } finally {
      setLoading(false);
    }
  };

  const fetchMessages = async (conversationId) => {
    try {
      const response = await axios.get(`${API}/conversations/${conversationId}/messages`);
      setMessages(response.data);
      
      // Mark messages as read
      markMessagesAsRead(conversationId);
    } catch (error) {
      toast.error('Failed to load messages');
    }
  };

  const markMessagesAsRead = (conversationId) => {
    if (socket) {
      socket.emit('mark_messages_read', { 
        conversation_id: conversationId,
        user_id: user.id 
      });
    }
  };

  const sendMessage = async (e) => {
    e.preventDefault();
    if (!newMessage.trim() || !activeConversation || sending) return;
    
    setSending(true);
    try {
      const response = await axios.post(`${API}/conversations`, {
        receiver_id: activeConversation.participant.id,
        content: newMessage.trim()
      });
      
      // Emit real-time message
      if (socket) {
        socket.emit('send_message', {
          conversation_id: activeConversation.conversation.id,
          sender_id: user.id,
          content: newMessage.trim()
        });
      }
      
      setMessages(prev => [...prev, response.data.message]);
      setNewMessage('');
      
      // Stop typing indicator
      stopTyping();
      
    } catch (error) {
      toast.error('Failed to send message');
    } finally {
      setSending(false);
    }
  };

  const startTyping = () => {
    if (socket && activeConversation) {
      socket.emit('typing_start', {
        conversation_id: activeConversation.conversation.id,
        user_id: user.id
      });
      
      // Clear existing timeout
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
      
      // Set timeout to stop typing
      typingTimeoutRef.current = setTimeout(stopTyping, 3000);
    }
  };

  const stopTyping = () => {
    if (socket && activeConversation) {
      socket.emit('typing_stop', {
        conversation_id: activeConversation.conversation.id,
        user_id: user.id
      });
    }
    
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }
  };

  const handleMessageInput = (e) => {
    setNewMessage(e.target.value);
    
    if (e.target.value.trim()) {
      startTyping();
    } else {
      stopTyping();
    }
  };

  const searchUsers = async (query) => {
    if (!query.trim()) {
      setSearchResults([]);
      return;
    }
    
    try {
      const response = await axios.get(`${API}/search`, {
        params: { q: query, type: 'users' }
      });
      setSearchResults(response.data.users || []);
    } catch (error) {
      setSearchResults([]);
    }
  };

  const startConversation = async (targetUser) => {
    try {
      const response = await axios.post(`${API}/conversations`, {
        receiver_id: targetUser.id,
        content: 'Hello!'
      });
      
      // Find or create conversation in list
      const existingConv = conversations.find(c => 
        c.participant.id === targetUser.id
      );
      
      if (existingConv) {
        setActiveConversation(existingConv);
      } else {
        const newConv = {
          conversation: response.data.conversation,
          participant: targetUser,
          unread_count: 0,
          is_online: onlineUsers.has(targetUser.id)
        };
        setConversations(prev => [newConv, ...prev]);
        setActiveConversation(newConv);
      }
      
      setShowNewMessage(false);
      setUserSearch('');
      setSearchResults([]);
      
    } catch (error) {
      toast.error('Failed to start conversation');
    }
  };

  const scrollToBottom = () => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const formatTime = (timestamp) => {
    return new Date(timestamp).toLocaleTimeString([], { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };

  if (loading) {
    return (
      <div className="max-w-6xl mx-auto py-6 px-4">
        <div className="flex justify-center items-center h-64">
          <Loader2 className="h-8 w-8 animate-spin" />
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto py-6 px-4">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-[calc(100vh-200px)]">
        {/* Conversations List */}
        <Card className="lg:col-span-1">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center space-x-2">
                <MessageSquare className="h-5 w-5" />
                <span>{t('messages.title')}</span>
              </CardTitle>
              <Button 
                size="sm" 
                onClick={() => setShowNewMessage(true)}
                data-testid="new-message-btn"
              >
                <Plus className="h-4 w-4" />
              </Button>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {conversations.length === 0 ? (
              <div className="p-6 text-center">
                <MessageSquare className="h-12 w-12 mx-auto text-gray-400 mb-4" />
                <p className="text-gray-500 mb-4">{t('messages.no_conversations')}</p>
                <Button 
                  onClick={() => setShowNewMessage(true)}
                  variant="outline"
                >
                  {t('messages.start_conversation')}
                </Button>
              </div>
            ) : (
              <div className="divide-y dark:divide-gray-700 max-h-96 overflow-y-auto">
                {conversations.map((conv) => (
                  <div
                    key={conv.conversation.id}
                    className={`p-4 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors ${
                      activeConversation?.conversation.id === conv.conversation.id 
                        ? 'bg-purple-50 dark:bg-purple-900/20' 
                        : ''
                    }`}
                    onClick={() => setActiveConversation(conv)}
                    data-testid={`conversation-${conv.conversation.id}`}
                  >
                    <div className="flex items-center space-x-3">
                      <div className="relative">
                        <Avatar className="h-10 w-10">
                          <AvatarImage src={conv.participant.avatar} />
                          <AvatarFallback>
                            {conv.participant.name[0]?.toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        {conv.is_online && (
                          <div className="absolute -bottom-0.5 -right-0.5">
                            <Circle className="h-3 w-3 fill-green-500 text-green-500" />
                          </div>
                        )}
                      </div>
                      
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <h3 className="font-medium text-gray-900 dark:text-gray-100 truncate">
                            {conv.participant.name}
                          </h3>
                          {conv.unread_count > 0 && (
                            <Badge variant="destructive" className="ml-2">
                              {conv.unread_count}
                            </Badge>
                          )}
                        </div>
                        <p className="text-sm text-gray-600 dark:text-gray-400 truncate">
                          {conv.conversation.last_message || 'No messages yet'}
                        </p>
                        {conv.is_online && (
                          <span className="text-xs text-green-500">{t('messages.online')}</span>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Messages Area */}
        <Card className="lg:col-span-2 flex flex-col">
          {activeConversation ? (
            <>
              {/* Chat Header */}
              <CardHeader className="pb-3 border-b">
                <div className="flex items-center space-x-3">
                  <Avatar className="h-8 w-8">
                    <AvatarImage src={activeConversation.participant.avatar} />
                    <AvatarFallback>
                      {activeConversation.participant.name[0]?.toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <h3 className="font-medium">{activeConversation.participant.name}</h3>
                    <p className="text-sm text-gray-500">
                      @{activeConversation.participant.username}
                      {activeConversation.is_online && (
                        <span className="ml-2 text-green-500">{t('messages.online')}</span>
                      )}
                    </p>
                  </div>
                </div>
              </CardHeader>

              {/* Messages */}
              <CardContent className="flex-1 p-4 overflow-y-auto">
                <div className="space-y-4">
                  {messages.map((message) => (
                    <div
                      key={message.id}
                      className={`flex ${message.sender_id === user.id ? 'justify-end' : 'justify-start'}`}
                    >
                      <div
                        className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
                          message.sender_id === user.id
                            ? 'bg-purple-500 text-white'
                            : 'bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-gray-100'
                        }`}
                      >
                        <p className="text-sm">{message.content}</p>
                        <div className={`flex items-center justify-between mt-1 text-xs ${
                          message.sender_id === user.id ? 'text-purple-100' : 'text-gray-500'
                        }`}>
                          <span>{formatTime(message.created_at)}</span>
                          {message.sender_id === user.id && message.is_read && (
                            <span>✓✓</span>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                  
                  {/* Typing Indicator */}
                  {typingUsers.size > 0 && (
                    <div className="flex justify-start">
                      <div className="bg-gray-100 dark:bg-gray-800 rounded-lg px-4 py-2">
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                          {t('messages.typing')}
                        </p>
                      </div>
                    </div>
                  )}
                  
                  <div ref={messagesEndRef} />
                </div>
              </CardContent>

              {/* Message Input */}
              <div className="p-4 border-t">
                <form onSubmit={sendMessage} className="flex space-x-2">
                  <Input
                    type="text"
                    placeholder={t('messages.type_message')}
                    value={newMessage}
                    onChange={handleMessageInput}
                    className="flex-1"
                    disabled={sending}
                    data-testid="message-input"
                  />
                  <Button 
                    type="submit" 
                    disabled={!newMessage.trim() || sending}
                    data-testid="send-message-btn"
                  >
                    {sending ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Send className="h-4 w-4" />
                    )}
                  </Button>
                </form>
              </div>
            </>
          ) : (
            <CardContent className="flex-1 flex items-center justify-center">
              <div className="text-center">
                <MessageSquare className="h-12 w-12 mx-auto text-gray-400 mb-4" />
                <p className="text-gray-500 mb-4">{t('messages.start_conversation')}</p>
                <Button onClick={() => setShowNewMessage(true)}>
                  {t('messages.new')}
                </Button>
              </div>
            </CardContent>
          )}
        </Card>
      </div>

      {/* New Message Dialog */}
      <Dialog open={showNewMessage} onOpenChange={setShowNewMessage}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('messages.new')}</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <Input
                type="text"
                placeholder={t('messages.search_users')}
                value={userSearch}
                onChange={(e) => {
                  setUserSearch(e.target.value);
                  searchUsers(e.target.value);
                }}
                className="pl-10"
                data-testid="user-search-input"
              />
            </div>
            
            {searchResults.length > 0 && (
              <div className="max-h-64 overflow-y-auto border rounded-lg">
                {searchResults.map((searchUser) => (
                  <div
                    key={searchUser.id}
                    className="flex items-center space-x-3 p-3 hover:bg-gray-50 dark:hover:bg-gray-800 cursor-pointer"
                    onClick={() => startConversation(searchUser)}
                  >
                    <Avatar className="h-8 w-8">
                      <AvatarImage src={searchUser.avatar} />
                      <AvatarFallback>
                        {searchUser.name[0]?.toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="font-medium">{searchUser.name}</p>
                      <p className="text-sm text-gray-500">@{searchUser.username}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default MessagesPage;