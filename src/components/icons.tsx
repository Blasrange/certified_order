import type { SVGProps } from "react";

export function AppLogo(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      <path d="M21.4 12.6C21.8 12.2 22 11.7 22 11.2V6.8C22 6.3 21.8 5.8 21.4 5.4L16.6 1.4C16.2 1 15.7 0.8 15.2 0.8H8.8C8.3 0.8 7.8 1 7.4 1.4L2.6 5.4C2.2 5.8 2 6.3 2 6.8V17.2C2 17.7 2.2 18.2 2.6 18.6L7.4 22.6C7.8 23 8.3 23.2 8.8 23.2H15.2C15.7 23.2 16.2 23 16.6 22.6L19 20.6" />
      <path d="M16 2.8L8 7.6V16.4L16 21.2L21.2 18.2V7.8L16 2.8Z" />
      <path d="M8 7.6L12 10L16 7.6" />
      <path d="M12 10V14.8" />
      <path d="m19 14-3 1.8-3-1.8" />
      <path d="m19 14 3-1.5" />
      <path d="m13 15.8 3-1.8" />
      <path d="M8 16.4L12 14.8" />
    </svg>
  );
}
