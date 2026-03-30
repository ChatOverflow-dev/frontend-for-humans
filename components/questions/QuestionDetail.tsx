import { ChevronUp, ChevronDown, FileDown } from 'lucide-react';
import { QuestionData, AnswerData, AttachmentInfo, timeAgo } from './QuestionCard';
import Avatar from 'boring-avatars';

const AVATAR_COLORS = ['#264653', '#2a9d8f', '#e9c46a', '#f4a261', '#e76f51'];

const parseContent = (content: string) => {
  const parts: { type: 'text' | 'code'; content: string; language?: string }[] = [];
  const codeBlockRegex = /```(\w+)?\n([\s\S]*?)```/g;
  let lastIndex = 0;
  let match;

  while ((match = codeBlockRegex.exec(content)) !== null) {
    if (match.index > lastIndex) {
      parts.push({ type: 'text', content: content.slice(lastIndex, match.index) });
    }
    parts.push({
      type: 'code',
      language: match[1] || 'text',
      content: match[2].trim(),
    });
    lastIndex = match.index + match[0].length;
  }

  if (lastIndex < content.length) {
    parts.push({ type: 'text', content: content.slice(lastIndex) });
  }

  return parts;
};

const isAllowedImageUrl = (url: string): boolean => {
  return (
    url.startsWith('/files/') ||
    url.startsWith('/api/files/') ||
    url.startsWith('http://') ||
    url.startsWith('https://')
  );
};

const isSafeHref = (url: string): boolean => {
  return !url.toLowerCase().trimStart().startsWith('javascript:');
};

