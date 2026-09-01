import { ImageResponse } from "next/og";
import { readFile } from "node:fs/promises";
import { join } from "node:path";

export const runtime = "nodejs";

export const ogImageSize = { width: 1200, height: 630 };
export const ogImageContentType = "image/png";
export const ogImageAlt = "Casa Herbert — Embelezamento e Saúde Capilar em Orlândia/SP";

export async function renderOgImage() {
  const [logoBuffer, playfairBold] = await Promise.all([
    readFile(join(process.cwd(), "public/logo.jpg")),
    readFile(join(process.cwd(), "src/app/fonts/PlayfairDisplay-Bold.woff")),
  ]);
  const logoSrc = `data:image/jpeg;base64,${logoBuffer.toString("base64")}`;

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "linear-gradient(135deg, #F7F3EA 0%, #E7E3D8 55%, #A3B89A 130%)",
          position: "relative",
        }}
      >
        <div
          style={{
            position: "absolute",
            top: 60,
            left: 60,
            right: 60,
            bottom: 60,
            border: "1px solid #CBB89A",
            borderRadius: 32,
            display: "flex",
          }}
        />

        <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
          {/* next/og renders this via satori, not the DOM — next/image and the alt
              a11y rule don't apply here, so both eslint rules are disabled below. */}
          {/* eslint-disable-next-line @next/next/no-img-element, jsx-a11y/alt-text */}
          <img
            src={logoSrc}
            alt=""
            width={148}
            height={148}
            style={{ borderRadius: "9999px", border: "5px solid #EF8523", objectFit: "cover" }}
          />

          <div
            style={{
              marginTop: 40,
              fontSize: 76,
              fontWeight: 700,
              fontFamily: "Playfair Display",
              color: "#BA681B",
              letterSpacing: -1,
              display: "flex",
            }}
          >
            Casa Herbert
          </div>

          <div
            style={{
              marginTop: 16,
              fontSize: 28,
              fontWeight: 600,
              letterSpacing: 6,
              textTransform: "uppercase",
              color: "#53735A",
              display: "flex",
            }}
          >
            Embelezamento &amp; Saúde Capilar
          </div>

          <div style={{ marginTop: 30, fontSize: 24, color: "#2E2E2E", opacity: 0.65, display: "flex" }}>
            Orlândia · SP
          </div>
        </div>
      </div>
    ),
    {
      ...ogImageSize,
      fonts: [{ name: "Playfair Display", data: playfairBold, weight: 700, style: "normal" }],
    }
  );
}
