import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface CollaborationCursorProps {
  userId: string;
  userName: string;
  userColor: string;
  position: { x: number; y: number };
  isVisible: boolean;
  isTyping?: boolean;
  selection?: { start: number; end: number };
}

export const CollaborationCursor: React.FC<CollaborationCursorProps> = ({
  userId,
  userName,
  userColor,
  position,
  isVisible,
  isTyping = false,
  selection
}) => {
  if (!isVisible) return null;

  return (
    <AnimatePresence>
      <motion.div
        className="absolute pointer-events-none z-50"
        style={{
          left: position.x,
          top: position.y,
          transform: 'translate(-50%, -50%)'
        }}
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.8 }}
      >
        {/* Cursor */}
        <div className="relative">
          <div
            className="w-0 h-0 border-l-[12px] border-l-transparent border-r-[12px] border-r-transparent border-t-[20px]"
            style={{ borderTopColor: userColor }}
          />

          {/* User Label */}
          <div className="absolute top-6 left-1/2 transform -translate-x-1/2 bg-gray-900 text-white text-xs px-2 py-1 rounded whitespace-nowrap shadow-lg">
            {userName}
            {isTyping && (
              <span className="ml-1">
                <span className="inline-block w-2 h-2 bg-green-400 rounded-full animate-pulse"></span>
                typing...
              </span>
            )}
          </div>
        </div>

        {/* Selection Indicator */}
        {selection && (
          <div
            className="absolute pointer-events-none"
            style={{
              left: Math.min(selection.start, selection.end),
              top: position.y + 30,
              width: Math.abs(selection.end - selection.start),
              height: 20,
              backgroundColor: `${userColor}20`,
              border: `1px solid ${userColor}`
            }}
          />
        )}
      </motion.div>
    </AnimatePresence>
  );
};

export default CollaborationCursor;