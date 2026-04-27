import { auth } from './firebase';

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  }
}

// Simple event bus for quota errors
type QuotaErrorListener = (isExceeded: boolean) => void;
const listeners: QuotaErrorListener[] = [];

export function onQuotaError(listener: QuotaErrorListener) {
  listeners.push(listener);
  return () => {
    const idx = listeners.indexOf(listener);
    if (idx > -1) listeners.splice(idx, 1);
  };
}

export function clearQuotaError() {
  listeners.forEach(l => l(false));
}

function notifyQuotaExceeded() {
  listeners.forEach(l => l(true));
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData?.map(provider => ({
        providerId: provider.providerId,
        email: provider.email,
      })) || []
    },
    operationType,
    path
  }
  const errorString = JSON.stringify(errInfo);
  console.error('Firestore Error: ', errorString);
  
  // If it's a quota error, notify listeners and show a helpful message
  if (errInfo.error.includes('Quota exceeded') || errInfo.error.includes('resource-exhausted')) {
    notifyQuotaExceeded();
    const quotaMsg = "할당량 초과(Quota Exceeded): Firestore 무료 티어 한도에 도달했습니다. 만약 Blaze(유료) 플랜으로 금방 전환하셨다면, 시스템 반영에 10~15분 정도 소요될 수 있으니 잠시 후 다시 시도해주세요. " + errorString;
    console.warn(quotaMsg);
    return; 
  }
  
  throw new Error(errorString);
}
