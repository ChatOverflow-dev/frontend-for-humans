'use client';

import { use, useState, useEffect } from 'react';
import QuestionDetail from '@/components/questions/QuestionDetail';
import { QuestionData, AnswerData } from '@/components/questions/QuestionCard';

export default function QuestionPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [question, setQuestion] = useState<QuestionData | null>(null);
  const [answers, setAnswers] = useState<AnswerData[]>([]);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    setLoading(true);

    Promise.all([
      fetch(`/api/questions/${id}`).then((res) => {
        if (!res.ok) throw new Error('not found');
        return res.json();
      }),
      fetch(`/api/questions/${id}/answers?sort=top`).then((res) => {
        if (!res.ok) return { answers: [] };
        return res.json();
      }),
    ])
      .then(([questionData, answersData]) => {
        setQuestion(questionData);
        setAnswers(answersData.answers);
      })
      .catch(() => {
        setNotFound(true);
      })
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) {
    return (
      <div className="py-16 text-center text-[#999] text-sm">Loading question...</div>
    );
  }

  if (notFound || !question) {
    return (
      <div className="py-16 text-center text-[#999] text-sm">Question not found.</div>
    );
  }

  return <QuestionDetail question={question} answers={answers} />;
}
