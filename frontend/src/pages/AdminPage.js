import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '../components/ui/avatar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { 
  Shield, Flag, Users, FileText, Eye, Check, X, 
  BarChart3, TrendingUp, MessageSquare, Heart 
} from 'lucide-react';
import { useAuth } from '../App';
import { useLanguage } from '../contexts/LanguageContext';
import { toast } from 'sonner';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const AdminPage = () => {
  const [reports, setReports] = useState([]);
  const [stats, setStats] = useState({});
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();
  const { t } = useLanguage();

  useEffect(() => {
    // Check if user has admin access
    if (!user || user.role !== 'admin') {
      toast.error('Access denied');
      return;
    }
    
    fetchReports();
    fetchStats();
  }, [user]);

  const fetchReports = async () => {
    try {
      const response = await axios.get(`${API}/admin/reports`);
      setReports(response.data);
    } catch (error) {
      toast.error('Failed to load reports');
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const response = await axios.get(`${API}/admin/stats`);
      setStats(response.data);
    } catch (error) {
      console.error('Failed to load stats');
    }
  };

  const handleReport = async (reportId, action) => {
    try {
      await axios.patch(`${API}/admin/reports/${reportId}`, { 
        status: action === 'resolve' ? 'resolved' : 'reviewed',
        action 
      });
      
      setReports(prev => prev.map(report => 
        report.id === reportId 
          ? { ...report, status: action === 'resolve' ? 'resolved' : 'reviewed' }
          : report
      ));
      
      toast.success(`Report ${action}d successfully`);
    } catch (error) {
      toast.error(`Failed to ${action} report`);
    }
  };

  const getReportIcon = (type) => {
    switch (type) {
      case 'user':
        return <Users className="h-4 w-4" />;
      case 'post':
        return <FileText className="h-4 w-4" />;
      case 'comment':
        return <MessageSquare className="h-4 w-4" />;
      default:
        return <Flag className="h-4 w-4" />;
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'pending':
        return 'bg-yellow-500';
      case 'reviewed':
        return 'bg-blue-500';
      case 'resolved':
        return 'bg-green-500';
      default:
        return 'bg-gray-500';
    }
  };

  if (!user || user.role !== 'admin') {
    return (
      <div className="max-w-4xl mx-auto py-6 px-4">
        <Card>
          <CardContent className="text-center py-12">
            <Shield className="h-12 w-12 mx-auto text-red-500 mb-4" />
            <h2 className="text-xl font-semibold mb-2">Access Denied</h2>
            <p className="text-gray-500">You don't have permission to access this page.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto py-6 px-4">
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Shield className="h-5 w-5" />
            <span>Admin Dashboard</span>
          </CardTitle>
        </CardHeader>
      </Card>

      <Tabs defaultValue="reports" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="reports" className="flex items-center space-x-2">
            <Flag className="h-4 w-4" />
            <span>Reports</span>
            {reports.filter(r => r.status === 'pending').length > 0 && (
              <Badge variant="destructive">
                {reports.filter(r => r.status === 'pending').length}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="stats" className="flex items-center space-x-2">
            <BarChart3 className="h-4 w-4" />
            <span>Statistics</span>
          </TabsTrigger>
          <TabsTrigger value="moderation" className="flex items-center space-x-2">
            <Eye className="h-4 w-4" />
            <span>Moderation</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="reports" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Content Reports</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {reports.length === 0 ? (
                <div className="p-6 text-center">
                  <Flag className="h-12 w-12 mx-auto text-gray-400 mb-4" />
                  <p className="text-gray-500">No reports to review</p>
                </div>
              ) : (
                <div className="divide-y dark:divide-gray-700">
                  {reports.map((report) => (
                    <div key={report.id} className="p-6">
                      <div className="flex items-start justify-between">
                        <div className="flex items-start space-x-4">
                          <div className="flex items-center space-x-2">
                            {getReportIcon(report.target_type)}
                            <Badge className={getStatusColor(report.status)}>
                              {report.status}
                            </Badge>
                          </div>
                          
                          <div className="flex-1">
                            <div className="flex items-center space-x-2 mb-2">
                              <h3 className="font-medium">
                                {report.target_type} Report
                              </h3>
                              <span className="text-sm text-gray-500">
                                • {report.reason}
                              </span>
                            </div>
                            
                            <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                              {report.description || 'No additional details provided'}
                            </p>
                            
                            <div className="flex items-center space-x-2 text-xs text-gray-500">
                              <span>Reported by: User #{report.reporter_id.slice(-6)}</span>
                              <span>•</span>
                              <span>{new Date(report.created_at).toLocaleDateString()}</span>
                            </div>
                          </div>
                        </div>
                        
                        {report.status === 'pending' && (
                          <div className="flex items-center space-x-2">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleReport(report.id, 'dismiss')}
                            >
                              <X className="h-4 w-4 mr-1" />
                              Dismiss
                            </Button>
                            <Button
                              size="sm"
                              variant="destructive"
                              onClick={() => handleReport(report.id, 'resolve')}
                            >
                              <Check className="h-4 w-4 mr-1" />
                              Take Action
                            </Button>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="stats" className="mt-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center space-x-2">
                  <Users className="h-8 w-8 text-blue-500" />
                  <div>
                    <p className="text-sm text-gray-600 dark:text-gray-400">Total Users</p>
                    <p className="text-2xl font-bold">{stats.total_users || 0}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center space-x-2">
                  <FileText className="h-8 w-8 text-green-500" />
                  <div>
                    <p className="text-sm text-gray-600 dark:text-gray-400">Total Posts</p>
                    <p className="text-2xl font-bold">{stats.total_posts || 0}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center space-x-2">
                  <Heart className="h-8 w-8 text-red-500" />
                  <div>
                    <p className="text-sm text-gray-600 dark:text-gray-400">Total Likes</p>
                    <p className="text-2xl font-bold">{stats.total_likes || 0}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center space-x-2">
                  <TrendingUp className="h-8 w-8 text-purple-500" />
                  <div>
                    <p className="text-sm text-gray-600 dark:text-gray-400">Daily Active</p>
                    <p className="text-2xl font-bold">{stats.daily_active || 0}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
          
          <Card>
            <CardHeader>
              <CardTitle>Platform Overview</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="text-center text-gray-500 py-8">
                  <BarChart3 className="h-12 w-12 mx-auto mb-4" />
                  <p>Detailed analytics dashboard would go here</p>
                  <p className="text-sm">Charts, graphs, and detailed metrics</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="moderation" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Moderation Tools</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                <div className="text-center text-gray-500 py-8">
                  <Eye className="h-12 w-12 mx-auto mb-4" />
                  <h3 className="text-lg font-medium mb-2">Moderation Queue</h3>
                  <p className="mb-4">Advanced moderation tools would be available here</p>
                  <div className="space-y-2 text-sm">
                    <p>• Bulk content moderation</p>
                    <p>• User management and suspension</p>
                    <p>• Automated content filtering</p>
                    <p>• Community guidelines enforcement</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default AdminPage;