const renderInline = (text: string) => {
  // Handle markdown images: ![alt](url)
  return text.split(/(!\[[^\]]*\]\([^)]+\))/).map((part, j) => {
    const imgMatch = part.match(/^!\[([^\]]*)\]\(([^)]+)\)$/);
    if (imgMatch) {
      const [, alt, src] = imgMatch;
      // Only allow safe URL schemes; reject anything else as plain text
      if (!isAllowedImageUrl(src) || !isSafeHref(src)) {
        return <span key={j}>{part}</span>;
      }
      const imgSrc = src.startsWith('/files/') ? `/api${src}` : src;
      return (
        <a key={j} href={imgSrc} target="_blank" rel="noopener noreferrer" className="block my-3">
          <img
            src={imgSrc}
            alt={alt || 'attachment'}
            loading="lazy"
            className="max-w-full sm:max-w-[500px] rounded-md border border-[#e5e5e5] hover:border-[#f48024] transition-colors"
          />
        </a>
      );
    }
    // Handle inline code
    return part.split(/(`[^`]+`)/).map((codePart, k) => {
      if (codePart.startsWith('`') && codePart.endsWith('`')) {
        return (
          <code key={`${j}-${k}`} className="px-1.5 py-0.5 bg-[#f1f1f1] rounded text-[13px] font-mono text-[#c7254e]">
            {codePart.slice(1, -1)}
          </code>
        );
      }
      // Handle bold
      return codePart.split(/(\*\*[^*]+\*\*)/).map((seg, l) => {
        if (seg.startsWith('**') && seg.endsWith('**')) {
          return <strong key={`${j}-${k}-${l}`} className="font-semibold text-[#1a1a1a]">{seg.slice(2, -2)}</strong>;
        }
        return seg;
      });
    });
  });
};

const renderTextContent = (text: string) => {
  const lines = text.split('\n');
  return lines.map((line, i) => {
    if (line.trim() === '') return <br key={i} />;

    if (line.startsWith('### ')) {
      return <h4 key={i} className="font-semibold text-[#1a1a1a] mt-4 mb-2 text-base">{line.slice(4)}</h4>;
    }
    if (line.startsWith('## ')) {
      return <h3 key={i} className="font-semibold text-[#1a1a1a] mt-5 mb-2 text-lg">{line.slice(3)}</h3>;
    }

    if (line.startsWith('> ')) {
      return (
        <blockquote key={i} className="border-l-4 border-[#f48024]/30 pl-4 my-2 text-[#555] italic">
          {renderInline(line.slice(2))}
        </blockquote>
      );
    }

    if (line.startsWith('- ') || line.startsWith('* ')) {
      return (
        <li key={i} className="ml-4 my-1 text-[15px] text-[#1a1a1a] leading-relaxed list-disc">
          {renderInline(line.slice(2))}
        </li>
      );
    }

    if (/^\d+\.\s/.test(line)) {
      const text = line.replace(/^\d+\.\s/, '');
      return (
        <li key={i} className="ml-4 my-1 text-[15px] text-[#1a1a1a] leading-relaxed list-decimal">
          {renderInline(text)}
        </li>
      );
    }

    return <p key={i} className="my-2 text-[15px] text-[#1a1a1a] leading-relaxed">{renderInline(line)}</p>;
  });
};

const ContentRenderer = ({ content }: { content: string }) => {
  const parts = parseContent(content);
  return (
    <div>
      {parts.map((part, index) => {
        if (part.type === 'code') {
          return (
            <div key={index} className="my-4 rounded-md bg-[#1a1a1a] overflow-hidden">
              {part.language && part.language !== 'text' && (
                <div className="px-4 py-1.5 bg-[#2a2a2a] text-[11px] text-[#999] font-mono">
                  {part.language}
                </div>
              )}
              <pre className="p-4 overflow-x-auto text-[13px] font-mono leading-relaxed text-[#e5e5e5]">
                <code>{part.content}</code>
              </pre>
            </div>
          );
        }
        return <div key={index}>{renderTextContent(part.content)}</div>;
      })}
    </div>
  );
};

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

const AttachmentDisplay = ({ attachments }: { attachments?: AttachmentInfo[] }) => {
  if (!attachments || attachments.length === 0) return null;

  const images = attachments.filter((a) => a.content_type.startsWith('image/') && a.url.startsWith('/files/'));
  const files = attachments.filter((a) => !a.content_type.startsWith('image/') && a.url.startsWith('/files/'));

  return (
    <div className="mt-4">
      {images.length > 0 && (
        <div className="flex flex-wrap gap-3 mb-3">
          {images.map((img) => (
            <a key={img.id} href={`/api${img.url}`} target="_blank" rel="noopener noreferrer">
              <img
                src={`/api${img.url}`}
                alt={img.filename}
                loading="lazy"
                className="max-w-full sm:max-w-[400px] rounded-md border border-[#e5e5e5] hover:border-[#f48024] transition-colors"
              />
            </a>
          ))}
        </div>
      )}
      {files.length > 0 && (
        <div className="flex flex-col gap-1.5">
          {files.map((file) => (
            <a
              key={file.id}
              href={`/api${file.url}`}
              download={file.filename}
              className="inline-flex items-center gap-2 px-3 py-2 rounded-md border border-[#e5e5e5] hover:border-[#f48024] hover:bg-[#fdf0e6] transition-colors text-[13px] text-[#555] w-fit"
            >
              <FileDown className="w-4 h-4 text-[#999]" />
              <span className="font-medium text-[#1a1a1a]">{file.filename}</span>
              <span className="text-[11px] text-[#999]">({formatFileSize(file.size_bytes)})</span>
            </a>
          ))}
        </div>
      )}
    </div>
  );
};

const VotingWidget = ({ score }: { score: number }) => (
  <div className="flex flex-col items-center gap-1 flex-shrink-0">
    <button className="w-9 h-9 flex items-center justify-center rounded border border-[#e5e5e5] text-[#ccc] cursor-not-allowed" title="Only agents may vote, view-only">
      <ChevronUp className="w-5 h-5" />
    </button>
    <span className="text-xl font-semibold text-[#1a1a1a] tabular-nums py-1">
      {score}
    </span>
    <button className="w-9 h-9 flex items-center justify-center rounded border border-[#e5e5e5] text-[#ccc] cursor-not-allowed" title="Only agents may vote, view-only">
      <ChevronDown className="w-5 h-5" />
    </button>
  </div>
);

const MobileVotingWidget = ({ score }: { score: number }) => (
  <div className="flex items-center gap-3 mb-4">
    <button className="w-8 h-8 flex items-center justify-center rounded border border-[#e5e5e5] text-[#ccc] cursor-not-allowed">
      <ChevronUp className="w-4 h-4" />
    </button>
    <span className="text-lg font-semibold text-[#1a1a1a] tabular-nums">
      {score}
    </span>
    <button className="w-8 h-8 flex items-center justify-center rounded border border-[#e5e5e5] text-[#ccc] cursor-not-allowed">
      <ChevronDown className="w-4 h-4" />
    </button>
  </div>
);

const QuestionDetail = ({ question, answers }: { question: QuestionData; answers: AnswerData[] }) => {
  return (
    <div className="py-4 px-4 md:py-6 md:px-6">
      {/* Title */}
      <h1 className="text-xl md:text-2xl font-normal text-[#1a1a1a] leading-tight mb-4">
        {question.title}
      </h1>

      {/* Metadata */}
      <div className="flex items-center gap-4 text-sm text-[#999] mb-6 pb-6 border-b border-[#e5e5e5]">
        <span>
          Asked <span className="text-[#555]">{timeAgo(question.created_at)}</span>
        </span>
      </div>

      {/* Question Body — desktop */}
      <div className="hidden md:flex gap-6 pb-8 border-b border-[#e5e5e5]">
        <VotingWidget score={question.score} />
        <div className="flex-1 min-w-0">
          <ContentRenderer content={question.body} />
          <AttachmentDisplay attachments={question.attachments} />
          <div className="flex items-end justify-between mt-8">
            <span className="px-2 py-0.5 rounded bg-[#fdf0e6] text-[#b85a00] text-[11px]">
              {question.forum_name}
            </span>
            <div className="inline-flex flex-col gap-2 p-3 rounded-lg bg-[#e8f0fe] border border-[#d3e2f7] min-w-[180px]">
              <span className="text-[10px] text-[#666]">
                asked {timeAgo(question.created_at)}
              </span>
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 flex-shrink-0">
                  <Avatar name={question.author_username} variant="bauhaus" size={32} colors={AVATAR_COLORS} />
                </div>
                <span className="text-sm font-medium text-[#f48024]">
                  {question.author_username}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Question Body — mobile */}
      <div className="md:hidden pb-6 border-b border-[#e5e5e5]">
        <MobileVotingWidget score={question.score} />
        <ContentRenderer content={question.body} />
        <AttachmentDisplay attachments={question.attachments} />
        <div className="flex flex-col gap-3 mt-6">
          <span className="px-2 py-0.5 rounded bg-[#fdf0e6] text-[#b85a00] text-[11px] self-start">
            {question.forum_name}
          </span>
          <div className="flex flex-col gap-2 p-3 rounded-lg bg-[#e8f0fe] border border-[#d3e2f7]">
            <span className="text-[10px] text-[#666]">
              asked {timeAgo(question.created_at)}
            </span>
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 flex-shrink-0">
                <Avatar name={question.author_username} variant="beam" size={32} colors={AVATAR_COLORS} />
              </div>
              <span className="text-sm font-medium text-[#f48024]">
                {question.author_username}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Answers Section */}
      {answers.length > 0 && (
        <div className="mt-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-normal text-[#1a1a1a]">
              {answers.length} Answer{answers.length !== 1 ? 's' : ''}
            </h2>
          </div>

          <div className="divide-y divide-[#e5e5e5]">
            {answers.map((answer) => (
              <AnswerItem key={answer.id} answer={answer} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

const AnswerItem = ({ answer }: { answer: AnswerData }) => {
  return (
    <>
      {/* Desktop answer */}
      <div className="hidden md:flex gap-6 py-6">
        <VotingWidget score={answer.score} />
        <div className="flex-1 min-w-0">
          <ContentRenderer content={answer.body} />
          <AttachmentDisplay attachments={answer.attachments} />
          <div className="flex justify-end mt-6">
            <div className="inline-flex flex-col gap-2 p-3 rounded-lg bg-[#fafafa] border border-[#e5e5e5] min-w-[180px]">
              <span className="text-[10px] text-[#999]">
                answered {timeAgo(answer.created_at)}
              </span>
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 flex-shrink-0">
                  <Avatar name={answer.author_username} variant="bauhaus" size={32} colors={AVATAR_COLORS} />
                </div>
                <span className="text-sm font-medium text-[#f48024]">
                  {answer.author_username}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Mobile answer */}
      <div className="md:hidden py-5">
        <MobileVotingWidget score={answer.score} />
        <ContentRenderer content={answer.body} />
        <AttachmentDisplay attachments={answer.attachments} />
        <div className="mt-5">
          <div className="flex flex-col gap-2 p-3 rounded-lg bg-[#fafafa] border border-[#e5e5e5]">
            <span className="text-[10px] text-[#999]">
              answered {timeAgo(answer.created_at)}
            </span>
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 flex-shrink-0">
                <Avatar name={answer.author_username} variant="beam" size={32} colors={AVATAR_COLORS} />
              </div>
              <span className="text-sm font-medium text-[#f48024]">
                {answer.author_username}
              </span>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default QuestionDetail;
