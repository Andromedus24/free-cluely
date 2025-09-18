import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';

interface UserAvatarProps {
  userId: string;
  size?: number;
  className?: string;
  style?: React.CSSProperties;
  showTooltip?: boolean;
  tooltipPosition?: 'top' | 'bottom' | 'left' | 'right';
}

interface UserProfile {
  id: string;
  name: string;
  email: string;
  avatar?: string;
  initials?: string;
  color?: string;
}

// Mock user service - in practice, this would be injected or provided by context
const getUserProfile = async (userId: string): Promise<UserProfile | null> => {
  // Mock implementation
  const mockUsers: Record<string, UserProfile> = {
    'user1': {
      id: 'user1',
      name: 'John Doe',
      email: 'john@example.com',
      initials: 'JD',
      color: '#3B82F6'
    },
    'user2': {
      id: 'user2',
      name: 'Jane Smith',
      email: 'jane@example.com',
      initials: 'JS',
      color: '#10B981'
    },
    'user3': {
      id: 'user3',
      name: 'Bob Johnson',
      email: 'bob@example.com',
      initials: 'BJ',
      color: '#F59E0B'
    }
  };

  return mockUsers[userId] || null;
};

const generateInitials = (name: string): string => {
  return name
    .split(' ')
    .map(word => word.charAt(0).toUpperCase())
    .slice(0, 2)
    .join('');
};

const generateColor = (userId: string): string => {
  // Generate a consistent color based on user ID
  const colors = [
    '#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6',
    '#06B6D4', '#84CC16', '#F97316', '#EC4899', '#6366F1'
  ];

  const index = userId.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  return colors[index % colors.length];
};

