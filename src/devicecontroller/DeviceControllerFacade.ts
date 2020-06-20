// Copyright 2020 Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import DeviceChangeObserver from '../devicechangeobserver/DeviceChangeObserver';
import Device from './Device';
import DevicePermission from './DevicePermission';

export default interface DeviceControllerFacade {
  listAudioInputDevices(): Promise<MediaDeviceInfo[]>;
  listVideoInputDevices(): Promise<MediaDeviceInfo[]>;
  listAudioOutputDevices(): Promise<MediaDeviceInfo[]>;
  chooseAudioInputDevice(device: Device): Promise<DevicePermission>;
  chooseVideoInputDevice(device: Device): Promise<DevicePermission>;
  chooseAudioOutputDevice(deviceId: string | null): Promise<void>;
  addDeviceChangeObserver(observer: DeviceChangeObserver): void;
  removeDeviceChangeObserver(observer: DeviceChangeObserver): void;
  createAnalyserNodeForAudioInput(): AnalyserNode | null;
  startVideoPreviewForVideoInput(element: HTMLVideoElement): void;
  stopVideoPreviewForVideoInput(element: HTMLVideoElement): void;
  setDeviceLabelTrigger(trigger: () => Promise<MediaStream>): void;
  mixIntoAudioInput(stream: MediaStream): MediaStreamAudioSourceNode;
  chooseVideoInputQuality(
    width: number,
    height: number,
    frameRate: number,
    maxBandwidthKbps: number
  ): void;
  enableWebAudio(flag: boolean): void;
}
