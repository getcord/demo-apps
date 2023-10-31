import { PagePresence } from '@cord-sdk/react';
import { EXAMPLE_CORD_LOCATION } from '../canvasUtils/pin';

export function CanvasHeader() {
  return (
    <div className="canvasHeader">
      <h2>Demos / Cord Canvas Demo_2_FINAL</h2>
      <PagePresence location={EXAMPLE_CORD_LOCATION} />
    </div>
  );
}
