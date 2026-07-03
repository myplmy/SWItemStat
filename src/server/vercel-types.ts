import type { IncomingMessage, ServerResponse } from "node:http";

export interface ApiRequest extends IncomingMessage {
  query: Record<string, string | string[] | undefined>;
}

export interface ApiResponse extends ServerResponse {
  json(body: unknown): ApiResponse;
  status(statusCode: number): ApiResponse;
}
