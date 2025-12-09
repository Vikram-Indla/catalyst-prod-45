import { createGlobalStyle } from 'styled-components';
import { token } from '@atlaskit/tokens';

export const AtlaskitGlobalStyles = createGlobalStyle`
  * {
    margin: 0;
    padding: 0;
    box-sizing: border-box;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen', 'Ubuntu', 'Fira Sans', 'Droid Sans', 'Helvetica Neue', sans-serif !important;
  }

  body {
    font-size: 14px !important;
    line-height: 20px !important;
    font-weight: 400 !important;
    color: ${token('color.text')} !important;
    background: ${token('elevation.surface')} !important;
  }

  h1 { font-size: 29px !important; line-height: 32px !important; font-weight: 500 !important; margin: 0 !important; }
  h2 { font-size: 24px !important; line-height: 28px !important; font-weight: 500 !important; margin: 0 !important; }
  h3 { font-size: 20px !important; line-height: 24px !important; font-weight: 500 !important; margin: 0 !important; }
  h4 { font-size: 16px !important; line-height: 20px !important; font-weight: 600 !important; margin: 0 !important; }
  h5 { font-size: 14px !important; line-height: 16px !important; font-weight: 600 !important; margin: 0 !important; }
  h6 { font-size: 12px !important; line-height: 16px !important; font-weight: 600 !important; margin: 0 !important; }

  p { font-size: 14px !important; line-height: 20px !important; margin: 0 !important; }
  small { font-size: 12px !important; line-height: 16px !important; }
  a { font-size: 14px !important; color: ${token('color.link')} !important; text-decoration: none !important; }
  button { font-size: 14px !important; font-weight: 500 !important; cursor: pointer !important; }
  input, textarea, select { font-size: 14px !important; line-height: 20px !important; }
  label { font-size: 12px !important; font-weight: 600 !important; }
  
  th {
    font-size: 11px !important;
    font-weight: 600 !important;
    text-transform: uppercase !important;
    letter-spacing: 0.06em !important;
    color: ${token('color.text.subtlest')} !important;
  }
  
  td { font-size: 14px !important; line-height: 20px !important; }
`;
