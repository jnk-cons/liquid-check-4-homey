import Homey, {FlowCardTriggerDevice} from 'homey';
import {ServerConfig} from '../../src/model/server.config';
import {LiquidCheckApi} from '../../src/api';

const SYNC_INTERVAL = 1000 * 60 * 1; // 1 min

class LiquidCheckDevice extends Homey.Device {

  private levelChangedCard: FlowCardTriggerDevice | null = null;
  private levelIncreasesCard: FlowCardTriggerDevice | null = null;
  private levelDecreasesCard: FlowCardTriggerDevice | null = null;

  async onInit() {
    this.log('LiquidCheckDevice has been initialized');
    this.levelChangedCard = this.homey.flow.getDeviceTriggerCard('tank_level_has_changed');
    this.levelIncreasesCard = this.homey.flow.getDeviceTriggerCard('tank_level_increased');
    this.levelDecreasesCard = this.homey.flow.getDeviceTriggerCard('tank_level_decreases');
    const meassureCard = this.homey.flow.getActionCard('start_new_measurement');
    meassureCard.registerRunListener(async (args, state) => {
      const device: LiquidCheckDevice = args.device;
      const api = new LiquidCheckApi(device.getSettings(), device.log);
      device.log("Executing start measure command")
      try {
        await api.requestMeasure();
        device.log("Executed start measure command")
        return {}
      } catch (e) {
        device.error("Starting measure command failed", e)
        return {}
      }
    });

    this.startAutoSync()

    setTimeout(() => {
      this.setCapabilityValue('start_measure', false).then()
      this.registerCapabilityListener('start_measure', (value, opts) => {
        this.log('Starting new measure')
        if (value) {
          const api = new LiquidCheckApi(this.getSettings(), this.log);
          api.requestMeasure()
              .then(() => {this.log("new measurement requested")})
              .catch((e) => {this.error("new measurement requestfailed", e)})
              .finally(() => {
                this.resetMeasureButton()
              })
        }

      })
    }, 1000)
  }

  private resetMeasureButton() {
    setTimeout(() => {
      this.setCapabilityValue('start_measure', false).then()
    }, 3000)
  }

  private startAutoSync() {
    const settings = this.getSettings()
    if (settings && settings.url) {
      this.sync().then(() => setInterval(() => this.sync(), SYNC_INTERVAL))
    }
  }

  async onAdded() {
    this.log('LiquidCheckDevice has been added');
    const storedSettings: ServerConfig = this.getStoreValue('settings');
    const updatedSettings = {
      url: storedSettings.url,
      name: storedSettings.name
    }

    await this.setSettings(updatedSettings)
    await this.unsetStoreValue('settings')
    this.startAutoSync()
  }

  async sync() {
    this.log('Start sync ...')
    try {
      let config: ServerConfig = this.getSettings()

      const api = new LiquidCheckApi(config, this.log)
      const result = await api.requestInfos()
      let oldLevel: number | undefined = this.getCapabilityValue('measure_liters')
      if (oldLevel === undefined || oldLevel == null) {
        oldLevel = 0
      }
      const newLevel = result.measure.content

      this.updateCapability('measure_liters', newLevel)
      this.updateCapability('measure_filled', result.measure.percent)
      const lastMeasurementSeconds = result.measure.age
      const hours = Math.floor(lastMeasurementSeconds / 3600)
      const remainingSeconds = lastMeasurementSeconds % 3600
      const minutes = Math.floor(remainingSeconds / 60)

      let measureTime = `${hours}:`
      if (hours < 10) {
        measureTime = `0${measureTime}`
      }
      if (minutes < 10) {
        measureTime += "0"
      }
      measureTime += `${minutes}`

      this.updateCapability('last_measurement', measureTime)

      if (oldLevel != newLevel) {
        const token = {
          'old level': oldLevel,
          'new level': newLevel,
          'level change': newLevel - oldLevel
        }
        this.levelChangedCard?.trigger(this, token).then(this.log).catch(this.error)
        if (oldLevel > newLevel) {
          this.levelDecreasesCard?.trigger(this, token).then(this.log).catch(this.error)
        } else if (oldLevel < newLevel) {
          this.levelIncreasesCard?.trigger(this, token).then(this.log).catch(this.error)
        }
      }
      this.log('Finished sync ...')
    } catch (e) {
      this.log('Finished sync with error...', e)
    }


  }

  private updateCapability(id: string, newValue: any) {
    if (newValue !== this.getCapabilityValue(id)) {
      this.log("setting new value")
      this.setCapabilityValue(id, newValue).then(() => {})
    }
    else {
      this.log('skipping value -> no change')
    }
  }

  async onSettings({
    oldSettings,
    newSettings,
    changedKeys,
  }: {
    oldSettings: { [key: string]: boolean | string | number | undefined | null };
    newSettings: { [key: string]: boolean | string | number | undefined | null };
    changedKeys: string[];
  }): Promise<string | void> {
    this.log('Settings changed. Executing check')
    const newSettingsAsConfig: ServerConfig = {
      name: this.getName(),
      // @ts-ignore
      url: newSettings.url,
      // @ts-ignore
      password: newSettings.password
    }
    try {
      await new LiquidCheckApi(newSettingsAsConfig, this.log).requestInfos()
    } catch (e) {
      throw e
    }
  }

}

module.exports = LiquidCheckDevice;
