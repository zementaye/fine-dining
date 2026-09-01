import { ImageResponse } from "next/og";

// Next.js file-convention icon: auto-generates favicon.ico/png at build time —
// no external image asset needed. Simple brass "G" monogram on charcoal,
// matching the site's palette.
export const size = { width: 32, height: 32 };
export const contentType = "image/png";

export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#1b1917",
          color: "#a8823f",
          fontSize: 22,
          fontFamily: "Georgia, serif",
        }}
      >
        G
      </div>
    ),
    { ...size }
  );
}
