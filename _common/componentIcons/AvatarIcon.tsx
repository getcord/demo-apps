export function AvatarIcon({ darkMode }: { darkMode: boolean }) {
  return darkMode ? (
    <svg
      width="16"
      height="16"
      viewBox="0 0 16 16"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <g opacity="0.5" clipPath="url(#clip0_332_2342)">
        <path
          d="M2.64967 12.5142C4.28177 11.5917 6.12523 11.1083 8 11.1111C9.94444 11.1111 11.7699 11.6206 13.3503 12.5142M10.3333 6.44444C10.3333 7.06328 10.0875 7.65678 9.64992 8.09436C9.21233 8.53195 8.61884 8.77778 8 8.77778C7.38116 8.77778 6.78767 8.53195 6.35008 8.09436C5.9125 7.65678 5.66667 7.06328 5.66667 6.44444C5.66667 5.82561 5.9125 5.23211 6.35008 4.79453C6.78767 4.35694 7.38116 4.11111 8 4.11111C8.61884 4.11111 9.21233 4.35694 9.64992 4.79453C10.0875 5.23211 10.3333 5.82561 10.3333 6.44444ZM15 8C15 8.91925 14.8189 9.82951 14.4672 10.6788C14.1154 11.5281 13.5998 12.2997 12.9497 12.9497C12.2997 13.5998 11.5281 14.1154 10.6788 14.4672C9.82951 14.8189 8.91925 15 8 15C7.08075 15 6.1705 14.8189 5.32122 14.4672C4.47194 14.1154 3.70026 13.5998 3.05025 12.9497C2.40024 12.2997 1.88463 11.5281 1.53284 10.6788C1.18106 9.82951 1 8.91925 1 8C1 6.14348 1.7375 4.36301 3.05025 3.05025C4.36301 1.7375 6.14348 1 8 1C9.85652 1 11.637 1.7375 12.9497 3.05025C14.2625 4.36301 15 6.14348 15 8Z"
          stroke="#F5F5F5"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </g>
      <defs>
        <clipPath id="clip0_332_2342">
          <rect width="16" height="16" fill="white" />
        </clipPath>
      </defs>
    </svg>
  ) : (
    <svg
      width="16"
      height="16"
      viewBox="0 0 16 16"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <g opacity="0.5" clipPath="url(#clip0_332_2313)">
        <path
          d="M2.64967 12.5142C4.28177 11.5917 6.12523 11.1083 8 11.1111C9.94444 11.1111 11.7699 11.6206 13.3503 12.5142M10.3333 6.44444C10.3333 7.06328 10.0875 7.65678 9.64992 8.09436C9.21233 8.53195 8.61884 8.77778 8 8.77778C7.38116 8.77778 6.78767 8.53195 6.35008 8.09436C5.9125 7.65678 5.66667 7.06328 5.66667 6.44444C5.66667 5.82561 5.9125 5.23211 6.35008 4.79453C6.78767 4.35694 7.38116 4.11111 8 4.11111C8.61884 4.11111 9.21233 4.35694 9.64992 4.79453C10.0875 5.23211 10.3333 5.82561 10.3333 6.44444ZM15 8C15 8.91925 14.8189 9.82951 14.4672 10.6788C14.1154 11.5281 13.5998 12.2997 12.9497 12.9497C12.2997 13.5998 11.5281 14.1154 10.6788 14.4672C9.82951 14.8189 8.91925 15 8 15C7.08075 15 6.1705 14.8189 5.32122 14.4672C4.47194 14.1154 3.70026 13.5998 3.05025 12.9497C2.40024 12.2997 1.88463 11.5281 1.53284 10.6788C1.18106 9.82951 1 8.91925 1 8C1 6.14348 1.7375 4.36301 3.05025 3.05025C4.36301 1.7375 6.14348 1 8 1C9.85652 1 11.637 1.7375 12.9497 3.05025C14.2625 4.36301 15 6.14348 15 8Z"
          stroke="#2E2E2E"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </g>
      <defs>
        <clipPath id="clip0_332_2313">
          <rect width="16" height="16" fill="white" />
        </clipPath>
      </defs>
    </svg>
  );
}