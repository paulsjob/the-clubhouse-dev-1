export interface SuccessResponse<T = any> {
  ok: true;
  data: T;
  requestId: string;
}

export interface ErrorResponse {
  ok: false;
  error: {
    code: string;
    message: string;
    requestId: string;
  };
}

export const wrapSuccess = <T>(data: T, requestId: string): SuccessResponse<T> => ({
  ok: true,
  data,
  requestId,
});

export const wrapError = (code: string, message: string, requestId: string): ErrorResponse => ({
  ok: false,
  error: {
    code,
    message,
    requestId,
  },
});