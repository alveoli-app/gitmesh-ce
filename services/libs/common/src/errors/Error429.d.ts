export default class Error429 extends Error {
    message: string;
    code: number;
    constructor(language?: any, messageCode?: any, ...args: any[]);
}