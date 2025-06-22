'use client';

import { motion } from 'framer-motion';
import { useState, useEffect } from 'react';

interface RateLimitCounterProps {
  remaining?: number;
  total?: number;
  resetTime?: number;
}

/**
 * Rate limit counter component showing API usage limits
 */
export const RateLimitCounter: React.FC<RateLimitCounterProps> = ({
  remaining = 10,
  total = 10,
  resetTime,
}) => {
  const [currentTime, setCurrentTime] = useState(Date.now());

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(Date.now());
    }, 60000); // Update every minute

    return () => clearInterval(interval);
  }, []);

  const used = total - remaining;
  const percentage = (used / total) * 100;

  // Format reset time
  const formatResetTime = (resetTime: number) => {
    const timeUntilReset = resetTime - currentTime;
    
    if (timeUntilReset <= 0) {
      return 'now';
    }

    const hours = Math.floor(timeUntilReset / (1000 * 60 * 60));
    const minutes = Math.floor((timeUntilReset % (1000 * 60 * 60)) / (1000 * 60));

    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    }
    
    return `${minutes}m`;
  };

  // Determine status color based on usage
  const getStatusColor = () => {
    if (remaining === 0) return 'text-red-600 bg-red-50 border-red-200';
    if (remaining <= 2) return 'text-orange-600 bg-orange-50 border-orange-200';
    if (remaining <= 5) return 'text-yellow-600 bg-yellow-50 border-yellow-200';
    return 'text-green-600 bg-green-50 border-green-200';
  };

  const getProgressColor = () => {
    if (remaining === 0) return 'bg-red-500';
    if (remaining <= 2) return 'bg-orange-500';
    if (remaining <= 5) return 'bg-yellow-500';
    return 'bg-green-500';
  };

  return (
    <motion.div
      className={`p-4 rounded-xl border-2 ${getStatusColor()}`}
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.3 }}
    >
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-semibold text-sm">API Usage</h3>
        <span className="text-xs font-medium">
          {used}/{total} requests
        </span>
      </div>

      {/* Progress bar */}
      <div className="w-full bg-gray-200 rounded-full h-2 mb-3">
        <motion.div
          className={`h-2 rounded-full ${getProgressColor()}`}
          initial={{ width: 0 }}
          animate={{ width: `${percentage}%` }}
          transition={{ duration: 0.5, ease: "easeOut" }}
        />
      </div>

      <div className="flex justify-between items-center text-xs">
        <span>
          {remaining > 0 ? `${remaining} remaining` : 'Limit reached'}
        </span>
        {resetTime && (
          <span>
            Resets in {formatResetTime(resetTime)}
          </span>
        )}
      </div>
    </motion.div>
  );
}; 