import {ServerConfig} from './model/server.config';
import fetch, {HeadersInit, RequestInit, Response} from 'node-fetch';

export interface InfosDto {
    measure: MeasureDto,
    device: DeviceDto
}


export interface MeasureDto {
    level: number,
    content: number,
    percent: number,
    age: number
}

export interface DeviceDto {
    firmware: string
    hardware: string,
    uuid: string
}

export class LiquidCheckApi {

    constructor(private config: ServerConfig,
                private log: (...args: any[]) => void,) { }

    requestInfos(): Promise<InfosDto> {
        const result = new Promise<InfosDto>( async (resolve, reject) => {
            this.executeRequest('infos.json', 'get')
                .then(async response => {
                    if (response.ok) {
                        const bodyAsJson = await response.json()
                        const parsed: InfosDto = {
                            measure: {
                                age: bodyAsJson['payload']['measure']['age'],
                                content: bodyAsJson['payload']['measure']['content'],
                                level: bodyAsJson['payload']['measure']['level'],
                                percent: bodyAsJson['payload']['measure']['percent'],
                            },
                            device: {
                                firmware: bodyAsJson['payload']['device']['firmware'],
                                uuid: bodyAsJson['payload']['device']['uuid'],
                                hardware: bodyAsJson['payload']['device']['hardware'],
                            }
                        }
                        resolve(parsed)
                    } else {
                        reject({
                            code: response.status,
                            msg: response.statusText
                        })
                    }
                })
                .catch(e => {
                    this.log('Error executing request for endpoint /infos.json', e)
                    reject({
                        code: -1,
                        msg: e.toString()
                    })
                })


        })
        return result
    }

    requestMeasure(): Promise<void> {
        const result = new Promise<void>( async (resolve, reject) => {
            const measureBody = {
                'header': {
                    'namespace': 'Device.Control',
                    'name': 'StartMeasure',
                    'messageId': '1',
                    'payloadVersion': '1'
                },
                'payload': null
            }
            this.executeRequest('command', 'post', JSON.stringify(measureBody))
                .then(response => {
                    if (response.ok) {
                        resolve()
                    }
                    else {
                        reject({
                            code: response.status,
                            msg: response.statusText
                        })
                    }
                })
                .catch(e => {
                    this.log('Error executing request for endpoint /command', e)
                    reject({
                        code: -1,
                        msg: e.toString()
                    })
                })
        })
        return result
    }


    private executeRequest(endpoint: string, method: string, body?: string): Promise<Response> {
        let headers: HeadersInit = {
            'Accept': 'application/json'
        }
        if (body) {
            headers = {
                'Accept': 'application/json',
                'Content-Type': 'application/json'
            }
        }
        let options: RequestInit = {
            method: method,
            headers: headers
        }
        if (body) {
            options.body = body
        }

        let endpointUrl = this.config.url
        if (!endpointUrl.endsWith('/')) {
            endpointUrl += '/'
        }
        endpointUrl += endpoint
        return fetch(endpointUrl, options)
    }

}
