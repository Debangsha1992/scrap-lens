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
  const percentage = (remaining / total) * 100;

  const formatResetTime = (resetTime: number) => {
    const now = Date.now();
    const diff = resetTime - now;
    
    if (diff <= 0) return 'Reset now';
    
    const minutes = Math.floor(diff / (1000 * 60));
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);
    
    if (days > 0) return `${days}d ${hours % 24}h`;
    if (hours > 0) return `${hours}h ${minutes % 60}m`;
    return `${minutes}m`;
  };

  const getStatusColor = () => {
    if (percentage > 50) return 'text-green-600';
    if (percentage > 20) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getProgressColor = () => {
    if (percentage > 50) return 'bg-green-500';
    if (percentage > 20) return 'bg-yellow-500';
    return 'bg-red-500';
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
          {remaining}/{total} requests
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