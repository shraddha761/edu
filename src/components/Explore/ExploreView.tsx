// src/components/Explore/ExploreView.tsx
import React, { useState, useCallback, useMemo, useRef, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import { SearchBar } from '../shared/SearchBar';
import { GPTService } from '../../services/gptService';
import { MarkdownComponentProps } from '../../types';
import { RelatedTopics } from './RelatedTopics';
import { RelatedQuestions } from './RelatedQuestions';
import { LoadingAnimation } from '../shared/LoadingAnimation';
import { UserContext } from '../../types';

interface Message {
  type: 'user' | 'ai';
  content?: string;
  topics?: Array<{ topic: string; type: string; reason: string; }>;
  questions?: Array<{ question: string; type: string; context: string; }>;
}

interface StreamChunk {
  text?: string;
  topics?: Array<{ topic: string; type: string; reason: string; }>;
  questions?: Array<{ question: string; type: string; context: string; }>;
}

interface ExploreViewProps {
  initialQuery?: string;
  onError: (message: string) => void;
  onRelatedQueryClick?: (query: string) => void;
  userContext: UserContext;
}

const MarkdownComponents: Record<string, React.FC<MarkdownComponentProps>> = {
  h1: ({ children, ...props }) => (
    <h1 className="text-xl sm:text-2xl font-bold text-gray-100 mt-4 mb-2" {...props}>
      {children}
    </h1>
  ),
  h2: ({ children, ...props }) => (
    <h2 className="text-lg sm:text-xl font-semibold text-gray-100 mt-3 mb-2" {...props}>
      {children}
    </h2>
  ),
  h3: ({ children, ...props }) => (
    <h3 className="text-base sm:text-lg font-medium text-gray-200 mt-2 mb-1" {...props}>
      {children}
    </h3>
  ),
  p: ({ children, ...props }) => (
    <p className="text-sm sm:text-base text-gray-300 my-1.5 leading-relaxed break-words" {...props}>
      {children}
    </p>
  ),
  ul: ({ children, ...props }) => (
    <ul className="list-disc list-inside my-2 text-gray-300" {...props}>
      {children}
    </ul>
  ),
  ol: ({ children, ...props }) => (
    <ol className="list-decimal list-inside my-2 text-gray-300" {...props}>
      {children}
    </ol>
  ),
  li: ({ children, ...props }) => (
    <li className="my-1 text-gray-300" {...props}>
      {children}
    </li>
  ),
  code: ({ children, inline, ...props }) => (
    inline ? 
      <code className="bg-gray-700 px-1 rounded text-xs sm:text-sm" {...props}>{children}</code> :
      <code className="block bg-gray-700 p-2 rounded my-2 text-xs sm:text-sm overflow-x-auto" {...props}>
        {children}
      </code>
  ),
  blockquote: ({ children, ...props }) => (
    <blockquote className="border-l-4 border-gray-500 pl-4 my-2 text-gray-400 italic" {...props}>
      {children}
    </blockquote>
  ),
};

export const ExploreView: React.FC<ExploreViewProps> = ({ 
  initialQuery, 
  onError,
  onRelatedQueryClick,
  userContext
}) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [showInitialSearch, setShowInitialSearch] = useState(!initialQuery);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const gptService = useMemo(() => new GPTService(), []);
  const [isLoading, setIsLoading] = useState(false);

  const scrollToTop = useCallback(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
    if (messagesContainerRef.current) {
      messagesContainerRef.current.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }, []);

  useEffect(() => {
    if (messages.length > 0) {
      scrollToTop();
    }
  }, [messages.length, scrollToTop]);

  useEffect(() => {
    const handleReset = () => {
      setMessages([]);
      setShowInitialSearch(true);
    };

    window.addEventListener('resetExplore', handleReset);
    return () => window.removeEventListener('resetExplore', handleReset);
  }, []);

  const handleSearch = useCallback(async (query: string) => {
    try {
      if (window.navigator.vibrate) {
        window.navigator.vibrate(50);
      }

      scrollToTop();
      setIsLoading(true);
      setMessages([{ type: 'user', content: query }, { type: 'ai', content: '' }]);
      setShowInitialSearch(false);

      await gptService.streamExploreContent(query, userContext, (chunk: StreamChunk) => {
        setMessages([{ type: 'user', content: query }, {
          type: 'ai',
          content: chunk.text,
          topics: chunk.topics,
          questions: chunk.questions
        }]);
      });
    } catch (error) {
      console.error('Search error:', error);
      onError(error instanceof Error ? error.message : 'Failed to load content');
    } finally {
      setIsLoading(false);
    }
  }, [gptService, onError, userContext, scrollToTop]);

  const handleRelatedQueryClick = useCallback((query: string) => {
    scrollToTop();
    if (onRelatedQueryClick) {
      onRelatedQueryClick(query);
    }
    handleSearch(query);
  }, [handleSearch, onRelatedQueryClick, scrollToTop]);

  useEffect(() => {
    if (initialQuery) {
      handleSearch(initialQuery);
    }
  }, [initialQuery, handleSearch]);

  return (
    <div className="w-full min-h-[calc(100vh-4rem)] flex flex-col">
      {showInitialSearch ? (
        <div className="flex-1 flex flex-col items-center justify-center px-4">
          <h1 className="text-2xl sm:text-3xl font-bold text-center mb-4">
            What do you want to explore?
          </h1>
          <div className="w-full max-w-xl mx-auto">
            <SearchBar
              onSearch={handleSearch}
              placeholder="Enter what you want to explore..."
              centered={true}
              className="bg-gray-900/80"
            />
            <p className="text-sm text-gray-400 text-center mt-1">Press Enter to search</p>
            <div className="flex flex-wrap items-center justify-center gap-2 mt-2">
              <span className="text-sm text-gray-400">Try:</span>
              {['Quantum Physics', 'Machine Learning', 'World History'].map((topic, index) => (
                <button
                  key={index}
                  onClick={() => handleSearch(topic)}
                  className={`px-3 py-1.5 rounded-lg bg-${index === 0 ? 'purple' : index === 1 ? 'blue' : 'green'}-500/20 hover:bg-${index === 0 ? 'purple' : index === 1 ? 'blue' : 'green'}-500/30 border border-${index === 0 ? 'purple' : index === 1 ? 'blue' : 'green'}-500/30 transition-colors text-xs sm:text-sm text-${index === 0 ? 'purple' : index === 1 ? 'blue' : 'green'}-300`}
                >
                  {topic}
                </button>
              ))}
            </div>
          </div>
        </div>
      ) : (
        <div ref={messagesContainerRef} className="relative flex flex-col w-full">
          <div className="space-y-2 pb-16">
            {messages.map((message, index) => (
              <div key={index} className="px-2 sm:px-4 w-full mx-auto">
                <div className="max-w-3xl mx-auto">
                  {message.type === 'user' ? (
                    <div className="flex-1 text-base sm:text-lg font-semibold text-gray-100">
                      {message.content}
                    </div>
                  ) : (
                    <div className="flex-1 min-w-0">
                      {!message.content && isLoading ? (
                        <div className="flex items-center space-x-2 py-2">
                          <LoadingAnimation />
                          <span className="text-sm text-gray-400">Thinking...</span>
                        </div>
                      ) : (
                        <ReactMarkdown
                          remarkPlugins={[remarkGfm, remarkMath]}
                          rehypePlugins={[rehypeKatex]}
                          components={MarkdownComponents}
                          className="whitespace-pre-wrap break-words space-y-1.5"
                        >
                          {message.content || ''}
                        </ReactMarkdown>
                      )}
                      {message.topics && message.topics.length > 0 && (
                        <div className="mt-3">
                          <RelatedTopics
                            topics={message.topics}
                            onTopicClick={handleRelatedQueryClick}
                          />
                        </div>
                      )}
                      {message.questions && message.questions.length > 0 && (
                        <div className="mt-3">
                          <RelatedQuestions
                            questions={message.questions}
                            onQuestionClick={handleRelatedQueryClick}
                          />
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            ))}
            <div className="h-8 w-full" aria-hidden="true" />
          </div>
          <div className="fixed bottom-12 left-0 right-0 bg-gradient-to-t from-background via-background to-transparent pb-1 pt-2 z-50">
            <div className="w-full px-2 sm:px-4 max-w-3xl mx-auto">
              <SearchBar
                onSearch={handleSearch} 
                placeholder="Ask a follow-up question..."
                centered={false}
                className="bg-gray-900/80 backdrop-blur-lg border border-gray-700/50 h-10"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

ExploreView.displayName = 'ExploreView';