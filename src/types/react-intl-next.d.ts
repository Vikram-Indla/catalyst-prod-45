// Shim for react-intl-next (transitive @atlaskit dep, aliased in vite.config.ts)
declare module 'react-intl-next' {
  export * from 'react-intl';
  export { default } from 'react-intl';
}
