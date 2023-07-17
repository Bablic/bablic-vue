export interface IHttpClient {
    get(url: string): Promise<any>;
    post(url: string, data: any): Promise<any>;
}
export const fetchClient: IHttpClient = {
    get: (url: string) => fetch(url).then((res) => res.json()),
    post: (url: string, data: any) => fetch(url, {
        method: "POST",
        body: JSON.stringify(data),
        headers: {
            "Content-Type": "application/json",
        },
    }).then((res) => res.json()),
}


let httpClient: IHttpClient = fetchClient;

export function getHttpClient(): IHttpClient {
    return httpClient;
}
export function setHttpClient(client: IHttpClient) {
    httpClient = client;
}
export function setAxiosClient(axios) {
    httpClient = {
        get: (url: string) => axios.get(url).then((res) => res.data),
        post: (url: string, data: any) => axios.post(url, data).then((res) => res.data),
    }
}
