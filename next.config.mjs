/** @type {import('next').NextConfig} */
const nextConfig = {
  output: "standalone",
  async redirects() {
    return [
      {
        source: "/dashboard",
        destination: "/admin",
        permanent: false,
      },
      {
        source: "/dashboard/:path*",
        destination: "/admin/:path*",
        permanent: false,
      },
      {
        source: "/hr/leave-requests/:id",
        destination: "/admin/hr/leave-requests?id=:id",
        permanent: false,
      },
      {
        source: "/hr/:path*",
        destination: "/admin/hr/:path*",
        permanent: false,
      },
      {
        source: "/fleet/:path*",
        destination: "/admin/fleet/:path*",
        permanent: false,
      },
      {
        source: "/maintenance/:path*",
        destination: "/admin/maintenance/:path*",
        permanent: false,
      },
      {
        source: "/chefz/:path*",
        destination: "/admin/chefz/:path*",
        permanent: false,
      },
    ];
  },
};

export default nextConfig;
