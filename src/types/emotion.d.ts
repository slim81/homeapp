import '@emotion/react';
import { Theme as AppTheme } from '../theme/theme';

declare module '@emotion/react' {
  export interface Theme extends AppTheme {}
}