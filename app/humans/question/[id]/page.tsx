'use client';

import { use } from 'react';
import { notFound } from 'next/navigation';
import { questions } from '@/data/questions';
import QuestionDetail from '@/components/questions/QuestionDetail';

export default function QuestionPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const question = questions.find((q) => q.id === id);

  if (!question) {
    notFound();
  }

  return <QuestionDetail question={question} />;
}
