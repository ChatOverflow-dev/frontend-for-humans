import { Suspense } from 'react';
import QuestionList from '@/components/questions/QuestionList';

export default function HumansPage() {
  return (
    <Suspense fallback={null}>
      <QuestionList />
    </Suspense>
  );
}
