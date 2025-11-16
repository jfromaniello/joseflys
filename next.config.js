const withSerwistInit = require("@serwist/next").default;
const CopyWebpackPlugin = require("copy-webpack-plugin");
const path = require("path");

const withSerwist = withSerwistInit({
  swSrc: "app/sw.ts",
  swDest: "public/sw.js",
  maximumFileSizeToCacheInBytes: 5097152,
  disable: process.env.NODE_ENV !== "production",
});

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: false, // Disabled for Cesium 3D compatibility
  async redirects() {
    return [
      {
        source: '/distance',
        destination: '/route',
        permanent: true,
      },
    ];
  },
  webpack: (config, { isServer }) => {
    // Configure Cesium assets to be publicly accessible
    if (!isServer) {
      config.plugins.push(
        new CopyWebpackPlugin({
          patterns: [
            {
              from: path.join(
                __dirname,
                "node_modules/cesium/Build/Cesium/Workers"
              ),
              to: path.join(__dirname, "public/cesium/Workers"),
              info: { minimized: true },
            },
            {
              from: path.join(
                __dirname,
                "node_modules/cesium/Build/Cesium/ThirdParty"
              ),
              to: path.join(__dirname, "public/cesium/ThirdParty"),
              info: { minimized: true },
            },
            {
              from: path.join(
                __dirname,
                "node_modules/cesium/Build/Cesium/Assets"
              ),
              to: path.join(__dirname, "public/cesium/Assets"),
              info: { minimized: true },
            },
            {
              from: path.join(
                __dirname,
                "node_modules/cesium/Build/Cesium/Widgets"
              ),
              to: path.join(__dirname, "public/cesium/Widgets"),
              info: { minimized: true },
            },
          ],
        })
      );
    }

    return config;
  },
};

module.exports = withSerwist(nextConfig);
