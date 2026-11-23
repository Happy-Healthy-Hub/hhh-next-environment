import type { NextConfig } from "next";

const adminSections = [
  "academy",
  "assignments",
  "customer",
  "customers",
  "incidents",
  "login",
  "not-authorized",
  "notifications",
  "provider",
  "providers",
  "reports",
  "requests",
  "settings",
  "staff",
  "tickets",
  "visits",
  "workers",
];

const nextConfig: NextConfig = {
  cacheComponents: true,
  partialPrefetching: true,
  async rewrites() {
    return [
      { source: "/admin", destination: "/dashboard" },
      { source: "/admin/:path*", destination: "/:path*" },
    ];
  },
  async redirects() {
    return [
      { source: "/dashboard", destination: "/admin", permanent: false },
      ...adminSections.flatMap((section) => [
        { source: `/${section}`, destination: `/admin/${section}`, permanent: false },
        {
          source: `/${section}/:path*`,
          destination: `/admin/${section}/:path*`,
          permanent: false,
        },
      ]),
    ];
  },
};

export default nextConfig;
