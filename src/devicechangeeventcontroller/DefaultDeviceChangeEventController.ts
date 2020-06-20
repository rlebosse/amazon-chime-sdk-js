// Copyright 2020 Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import DeviceChangeEventObserver from '../devicechangeeventobserver/DeviceChangeEventObserver';
import Logger from '../logger/Logger';
import Maybe from '../maybe/Maybe';
import AsyncScheduler from '../scheduler/AsyncScheduler';
import IntervalScheduler from '../scheduler/IntervalScheduler';
import DeviceChangeEventController from './DeviceChangeEventController';

export default class DefaultDeviceChangeEventController implements DeviceChangeEventController {
  private static INTERVAL_MS: number = 1000;

  private observerQueue: Set<DeviceChangeEventObserver> = new Set<DeviceChangeEventObserver>();
  private started: boolean = false;
  private isMediaDevicesSupported: boolean;
  private isDeviceChangeSupported: boolean;

  // If the "devicechange" event is not supported, regularly request a list of input and output devices
  // and notify observers if the device list changes.
  private scheduler: IntervalScheduler;
  private devices: MediaDeviceInfo[] | null = null;

  constructor(private logger: Logger) {
    this.isMediaDevicesSupported = typeof navigator !== 'undefined' && !!navigator.mediaDevices;
    this.isDeviceChangeSupported =
      this.isMediaDevicesSupported && 'ondevicechange' in navigator.mediaDevices;
  }

  start(): void {
    if (!this.isMediaDevicesSupported) {
      this.logger.error(`navigator.mediaDevices is not supported`);
      return;
    }

    if (this.started) {
      return;
    }
    this.started = true;

    if (this.isDeviceChangeSupported) {
      // @ts-ignore
      navigator.mediaDevices.addEventListener('devicechange', this.handleDeviceChangeEvent);
    } else {
      this.scheduler = new IntervalScheduler(DefaultDeviceChangeEventController.INTERVAL_MS);
      this.scheduler.start(this.pollDeviceLists);
    }
  }

  stop(): void {
    if (!this.started) {
      return;
    }
    this.started = false;

    if (this.isDeviceChangeSupported) {
      // @ts-ignore
      navigator.mediaDevices.removeEventListener('devicechange', this.handleDeviceChangeEvent);
    } else {
      this.scheduler.stop();
    }
  }

  registerObserver(observer: DeviceChangeEventObserver): void {
    this.observerQueue.add(observer);
  }

  removeObserver(observer: DeviceChangeEventObserver): void {
    this.observerQueue.delete(observer);
  }

  private forEachObserver(observerFunc: (observer: DeviceChangeEventObserver) => void): void {
    for (const observer of this.observerQueue) {
      new AsyncScheduler().start(() => {
        if (this.observerQueue.has(observer)) {
          observerFunc(observer);
        }
      });
    }
  }

  private handleDeviceChangeEvent = (): void => {
    this.forEachObserver(observer => {
      Maybe.of(observer.didReceiveDeviceChangeEvent).map(f => f.bind(observer)());
    });
  };

  private pollDeviceLists = async (): Promise<void> => {
    const newDevices = await this.sortedDeviceList();
    if (this.devices) {
      const changed =
        newDevices.length !== this.devices.length ||
        newDevices.some((device: MediaDeviceInfo, index: number) => {
          return device.deviceId !== this.devices[index].deviceId;
        });
      if (changed) {
        this.handleDeviceChangeEvent();
      }
    }
    this.devices = newDevices;
  };

  private async sortedDeviceList(): Promise<MediaDeviceInfo[]> {
    // @ts-ignore
    const newDevices = await navigator.mediaDevices.enumerateDevices();
    return newDevices.sort((device1: MediaDeviceInfo, device2: MediaDeviceInfo) => {
      if (device1.deviceId < device2.deviceId) {
        return 1;
      } else if (device1.deviceId > device2.deviceId) {
        return -1;
      } else {
        return 0;
      }
    });
  }
}
