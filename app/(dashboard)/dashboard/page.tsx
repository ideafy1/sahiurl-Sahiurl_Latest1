"use client"

import { useState, useEffect } from "react"
import { useAuth } from "@/lib/auth-context"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { Link as LucideLink, Globe, BarChart3, DollarSign, ArrowUpRight, Info } from "lucide-react"
import DashboardShell from "@/components/dashboard/dashboard-shell"
import { RecentLinks } from "@/components/dashboard/recent-links"
import TopLinks from "@/components/dashboard/top-links"
import { Skeleton } from "@/components/ui/skeleton"
import { useToast } from "@/components/ui/use-toast"
import type { Link } from "@/types/database"
import { getAuthToken, createAuthHeader } from "@/lib/auth-helpers"
import { ErrorBoundary } from "react-error-boundary"
import { getUserLinks } from "@/lib/firebase/links"
import { getUserAnalytics } from "@/lib/firebase/analytics"
import { auth } from "@/lib/firebase/config"
import { fetchUserData } from "@/lib/auth-context"

// Define proper analytics type
type DashboardAnalytics = {
  clicksToday: number
  earningsToday: number
  clicksByDate: Array<{ date: string; clicks: number }>
  topCountries: Array<{ country: string; clicks: number }>
}

// Define state type explicitly
type DashboardData = {
  links: Link[]
  analytics: DashboardAnalytics
}

interface DashboardStats {
  totalLinks: number
  totalClicks: number
  earnings: number
  recentLinks: Link[]
  topLinks: Link[]
  analytics: {
    clicksToday: number
    earningsToday: number
    clicksByDate: Array<{ date: string; clicks: number }>
    topCountries: Array<{ country: string; clicks: number }>
  }
  user?: {
    displayName: string
    email: string
    role: string
    subscription?: string
    stats?: any
  }
}

// Add proper types for the StatsCard component
interface StatsCardProps {
  title: string;
  value: string | number;
  description: string;
  icon: React.ReactNode;
}

function ErrorFallback({ error, resetErrorBoundary }: any) {
  return (
    <div role="alert" className="p-4 bg-red-100 text-red-700 rounded-lg">
      <h2 className="font-bold mb-2">Something went wrong:</h2>
      <pre className="mb-4">{error.message}</pre>
      <Button onClick={resetErrorBoundary}>Try again</Button>
    </div>
  )
}

