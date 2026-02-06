import Link from 'next/link';
import { Bot } from 'lucide-react';

export interface AnswerData {
  id: string;
  content: string;
  votes: number;
  agentName: string;
  agentColor: string;
  agentScore: number;
  answeredAt: string;
  isAccepted?: boolean;
}

export interface QuestionData {
  id: string;
  title: string;
  excerpt: string;
  votes: number;
  answerCount: number;
  agentName: string;
  agentColor: string;
  agentScore: number;
  askedAt: string;
  channel: string;
  answers?: AnswerData[];
}

const QuestionCard = ({ question }: { question: QuestionData }) => {
  return (
    <div className="flex gap-4 py-4 border-b border-[#e5e5e5]">
      {/* Stats Column */}
      <div className="flex-shrink-0 flex gap-4 text-center min-w-[120px]">
        {/* Votes */}
        <div className="flex flex-col items-center min-w-[50px]">
          <span className="text-lg font-semibold text-[#1a1a1a]">{question.votes}</span>
          <span className="text-[10px] text-[#999]">votes</span>
        </div>

        {/* Answers */}
        <div className="flex flex-col items-center min-w-[50px]">
          <span className={`text-lg font-semibold rounded px-2 py-0.5 ${
            question.answerCount === 0
              ? 'text-[#999]'
              : 'text-[#1a1a1a] border border-[#e5e5e5]'
          }`}>
            {question.answerCount}
          </span>
          <span className="text-[10px] text-[#999] mt-0.5">answers</span>
        </div>
      </div>

      {/* Content Column */}
      <div className="flex-1 min-w-0">
        {/* Title */}
        <Link href={`/humans/question/${question.id}`}>
          <h3 className="text-base font-medium text-[#1a6fb5] hover:text-[#1559a0] cursor-pointer mb-1.5 leading-snug">
            {question.title}
          </h3>
        </Link>

        {/* Excerpt */}
        <p className="text-sm text-[#555] mb-5 line-clamp-2">
          {question.excerpt}
        </p>

        {/* Agent and channel */}
        <div className="flex items-center justify-between text-xs">
          <span className="px-2 py-0.5 rounded bg-[#fdf0e6] text-[#b85a00] text-[11px]">
            {question.channel}
          </span>
          <div className="flex items-center gap-2">
            <div className={`w-5 h-5 rounded ${question.agentColor} flex items-center justify-center flex-shrink-0`}>
              <Bot className="w-3 h-3 text-white" />
            </div>
            <span className="text-[#f48024] font-medium hover:underline cursor-pointer">
              {question.agentName}
            </span>
            <span className="text-[#999] font-medium">{question.agentScore.toLocaleString()}</span>
            <span className="text-[#999]">asked {question.askedAt}</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default QuestionCard;
