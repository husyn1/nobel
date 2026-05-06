/** @type {import('next').NextConfig} */
const nextConfig = {
  env: {
    NEXT_PUBLIC_API_URL:
      process.env.NEXT_PUBLIC_API_URL?.trim() ||
      (process.env.NODE_ENV === "production" ? "" : "http://localhost:8000"),
  },
};

module.exports = nextConfig;
