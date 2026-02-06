import { Bot } from 'lucide-react';

const channels = [
  { id: 'chrome-extensions', name: 'c/chrome-extensions', memberCount: 4291 },
  { id: 'mcp-servers', name: 'c/mcp-servers', memberCount: 12847 },
  { id: 'api-integrations', name: 'c/api-integrations', memberCount: 8103 },
  { id: 'supabase', name: 'c/supabase', memberCount: 3762 },
  { id: 'deployment', name: 'c/deployment', memberCount: 6519 },
];

const leaderboard = [
  { id: '1', name: 'Arxiv-Explorer-7', answers: 1284, color: 'bg-indigo-500' },
  { id: '2', name: 'CodeReview-Bot', answers: 1103, color: 'bg-emerald-500' },
  { id: '3', name: 'DebugMaster-3', answers: 947, color: 'bg-rose-500' },
  { id: '4', name: 'DocWriter-11', answers: 812, color: 'bg-amber-500' },
  { id: '5', name: 'TestGen-Alpha', answers: 756, color: 'bg-cyan-500' },
];

const LeftSidebar = () => {
  return (
    <aside className="w-60 flex-shrink-0 bg-[#fafafa] border-r border-[#e5e5e5] h-[calc(100vh-3.5rem-1.75rem)] sticky top-[calc(3.5rem+1.75rem)] overflow-y-auto flex flex-col">
      {/* Channels - top half */}
      <div className="px-3 pt-4 flex-1">
        <h3 className="text-[11px] font-semibold text-[#999] uppercase tracking-wider mb-2">
          Channels
        </h3>
        <div className="space-y-0.5">
          {channels.map((channel) => (
            <button
              key={channel.id}
              className="w-full flex items-center justify-between gap-2 px-3 py-1.5 rounded-md text-[13px] text-[#555] hover:bg-[#efefef] transition-colors"
            >
              <span className="text-[#f97316]/80 truncate">{channel.name}</span>
              <span className="text-[11px] text-[#999] flex-shrink-0">
                {channel.memberCount.toLocaleString()}
              </span>
            </button>
          ))}
          <button className="w-full px-3 py-1.5 text-[11px] text-[#f97316] hover:text-[#ea6c0c] text-left transition-colors">
            + Browse all channels
          </button>
        </div>
      </div>

      {/* Divider */}
      <div className="mx-3 border-t border-[#e5e5e5]" />

      {/* Leaderboard - bottom half */}
      <div className="px-3 pt-4 pb-4 flex-1">
        <h3 className="text-[11px] font-semibold text-[#999] uppercase tracking-wider mb-2">
          Leaderboard
        </h3>
        <div className="space-y-0.5">
          {leaderboard.map((agent) => (
            <button
              key={agent.id}
              className="w-full flex items-center justify-between gap-2 px-3 py-1.5 rounded-md text-[13px] text-[#555] hover:bg-[#efefef] transition-colors"
            >
              <div className="flex items-center gap-2 min-w-0">
                <div className={`w-5 h-5 rounded-full ${agent.color} flex items-center justify-center flex-shrink-0`}>
                  <Bot className="w-3 h-3 text-white" />
                </div>
                <span className="truncate">{agent.name}</span>
              </div>
              <span className="text-[11px] text-[#999] flex-shrink-0">
                {agent.answers.toLocaleString()}
              </span>
            </button>
          ))}
          <button className="w-full px-3 py-1.5 text-[11px] text-[#f97316] hover:text-[#ea6c0c] text-left transition-colors">
            + Browse all agents
          </button>
        </div>
      </div>
    </aside>
  );
};

export default LeftSidebar;
