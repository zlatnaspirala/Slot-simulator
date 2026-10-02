import type { NextConfig } from "next";
const nextConfig:NextConfig={
  reactStrictMode:true,
  async rewrites(){
    return [{source:"/slot-api/:path*",destination:"http://localhost:4000/slot-api/:path*"}];
  }
};
export default nextConfig;
