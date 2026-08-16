import { Question } from '../types';
import { motion } from 'framer-motion';

interface QuizCardProps {
  question: Question;
  answer: string;
  showResult: boolean;
  onAnswer: (ans: string) => void;
}

export default function QuizCard({ question: q, answer, showResult, onAnswer }: QuizCardProps) {
  const getImpStyles = (imp?: string) => {
    if (!imp) return { bg: 'bg-gray-50', text: 'text-gray-400', label: '基础演练' };
    if (imp.includes('必考')) return { bg: 'bg-red-50 border border-red-200', text: 'text-red-500', label: '🔴 核心必考' };
    if (imp.includes('重点')) return { bg: 'bg-amber-50 border border-amber-200', text: 'text-amber-600', label: '🟡 冲刺重点' };
    return { bg: 'bg-blue-50', text: 'text-blue-500', label: '🔵 高频考点' };
  };
  const currentImp = getImpStyles(q.importance);

  return (
    <div className="bg-white rounded-[26px] p-5 border border-orange-50/60 shadow-[0_10px_25px_-5px_rgba(249,115,22,0.04)] space-y-4">
      <div className="flex justify-between items-center">
        <span className="text-[10px] font-black uppercase tracking-wider bg-orange-100 text-orange-700 px-2.5 py-0.5 rounded-md">
          {q.type === 'choice' ? '单项选择' : q.type === 'judge' ? '概念判断' : '深度叙述'}
        </span>
        <span className={'text-[9px] font-black px-2 py-0.5 rounded-md ' + currentImp.bg + ' ' + currentImp.text}>{currentImp.label}</span>
      </div>
      <h2 className="font-extrabold text-base text-gray-800 leading-relaxed pt-1">{q.question}</h2>
      {(q.type === 'choice' || q.type === 'judge') && q.options && (
        <div className="space-y-2 pt-2">
          {q.options.map((opt) => {
            const isSelected = answer === opt;
            const isCorrect = opt === q.answer;
            let borderCls = 'border-gray-100 bg-gray-50/50 text-gray-700';
            if (showResult) {
              if (isCorrect) borderCls = 'border-green-500 bg-green-50 text-green-700 font-black shadow-sm shadow-green-200';
              else if (isSelected) borderCls = 'border-red-400 bg-red-50 text-red-700 font-black shadow-sm shadow-red-200';
            } else if (isSelected) {
              borderCls = 'border-orange-500 bg-orange-50/60 text-orange-700 font-black';
            }
            return (
              <motion.button key={opt} whileTap={{ scale: 0.99 }}
                className={'w-full text-left p-3.5 rounded-2xl border-2 text-xs font-bold flex justify-between items-center transition-all ' + borderCls}
                onClick={() => !showResult && onAnswer(opt)} disabled={showResult}>
                <span>{opt}</span>
                {showResult && isCorrect && <span className="text-[10px] font-black text-green-600">{'✓ 正确解'}</span>}
                {showResult && isSelected && !isCorrect && <span className="text-[10px] font-black text-red-500">{'✕ 错选'}</span>}
              </motion.button>
            );
          })}
        </div>
      )}
      {(q.type === 'short' || q.type === 'essay') && !showResult && (
        <div className="space-y-3 pt-2">
          <textarea value={answer} onChange={e => onAnswer(e.target.value)}
            placeholder={q.type === 'essay' ? '请在此层理清论证逻辑，写下你的核心得分要点...' : '请输入作答内容...'}
            rows={4} className="w-full p-4 border border-orange-100 rounded-2xl text-xs font-medium bg-gray-50/40 focus:bg-white focus:outline-none focus:border-orange-400 transition-all resize-none" />
          <button className="btn-3d-orange w-full py-2.5 rounded-xl text-xs" onClick={() => onAnswer(answer)}>{'提交本题答案'}</button>
        </div>
      )}
      {showResult && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
          className={'rounded-2xl p-4 border text-xs leading-relaxed space-y-1.5 ' + (answer === q.answer ? 'bg-green-50/40 border-green-100' : 'bg-red-50/40 border-red-100')}>
          <div className={'font-black ' + (answer === q.answer ? 'text-green-600' : 'text-red-500')}>
            {answer === q.answer ? '✅ 精准契合！回答正确' : '❌ 回答错误，官方建议标准答案：' + q.answer}
          </div>
          <p className="font-bold text-gray-500 pt-1">{'💡 考点穿透核心解析：'}</p>
          <p className="font-medium text-gray-400">{q.explanation}</p>
        </motion.div>
      )}
    </div>
  );
}

interface QuizNavProps { index: number; total: number; title: string; onBack: () => void; }
export function QuizHeader({ index, total, title, onBack }: QuizNavProps) {
  return (
    <header className="flex items-center gap-3 px-4 pt-4">
      <button className="text-xl font-light text-gray-400 hover:text-orange-500" onClick={onBack}>{'←'}</button>
      <h1 className="text-lg font-[900] text-gray-800 flex-1">{title}</h1>
      <p className="text-xs font-bold text-gray-400">{index + 1} / {total}</p>
    </header>
  );
}
