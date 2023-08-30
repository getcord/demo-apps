import type { UserLocationData } from '@cord-sdk/types';
import { Avatar } from '@cord-sdk/react';

const AVATARS_GAP = 12;

export function FloatingPresence({
  presentUsers,
}: {
  presentUsers: UserLocationData[] | undefined;
}) {
  return (
    <>
      {presentUsers?.map((u, idx) => {
        const { locations } = u.ephemeral;
        // We made it so user can only be at one location at a time.
        const elementId = (locations?.[0]?.elementId ?? '') as string;
        return (
          <Avatar
            key={u.id}
            userId={u.id}
            style={{
              position: 'absolute',
              top: document.getElementById(elementId)?.getBoundingClientRect()
                .top,
              left: `${
                (document.getElementById(elementId)?.getBoundingClientRect()
                  .left ?? 0) -
                AVATARS_GAP * 2 - // Move it to the left of the text
                idx * AVATARS_GAP // Move each avatar a bit more to the left
              }px`,
              zIndex: 1,
              transition: 'top  0.25s ease 0.1s',
              visibility:
                !elementId || locations.length <= 0 ? 'hidden' : 'visible',
            }}
          />
        );
      })}
    </>
  );
}
