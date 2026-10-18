import { config } from '../config';
import { createHttpBackend } from './http';
import { createMockBackend } from './mock';

export const backend = config.backend === 'http' ? createHttpBackend() : createMockBackend();
export type * from './types';
