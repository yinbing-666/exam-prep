// 本地存储工具
export const storage = {
  // 获取存储值
  get<T>(key: string, defaultValue: T): T {
    try {
      const value = localStorage.getItem(key);
      if (value === null) return defaultValue;
      return JSON.parse(value);
    } catch {
      return defaultValue;
    }
  },

  // 设置存储值
  set(key: string, value: any): void {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch (error) {
      console.error('Failed to save to localStorage:', error);
    }
  },

  // 删除存储值
  remove(key: string): void {
    localStorage.removeItem(key);
  },

  // 清空所有存储
  clear(): void {
    localStorage.clear();
  },

  // 获取学习记录
  getStudyRecords(): Array<{
    date: string;
    subject: string;
    totalQuestions: number;
    correctCount: number;
    timeSpent: number;
    correct?: boolean;
  }> {
    return this.get('study_records', []);
  },

  // 添加学习记录
  addStudyRecord(record: {
    date: string;
    subject: string;
    totalQuestions: number;
    correctCount: number;
    timeSpent: number;
  }): void {
    const records = this.getStudyRecords();
    records.push({
      ...record,
      correct: record.correctCount > record.totalQuestions / 2,
    });
    this.set('study_records', records);
  },

  // 获取科目进度
  getSubjectProgress(subject: string): {
    totalQuestions: number;
    correctCount: number;
    masteredCount: number;
  } {
    const records = this.getStudyRecords();
    const subjectRecords = records.filter(r => r.subject === subject);
    return {
      totalQuestions: subjectRecords.length,
      correctCount: subjectRecords.filter(r => r.correct).length,
      masteredCount: Math.floor(subjectRecords.filter(r => r.correct).length * 0.8),
    };
  },

  // 获取当前科目
  getCurrentSubject(): string {
    return this.get('current_subject', '数学');
  },

  // 设置当前科目
  setCurrentSubject(subject: string): void {
    this.set('current_subject', subject);
  },
};
