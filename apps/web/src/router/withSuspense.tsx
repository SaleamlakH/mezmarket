import { Suspense } from 'react';
import type { ComponentType } from 'react';
import { LoadingState } from '@/components/LoadingState';

export function withSuspense<P extends object>(Component: ComponentType<P>) {
  return function SuspendedComponent(props: P) {
    return (
      <Suspense fallback={<LoadingState label="Loading..." />}>
        <Component {...props} />
      </Suspense>
    );
  };
}
