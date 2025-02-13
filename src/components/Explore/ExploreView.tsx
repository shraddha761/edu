import React, { useState, useCallback, useMemo, useRef, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import { SearchBar } from '../shared/SearchBar';
import { GPTService } from '../../services/gptService';
import { MarkdownComponentProps } from '../../types';
import { RelatedTopics } from './RelatedTopics';
import { RelatedQuestions } from './RelatedQuestions';
import { LoadingAnimation } from '../shared/LoadingAnimation';
import { UserContext } from '../../types';

export interface Message {
  type: 'user' | 'ai';
  content?: string;
  topics?: Array<{ topic: string; type: string; reason: string }>;
  questions?: Array<{ question: string; type: string; context: string }>;
}

interface StreamChunk {
  text?: string;
  topics?: Array<{ topic: string; type: string; reason: string }>;
  questions?: Array<{ question: string; type: string; context: string }>;
}

interface ExploreViewProps {
  initialQuery?: string;
  onError: (message: string) => void;
  onRelatedQueryClick?: (query: string) => void;
  userContext: UserContext;
}

const MarkdownComponents: Record<string, React.FC<MarkdownComponentProps>> = {
  h1: ({ children, ...props }) => <h1 className="text-2xl font-bold" {...props}>{children}</h1>,
  h2: ({ children, ...props }) => <h2 className="text-xl font-semibold" {...props}>{children}</h2>,
  h3: ({ children, ...props }) => <h3 className="text-lg font-medium" {...props}>{children}</h3>,
  p: ({ children, ...props }) => <p className="text-sm sm:text-base" {...props}>{children}</p>,
  ul: ({ children, ...props }) => <ul className="list-disc pl-4" {...props}>{children}</ul>,
  ol: ({ children, ...props }) => <ol className="list-decimal pl-4" {...props}>{children}</ol>,
  li: ({ children, ...props }) => <li className="text-sm sm:text-base" {...props}>{children}</li>,
  code: ({ children, inline, ...props }) =>
    inline ? (
      <code className="bg-gray-100 px-1 py-0.5 rounded" {...props}>
        {children}
      </code>
    ) : (
      <pre className="bg-gray-100 p-4 rounded overflow-auto" {...props}>
        {children}
      </pre>
    ),
  blockquote: ({ children, ...props }) => (
    <blockquote className="border-l-4 border-gray-300 pl-4 italic" {...props}>
      {children}
    </blockquote>
  ),
};

export const ExploreView: React.FC<ExploreViewProps> = ({
  initialQuery,
  onError,
  userContext,
}) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [chatHistory, setChatHistory] = useState<Message[][]>([]);
  const [showInitialSearch, setShowInitialSearch] = useState(!initialQuery);
  const messagesContainerRef = useRef<HTMLDivElement | null>(null);
  const gptService = useMemo(() => new GPTService(), []);
  const [isLoading, setIsLoading] = useState(false);
  const [context, setContext] = useState('');

  const scrollToBottom = useCallback(() => {
    if (messagesContainerRef.current) {
      messagesContainerRef.current.scrollTop = messagesContainerRef.current.scrollHeight;
    }
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  useEffect(() => {
    const handleReset = () => {
      setMessages([]);
      setChatHistory([]);
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
      setIsLoading(true);
      setMessages([{ type: 'user', content: query }, { type: 'ai', content: '' }]);
      setShowInitialSearch(false);

      await gptService.streamExploreContent(query, userContext, (chunk: StreamChunk) => {
        setMessages((prev) => [
          ...prev.slice(0, -1),
          {
            type: 'ai',
            content: chunk.text,
            topics: chunk.topics,
            questions: chunk.questions,
          },
        ]);
      });

      setChatHistory((prev) => [...prev, messages]);
      setContext(messages.map((msg) => msg.content).join(' '));
    } catch (error) {
      console.error('Search error:', error);
      onError(error instanceof Error ? error.message : 'Failed to load content');
    } finally {
      setIsLoading(false);
    }
  }, [gptService, onError, userContext, messages]);


  const handleFollowUpQuestion = useCallback(
    async (followUpQuery: string) => {
      const fullQuery = `${context} ${followUpQuery}`;
      await handleSearch(fullQuery);
    },
    [context, handleSearch]
  );

  useEffect(() => {
    if (initialQuery) {
      handleSearch(initialQuery);
    }
  }, [initialQuery, handleSearch]);

  const handleTopicClick = (topic: string) => {
    console.log('Topic clicked:', topic);
  };

  useEffect(() => {
    console.log('Chat History:', chatHistory);
  }, [chatHistory]);

  return (
    <div className="flex flex-col h-full">
      {/* Scrollable Chat History */}
      <div ref={messagesContainerRef} className="flex-1 overflow-y-auto p-4">
        {messages.map((message, index) => (
          <div key={index}>
            {message.type === 'user' ? (
              <div className="text-right">{message.content}</div>
            ) : (
              <div>
                {!message.content && isLoading ? (
                  <LoadingAnimation />
                ) : (
                  <ReactMarkdown components={MarkdownComponents}>
                    {message.content || ''}
                  </ReactMarkdown>
                )}
                {message.topics && message.topics.length > 0 && (
                  <RelatedTopics 
                    topics={message.topics} 
                    onTopicClick={handleTopicClick}
                  />
                )}
                {message.questions && message.questions.length > 0 && (
                  <RelatedQuestions
                    questions={message.questions}
                    onQuestionClick={handleFollowUpQuestion}
                  />
                )}
              </div>
            )}
          </div>
        ))}
      </div>

      {showInitialSearch ? (
        <div className="p-4">
          <h2 className="text-lg font-semibold">What do you want to explore?</h2>
          <p className="text-sm text-gray-500">Press Enter to search</p>
          <div className="mt-4 space-x-2">
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
      ) : (
        <SearchBar
          onSearch={handleSearch}
          placeholder="Ask a question..."
        />
      )}
    </div>
  );
};

ExploreView.displayName = 'ExploreView';