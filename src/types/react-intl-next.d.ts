// Shim for react-intl-next (transitive @atlaskit dep, aliased to react-intl in vite.config.ts)
declare module 'react-intl-next' {
  export const IntlProvider: any;
  export const FormattedMessage: any;
  export const useIntl: any;
  export const injectIntl: any;
  export const createIntl: any;
  export const createIntlCache: any;
  export const defineMessages: any;
  export const defineMessage: any;
  const _default: any;
  export default _default;
}
