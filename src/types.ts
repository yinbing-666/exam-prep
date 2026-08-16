
// 模拟考配置
export interface MockExamConfig {
  chapters: string[];          // 选中的章节
  questionTypes: {
    choice: number;            // 选择题数量
    judge: number;             // 判断题数量
    short: number;             // 简答题数量
    essay: number;             // 论述题数量
    programming: number;       // 程序题数量
  };
  scoring: {
    choice: number;            // 每题分值
    judge: number;
    short: number;
    essay: number;
    programming: number;       // 程序题分值
  };
  duration: number;            // 考试时长(分钟)
  referenceReal: boolean;      // 参考985/211真题
  customFocus: string;         // 自定义重点内容
}

// 资料
export interface Material {
  id: string;
  title: string;
  kind: 'pdf' | 'docx' | 'txt' | 'md' | 'pptx';
  content: string;
  charCount: number;
  createdAt: number;
  subject?: string;
}

// 每日计划
export interface DailyPlan {
  id: string;
  moduleId: string;
  moduleTitle: string;
  date: string;           // YYYY-MM-DD
  dayOrder: number;
  reason: string;
  status: 'pending' | 'done';
  createdAt: number;
  subject?: string;           // 所属科目
  // 反馈字段
  mastery?: 'red' | 'yellow' | 'green';  // 🔴没懂 🟡半懂 🟢懂了
  timeSpent?: number;                      // 实际用时(分钟)
  note?: string;                           // 笔记/难点
  completedAt?: number;                    // 完成时间戳
}

// 考试项目（每日计划用）
export interface ExamProject {
  subject: string;
  examDate: string;       // YYYY-MM-DD
  dailyMinutes: number;
  targetScore?: string;
}

export interface Question {
  id: string;
  type: 'choice' | 'judge' | 'short' | 'essay' | 'programming';
  question: string;
  options?: string[];
  answer: string;
  explanation: string;
  importance?: string;
  chapter: string;
  /** 知识点标签，由AI自动生成，每题1-3个 */
  knowledgeTags?: string[];
}

export interface StudySet {
  id: string;
  title: string;
  chapter: string;
  content: string;
  questions: Question[];
  createdAt: number;
  subject?: string;
}

export interface QuizResult {
  questionId: string;
  userAnswer: string;
  correct: boolean;
  answeredAt: number;
}

export interface WrongQuestion {
  questionId: string;
  question: Question;
  lastUserAnswer: string;
  wrongCount: number;
  lastWrongAt: number;
}

export interface KnowledgeModule {
  id: string;
  title: string;
  chapter: string;
  estimatedMinutes: number;
  difficulty: '低' | '中' | '高';
  importanceRank: number;
  examPoints: string;
  practice: string;
  mnemonic?: string;
  keyFormula?: string;
  visualHint?: string;
  diagram?: string;
  status: 'todo' | 'doing' | 'done';
  createdAt: number;
  subject?: string;
}

export interface LearnCard {
  id: string;
  moduleId: string;
  type: 'concept' | 'mistake' | 'exam' | 'quick_memory';
  front: string;
  back: string;
  importance?: number;
}

export interface MockExam {
  id: string;
  title: string;
  content: string;
  answerKey: string;
  duration: number;
  createdAt: number;
  subject?: string;
}

export interface MockAttempt {
  id: string;
  mockId: string;
  answers: string;
  feedback: string;
  score: string;
  createdAt: number;
}
