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

    constructor(private config: ServerConfig) { }

    requestInfos(): Promise<InfosDto> {
        const result = new Promise<InfosDto>( async (resolve, reject) => {
            const infoResponse = await this.executeRequest('infos.json', 'get')
            if (infoResponse.ok) {
                const bodyAsJson = await infoResponse.json()
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
            }
            else {
                reject({
                    code: infoResponse.status,
                    msg: infoResponse.statusText
                })
            }
        })
        return result
    }

    requestMeasure(): Promise<void> {
        const result = new Promise<void>( async (resolve, reject) => {
            // {"header":{"namespace":"Device.Control","name":"StartMeasure","messageId":"1","payloadVersion":"1"},"payload":null}
            const measureBody = {
                'header': {
                    'namespace': 'Device.Control',
                    'name': 'StartMeasure',
                    'messageId': '1',
                    'payloadVersion': '1'
                },
                'payload': null
            }
            const infoResponse = await this.executeRequest('command', 'post', JSON.stringify(measureBody))
            if (infoResponse.ok) {
                resolve()
            }
            else {
                reject({
                    code: infoResponse.status,
                    msg: infoResponse.statusText
                })
            }
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
