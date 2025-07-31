'use client'

import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { supabase } from '@/lib/supabase'
import { getAnalyticsData } from '@/lib/training'
import { getStorageStats } from '@/lib/storage'

interface AnalyticsData {
  totalAnalyses: number
  totalImages: number
  modelUsage: Record<string, number>
  dailyUsage: Array<{ date: string; count: number }>
  topObjects: Array<{ label: string; count: number }>
  averageProcessingTime: number
  storageStats: {
    totalImages: number
    totalSize: number
    storageUsed: string
  }
}

// interface UserProfile {
//   subscription_tier: 'free' | 'premium' | 'enterprise'
//   api_usage_count: number
//   email: string
// }

export function AnalyticsDashboard() {
  const [analytics, setAnalytics] = useState<AnalyticsData>({
    totalAnalyses: 0,
    totalImages: 0,
    modelUsage: {},
    dailyUsage: [],
    topObjects: [],
    averageProcessingTime: 0,
    storageStats: {
      totalImages: 0,
      totalSize: 0,
      storageUsed: '0 MB'
    }
  })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetchAnalytics()
  }, [])

  const fetchAnalytics = async () => {
    try {
      setLoading(true)
      const { data: user } = await supabase.auth.getUser()
      
      if (!user.user) {
        setError('Please sign in to view analytics')
        return
      }

      // Fetch user profile
      const { data: profile } = await supabase
        .from('users')
        .select('subscription_tier, api_usage_count, email')
        .eq('id', user.user.id)
        .single()

      if (profile) {
        // setUserProfile(profile) // This line was removed as per the edit hint
      }

      // Fetch analytics data
      const analyticsData = await getAnalyticsData(user.user.id)
      
      // Fetch storage stats
      const storageStats = await getStorageStats(user.user.id)

      setAnalytics({
        ...analyticsData,
        storageStats
      })

    } catch (error) {
      console.error('Error fetching analytics:', error)
      setError('Failed to load analytics data')
    } finally {
      setLoading(false)
    }
  }

  const getSubscriptionLimits = (tier: string) => {
    switch (tier) {
      case 'premium':
        return { daily: 100, monthly: 2000, storage: '10 GB' }
      case 'enterprise':
        return { daily: 1000, monthly: 20000, storage: '100 GB' }
      default:
        return { daily: 10, monthly: 100, storage: '100 MB' }
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
        <span className="ml-2 text-gray-600">Loading analytics...</span>
      </div>
    )
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <p className="text-red-800">{error}</p>
        <button 
          onClick={fetchAnalytics}
          className="mt-2 text-red-600 hover:text-red-800 underline"
        >
          Try again
        </button>
      </div>
    )
  }

  if (!analytics) {
    return (
      <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
        <p className="text-gray-600">No analytics data available</p>
      </div>
    )
  }

  const limits = getSubscriptionLimits(analytics.totalAnalyses > 0 ? 'free' : 'premium') // Assuming a default tier if no data
  const usagePercentage = (analytics.totalAnalyses / limits.daily) * 100

  return (
    <div className="space-y-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <h2 className="text-2xl font-bold text-gray-800 mb-2">Analytics Dashboard</h2>
        <p className="text-gray-600">Track your AI image analysis usage and insights</p>
      </motion.div>

      {/* Subscription Info */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.1 }}
        className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-xl p-6"
      >
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold text-blue-800 capitalize">
              {limits.daily > 0 ? 'Free' : 'Premium'} Plan
            </h3>
            <p className="text-blue-600 text-sm">User not logged in</p>
          </div>
          <div className="text-right">
            <div className="text-2xl font-bold text-blue-600">
              {analytics.totalAnalyses}/{limits.daily}
            </div>
            <div className="text-sm text-blue-500">Daily Usage</div>
          </div>
        </div>
        
        <div className="mt-4">
          <div className="flex justify-between text-sm text-blue-600 mb-1">
            <span>Daily Usage</span>
            <span>{usagePercentage.toFixed(1)}%</span>
          </div>
          <div className="w-full bg-blue-200 rounded-full h-2">
            <motion.div
              className="bg-blue-600 h-2 rounded-full"
              initial={{ width: 0 }}
              animate={{ width: `${Math.min(usagePercentage, 100)}%` }}
              transition={{ duration: 1, delay: 0.2 }}
            />
          </div>
        </div>
      </motion.div>

      {/* Key Metrics */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.2 }}
        className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6"
      >
        <MetricCard
          title="Total Analyses"
          value={analytics.totalAnalyses}
          icon="🔍"
          color="blue"
        />
        <MetricCard
          title="Images Processed"
          value={analytics.totalImages}
          icon="📸"
          color="green"
        />
        <MetricCard
          title="Storage Used"
          value={analytics.storageStats.storageUsed}
          subValue={`${analytics.storageStats.totalImages} images`}
          icon="💾"
          color="purple"
        />
        <MetricCard
          title="Avg Processing"
          value={`${(analytics.averageProcessingTime / 1000).toFixed(1)}s`}
          icon="⚡"
          color="orange"
        />
      </motion.div>

      {/* Model Usage Chart */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.3 }}
        className="bg-white rounded-xl shadow-lg border border-gray-200 p-6"
      >
        <h3 className="text-lg font-semibold text-gray-800 mb-4">Model Usage</h3>
        <div className="space-y-3">
          {Object.entries(analytics.modelUsage).map(([model, count]) => {
            const percentage = (count / analytics.totalAnalyses) * 100
            return (
              <div key={model} className="flex items-center justify-between">
                <span className="text-sm font-medium text-gray-700">{model}</span>
                <div className="flex items-center space-x-2">
                  <div className="w-32 bg-gray-200 rounded-full h-2">
                    <motion.div
                      className="bg-blue-600 h-2 rounded-full"
                      initial={{ width: 0 }}
                      animate={{ width: `${percentage}%` }}
                      transition={{ duration: 1, delay: 0.4 }}
                    />
                  </div>
                  <span className="text-sm text-gray-600 w-12 text-right">{count}</span>
                </div>
              </div>
            )
          })}
        </div>
      </motion.div>

      {/* Top Objects */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.4 }}
        className="bg-white rounded-xl shadow-lg border border-gray-200 p-6"
      >
        <h3 className="text-lg font-semibold text-gray-800 mb-4">Most Detected Objects</h3>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
          {analytics.topObjects.slice(0, 10).map((object, index) => (
            <motion.div
              key={object.label}
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.3, delay: 0.5 + index * 0.1 }}
              className="bg-gray-50 rounded-lg p-3 text-center"
            >
              <div className="text-lg font-bold text-gray-800">{object.count}</div>
              <div className="text-sm text-gray-600 capitalize">{object.label}</div>
            </motion.div>
          ))}
        </div>
      </motion.div>

      {/* Daily Usage Chart */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.5 }}
        className="bg-white rounded-xl shadow-lg border border-gray-200 p-6"
      >
        <h3 className="text-lg font-semibold text-gray-800 mb-4">Daily Usage (Last 30 Days)</h3>
        <div className="flex items-end space-x-1 h-32">
          {analytics.dailyUsage.map((day, index) => {
            const maxCount = Math.max(...analytics.dailyUsage.map(d => d.count), 1)
            const height = (day.count / maxCount) * 100
            
            return (
              <motion.div
                key={day.date}
                initial={{ height: 0 }}
                animate={{ height: `${height}%` }}
                transition={{ duration: 0.5, delay: 0.6 + index * 0.02 }}
                className="flex-1 bg-blue-500 rounded-t min-h-1"
                title={`${day.date}: ${day.count} analyses`}
              />
            )
          })}
        </div>
        <div className="flex justify-between text-xs text-gray-500 mt-2">
          <span>30 days ago</span>
          <span>Today</span>
        </div>
      </motion.div>
    </div>
  )
}

interface MetricCardProps {
  title: string
  value: string | number
  subValue?: string
  icon: string
  color: 'blue' | 'green' | 'purple' | 'orange'
}

const MetricCard: React.FC<MetricCardProps> = ({ title, value, subValue, icon, color }) => {
  const colorClasses = {
    blue: 'from-blue-500 to-blue-600 text-blue-50',
    green: 'from-green-500 to-green-600 text-green-50',
    purple: 'from-purple-500 to-purple-600 text-purple-50',
    orange: 'from-orange-500 to-orange-600 text-orange-50'
  }

  return (
    <motion.div
      whileHover={{ scale: 1.02 }}
      className={`bg-gradient-to-r ${colorClasses[color]} rounded-xl p-6 shadow-lg`}
    >
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm opacity-90">{title}</p>
          <p className="text-2xl font-bold">{value}</p>
          {subValue && (
            <p className="text-xs opacity-75">{subValue}</p>
          )}
        </div>
        <div className="text-3xl opacity-75">{icon}</div>
      </div>
    </motion.div>
  )
} 