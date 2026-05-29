export interface ApiReferenceExample {
    name: string;
    payload: unknown;
}
export interface ApiReferenceEndpoint {
    operation_id: string;
    method: "POST";
    path: string;
    summary: string;
    request_examples: ApiReferenceExample[];
    success_examples: ApiReferenceExample[];
    error_codes: string[];
    notes: string[];
}
export interface CoreApiReferenceDocument {
    endpoints: ApiReferenceEndpoint[];
}
export declare const coreApiReferenceDocument: CoreApiReferenceDocument;
