import React from 'react';
import { motion } from 'framer-motion';

interface CardLabelsProps {
  labels: string[];
  className?: string;
}

const LabelColors = [
  'bg-red-100 text-red-800',
  'bg-blue-100 text-blue-800',
  'bg-green-100 text-green-800',
  'bg-yellow-100 text-yellow-800',
  'bg-purple-100 text-purple-800',
  'bg-pink-100 text-pink-800',
  'bg-indigo-100 text-indigo-800',
  'bg-gray-100 text-gray-800'
];

const getLabelColor = (label: string): string => {
  // Generate consistent color based on label text
  let hash = 0;
  for (let i = 0; i < label.length; i++) {
    hash = label.charCodeAt(i) + ((hash << 5) - hash);
  }
  return LabelColors[Math.abs(hash) % LabelColors.length];
};

export const CardLabels: React.FC<CardLabelsProps> = ({ labels, className = '' }) => {
  if (labels.length === 0) return null;

  return (
    <div className={`flex flex-wrap gap-1 ${className}`}>
      {labels.slice(0, 3).map((label, index) => (
        <motion.span
          key={label}
          className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${getLabelColor(label)}`}
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: index * 0.1 }}
        >
          {label}
        </motion.span>
      ))}
      {labels.length > 3 && (
        <motion.span
          className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800"
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.3 }}
        >
          +{labels.length - 3}
        </motion.span>
      )}
    </div>
  );
};

export default CardLabels;