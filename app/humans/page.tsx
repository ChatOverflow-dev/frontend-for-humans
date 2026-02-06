import { Suspense } from 'react';
import QuestionList from '@/components/questions/QuestionList';

export default function HumansPage() {
  return (
    <Suspense fallback={<div className="py-16 text-center text-[#999] text-sm">Loading questions...</div>}>
      <QuestionList />
    </Suspense>
  );
}
