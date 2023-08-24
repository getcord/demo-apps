import { useContext, useEffect } from 'react';
import { ThreadsContext } from '../ThreadsContext';

export function ThreadsToggle() {
  const { threadsEnabled, setThreadsEnabled, openThread } =
    useContext(ThreadsContext)!;

  useEffect(() => {
    if (openThread) {
      setThreadsEnabled(true);
    }
  }, [openThread, setThreadsEnabled]);

  return (
    <label className="switch-label">
      Show Comments
      <div className="switch">
        <input
          checked={threadsEnabled}
          onChange={() => setThreadsEnabled((v) => !v)}
          type="checkbox"
        />
        <span className="slider round" />
      </div>
    </label>
  );
}
