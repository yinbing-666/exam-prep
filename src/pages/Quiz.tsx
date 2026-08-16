import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { storage } from '../utils/storage';

interface QuizQuestion {
  id: string;
  question: string;
  options: string[];
  correctAnswer: number;
  explanation?: string;
  subject?: string;
  chapter?: string;
}

const Quiz: React.FC = () => {
  const navigate = useNavigate();
  const [questions, setQuestions] = useState<QuizQuestion[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const [showResult, setShowResult] = useState(false);
  const [score, setScore] = useState(0);
  const [isFinished, setIsFinished] = useState(false);

  useEffect(() => {
    // 生成模拟题目
    const config = storage.get<any>('study_config', { subject: '数学', count: 10 });
    const mockQuestions: QuizQuestion[] = Array.from({ length: config.count }, (_, i) => ({
      id: `q_${i}`,
      question: `${config.subject} 第${i + 1}题：这是一道示例题目，考察相关知识点的理解和应用。`,
      options: ['选项 A', '选项 B', '选项 C', '选项 D'],
      correctAnswer: Math.floor(Math.random() * 4),
      explanation: '这是一道示例题目，实际使用时会从题库中加载真实题目。',
      subject: config.subject,
    }));
    setQuestions(mockQuestions);
  }, []);

  const handleAnswer = (index: number) => {
    if (showResult) return;
    setSelectedAnswer(index);
    setShowResult(true);
    
    if (index === questions[currentIndex].correctAnswer) {
      setScore(score + 1);
    }
  };

  const handleNext = () => {
    if (currentIndex < questions.length - 1) {
      setCurrentIndex(currentIndex + 1);
      setSelectedAnswer(null);
      setShowResult(false);
    } else {
      setIsFinished(true);
      // 保存学习记录
      storage.addStudyRecord({
        date: new Date().toISOString(),
        subject: questions[0]?.subject || '未知',
        totalQuestions: questions.length,
        correctCount: score,
        timeSpent: 0,
      });
    }
  };

  const handleRestart = () => {
    setCurrentIndex(0);
    setSelectedAnswer(null);
    setShowResult(false);
    setScore(0);
    setIsFinished(false);
  };

  if (questions.length === 0) {
    return (
      <div style={{
        minHeight: '100vh',
        background: '#faf8f5',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Noto Sans SC", sans-serif',
      }}>
        <div style={{ color: '#8b8580' }}>加载中...</div>
      </div>
    );
  }

  if (isFinished) {
    return (
      <div style={{
        minHeight: '100vh',
        background: '#faf8f5',
        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Noto Sans SC", sans-serif',
        WebkitFontSmoothing: 'antialiased',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 20,
      }}>
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5 }}
          style={{
            background: '#ffffff',
            borderRadius: 16,
            border: '1px solid #e8e2db',
            padding: 32,
            textAlign: 'center',
            maxWidth: 400,
            width: '100%',
          }}
        >
          <div style={{
            width: 80,
            height: 80,
            background: score >= questions.length * 0.8 
              ? 'linear-gradient(135deg, #22c55e 0%, #16a34a 100%)'
              : score >= questions.length * 0.6
                ? 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)'
                : 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
            borderRadius: '50%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '2.5rem',
            margin: '0 auto 20px',
          }}>
            {score >= questions.length * 0.8 ? '🎉' : score >= questions.length * 0.6 ? '👍' : '💪'}
          </div>
          
          <h2 style={{
            fontSize: '1.3rem',
            fontWeight: 700,
            color: '#2d2d2d',
            margin: '0 0 8px',
          }}>
            完成！
          </h2>
          
          <div style={{
            fontSize: '2.5rem',
            fontWeight: 700,
            color: '#d97706',
            margin: '8px 0',
          }}>
            {score}/{questions.length}
          </div>
          
          <div style={{
            fontSize: '0.85rem',
            color: '#8b8580',
            marginBottom: 24,
          }}>
            正确率 {Math.round(score / questions.length * 100)}%
          </div>
          
          <div style={{ display: 'flex', gap: 12 }}>
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={handleRestart}
              style={{
                flex: 1,
                background: '#ffffff',
                color: '#d97706',
                border: '1px solid #d97706',
                borderRadius: 10,
                padding: '12px',
                fontSize: '0.9rem',
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              再来一轮
            </motion.button>
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => navigate('/')}
              style={{
                flex: 1,
                background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
                color: '#ffffff',
                border: 'none',
                borderRadius: 10,
                padding: '12px',
                fontSize: '0.9rem',
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              返回首页
            </motion.button>
          </div>
        </motion.div>
      </div>
    );
  }

  const currentQuestion = questions[currentIndex];
  const progress = ((currentIndex + 1) / questions.length) * 100;

  return (
    <div style={{
      minHeight: '100vh',
      background: '#faf8f5',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Noto Sans SC", sans-serif',
      WebkitFontSmoothing: 'antialiased',
      paddingBottom: 80,
    }}>
      {/* 顶部进度 */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        style={{
          padding: '16px 20px',
          background: '#ffffff',
          borderBottom: '1px solid #e8e2db',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
          <span style={{ fontSize: '0.85rem', color: '#8b8580' }}>
            {currentIndex + 1} / {questions.length}
          </span>
          <span style={{ fontSize: '0.85rem', color: '#d97706', fontWeight: 600 }}>
            得分: {score}
          </span>
        </div>
        <div style={{
          height: 4,
          background: '#f5f0eb',
          borderRadius: 2,
          overflow: 'hidden',
        }}>
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${progress}%` }}
            transition={{ duration: 0.3 }}
            style={{
              height: '100%',
              background: 'linear-gradient(90deg, #f59e0b 0%, #d97706 100%)',
              borderRadius: 2,
            }}
          />
        </div>
      </motion.div>

      {/* 题目卡片 */}
      <motion.div
        key={currentIndex}
        initial={{ opacity: 0, x: 50 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: -50 }}
        transition={{ duration: 0.3 }}
        style={{ padding: '20px' }}
      >
        <div style={{
          background: '#ffffff',
          borderRadius: 12,
          border: '1px solid #e8e2db',
          padding: 24,
          marginBottom: 16,
        }}>
          <div style={{
            fontSize: '1rem',
            fontWeight: 600,
            color: '#2d2d2d',
            lineHeight: 1.6,
            marginBottom: 20,
          }}>
            {currentQuestion.question}
          </div>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {currentQuestion.options.map((option, index) => {
              const isSelected = selectedAnswer === index;
              const isCorrect = index === currentQuestion.correctAnswer;
              const showCorrect = showResult && isCorrect;
              const showWrong = showResult && isSelected && !isCorrect;
              
              return (
                <motion.button
                  key={index}
                  whileHover={!showResult ? { scale: 1.01, x: 4 } : {}}
                  whileTap={!showResult ? { scale: 0.99 } : {}}
                  onClick={() => handleAnswer(index)}
                  disabled={showResult}
                  style={{
                    background: showCorrect 
                      ? '#f0fdf4' 
                      : showWrong 
                        ? '#fef2f2' 
                        : isSelected 
                          ? '#fef3c7' 
                          : '#faf8f5',
                    border: `1px solid ${showCorrect 
                      ? '#22c55e' 
                      : showWrong 
                        ? '#ef4444' 
                        : isSelected 
                          ? '#d97706' 
                          : '#e8e2db'}`,
                    borderRadius: 10,
                    padding: '14px 16px',
                    fontSize: '0.9rem',
                    color: '#2d2d2d',
                    cursor: showResult ? 'default' : 'pointer',
                    textAlign: 'left',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 12,
                    transition: 'all 0.2s ease',
                  }}
                >
                  <span style={{
                    width: 28,
                    height: 28,
                    borderRadius: '50%',
                    background: showCorrect 
                      ? '#22c55e' 
                      : showWrong 
                        ? '#ef4444' 
                        : isSelected 
                          ? '#d97706' 
                          : '#e8e2db',
                    color: (showCorrect || showWrong || isSelected) ? '#ffffff' : '#8b8580',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '0.8rem',
                    fontWeight: 600,
                    flexShrink: 0,
                  }}>
                    {String.fromCharCode(65 + index)}
                  </span>
                  <span>{option}</span>
                </motion.button>
              );
            })}
          </div>
        </div>

        {/* 解析 */}
        <AnimatePresence>
          {showResult && currentQuestion.explanation && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              style={{
                background: '#fef3c7',
                borderRadius: 12,
                border: '1px solid #fde68a',
                padding: 16,
                marginBottom: 16,
              }}
            >
              <div style={{
                fontSize: '0.85rem',
                fontWeight: 600,
                color: '#92400e',
                marginBottom: 8,
              }}>
                💡 解析
              </div>
              <div style={{
                fontSize: '0.85rem',
                color: '#92400e',
                lineHeight: 1.6,
              }}>
                {currentQuestion.explanation}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* 下一题按钮 */}
        {showResult && (
          <motion.button
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            whileHover={{ scale: 1.02, y: -2 }}
            whileTap={{ scale: 0.98 }}
            onClick={handleNext}
            style={{
              width: '100%',
              background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
              color: '#ffffff',
              border: 'none',
              borderRadius: 12,
              padding: '14px',
              fontSize: '0.95rem',
              fontWeight: 600,
              cursor: 'pointer',
              boxShadow: '0 4px 12px rgba(217, 119, 6, 0.3)',
            }}
          >
            {currentIndex < questions.length - 1 ? '下一题' : '查看结果'}
          </motion.button>
        )}
      </motion.div>

      {/* 底部 Tab 栏 */}
      <div style={{
        position: 'fixed',
        bottom: 0,
        left: 0,
        right: 0,
        background: '#ffffff',
        borderTop: '1px solid #e8e2db',
        display: 'flex',
        justifyContent: 'space-around',
        padding: '8px 0',
        paddingBottom: 'max(8px, env(safe-area-inset-bottom))',
        zIndex: 100,
      }}>
        {[
          { icon: '🏠', label: '首页', path: '/' },
          { icon: '📝', label: '刷题', path: '/study' },
          { icon: '🔄', label: '复习', path: '/review' },
          { icon: '📊', label: '统计', path: '/stats' },
          { icon: '👤', label: '我的', path: '/profile' },
        ].map((tab) => {
          const isActive = location.pathname === tab.path;
          return (
            <motion.div
              key={tab.label}
              whileTap={{ scale: 0.9 }}
              onClick={() => navigate(tab.path)}
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: 2,
                padding: '4px 12px',
                cursor: 'pointer',
              }}
            >
              <span style={{ 
                fontSize: '1.2rem',
                opacity: isActive ? 1 : 0.6,
              }}>
                {tab.icon}
              </span>
              <span style={{
                fontSize: '0.65rem',
                fontWeight: isActive ? 600 : 400,
                color: isActive ? '#d97706' : '#8b8580',
              }}>
                {tab.label}
              </span>
              {isActive && (
                <motion.div
                  layoutId="tab-indicator"
                  style={{
                    width: 16,
                    height: 2,
                    background: '#d97706',
                    borderRadius: 1,
                    marginTop: -2,
                  }}
                />
              )}
            </motion.div>
          );
        })}
      </div>
    </div>
  );
};

export default Quiz;
