import {createHash} from 'node:crypto';

export const digest=data=>createHash('sha256').update(data).digest('hex');
export class ShareError extends Error {constructor(code,message){super(message);this.code=code;}}
