import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ArrowLeft, Users, Coins, ChevronDown, ChevronRight, Loader2 } from "lucide-react";
import { useApp } from "@/contexts/AppContext";
import { api } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";

interface DailyStats {
  date: string;
  userCount: number;
  inputTokens: number;
  outputTokens: number;
}

interface UserDetails {
  id: number;
  email: string;
  registeredAt: string;
  beansAI: number;
  beansManual: number;
  grinders: number;
  brewers: number;
  servers: number;
  recipes: number;
  brewTemplates: number;
  brewHistory: number;
}

interface Totals {
  totalUsers: number;
  totalInputTokens: number;
  totalOutputTokens: number;
}

export default function Admin() {
  const navigate = useNavigate();
  const { user } = useApp();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [dailyStats, setDailyStats] = useState<DailyStats[]>([]);
  const [totals, setTotals] = useState<Totals | null>(null);
  const [expandedDate, setExpandedDate] = useState<string | null>(null);
  const [userDetails, setUserDetails] = useState<Record<string, UserDetails[]>>({});
  const [loadingUsers, setLoadingUsers] = useState<string | null>(null);

  useEffect(() => {
    if (!user?.isAdmin) {
      navigate("/dashboard");
      return;
    }
    loadStats();
  }, [user, navigate]);

  const loadStats = async () => {
    try {
      const data = await api.admin.getDailyStats();
      setDailyStats(data.daily);
      setTotals(data.totals);
    } catch (error) {
      console.error('Failed to load admin stats:', error);
      toast({ title: "Error", description: error instanceof Error ? error.message : "Failed to load admin stats", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const toggleDate = async (date: string) => {
    if (expandedDate === date) {
      setExpandedDate(null);
      return;
    }
    
    setExpandedDate(date);
    
    if (!userDetails[date]) {
      setLoadingUsers(date);
      try {
        const users = await api.admin.getUsersByDate(date);
        setUserDetails(prev => ({ ...prev, [date]: users }));
      } catch (error) {
        toast({ title: "Error", description: "Failed to load user details", variant: "destructive" });
      } finally {
        setLoadingUsers(null);
      }
    }
  };

  const formatNumber = (num: number) => num.toLocaleString();

  if (!user?.isAdmin) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-secondary/20 to-background">
      <div className="container max-w-4xl mx-auto p-4 space-y-4">
        <div className="flex items-center gap-4 pt-4 pb-2">
          <Button variant="ghost" size="icon" onClick={() => navigate("/dashboard")}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-2xl font-bold">Admin Dashboard</h1>
        </div>

        {loading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <>
            {/* Summary Cards */}
            <div className="grid grid-cols-3 gap-4">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                    <Users className="h-4 w-4" />
                    Total Users
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-2xl font-bold">{formatNumber(totals?.totalUsers || 0)}</p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                    <Coins className="h-4 w-4" />
                    Input Tokens
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-2xl font-bold">{formatNumber(totals?.totalInputTokens || 0)}</p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                    <Coins className="h-4 w-4" />
                    Output Tokens
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-2xl font-bold">{formatNumber(totals?.totalOutputTokens || 0)}</p>
                </CardContent>
              </Card>
            </div>

            {/* Daily Stats Table */}
            <Card>
              <CardHeader>
                <CardTitle>Daily Statistics</CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-10"></TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead className="text-right">Users</TableHead>
                      <TableHead className="text-right">Input Tokens</TableHead>
                      <TableHead className="text-right">Output Tokens</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {dailyStats.map((stat) => (
                      <React.Fragment key={stat.date}>
                        <TableRow 
                          className="cursor-pointer hover:bg-muted/50"
                          onClick={() => stat.userCount > 0 && toggleDate(stat.date)}
                        >
                          <TableCell>
                            {stat.userCount > 0 && (
                              expandedDate === stat.date ? 
                                <ChevronDown className="h-4 w-4" /> : 
                                <ChevronRight className="h-4 w-4" />
                            )}
                          </TableCell>
                          <TableCell className="font-medium">{stat.date}</TableCell>
                          <TableCell className="text-right">{stat.userCount}</TableCell>
                          <TableCell className="text-right">{formatNumber(stat.inputTokens)}</TableCell>
                          <TableCell className="text-right">{formatNumber(stat.outputTokens)}</TableCell>
                        </TableRow>
                        {expandedDate === stat.date && (
                          <TableRow>
                            <TableCell colSpan={5} className="p-0">
                              <div className="bg-muted/30 p-4">
                                {loadingUsers === stat.date ? (
                                  <div className="flex justify-center py-4">
                                    <Loader2 className="h-5 w-5 animate-spin" />
                                  </div>
                                ) : (
                                  <UserDetailsTable users={userDetails[stat.date] || []} />
                                )}
                              </div>
                            </TableCell>
                          </TableRow>
                        )}
                      </React.Fragment>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </div>
  );
}

function UserDetailsTable({ users }: { users: UserDetails[] }) {
  if (users.length === 0) return <p className="text-muted-foreground text-sm">No users found</p>;
  
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Email</TableHead>
          <TableHead>Registered</TableHead>
          <TableHead className="text-center" title="Beans (AI)">🫘🤖</TableHead>
          <TableHead className="text-center" title="Beans (Manual)">🫘✏️</TableHead>
          <TableHead className="text-center" title="Grinders">⚙️</TableHead>
          <TableHead className="text-center" title="Brewers">☕</TableHead>
          <TableHead className="text-center" title="Servers">🫖</TableHead>
          <TableHead className="text-center" title="Recipes">📖</TableHead>
          <TableHead className="text-center" title="Templates">📝</TableHead>
          <TableHead className="text-center" title="Brew History">📊</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {users.map((user) => (
          <TableRow key={user.id}>
            <TableCell className="font-mono text-xs">{user.email}</TableCell>
            <TableCell className="text-xs">{new Date(user.registeredAt).toLocaleString()}</TableCell>
            <TableCell className="text-center">{user.beansAI}</TableCell>
            <TableCell className="text-center">{user.beansManual}</TableCell>
            <TableCell className="text-center">{user.grinders}</TableCell>
            <TableCell className="text-center">{user.brewers}</TableCell>
            <TableCell className="text-center">{user.servers}</TableCell>
            <TableCell className="text-center">{user.recipes}</TableCell>
            <TableCell className="text-center">{user.brewTemplates}</TableCell>
            <TableCell className="text-center">{user.brewHistory}</TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
