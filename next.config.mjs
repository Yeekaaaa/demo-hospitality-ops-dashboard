/** @type {import('next').NextConfig} */
const nextConfig = {
  typedRoutes: true,
  async redirects() {
    return [{ source: "/overview", destination: "/dashboard", permanent: true }];
  }
};

export default nextConfig;