const Tooltip: React.FC<{
  content: string;
  position: 'top' | 'bottom' | 'left' | 'right';
  children: React.ReactNode;
}> = ({ content, position, children }) => {
  const [isVisible, setIsVisible] = useState(false);

  const getPositionClasses = () => {
    switch (position) {
      case 'top':
        return 'bottom-full left-1/2 transform -translate-x-1/2 mb-2';
      case 'bottom':
        return 'top-full left-1/2 transform -translate-x-1/2 mt-2';
      case 'left':
        return 'right-full top-1/2 transform -translate-y-1/2 mr-2';
      case 'right':
        return 'left-full top-1/2 transform -translate-y-1/2 ml-2';
      default:
        return 'bottom-full left-1/2 transform -translate-x-1/2 mb-2';
    }
  };

  const getArrowClasses = () => {
    switch (position) {
      case 'top':
        return 'top-full left-1/2 transform -translate-x-1/2 border-l-4 border-r-4 border-t-4 border-l-transparent border-r-transparent';
      case 'bottom':
        return 'bottom-full left-1/2 transform -translate-x-1/2 border-l-4 border-r-4 border-b-4 border-l-transparent border-r-transparent';
      case 'left':
        return 'left-full top-1/2 transform -translate-y-1/2 border-t-4 border-b-4 border-l-4 border-t-transparent border-b-transparent';
      case 'right':
        return 'right-full top-1/2 transform -translate-y-1/2 border-t-4 border-b-4 border-r-4 border-t-transparent border-b-transparent';
      default:
        return 'top-full left-1/2 transform -translate-x-1/2 border-l-4 border-r-4 border-t-4 border-l-transparent border-r-transparent';
    }
  };

  return (
    <div className="relative inline-block">
      <div
        onMouseEnter={() => setIsVisible(true)}
        onMouseLeave={() => setIsVisible(false)}
        onFocus={() => setIsVisible(true)}
        onBlur={() => setIsVisible(false)}
      >
        {children}
      </div>

      <AnimatePresence>
        {isVisible && (
          <motion.div
            className={`absolute z-50 ${getPositionClasses()}`}
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            transition={{ duration: 0.2 }}
          >
            <div className="bg-gray-900 text-white text-sm rounded-lg py-2 px-3 shadow-lg whitespace-nowrap">
              {content}
              <div className={`absolute w-0 h-0 ${getArrowClasses()} border-gray-900`}></div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export const UserAvatar: React.FC<UserAvatarProps> = ({
  userId,
  size = 32,
  className = '',
  style = {},
  showTooltip = true,
  tooltipPosition = 'top'
}) => {
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadUserProfile = async () => {
      try {
        const profile = await getUserProfile(userId);
        if (profile) {
          setUserProfile(profile);
        } else {
          // Generate a default profile
          setUserProfile({
            id: userId,
            name: `User ${userId}`,
            email: `user${userId}@example.com`,
            initials: generateInitials(`User ${userId}`),
            color: generateColor(userId)
          });
        }
      } catch (error) {
        console.error('Failed to load user profile:', error);
        // Fallback profile
        setUserProfile({
          id: userId,
          name: `User ${userId}`,
          email: `user${userId}@example.com`,
          initials: generateInitials(`User ${userId}`),
          color: generateColor(userId)
        });
      } finally {
        setLoading(false);
      }
    };

    loadUserProfile();
  }, [userId]);

  if (loading) {
    return (
      <div
        className={`bg-gray-200 rounded-full flex items-center justify-center ${className}`}
        style={{
          width: size,
          height: size,
          ...style
        }}
      >
        <div className="animate-spin rounded-full h-1/2 w-1/2 border-b-2 border-gray-400"></div>
      </div>
    );
  }

  if (!userProfile) {
    return null;
  }

  const avatarContent = (
    <div
      className={`rounded-full flex items-center justify-center text-white font-medium overflow-hidden ${className}`}
      style={{
        width: size,
        height: size,
        backgroundColor: userProfile.color,
        fontSize: `${size * 0.4}px`,
        lineHeight: 1,
        ...style
      }}
    >
      {userProfile.avatar ? (
        <img
          src={userProfile.avatar}
          alt={userProfile.name}
          className="w-full h-full object-cover"
          onError={(e) => {
            // Fallback to initials if image fails to load
            e.currentTarget.style.display = 'none';
            e.currentTarget.parentElement!.textContent = userProfile.initials || userProfile.name.charAt(0);
          }}
        />
      ) : (
        userProfile.initials || userProfile.name.charAt(0)
      )}
    </div>
  );

  if (showTooltip) {
    return (
      <Tooltip content={userProfile.name} position={tooltipPosition}>
        {avatarContent}
      </Tooltip>
    );
  }

  return avatarContent;
};

// Specialized avatar components for different contexts
export const UserAvatarGroup: React.FC<{
  userIds: string[];
  max?: number;
  size?: number;
  className?: string;
}> = ({ userIds, max = 5, size = 32, className = '' }) => {
  const visibleUsers = userIds.slice(0, max);
  const remainingCount = userIds.length - max;

  return (
    <div className={`flex -space-x-2 ${className}`}>
      {visibleUsers.map((userId, index) => (
        <UserAvatar
          key={userId}
          userId={userId}
          size={size}
          className="border-2 border-white"
          style={{ zIndex: visibleUsers.length - index }}
        />
      ))}
      {remainingCount > 0 && (
        <div
          className="rounded-full bg-gray-300 border-2 border-white flex items-center justify-center text-xs font-medium text-gray-700"
          style={{
            width: size,
            height: size,
            fontSize: `${size * 0.375}px`,
            zIndex: 0
          }}
        >
          +{remainingCount}
        </div>
      )}
    </div>
  );
};

export const UserAvatarStack: React.FC<{
  userIds: string[];
  size?: number;
  className?: string;
}> = ({ userIds, size = 24, className = '' }) => {
  return (
    <div className={`flex flex-col items-center space-y-1 ${className}`}>
      {userIds.slice(0, 3).map((userId, index) => (
        <UserAvatar
          key={userId}
          userId={userId}
          size={size}
          className={`border border-white ${index > 0 ? 'opacity-80' : ''}`}
          style={{
            transform: `translateX(${index * 4}px)`,
            zIndex: 3 - index
          }}
        />
      ))}
      {userIds.length > 3 && (
        <div
          className="rounded-full bg-gray-200 border border-white flex items-center justify-center text-xs font-medium text-gray-600"
          style={{
            width: size,
            height: size,
            transform: `translateX(${3 * 4}px)`,
            zIndex: 0
          }}
        >
          +{userIds.length - 3}
        </div>
      )}
    </div>
  );
};

export const UserAvatarWithStatus: React.FC<{
  userId: string;
  status?: 'online' | 'offline' | 'away' | 'busy';
  size?: number;
  className?: string;
}> = ({ userId, status = 'offline', size = 32, className = '' }) => {
  const statusColors = {
    online: 'bg-green-500',
    offline: 'bg-gray-400',
    away: 'bg-yellow-500',
    busy: 'bg-red-500'
  };

  return (
    <div className={`relative ${className}`}>
      <UserAvatar userId={userId} size={size} />
      <div
        className={`absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-white ${statusColors[status]}`}
        style={{
          width: `${size * 0.25}px`,
          height: `${size * 0.25}px`
        }}
      />
    </div>
  );
};

export default UserAvatar;