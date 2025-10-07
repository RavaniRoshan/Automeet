import { Bot } from 'lucide-react';

export default function TypingIndicator() {
  return (
    <div className="flex gap-4 justify-start mb-6">
      <div className="flex-shrink-0 w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center">
        <Bot className="w-6 h-6 text-white" />
      </div>

      <div className="flex flex-col items-start">
        <div className="rounded-2xl px-4 py-3 bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-700">
          <div className="flex gap-1">
            <span className="w-2 h-2 bg-gray-400 dark:bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></span>
            <span className="w-2 h-2 bg-gray-400 dark:bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></span>
            <span className="w-2 h-2 bg-gray-400 dark:bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></span>
          </div>
        </div>
      </div>
    </div>
  );
}
