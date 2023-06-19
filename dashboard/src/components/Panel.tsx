import type { PropsWithChildren } from 'react';

export function Panel(props: PropsWithChildren<{ title: string }>) {
  return (
    <div className="panel">
      <h2>{props.title}</h2>
      {props.children}
    </div>
  );
}
