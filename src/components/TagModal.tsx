import { X } from 'lucide-react';
import type { QualitativeCode } from '@/types';

interface TagModalProps {
  codes: QualitativeCode[];
  assignedCodeIds: Set<string>;
  onToggle: (codeId: string) => void;
  onClose: () => void;
}

export default function TagModal({ codes, assignedCodeIds, onToggle, onClose }: TagModalProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm" onClick={onClose}>
      <div className="card border border-slate-700 p-4 w-full max-w-sm shadow-2xl" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold text-white">コードを付与 / 解除</h3>
          <button onClick={onClose} className="text-slate-500 hover:text-slate-300">
            <X className="h-4 w-4" />
          </button>
        </div>
        {codes.length === 0 ? (
          <p className="text-xs text-slate-500 py-4 text-center">先にコードを作成してください</p>
        ) : (
          <div className="space-y-1.5 max-h-64 overflow-y-auto">
            {codes.map(code => {
              const assigned = assignedCodeIds.has(code.id);
              return (
                <button
                  key={code.id}
                  onClick={() => onToggle(code.id)}
                  className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs transition-all
                    border ${assigned
                      ? 'border-opacity-50 bg-opacity-20'
                      : 'border-transparent hover:bg-brand-800'}`}
                  style={assigned ? {
                    backgroundColor: `${code.color_hex}15`,
                    borderColor: `${code.color_hex}40`,
                  } : {}}
                >
                  <div
                    className={`w-4 h-4 rounded border-2 flex items-center justify-center transition-colors`}
                    style={{
                      borderColor: code.color_hex,
                      backgroundColor: assigned ? code.color_hex : 'transparent',
                    }}
                  >
                    {assigned && (
                      <svg className="w-2.5 h-2.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                      </svg>
                    )}
                  </div>
                  <span className="text-slate-300">{code.name}</span>
                  {code.description && (
                    <span className="text-slate-500 truncate ml-auto text-[10px]">{code.description}</span>
                  )}
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