export default function DashboardPage() {
  const { user } = useAuth()
  const [loading, setLoading] = useState(true)
  
  // Properly type the state to avoid "never[]" error
  const [data, setData] = useState<DashboardData>({
    links: [],
    analytics: {
      clicksToday: 0,
      earningsToday: 0,
      clicksByDate: [],
      topCountries: []
    }
  })
  
  const { toast } = useToast()

  useEffect(() => {
    async function fetchDashboardData() {
      if (!user) return

      try {
        // Ensure user is authenticated before fetching data
        const userData = await fetchUserData(user.uid)
        // Fetch other data as needed...
      } catch (error) {
        console.error("Error fetching user data:", error)
      }
    }

    fetchDashboardData()
  }, [user])

  if (!user) {
    return <div>Please log in to access your dashboard.</div>
  }

  return (
    <DashboardShell>
      <ErrorBoundary
        FallbackComponent={ErrorFallback}
        onReset={() => window.location.reload()}
      >
        <div className="flex-1 space-y-4 p-4 pt-6 md:p-8">
          <div className="flex items-center justify-between">
            <h2 className="text-3xl font-bold tracking-tight">Dashboard</h2>
            <div className="flex items-center space-x-2">
              <Button>
                <LucideLink className="mr-2 h-4 w-4" />
                Create New Link
              </Button>
            </div>
          </div>

          {loading ? (
            <DashboardSkeleton />
          ) : (
            <div className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <StatsCard
                  title="Total Clicks"
                  value={data.analytics?.clicksToday || 0}
                  description="Today"
                  icon={<Globe className="h-4 w-4 text-muted-foreground" />}
                />
                <StatsCard
                  title="Revenue"
                  value={`$${data.analytics?.earningsToday?.toFixed(2) || "0.00"}`}
                  description="Today"
                  icon={<DollarSign className="h-4 w-4 text-muted-foreground" />}
                />
                <StatsCard
                  title="Active Links"
                  value={data.links?.length || 0}
                  description="Total"
                  icon={<LucideLink className="h-4 w-4 text-muted-foreground" />}
                />
                <StatsCard
                  title="Traffic Sources"
                  value={data.analytics?.topCountries?.length || 0}
                  description="Countries"
                  icon={<Globe className="h-4 w-4 text-muted-foreground" />}
                />
              </div>

              <Tabs defaultValue="overview" className="space-y-4">
                <TabsList>
                  <TabsTrigger value="overview">Overview</TabsTrigger>
                  <TabsTrigger value="analytics">Analytics</TabsTrigger>
                  <TabsTrigger value="links">Links</TabsTrigger>
                </TabsList>
                <TabsContent value="overview" className="space-y-4">
                  <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
                    <Card className="col-span-4">
                      <CardHeader>
                        <CardTitle>Clicks Over Time</CardTitle>
                      </CardHeader>
                      <CardContent className="pl-2">
                        <ResponsiveContainer width="100%" height={300}>
                          <LineChart data={data.analytics?.clicksByDate || []}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis dataKey="date" />
                            <YAxis />
                            <Tooltip />
                            <Line type="monotone" dataKey="clicks" stroke="#8884d8" activeDot={{ r: 8 }} />
                          </LineChart>
                        </ResponsiveContainer>
                      </CardContent>
                    </Card>
                    <Card className="col-span-3">
                      <CardHeader>
                        <CardTitle>Top Countries</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <ResponsiveContainer width="100%" height={300}>
                          <BarChart data={data.analytics?.topCountries || []}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis dataKey="country" />
                            <YAxis />
                            <Tooltip />
                            <Bar dataKey="clicks" fill="#8884d8" />
                          </BarChart>
                        </ResponsiveContainer>
                      </CardContent>
                    </Card>
                  </div>
                  <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
                    <Card className="col-span-4">
                      <CardHeader>
                        <CardTitle>Recent Links</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <RecentLinks links={data.links} />
                      </CardContent>
                    </Card>
                    <Card className="col-span-3">
                      <CardHeader>
                        <CardTitle>Top Links</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <TopLinks userId={user.uid} />
                      </CardContent>
                    </Card>
                  </div>
                </TabsContent>
                <TabsContent value="analytics" className="space-y-4">
                  <Card className="col-span-4">
                    <CardHeader>
                      <CardTitle>Analytics Overview</CardTitle>
                    </CardHeader>
                    <CardContent>
                      {/* Analytics content */}
                    </CardContent>
                  </Card>
                </TabsContent>
                <TabsContent value="links" className="space-y-4">
                  <Card className="col-span-4">
                    <CardHeader>
                      <CardTitle>All Links</CardTitle>
                    </CardHeader>
                    <CardContent>
                      {/* Links content */}
                    </CardContent>
                  </Card>
                </TabsContent>
              </Tabs>
            </div>
          )}
        </div>
      </ErrorBoundary>
    </DashboardShell>
  )
}

function StatsCard({ title, value, description, icon }: StatsCardProps) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        {icon}
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
        <p className="text-xs text-muted-foreground">{description}</p>
      </CardContent>
    </Card>
  )
}

function DashboardSkeleton() {
  return (
    <div className="space-y-4">
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {Array(4).fill(0).map((_, i) => (
          <Card key={i}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <Skeleton className="h-4 w-[150px]" />
              <Skeleton className="h-4 w-4 rounded-full" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-8 w-[100px] mb-2" />
              <Skeleton className="h-4 w-[120px]" />
            </CardContent>
          </Card>
        ))}
      </div>
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-[250px]" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-[300px] w-full" />
        </CardContent>
      </Card>
      <div className="grid gap-4 md:grid-cols-2">
        {Array(2).fill(0).map((_, i) => (
          <Card key={i}>
            <CardHeader>
              <Skeleton className="h-6 w-[200px]" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-[200px] w-full" />
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}

