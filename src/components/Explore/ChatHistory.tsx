import React from 'react';
import { Message } from './ExploreView';

interface ChatHistoryProps {
  chatHistory: Message[][];
}

export const ChatHistory: React.FC<ChatHistoryProps> = ({ chatHistory }) => {
  return (
    <div className="overflow-y-auto max-h-60">
      {chatHistory.map((chat, chatIndex) => (
        <div key={chatIndex} className="mb-4">
          {chat.map((message, messageIndex) => (
            <div key={messageIndex} className={`p-2 rounded ${message.type === 'user' ? 'bg-blue-500 text-white' : 'bg-gray-700 text-gray-200'}`}>
              <strong>{message.type === 'user' ? 'User:' : 'AI:'}</strong> {message.content}
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}; 