export const IntlProvider = ({ children }: any) => children;
export const defineMessages = (m: any) => m;
export const defineMessage = (m: any) => m;
export const useIntl = () => ({
  formatMessage: (m: any) => m?.defaultMessage ?? m?.id ?? '',
  locale: 'en',
});
export const FormattedMessage = ({ defaultMessage, id }: any) => defaultMessage ?? id ?? null;
export const injectIntl = (Component: any) => Component;
export const createIntl = () => ({ formatMessage: (m: any) => m?.defaultMessage ?? '' });
export const createIntlCache = () => ({});
export const RawIntlProvider = ({ children }: any) => children;
export default {
  IntlProvider,
  defineMessages,
  useIntl,
  FormattedMessage,
};
