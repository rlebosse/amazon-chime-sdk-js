// Copyright 2020 Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import DeviceChangeEventObserver from '../devicechangeeventobserver/DeviceChangeEventObserver';

/**
 * [[DeviceChangeEventController]] notifies observers when the "devicechange" event occurs.
 */
export default interface DeviceChangeEventController {
  /**
   * Starts receiving a device change event.
   */
  start(): void;

  /**
   * Stops receiving a device change event.
   */
  stop(): void;

  /**
   * Registers a device change event observer.
   */
  registerObserver(observer: DeviceChangeEventObserver): void;

  /**
   * Removes a device change event observer.
   */
  removeObserver(observer: DeviceChangeEventObserver): void;
}
