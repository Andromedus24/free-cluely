import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CollaborationSession, UserActivity } from '../types/BoardTypes';

interface CollaborationPanelProps {
  sessionId: string;
  participants: CollaborationSession['participants'];
  activities: UserActivity[];
  onLeaveSession: () => void;
  onKickUser?: (userId: string) => void;
  isOwner: boolean;
  className?: string;
}

const USER_COLORS = [
  '#3B82F6', '#EF4444', '#10B981', '#F59E0B', '#8B5CF6',
  '#EC4899', '#06B6D4', '#F97316', '#84CC16', '#6366F1'
];

const getUserColor = (userId: string) => {
  let hash = 0;
  for (let i = 0; i < userId.length; i++) {
    hash = userId.charCodeAt(i) + ((hash << 5) - hash);
  }
  return USER_COLORS[Math.abs(hash) % USER_COLORS.length];
};

const formatTime = (date: Date) => {
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);

  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${minutes}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days < 7) return `${days}d ago`;
  return date.toLocaleDateString();
};

export const CollaborationPanel: React.FC<CollaborationPanelProps> = ({
  sessionId,
  participants,
  activities,
  onLeaveSession,
  onKickUser,
  isOwner,
  className = ''
}) => {
  const [activeTab, setActiveTab] = useState<'participants' | 'activity'>('participants');
  const [showInvite, setShowInvite] = useState(false);
  const [inviteLink, setInviteLink] = useState('');

  useEffect(() => {
    if (showInvite) {
      setInviteLink(`${window.location.origin}/board/invite/${sessionId}`);
    }
  }, [showInvite, sessionId]);

  const handleCopyInvite = () => {
    navigator.clipboard.writeText(inviteLink);
  };

  return (
    <motion.div
      className={`bg-white border-l border-gray-200 ${className}`}
      initial={{ width: 0 }}
      animate={{ width: 320 }}
      exit={{ width: 0 }}
    >
      <div className="w-80 h-full bg-white border-l border-gray-200 flex flex-col">
        {/* Header */}
        <div className="p-4 border-b border-gray-200">
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-lg font-semibold text-gray-900">Collaboration</h2>
            <button
              onClick={onLeaveSession}
              className="p-1 text-gray-400 hover:text-gray-600 rounded"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          <div className="flex items-center space-x-2">
            <div className="flex -space-x-2">
              {participants.slice(0, 3).map((participant) => (
                <div
                  key={participant.userId}
                  className="w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-medium"
                  style={{ backgroundColor: getUserColor(participant.userId) }}
                >
                  {participant.userName.charAt(0).toUpperCase()}
                </div>
              ))}
              {participants.length > 3 && (
                <div className="w-8 h-8 rounded-full bg-gray-300 border-2 border-white flex items-center justify-center text-xs font-medium text-gray-700">
                  +{participants.length - 3}
                </div>
              )}
            </div>
            <span className="text-sm text-gray-600">
              {participants.length} {participants.length === 1 ? 'person' : 'people'}
            </span>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-gray-200">
          {(['participants', 'activity'] as const).map(tab => (
            <button
              key={tab}
              className={`flex-1 px-3 py-2 text-sm font-medium text-center transition-colors relative ${
                activeTab === tab
                  ? 'text-blue-600'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
              onClick={() => setActiveTab(tab)}
            >
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
              {activeTab === tab && (
                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-600" />
              )}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4">
          {activeTab === 'participants' && (
            <div className="space-y-3">
              {participants.map((participant) => (
                <div
                  key={participant.userId}
                  className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                >
                  <div className="flex items-center space-x-3">
                    <div
                      className="w-10 h-10 rounded-full flex items-center justify-center text-white font-medium"
                      style={{ backgroundColor: getUserColor(participant.userId) }}
                    >
                      {participant.userName.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <div className="font-medium text-gray-900">
                        {participant.userName}
                        {participant.isOwner && (
                          <span className="ml-2 text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded">
                            Owner
                          </span>
                        )}
                        {participant.isActive && (
                          <span className="ml-2 inline-block w-2 h-2 bg-green-400 rounded-full"></span>
                        )}
                      </div>
                      <div className="text-xs text-gray-500">
                        {participant.role} • {formatTime(participant.joinedAt)}
                      </div>
                    </div>
                  </div>
                  {isOwner && !participant.isOwner && (
                    <button
                      onClick={() => onKickUser?.(participant.userId)}
                      className="p-1 text-gray-400 hover:text-red-600 rounded"
                      title="Remove from session"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  )}
                </div>
              ))}

              {/* Invite Button */}
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className="w-full p-3 border-2 border-dashed border-gray-300 rounded-lg text-gray-600 hover:border-gray-400 hover:text-gray-700 flex items-center justify-center space-x-2"
                onClick={() => setShowInvite(true)}
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                <span>Invite People</span>
              </motion.button>
            </div>
          )}

          {activeTab === 'activity' && (
            <div className="space-y-3">
              {activities.length === 0 ? (
                <div className="text-center py-8">
                  <div className="text-gray-400 mb-2">📊</div>
                  <p className="text-gray-600">No recent activity</p>
                </div>
              ) : (
                activities.map((activity, index) => (
                  <div
                    key={index}
                    className="flex items-start space-x-3 p-3 bg-gray-50 rounded-lg"
                  >
                    <div
                      className="w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-medium flex-shrink-0"
                      style={{ backgroundColor: getUserColor(activity.userId) }}
                    >
                      {activity.userName.charAt(0).toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm text-gray-900">
                        <span className="font-medium">{activity.userName}</span>
                        <span className="text-gray-600"> {activity.action}</span>
                      </div>
                      <div className="text-xs text-gray-500">
                        {formatTime(activity.timestamp)}
                      </div>
                      {activity.details && (
                        <div className="text-xs text-gray-600 mt-1">
                          {activity.details}
                        </div>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
        </div>

        {/* Invite Modal */}
        <AnimatePresence>
          {showInvite && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
              <motion.div
                className="bg-white rounded-lg shadow-xl w-full max-w-md p-6"
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.9, opacity: 0 }}
              >
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Invite to Board</h3>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Share this link
                    </label>
                    <div className="flex space-x-2">
                      <input
                        type="text"
                        value={inviteLink}
                        readOnly
                        className="flex-1 px-3 py-2 border border-gray-300 rounded-lg bg-gray-50 text-sm"
                      />
                      <motion.button
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                        onClick={handleCopyInvite}
                      >
                        Copy
                      </motion.button>
                    </div>
                  </div>
                  <div className="text-xs text-gray-500">
                    Anyone with this link can join the collaboration session
                  </div>
                </div>
                <div className="flex justify-end space-x-3 mt-6">
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                    onClick={() => setShowInvite(false)}
                  >
                    Close
                  </motion.button>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
};

export default CollaborationPanel;