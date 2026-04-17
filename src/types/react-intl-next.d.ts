// Shim for react-intl-next (transitive @atlaskit dep, aliased in vite.config.ts)
declare module 'react-intl-next' {
  const anyExport: any;
  export = anyExport;
}
