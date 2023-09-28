import Homey from 'homey';
import {ServerConfig} from '../../src/model/server.config';
import PairSession from 'homey/lib/PairSession';
import {LiquidCheckApi} from '../../src/api';

class LiquidCheckDriver extends Homey.Driver {

  private settings: ServerConfig = {
    name: '',
    //url: 'http://liquid-check'
    url: 'http://192.168.178.144'
  }


  onPair(session: PairSession) {
    session.setHandler('settingsChanged', async (data: ServerConfig) => {
      return await  this.onSettingsChanged(data)
    })

    session.setHandler('checkConnection', async (data: ServerConfig) => {
      return await  this.onCheckConnection(data)
    })

    session.setHandler("list_devices", async () => {
      return await this.onPairListDevices();
    });

    session.setHandler("getSettings", async () => {
      return this.settings;
    });
    return new Promise<void>(async (resolve, reject) => resolve());
  }

  async onSettingsChanged(data: ServerConfig) {
    this.settings = data
    return true
  }

  private validateSettings(): string | undefined {
    if (this.settings.name === null || this.settings.name.trim() === '') {
      return this.homey.__('setup.validation.required', {input: this.homey.__('setup.name')});
    }
    if (this.settings.url === null || this.settings.url.trim() === '') {
      return this.homey.__('setup.validation.required', {input: this.homey.__('setup.url')});
    }
    return undefined
  }

  async onCheckConnection(data: ServerConfig) {
    this.settings = data
    const validationError = this.validateSettings()
    if (validationError) {
      return validationError
    }
    const api = new LiquidCheckApi(data)
    try {
      await api.requestInfos()
      return this.homey.__('setup.connection-test.success');
    } catch (e) {
      // @ts-ignore
      if (e.message) {
        // @ts-ignore
        return e.message;
      }
      return this.homey.__('setup.connection-test.failed-detail', {detail: e});
    }
  }

  async onInit() {
    this.log('LiquidCheckDriver has been initialized');
  }

  async onPairListDevices() {
    return [
      {
        name: this.settings.name,
        data: {
          id: 'lc-device-' + this.settings.url + '-' + Date.now(),
        },
        store: {
          settings: this.settings
        },
      },
    ];
  }

}

module.exports = LiquidCheckDriver;
