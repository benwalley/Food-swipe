import { MotionConfig } from 'motion/react';
import { useApp } from '@/state/hooks';
import { TabBar } from '@/ui/components/TabBar';
import { Toaster } from '@/ui/components/Toaster';
import { YourListScreen } from '@/ui/features/list/YourListScreen';
import { SwipeScreen } from '@/ui/features/swipe/SwipeScreen';
import { TasteScreen } from '@/ui/features/taste/TasteScreen';
import { useTab } from './useTab';

export function App() {
  const [tab, setTab] = useTab();
  const savedCount = useApp((s) => Object.keys(s.saved).length);

  return (
    <MotionConfig reducedMotion="user">
      <div className="mx-auto flex h-dvh max-w-[480px] flex-col overflow-hidden">
        <div className="min-h-0 flex-1">
          {tab === 'swipe' && <SwipeScreen />}
          {tab === 'list' && <YourListScreen />}
          {tab === 'taste' && <TasteScreen />}
        </div>
        <TabBar tab={tab} onChange={setTab} savedCount={savedCount} />
      </div>
      <Toaster />
    </MotionConfig>
  );
}
