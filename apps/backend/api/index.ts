import { handleRequest } from '../src/app.js';

export default function handler(request: Request): Promise<Response> {
  return handleRequest(request);
}
