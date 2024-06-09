import B2 from 'backblaze-b2';
import { B2_APPLICATION_KEY, B2_APPLICATION_KEY_ID } from '../configKey';

class B2Class extends B2 {
  private static instance: B2;

  constructor(
    applicationKeyId: string,
    applicationKey: string,
    retries?: number,
  ) {
    super({
      applicationKeyId,
      applicationKey,
      retry: { retries: retries || 4 },
    });
  }

  static getInstance(applicationKeyId: string, applicationKey: string) {
    if (!B2Class.instance) {
      B2Class.instance = new B2Class(applicationKeyId, applicationKey);
    }
    return B2Class.instance;
  }
}

const blackblaze = B2Class.getInstance(
  B2_APPLICATION_KEY_ID || '',
  B2_APPLICATION_KEY || '',
);

export { blackblaze };
