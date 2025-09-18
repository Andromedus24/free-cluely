import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { UserAvatar } from './UserAvatar';
import { formatTime } from '../utils/formatTime';

interface ChatMessage {
  id: string;
  userId: string;
  userName: string;
  content: string;
  timestamp: Date;
  type: 'text' | 'system' | 'action';
  mentions?: string[];
  attachments?: {
    id: string;
    name: string;
    type: string;
    size: number;
    url: string;
  }[];
}

interface BoardChatProps {
  boardId: string;
  sessionId: string;
  userId: string;
  messages: ChatMessage[];
  onSendMessage: (message: { content: string; mentions?: string[]; attachments?: File[] }) => void;
  onTypingStart?: () => void;
  onTypingEnd?: () => void;
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

const MessageBubble: React.FC<{
  message: ChatMessage;
  isOwn: boolean;
  onMentionClick: (userId: string) => void;
}> = ({ message, isOwn, onMentionClick }) => {
  const [showActions, setShowActions] = useState(false);

  const renderContent = () => {
    if (message.type === 'system') {
      return (
        <div className="text-sm text-gray-600 italic">
          {message.content}
        </div>
      );
    }

    if (message.type === 'action') {
      return (
        <div className="text-sm text-gray-600 italic">
          <span className="font-medium">{message.userName}</span> {message.content}
        </div>
      );
    }

    // Process mentions in the content
    let content = message.content;
    if (message.mentions && message.mentions.length > 0) {
      message.mentions.forEach(mentionId => {
        const mentionRegex = new RegExp(`@${mentionId}`, 'g');
        content = content.replace(mentionRegex, `@[${mentionId}]`);
      });
    }

    return (
      <div className="space-y-2">
        <div className="text-sm">{content}</div>

        {message.attachments && message.attachments.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {message.attachments.map(attachment => (
              <div
                key={attachment.id}
                className="flex items-center space-x-2 p-2 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors cursor-pointer"
                onClick={() => window.open(attachment.url, '_blank')}
              >
                <div className="w-8 h-8 bg-blue-100 rounded flex items-center justify-center">
                  <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </div>
                <div className="text-xs">
                  <div className="font-medium text-gray-900 truncate max-w-xs">{attachment.name}</div>
                  <div className="text-gray-500">{(attachment.size / 1024).toFixed(1)} KB</div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  };

  return (
    <motion.div
      className={`flex space-x-3 ${isOwn ? 'flex-row-reverse space-x-reverse' : ''}`}
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
      onMouseEnter={() => setShowActions(true)}
      onMouseLeave={() => setShowActions(false)}
    >
      <UserAvatar userId={message.userId} size={32} />

      <div className={`flex-1 max-w-md ${isOwn ? 'text-right' : ''}`}>
        <div className="flex items-center space-x-2 mb-1">
          <span className="text-xs font-medium text-gray-700">{message.userName}</span>
          <span className="text-xs text-gray-500">{formatTime(message.timestamp)}</span>
          {message.type === 'action' && (
            <span className="text-xs bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded">Action</span>
          )}
        </div>

        <div
          className={`inline-block p-3 rounded-lg ${
            isOwn
              ? 'bg-blue-600 text-white'
              : message.type === 'system'
              ? 'bg-gray-100 text-gray-700'
              : 'bg-gray-200 text-gray-900'
          }`}
        >
          {renderContent()}
        </div>

        {showActions && isOwn && message.type === 'text' && (
          <div className={`flex items-center space-x-2 mt-1 ${isOwn ? 'justify-end' : 'justify-start'}`}>
            <button className="text-xs text-gray-500 hover:text-gray-700">
              Edit
            </button>
            <button className="text-xs text-red-500 hover:text-red-700">
              Delete
            </button>
          </div>
        )}
      </div>
    </motion.div>
  );
};

export const BoardChat: React.FC<BoardChatProps> = ({
  boardId,
  sessionId,
  userId,
  messages,
  onSendMessage,
  onTypingStart,
  onTypingEnd,
  className = ''
}) => {
  const [message, setMessage] = useState('');
  const [attachments, setAttachments] = useState<File[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [typingTimeout, setTypingTimeout] = useState<NodeJS.Timeout | null>(null);
  const [mentionSuggestions, setMentionSuggestions] = useState<string[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [cursorPosition, setCursorPosition] = useState(0);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Handle typing indicators
  const handleTyping = (text: string) => {
    setMessage(text);

    if (onTypingStart && onTypingEnd) {
      if (text.trim()) {
        if (typingTimeout) {
          clearTimeout(typingTimeout);
        }
        onTypingStart();

        const timeout = setTimeout(() => {
          onTypingEnd();
        }, 1000);
        setTypingTimeout(timeout);
      } else {
        onTypingEnd();
        if (typingTimeout) {
          clearTimeout(typingTimeout);
          setTypingTimeout(null);
        }
      }
    }

    // Handle @ mentions
    const lastWord = text.split(' ').pop();
    if (lastWord?.startsWith('@')) {
      const searchTerm = lastWord.substring(1);
      // Mock suggestion logic - in real app, this would query actual users
      if (searchTerm.length > 0) {
        setMentionSuggestions(['user1', 'user2', 'user3'].filter(id =>
          id.toLowerCase().includes(searchTerm.toLowerCase())
        ));
        setShowSuggestions(true);
      }
    } else {
      setShowSuggestions(false);
    }
  };

  const handleSendMessage = () => {
    if (message.trim() || attachments.length > 0) {
      const mentions = message
        .split(' ')
        .filter(word => word.startsWith('@'))
        .map(word => word.substring(1));

      onSendMessage({
        content: message.trim(),
        mentions,
        attachments: attachments.length > 0 ? attachments : undefined
      });

      setMessage('');
      setAttachments([]);
      setShowSuggestions(false);

      if (typingTimeout) {
        clearTimeout(typingTimeout);
        setTypingTimeout(null);
      }
      if (onTypingEnd) {
        onTypingEnd();
      }
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handleFileSelect = (files: FileList | null) => {
    if (files) {
      setAttachments(prev => [...prev, ...Array.from(files)]);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    handleFileSelect(e.dataTransfer.files);
  };

  const removeAttachment = (index: number) => {
    setAttachments(prev => prev.filter((_, i) => i !== index));
  };

  const handleMentionSelect = (userId: string) => {
    const words = message.split(' ');
    const lastWordIndex = words.length - 1;
    if (words[lastWordIndex].startsWith('@')) {
      words[lastWordIndex] = `@${userId}`;
    } else {
      words.push(`@${userId}`);
    }

    setMessage(words.join(' ') + ' ');
    setShowSuggestions(false);
    textareaRef.current?.focus();
  };

  return (
    <div className={`flex flex-col h-full bg-white border-l border-gray-200 ${className}`}>
      {/* Chat Header */}
      <div className="p-4 border-b border-gray-200">
        <h3 className="text-lg font-semibold text-gray-900">Board Chat</h3>
        <p className="text-sm text-gray-600">Real-time conversation with team members</p>
      </div>

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 ? (
          <div className="text-center py-8">
            <div className="text-gray-400 mb-2">💬</div>
            <p className="text-gray-600">No messages yet. Start the conversation!</p>
          </div>
        ) : (
          messages.map((msg) => (
            <MessageBubble
              key={msg.id}
              message={msg}
              isOwn={msg.userId === userId}
              onMentionClick={(mentionId) => {
                setMessage(prev => prev + ` @${mentionId}`);
                textareaRef.current?.focus();
              }}
            />
          ))
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Attachment Preview */}
      {attachments.length > 0 && (
        <div className="p-4 border-t border-gray-200 bg-gray-50">
          <div className="text-sm font-medium text-gray-700 mb-2">Attachments:</div>
          <div className="flex flex-wrap gap-2">
            {attachments.map((file, index) => (
              <div key={index} className="flex items-center space-x-2 p-2 bg-white rounded-lg border">
                <div className="w-8 h-8 bg-blue-100 rounded flex items-center justify-center">
                  <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </div>
                <div className="text-xs">
                  <div className="font-medium text-gray-900 truncate max-w-xs">{file.name}</div>
                  <div className="text-gray-500">{(file.size / 1024).toFixed(1)} KB</div>
                </div>
                <button
                  onClick={() => removeAttachment(index)}
                  className="text-red-500 hover:text-red-700"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Input Area */}
      <div className="p-4 border-t border-gray-200">
        {/* Mention Suggestions */}
        <AnimatePresence>
          {showSuggestions && mentionSuggestions.length > 0 && (
            <motion.div
              className="absolute bottom-20 left-4 right-4 bg-white border border-gray-200 rounded-lg shadow-lg z-10 max-h-48 overflow-y-auto"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
            >
              {mentionSuggestions.map(userId => (
                <button
                  key={userId}
                  className="w-full text-left px-3 py-2 hover:bg-gray-100 flex items-center space-x-2"
                  onClick={() => handleMentionSelect(userId)}
                >
                  <UserAvatar userId={userId} size={24} />
                  <span className="text-sm">{userId}</span>
                </button>
              ))}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Drop Zone */}
        <div
          className={`mb-2 p-4 border-2 border-dashed rounded-lg text-center transition-colors ${
            isDragging
              ? 'border-blue-500 bg-blue-50'
              : 'border-gray-300 hover:border-gray-400'
          }`}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
        >
          <input
            ref={fileInputRef}
            type="file"
            multiple
            className="hidden"
            onChange={(e) => handleFileSelect(e.target.files)}
          />
          <div className="text-sm text-gray-600">
            {isDragging ? 'Drop files here' : (
              <>
                Drag & drop files here or{' '}
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="text-blue-600 hover:text-blue-700 underline"
                >
                  browse
                </button>
              </>
            )}
          </div>
        </div>

        {/* Message Input */}
        <div className="flex space-x-2">
          <textarea
            ref={textareaRef}
            value={message}
            onChange={(e) => handleTyping(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Type your message... Use @ to mention users"
            className="flex-1 p-3 border border-gray-300 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            rows={3}
          />
          <button
            onClick={handleSendMessage}
            disabled={!message.trim() && attachments.length === 0}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
          >
            Send
          </button>
        </div>

        {/* Quick Actions */}
        <div className="flex items-center justify-between mt-2">
          <div className="flex items-center space-x-2">
            <button
              onClick={() => fileInputRef.current?.click()}
              className="p-1 text-gray-500 hover:text-gray-700"
              title="Attach file"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
              </svg>
            </button>
          </div>

          <div className="text-xs text-gray-500">
            Press Enter to send, Shift+Enter for new line
          </div>
        </div>
      </div>
    </div>
  );
};

export default BoardChat;